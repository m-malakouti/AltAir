using AltAir.MarketApi;
namespace AltAir.MarketApi.Tests;
public sealed class MetalTests {
    [Theory]
    [InlineData("18ayar", "GOLD_18")]
    [InlineData("abshodeh", "GOLD_MELTED")]
    [InlineData("sekkeh", "COIN_IMAMI")]
    [InlineData("bahar", "COIN_BAHAR")]
    [InlineData("nim", "COIN_HALF")]
    [InlineData("rob", "COIN_QUARTER")]
    [InlineData("gerami", "COIN_GRAM")]
    public void MapsProviderMetalKeysAndKeepsTomanChanges(string key, string code) {
        var now = DateTimeOffset.FromUnixTimeSeconds(1790000000);
        var json = $$$"""{"usd_sell":{"value":"100","timestamp":1790000000},"{{{key}}}":{"value":"15000000","change":-25000,"timestamp":1790000000}}""";
        var result = NavasanParser.Parse(json, "toman", now, 120).Rates!.Single(rate => rate.Code == code);
        var thousandToman = code.StartsWith("COIN_", StringComparison.Ordinal) || code == "GOLD_MELTED";
        Assert.Equal(thousandToman ? 15000000000m : 15000000m, result.PriceToman);
        Assert.Equal(thousandToman ? -25000000m : -25000m, result.ChangeToman);
        var rial = NavasanParser.Parse(json, "rial", now, 120).Rates!.Single(rate => rate.Code == code);
        Assert.Equal(thousandToman ? 15000000000m : 1500000m, rial.PriceToman);
        Assert.Equal(thousandToman ? -25000000m : -2500m, rial.ChangeToman);
    }
}