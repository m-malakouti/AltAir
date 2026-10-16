using AltAir.MarketApi;

namespace AltAir.MarketApi.Tests;

public sealed class CryptoTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1790000000);

    [Theory]
    [InlineData(10, 10)]
    [InlineData(-10, -10)]
    [InlineData(0, 0)]
    public void ParsesDollarPricesAndDerivesDollarChangeFromPercent(int percent, int expected)
    {
        var price = 100 + percent;
        var json = $$$"""{"usd_sell":{"value":"1000","timestamp":1790000000},"btc":{"value":"99999999","dollar_rate":{{{price}}},"dollar_rate_time":1790000000,"dollar_rate_24h_change":{{{percent}}}}}""";
        var basket = NavasanParser.Parse(json, "rial", Now, 120);
        var rate = Assert.Single(basket.CryptoRates!);
        Assert.Equal("BTC", rate.Code);
        Assert.Equal(price, rate.PriceUsd);
        Assert.Equal(expected, rate.ChangeUsd);
        Assert.Equal(percent, rate.Percent);
        Assert.Equal(Now, rate.UpdatedAt);
        Assert.Equal(100m, basket.PriceToman);
    }

    [Fact]
    public void OptionalInvalidCryptoDoesNotDiscardOtherRates()
    {
        const string json = """{"usd_sell":{"value":"1000","timestamp":1790000000},"btc":{"dollar_rate":0,"dollar_rate_time":1790000000},"eth":{"dollar_rate":12,"dollar_rate_time":1790000400},"usdt":{"dollar_rate":"0.999077","dollar_rate_time":1790000000,"dollar_rate_24h_change":null}}""";
        var basket = NavasanParser.Parse(json, "toman", Now, 120);
        var rate = Assert.Single(basket.CryptoRates!);
        Assert.Equal("USDT", rate.Code);
        Assert.Equal(0.999077m, rate.PriceUsd);
        Assert.Null(rate.ChangeUsd);
        Assert.Null(rate.Percent);
        Assert.Equal(1000m, basket.PriceToman);
    }

    [Fact]
    public void TetherUsesItsOwnLocalPriceAndTimestamp()
    {
        const string json = """{"usd_sell":{"value":"1000","timestamp":1790000000},"usdt":{"value":"12345","timestamp":1789999900,"dollar_rate":"0.999","dollar_rate_time":1790000000}}""";
        var basket = NavasanParser.Parse(json, "toman", Now, 120);
        var tether = Assert.Single(basket.CryptoRates!);
        Assert.Equal(12345m, tether.PriceToman);
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1789999900), tether.TomanUpdatedAt);
        Assert.Equal(0.999m, tether.PriceUsd);
        var rial = NavasanParser.Parse(json, "rial", Now, 120);
        Assert.Equal(1234.5m, Assert.Single(rial.CryptoRates!).PriceToman);
    }

    [Fact]
    public void InvalidTetherLocalPriceDoesNotDiscardDollarPrice()
    {
        const string json = """{"usd_sell":{"value":"1000","timestamp":1790000000},"usdt":{"value":"-1","timestamp":1790000000,"dollar_rate":"0.999","dollar_rate_time":1790000000}}""";
        var rate = Assert.Single(NavasanParser.Parse(json, "toman", Now, 120).CryptoRates!);
        Assert.Null(rate.PriceToman);
        Assert.Null(rate.TomanUpdatedAt);
        Assert.Equal(0.999m, rate.PriceUsd);
    }

    [Fact]
    public void OldProviderResponsesRemainCompatible()
    {
        var basket = NavasanParser.Parse("""{"usd_sell":{"value":"1000","timestamp":1790000000}}""", "toman", Now, 120);
        Assert.Empty(basket.CryptoRates!);
    }
}
