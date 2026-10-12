using Microsoft.Extensions.Options;

namespace AltAir.MarketApi;

public sealed class MarketUnavailableException : Exception;

public sealed class NavasanService(
    IHttpClientFactory clientFactory,
    IOptions<NavasanOptions> options,
    TimeProvider clock) : IDisposable
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private DollarQuote? cached;
    private DateTimeOffset nextAttemptAt;
    private (int Year, int Month) budgetMonth;
    private int calls;
    private bool lastFetchFailed;

    public async Task<DollarQuote> GetQuoteAsync(CancellationToken cancellationToken, bool localDevelopment = false)
    {
        var settings = options.Value;
        if (!settings.IsConfigured(localDevelopment)) throw new MarketUnavailableException();
        await gate.WaitAsync(cancellationToken);
        try
        {
            var now = clock.GetUtcNow();
            if (now < nextAttemptAt)
                return cached is null ? throw new MarketUnavailableException()
                    : cached with { FetchFailed = lastFetchFailed };
            var currentMonth = (now.Year, now.Month);
            if (currentMonth != budgetMonth) { budgetMonth = currentMonth; calls = 0; }
            if (calls >= settings.MaxRequestsPerMonth)
                return cached is null ? throw new MarketUnavailableException()
                    : cached with { FetchFailed = true };

            calls++;
            nextAttemptAt = now.AddMinutes(15);
            try
            {
                var key = Uri.EscapeDataString(settings.ApiKey);
                using var response = await clientFactory.CreateClient("navasan")
                    .GetAsync($"https://api.navasan.tech/latest/?api_key={key}", cancellationToken);
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                cached = NavasanParser.Parse(json, settings.PriceUnit, now, settings.StaleAfterMinutes);
                nextAttemptAt = now.AddMinutes(settings.PollMinutes);
                lastFetchFailed = false;
                return cached;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
            catch (Exception error) when (error is HttpRequestException or TaskCanceledException
                or System.Text.Json.JsonException or KeyNotFoundException or InvalidOperationException
                or InvalidDataException or FormatException or OverflowException or ArgumentOutOfRangeException)
            {
                lastFetchFailed = true;
                return cached is null ? throw new MarketUnavailableException()
                    : cached with { FetchFailed = true };
            }
        }
        finally { gate.Release(); }
    }

    public void Dispose() => gate.Dispose();
}
