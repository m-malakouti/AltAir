using AltAir.MarketApi;
using Microsoft.Extensions.Options;
using System.Net;

namespace AltAir.MarketApi.Tests;

public sealed class NavasanTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1_790_000_000);
    private const string Payload = """{"usd_sell":{"value":"1234560","timestamp":1790000000}}""";

    [Theory]
    [InlineData("rial", 123456)]
    [InlineData("toman", 1234560)]
    public void ConvertsOnlyTheExplicitlyConfiguredUnit(string unit, decimal expected)
    {
        var quote = NavasanParser.Parse(Payload, unit, Now, 120);
        Assert.Equal(expected, quote.PriceToman);
        Assert.Equal("USD_FREE_SELL", quote.Instrument);
        Assert.Equal(Now, quote.UpdatedAt);
        Assert.Equal(7200, quote.StaleAfterSeconds);
    }

    [Fact]
    public void RejectsUnknownUnits() =>
        Assert.Throws<InvalidDataException>(() => NavasanParser.Parse(Payload, "", Now, 120));

    [Fact]
    public void RejectsFutureTimestamps() =>
        Assert.Throws<InvalidDataException>(() => NavasanParser.Parse(Payload, "rial", Now.AddHours(-1), 120));

    [Theory]
    [InlineData("0")]
    [InlineData("-20")]
    [InlineData("invalid")]
    public void RejectsInvalidPrices(string value) =>
        Assert.ThrowsAny<Exception>(() => NavasanParser.Parse(Payload.Replace("1234560", value), "rial", Now, 120));

    [Fact]
    public async Task DoesNotContactProviderUntilAllConfigurationIsVerified()
    {
        var handler = new FakeHandler();
        using var service = MakeService(handler, new NavasanOptions(), new FakeClock(Now));
        await Assert.ThrowsAsync<MarketUnavailableException>(() => service.GetQuoteAsync(default));
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task ConcurrentRequestsShareOneProviderFetch()
    {
        var handler = new FakeHandler();
        using var service = MakeService(handler, Configured(), new FakeClock(Now));
        await Task.WhenAll(Enumerable.Range(0, 12).Select(_ => service.GetQuoteAsync(default)));
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task PreservesSuccessfulTimestampWhenProviderFails()
    {
        var clock = new FakeClock(Now);
        var handler = new FakeHandler();
        using var service = MakeService(handler, Configured(), clock);
        var original = await service.GetQuoteAsync(default);
        clock.Now = Now.AddHours(9);
        handler.Status = HttpStatusCode.BadGateway;
        var fallback = await service.GetQuoteAsync(default);
        Assert.True(fallback.FetchFailed);
        Assert.Equal(original.FetchedAt, fallback.FetchedAt);
        Assert.Equal(original.UpdatedAt, fallback.UpdatedAt);
    }

    [Fact]
    public async Task StopsAtTheConfiguredMonthlyBudget()
    {
        var clock = new FakeClock(Now);
        var handler = new FakeHandler();
        var settings = Configured();
        settings.MaxRequestsPerMonth = 1;
        using var service = MakeService(handler, settings, clock);
        await service.GetQuoteAsync(default);
        clock.Now = Now.AddHours(9);
        Assert.True((await service.GetQuoteAsync(default)).FetchFailed);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task LocalPreviewDoesNotGrantProductionRedistribution()
    {
        var settings = Configured();
        settings.RedistributionApproved = false;
        settings.LocalDevelopmentEnabled = true;
        var handler = new FakeHandler();
        using var service = MakeService(handler, settings, new FakeClock(Now));
        await Assert.ThrowsAsync<MarketUnavailableException>(() => service.GetQuoteAsync(default));
        Assert.Equal(0, handler.Calls);
        Assert.Equal(123456m, (await service.GetQuoteAsync(default, localDevelopment: true)).PriceToman);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task LocalPreviewStillRequiresAnExplicitVerifiedUnit()
    {
        var settings = Configured();
        settings.RedistributionApproved = false;
        settings.LocalDevelopmentEnabled = true;
        settings.PriceUnit = "";
        var handler = new FakeHandler();
        using var service = MakeService(handler, settings, new FakeClock(Now));
        await Assert.ThrowsAsync<MarketUnavailableException>(() => service.GetQuoteAsync(default, localDevelopment: true));
        Assert.Equal(0, handler.Calls);
    }


    [Fact]
    public void ParsesMultipleCurrenciesAndSkipsAnInvalidOptionalRate()
    {
        const string json = """{"usd_sell":{"value":"1000","timestamp":1790000000},"eur":{"value":"1100","timestamp":1789999900},"gbp":{"value":"bad","timestamp":1790000000},"aed_sell":{"value":"300","timestamp":1790000000}}""";
        var quote = NavasanParser.Parse(json, "toman", Now, 120);
        Assert.NotNull(quote.Rates);
        Assert.Equal(3, quote.Rates.Count);
        Assert.Equal(1100m, quote.Rates.Single(rate => rate.Code == "EUR").PriceToman);
        Assert.Equal(Now.AddSeconds(-100), quote.Rates.Single(rate => rate.Code == "EUR").UpdatedAt);
        Assert.DoesNotContain(quote.Rates, rate => rate.Code == "GBP");
    }

    [Fact]
    public void MissingOptionalCurrenciesAreNotFabricated()
    {
        var quote = NavasanParser.Parse(Payload, "toman", Now, 120);
        Assert.Single(quote.Rates!);
        Assert.Equal("USD", quote.Rates![0].Code);
    }


    [Theory]
    [InlineData("100", "toman", 100)]
    [InlineData("-100", "toman", -100)]
    [InlineData("0", "toman", 0)]
    [InlineData("100", "rial", 10)]
    public void ConvertsDailyChangeWithThePriceUnit(string change, string unit, decimal expected)
    {
        var json = Payload.Replace("\"value\":", $"\"change\":\"{change}\",\"value\":");
        var quote = NavasanParser.Parse(json, unit, Now, 120);
        Assert.Equal(expected, quote.Rates![0].ChangeToman);
    }

    [Theory]
    [InlineData("bad")]
    [InlineData("1234560")]
    public void InvalidDailyChangeDoesNotDiscardThePrice(string change)
    {
        var json = Payload.Replace("\"value\":", $"\"change\":\"{change}\",\"value\":");
        var quote = NavasanParser.Parse(json, "toman", Now, 120);
        Assert.Equal(1234560m, quote.PriceToman);
        Assert.Null(quote.Rates![0].ChangeToman);
    }

    private static NavasanOptions Configured() => new()
    { ApiKey = "test-only", PriceUnit = "rial", RedistributionApproved = true };
    private static NavasanService MakeService(FakeHandler handler, NavasanOptions settings, TimeProvider clock) =>
        new(new FakeFactory(handler), Options.Create(settings), clock);

    private sealed class FakeClock(DateTimeOffset now) : TimeProvider
    { public DateTimeOffset Now { get; set; } = now; public override DateTimeOffset GetUtcNow() => Now; }
    private sealed class FakeFactory(FakeHandler handler) : IHttpClientFactory
    { public HttpClient CreateClient(string name) => new(handler, disposeHandler: false); }
    private sealed class FakeHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        { Assert.DoesNotContain("item=", request.RequestUri!.Query); Assert.Contains("dollar_rate=true", request.RequestUri.Query); Calls++; return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(Payload) }); }
    }
}
