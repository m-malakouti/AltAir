using AltAir.MarketApi;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;

namespace AltAir.MarketApi.Tests;

public sealed class MarketDiagnosticsTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 25, 7, 0, 0, TimeSpan.Zero);
    private static NavasanOptions Settings() => new()
        { ApiKey = "private-test-key", PriceUnit = "toman", RedistributionApproved = true };
    private static string Payload(DateTimeOffset usdAt, DateTimeOffset eurAt) => JsonSerializer.Serialize(new
    {
        usd_sell = new { value = "1000", timestamp = usdAt.ToUnixTimeSeconds() },
        eur = new { value = "1100", timestamp = eurAt.ToUnixTimeSeconds() }
    });
    private static NavasanService Service(Handler handler, Clock clock, NavasanOptions? settings = null,
        AdminSettingsStore? store = null) => new(new Factory(handler), Options.Create(settings ?? Settings()), clock, store);

    [Fact]
    public async Task ReadingStatusDoesNotFetchOrConsumeQuota()
    {
        var clock = new Clock(Now);
        var handler = new Handler();
        using var service = Service(handler, clock);
        var status = await service.GetDiagnosticsAsync(default);
        Assert.Equal("not_checked", status.State);
        Assert.Equal(0, status.Budget.Used);
        Assert.Equal(120, status.Budget.Remaining);
        Assert.Equal(Now, status.NextEligibleAt);
        Assert.Null(status.LastSuccessAt);
        Assert.Empty(status.RecentAttempts);
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task FreshFetchDoesNotMakeOldProviderDataFresh()
    {
        var clock = new Clock(Now);
        var handler = new Handler { Body = Payload(Now.AddHours(-3), Now.AddMinutes(-5)) };
        using var service = Service(handler, clock);
        await service.GetQuoteAsync(default);
        var status = await service.GetDiagnosticsAsync(default);
        Assert.Equal("stale", status.State);
        Assert.Equal(Now, status.LastSuccessAt);
        Assert.Equal(Now.AddHours(-3), status.ProviderUpdatedAt);
        Assert.Equal(2, status.AssetCount);
        Assert.Equal(1, status.StaleAssetCount);
        Assert.Equal(Now.AddHours(-3), status.OldestAssetAt);
        Assert.Equal(Now.AddMinutes(-5), status.NewestAssetAt);
        Assert.Equal(Now.AddMinutes(480), status.NextEligibleAt);
        Assert.True(Assert.Single(status.RecentAttempts).Successful);
        await service.GetQuoteAsync(default);
        Assert.Equal(1, (await service.GetDiagnosticsAsync(default)).Budget.Used);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task FailureKeepsSuccessfulCacheAndReportsOnlySafeDetails()
    {
        var clock = new Clock(Now);
        var handler = new Handler();
        using var service = Service(handler, clock);
        await service.GetQuoteAsync(default);
        clock.Now = Now.AddHours(9);
        handler.Status = HttpStatusCode.Unauthorized;
        await service.GetQuoteAsync(default);
        var status = await service.GetDiagnosticsAsync(default);
        Assert.Equal("unavailable", status.State);
        Assert.True(status.CacheAvailable);
        Assert.True(status.FetchFailed);
        Assert.Equal(Now, status.LastSuccessAt);
        Assert.Equal(2, status.Budget.Used);
        Assert.Equal("provider_http_error", status.LastFailure!.Code);
        Assert.Equal(401, status.LastFailure.HttpStatus);
        Assert.Equal(clock.Now.AddMinutes(15), status.NextEligibleAt);
        Assert.DoesNotContain("private-test-key", JsonSerializer.Serialize(status));
        await service.GetQuoteAsync(default);
        Assert.Equal(2, handler.Calls);
        clock.Now = clock.Now.AddMinutes(16);
        handler.Status = HttpStatusCode.OK;
        await service.GetQuoteAsync(default);
        var recovered = await service.GetDiagnosticsAsync(default);
        Assert.False(recovered.FetchFailed);
        Assert.Equal(clock.Now, recovered.LastSuccessAt);
        Assert.Equal(status.LastFailure, recovered.LastFailure);
        Assert.Equal(3, recovered.RecentAttempts.Count);
    }

    [Theory]
    [InlineData("network", "network_error")]
    [InlineData("timeout", "provider_timeout")]
    [InlineData("json", "invalid_response")]
    public async Task DistinguishesNetworkTimeoutAndInvalidData(string failure, string expected)
    {
        var handler = new Handler { Failure = failure };
        using var service = Service(handler, new Clock(Now));
        await Assert.ThrowsAsync<MarketUnavailableException>(() => service.GetQuoteAsync(default));
        var status = await service.GetDiagnosticsAsync(default);
        Assert.Equal(expected, status.LastFailure!.Code);
        Assert.Equal("unavailable", status.State);
        Assert.False(status.CacheAvailable);
        Assert.Null(status.LastSuccessAt);
        var json = JsonSerializer.Serialize(status);
        Assert.DoesNotContain("private-test-key", json);
        Assert.DoesNotContain("api_key=", json);
        Assert.Equal(1, status.Budget.Used);
    }

    [Fact]
    public async Task ReportsBudgetBlockAndResetsAtUtcMonthBoundary()
    {
        var clock = new Clock(new DateTimeOffset(2026, 10, 31, 12, 0, 0, TimeSpan.Zero));
        var handler = new Handler();
        var settings = Settings();
        settings.MaxRequestsPerMonth = 1;
        using var service = Service(handler, clock, settings);
        await service.GetQuoteAsync(default);
        clock.Now = clock.Now.AddHours(9);
        await service.GetQuoteAsync(default);
        var blocked = await service.GetDiagnosticsAsync(default);
        Assert.Equal("budget_exhausted", blocked.State);
        Assert.Equal(0, blocked.Budget.Remaining);
        Assert.Equal(new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero), blocked.NextEligibleAt);
        Assert.Equal(1, handler.Calls);
        clock.Now = blocked.Budget.ResetsAt;
        var reset = await service.GetDiagnosticsAsync(default);
        Assert.Equal("2026-11", reset.Budget.MonthUtc);
        Assert.Equal(0, reset.Budget.Used);
        Assert.Equal(1, reset.Budget.Remaining);
        Assert.Equal(1, handler.Calls);
        await service.GetQuoteAsync(default);
        Assert.Equal(2, handler.Calls);
    }

    [Fact]
    public async Task MissingConfigurationAndCorruptPolicyRemainObservableWithoutProviderCalls()
    {
        var clock = new Clock(Now);
        var handler = new Handler();
        using (var unconfigured = Service(handler, clock, new NavasanOptions()))
        {
            var status = await unconfigured.GetDiagnosticsAsync(default);
            Assert.Equal("unconfigured", status.State);
            Assert.Null(status.NextEligibleAt);
        }
        var directory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(directory);
        try
        {
            var path = Path.Combine(directory, "settings.json");
            await File.WriteAllTextAsync(path, "invalid json");
            using var service = Service(handler, clock, store: new(path));
            Assert.Equal("storage_error", (await service.GetDiagnosticsAsync(default)).State);
            await Assert.ThrowsAsync<MarketUnavailableException>(() => service.GetQuoteAsync(default));
            Assert.Equal(0, handler.Calls);
        }
        finally { Directory.Delete(directory, true); }
    }

    [Fact]
    public async Task HistoryIsBoundedAndPolicyChangesDoNotRewriteExistingCacheFreshness()
    {
        var clock = new Clock(Now);
        var handler = new Handler();
        var settings = Settings();
        settings.PollMinutes = 1;
        using var service = Service(handler, clock, settings);
        for (var i = 0; i < 25; i++)
        {
            await service.GetQuoteAsync(default);
            clock.Now = clock.Now.AddMinutes(2);
        }
        settings.StaleAfterMinutes = 5;
        var status = await service.GetDiagnosticsAsync(default);
        Assert.Equal(20, status.RecentAttempts.Count);
        Assert.Equal(25, status.Budget.Used);
        Assert.Equal(7200, status.CacheStaleAfterSeconds);
        Assert.Equal(5, status.Settings.StaleAfterMinutes);
        Assert.True(status.RecentAttempts[0].StartedAt > status.RecentAttempts[^1].StartedAt);
    }

    private sealed class Clock(DateTimeOffset now) : TimeProvider
    { public DateTimeOffset Now { get; set; } = now; public override DateTimeOffset GetUtcNow() => Now; }
    private sealed class Factory(Handler handler) : IHttpClientFactory
    { public HttpClient CreateClient(string name) => new(handler, disposeHandler: false); }
    private sealed class Handler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public string Body { get; set; } = Payload(Now, Now);
        public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
        public string? Failure { get; set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Calls++;
            if (Failure == "network") throw new HttpRequestException("https://provider/?api_key=private-test-key");
            if (Failure == "timeout") throw new TaskCanceledException("private-test-key");
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(Failure == "json" ? "not json" : Body) });
        }
    }
}
