using AltAir.MarketApi;
using System.Net;
using Microsoft.Extensions.Caching.Memory;
namespace AltAir.MarketApi.Tests;
public sealed class WeatherTests
{
    private const string Json = """{"current_units":{"temperature_2m":"°C"},"current":{"temperature_2m":22.5,"weather_code":0,"is_day":1,"time":1790000000}}""";
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1790000000);
    [Fact] public void ParsesCelsiusAndUtcTime() {
        var result = WeatherService.Parse(Json, Now);
        Assert.Equal(22.5, result.Temperature); Assert.Equal(Now, result.ObservedAt); Assert.True(result.IsDay);
    }
    [Theory]
    [InlineData("°C", "°F")]
    [InlineData("22.5", "null")]
    [InlineData("22.5", "90")]
    [InlineData("\"is_day\":1", "\"is_day\":7")]
    public void RejectsMalformedWeather(string before, string after) =>
        Assert.ThrowsAny<Exception>(() => WeatherService.Parse(Json.Replace(before, after), Now));
    [Fact] public void RejectsFutureTime() =>
        Assert.Throws<InvalidDataException>(() => WeatherService.Parse(Json, Now.AddHours(-1)));
    [Theory]
    [InlineData(91, 0)]
    [InlineData(0, 181)]
    [InlineData(double.NaN, 0)]
    public void RejectsInvalidCoordinates(double lat, double lon) =>
        Assert.False(WeatherService.ValidCoordinates(lat, lon));
    [Fact] public async Task ConcurrentViewsShareWeatherCache() {
        var handler = new Handler();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        using var service = new WeatherService(new Factory(handler), cache, new Clock());
        var results = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => service.CurrentAsync(35.69,51.42,default)));
        Assert.Equal(1, handler.Calls); Assert.All(results, result => Assert.Equal(22.5, result.Temperature));
    }
    private sealed class Clock : TimeProvider { public override DateTimeOffset GetUtcNow() => Now; }
    private sealed class Factory(Handler handler) : IHttpClientFactory { public HttpClient CreateClient(string name) => new(handler, false); }
    private sealed class Handler : HttpMessageHandler {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) {
            Calls++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Json) });
        }
    }
}
