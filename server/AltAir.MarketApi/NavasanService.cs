using Microsoft.Extensions.Options;
using System.Diagnostics;

namespace AltAir.MarketApi;

public sealed class MarketUnavailableException : Exception;

public sealed class NavasanService(
    IHttpClientFactory clientFactory,
    IOptions<NavasanOptions> options,
    TimeProvider clock,
    AdminSettingsStore? adminSettings = null) : IDisposable
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private DollarQuote? cached;
    private DateTimeOffset nextAttemptAt;
    private (int Year, int Month) budgetMonth;
    private int calls;
    private bool lastFetchFailed;
    private readonly DateTimeOffset processStartedAt = GetProcessStartedAt();
    private readonly List<MarketFetchAttempt> attempts = [];
    private MarketFailure? lastFailure;

    private static DateTimeOffset GetProcessStartedAt()
    {
        using var process = Process.GetCurrentProcess();
        return process.StartTime.ToUniversalTime();
    }

    private async Task<AdminSettings> ReadPolicyAsync(CancellationToken token) =>
        (adminSettings is null ? null : await adminSettings.ReadAsync(token)) ??
        new(options.Value.PollMinutes, options.Value.StaleAfterMinutes, options.Value.MaxRequestsPerMonth);

    private void ResetBudget(DateTimeOffset now)
    {
        var month = (now.Year, now.Month);
        if (month != budgetMonth) { budgetMonth = month; calls = 0; }
    }

    private void RecordAttempt(DateTimeOffset startedAt, long timer, string? errorCode, int? httpStatus)
    {
        var completedAt = clock.GetUtcNow();
        attempts.Insert(0, new(startedAt, completedAt, (long)Stopwatch.GetElapsedTime(timer).TotalMilliseconds,
            errorCode is null, errorCode, httpStatus));
        if (attempts.Count > 20) attempts.RemoveAt(attempts.Count - 1);
        if (errorCode is not null) lastFailure = new(completedAt, errorCode, httpStatus);
    }

    // Observing diagnostics never fetches prices or consumes provider quota.
    public async Task<MarketDiagnostics> GetDiagnosticsAsync(CancellationToken token, bool localDevelopment = false)
    {
        await gate.WaitAsync(token);
        try
        {
            var now = clock.GetUtcNow();
            ResetBudget(now);
            var settings = options.Value;
            var policy = new AdminSettings(settings.PollMinutes, settings.StaleAfterMinutes, settings.MaxRequestsPerMonth);
            var storageFailed = false;
            try { policy = await ReadPolicyAsync(token); }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException or System.Text.Json.JsonException or InvalidDataException)
            { storageFailed = true; }
            var configured = settings.IsConfigured(localDevelopment);
            var resetAt = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero).AddMonths(1);
            var exhausted = calls >= policy.MaxRequestsPerMonth;
            var times = cached?.Assets is { Count: > 0 } assets ? assets.Select(a => a.UpdatedAt).ToArray()
                : cached?.Rates is { Count: > 0 } rates ? rates.Select(r => r.UpdatedAt).ToArray()
                : cached is null ? [] : new[] { cached.UpdatedAt };
            var staleCount = cached is null ? 0 : times.Count(time => now - time > TimeSpan.FromSeconds(cached.StaleAfterSeconds));
            var state = storageFailed ? "storage_error" : !configured ? "unconfigured" : exhausted ? "budget_exhausted"
                : lastFetchFailed ? "unavailable" : cached is null ? "not_checked" : staleCount > 0 ? "stale" : "ready";
            DateTimeOffset? next = !configured || storageFailed ? null : exhausted
                ? (nextAttemptAt > resetAt ? nextAttemptAt : resetAt) : nextAttemptAt > now ? nextAttemptAt : now;
            return new(now, processStartedAt, configured, state, cached is not null, cached?.UpdatedAt,
                cached?.FetchedAt, attempts.FirstOrDefault()?.StartedAt, attempts.FirstOrDefault()?.DurationMs,
                next, lastFetchFailed, times.Length, staleCount, times.Length == 0 ? null : times.Min(),
                times.Length == 0 ? null : times.Max(), cached?.StaleAfterSeconds, policy,
                new(now.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture), calls,
                    policy.MaxRequestsPerMonth, Math.Max(0, policy.MaxRequestsPerMonth - calls), resetAt),
                lastFailure, attempts.ToArray());
        }
        finally { gate.Release(); }
    }

    public async Task<DollarQuote> GetQuoteAsync(CancellationToken cancellationToken, bool localDevelopment = false)
    {
        var settings = options.Value;
        AdminSettings policy;
        try { policy = await ReadPolicyAsync(cancellationToken); }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException or System.Text.Json.JsonException or InvalidDataException)
        { throw new MarketUnavailableException(); }
        if (!settings.IsConfigured(localDevelopment)) throw new MarketUnavailableException();
        await gate.WaitAsync(cancellationToken);
        try
        {
            var now = clock.GetUtcNow();
            ResetBudget(now);
            if (now < nextAttemptAt)
                return cached is null ? throw new MarketUnavailableException()
                    : cached with { FetchFailed = lastFetchFailed };
            if (calls >= policy.MaxRequestsPerMonth)
                return cached is null ? throw new MarketUnavailableException()
                    : cached with { FetchFailed = true };

            calls++;
            nextAttemptAt = now.AddMinutes(15);
            var timer = Stopwatch.GetTimestamp();
            int? httpStatus = null;
            try
            {
                var key = Uri.EscapeDataString(settings.ApiKey);
                using var response = await clientFactory.CreateClient("navasan")
                    .GetAsync($"https://api.navasan.tech/latest/?api_key={key}&dollar_rate=true", cancellationToken);
                httpStatus = (int)response.StatusCode;
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                cached = NavasanParser.Parse(json, settings.PriceUnit, clock.GetUtcNow(), policy.StaleAfterMinutes);
                nextAttemptAt = clock.GetUtcNow().AddMinutes(policy.PollMinutes);
                lastFetchFailed = false;
                RecordAttempt(now, timer, null, httpStatus);
                return cached;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                lastFetchFailed = true;
                RecordAttempt(now, timer, "request_cancelled", httpStatus);
                throw;
            }
            catch (Exception error) when (error is HttpRequestException or TaskCanceledException
                or System.Text.Json.JsonException or KeyNotFoundException or InvalidOperationException
                or InvalidDataException or FormatException or OverflowException or ArgumentOutOfRangeException)
            {
                lastFetchFailed = true;
                var code = error is TaskCanceledException ? "provider_timeout"
                    : error is HttpRequestException ? (httpStatus.HasValue ? "provider_http_error" : "network_error")
                    : "invalid_response";
                RecordAttempt(now, timer, code, httpStatus);
                return cached is null ? throw new MarketUnavailableException()
                    : cached with { FetchFailed = true };
            }
        }
        finally { gate.Release(); }
    }

    public void Dispose() => gate.Dispose();
}
