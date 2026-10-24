using System.Text.Json;
using AltAir.MarketApi;

namespace AltAir.MarketApi.Tests;

public sealed class ExchangeTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1790000000);
    private static IReadOnlyList<ExchangeAsset> Parse(string json, string unit = "toman")
    {
        using var doc = JsonDocument.Parse(json);
        return ExchangeParser.Parse(doc.RootElement, unit, Now);
    }

    [Fact]
    public void CryptoDollarAndLocalPricesRetainIndependentTimesAndPeriods()
    {
        var asset = Assert.Single(Parse("""{"btc":{"value":"2000","timestamp":1789999000,"change":"-100","dollar_rate":110,"dollar_rate_time":1790000000,"dollar_rate_24h_change":10,"dollar_rate_24h_vol":4000}}"""));
        Assert.Equal("USD", asset.Unit);
        Assert.Equal(110m, asset.Price);
        Assert.Equal(10m, asset.Change);
        Assert.Equal(10m, asset.Percent);
        Assert.Equal("24h", asset.ChangePeriod);
        Assert.Equal(Now, asset.UpdatedAt);
        Assert.Equal(2000m, asset.PriceToman);
        Assert.Equal(-100m, asset.ChangeToman);
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1789999000), asset.TomanUpdatedAt);
        Assert.Equal(4000m, asset.VolumeUsd);
    }

    [Fact]
    public void UsdPrefixOnCryptoAliasDoesNotMeanDollarUnit()
    {
        var asset = Assert.Single(Parse("""{"usd_btc":{"value":"9000000000","timestamp":1790000000}}"""));
        Assert.Equal("toman", asset.Unit);
        Assert.Equal(9000000000m, asset.Price);
        Assert.True(asset.Variant);
    }

    [Theory]
    [InlineData("toman", 1000)]
    [InlineData("rial", 100)]
    public void AppliesContractUnitsAndKeepsUnknownBubbleUnitsExplicit(string unit, int fiat)
    {
        var assets = Parse("""{"eur":{"value":"1000","timestamp":1790000000},"sekkeh":{"value":"1000","timestamp":1790000000,"change":10},"bub_sekkeh":{"value":"-12","timestamp":1790000000},"xag":{"value":"70","timestamp":1790000000}}""", unit);
        Assert.Equal(fiat, assets.Single(a => a.Id == "eur").Price);
        Assert.Equal(1000000m, assets.Single(a => a.Id == "sekkeh").Price);
        Assert.Equal(10000m, assets.Single(a => a.Id == "sekkeh").Change);
        var bubble = assets.Single(a => a.Id == "bub_sekkeh");
        Assert.Equal(-12m, bubble.Price);
        Assert.Equal("source", bubble.Unit);
        Assert.False(bubble.UnitVerified);
        Assert.False(assets.Single(a => a.Id == "xag").UnitVerified);
    }

    [Fact]
    public void InvalidOptionalFieldsDoNotEraseUsableIndependentPrices()
    {
        var assets = Parse("""{"btc":{"value":"bad","timestamp":1790000000,"dollar_rate":1,"dollar_rate_time":1790000000},"eth":{"value":1000,"timestamp":1790000000,"dollar_rate":0,"dollar_rate_time":1790000000},"eur":{"value":0,"timestamp":1790000000},"gbp":{"value":100,"timestamp":1790000400},"future_new_asset":{"value":100,"timestamp":1790000000}}""");
        Assert.Equal(2, assets.Count);
        Assert.Equal("USD", assets[0].Unit);
        Assert.Null(assets[0].PriceToman);
        Assert.Equal("toman", assets[1].Unit);
        Assert.Null(assets[1].Percent);
    }

    [Fact]
    public void DuplicateEntriesAreNotShownTwiceAndBadChangesStayNeutral()
    {
        var asset = Assert.Single(Parse("""{"eur":{"value":100,"timestamp":1790000000,"change":"bad"},"eur":{"value":200,"timestamp":1790000000}}"""));
        Assert.Equal(100m, asset.Price);
        Assert.Null(asset.Percent);
        Assert.Null(asset.Change);
    }
}
