using AltAir.MarketApi;
namespace AltAir.MarketApi.Tests;
public sealed class HourlyWeatherTests
{
    private const string Json = """{"timezone":"Asia/Tehran","current_units":{"temperature_2m":"°C"},"current":{"temperature_2m":22.5,"weather_code":0,"is_day":1,"time":1790000000},"hourly_units":{"temperature_2m":"°C"},"hourly":{"time":[1790000000,1790003600,1790007200],"temperature_2m":[22,21,20],"weather_code":[0,61,3],"is_day":[1,1,0],"precipitation_probability":[0,70,null]}}""";
    [Fact] public void FiltersPastHoursAndPreservesRainAndTimezone() {
        var result = WeatherService.Parse(Json, DateTimeOffset.FromUnixTimeSeconds(1790000000));
        Assert.Equal(2, result.Hourly.Length);
        Assert.Equal(70, result.Hourly[0].PrecipitationProbability);
        Assert.Null(result.Hourly[1].PrecipitationProbability);
        Assert.Equal("Asia/Tehran", result.Timezone);
    }
    [Theory]
    [InlineData("[0,70,null]", "[0,101,null]")]
    [InlineData("[22,21,20]", "[22,21]")]
    [InlineData("1790007200", "1790003600")]
    public void RejectsMalformedForecast(string before, string after) => Assert.ThrowsAny<Exception>(() => WeatherService.Parse(Json.Replace(before,after),DateTimeOffset.FromUnixTimeSeconds(1790000000)));
}
