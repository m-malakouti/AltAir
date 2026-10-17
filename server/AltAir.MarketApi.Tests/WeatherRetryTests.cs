using AltAir.MarketApi;
using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;
namespace AltAir.MarketApi.Tests;
public sealed class WeatherRetryTests
{
    private const string Json = """{"current_units":{"temperature_2m":"°C"},"current":{"temperature_2m":22.5,"weather_code":0,"is_day":1,"time":1790000000}}""";
    [Fact] public async Task RecoversFromTemporaryOverload() {
        var handler = new Handler(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        using var service = new WeatherService(new Factory(handler), cache, new Clock());
        Assert.Equal(22.5, (await service.CurrentAsync(35,51,default)).Temperature);
        Assert.Equal(2,handler.Calls);
    }
    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable, 2)]
    [InlineData(HttpStatusCode.BadRequest, 1)]
    public async Task RetriesAreBoundedAndDoNotRetryInvalidRequests(HttpStatusCode status,int expected) {
        var handler = new Handler(status,status);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        using var service = new WeatherService(new Factory(handler), cache, new Clock());
        await Assert.ThrowsAsync<HttpRequestException>(()=>service.CurrentAsync(35,51,default));
        Assert.Equal(expected,handler.Calls);
    }
    [Fact] public async Task DoesNotIgnoreLongProviderRetryAfter() {
        var handler = new Handler(HttpStatusCode.TooManyRequests,HttpStatusCode.OK) { LongDelay=true };
        using var cache = new MemoryCache(new MemoryCacheOptions());
        using var service = new WeatherService(new Factory(handler), cache, new Clock());
        await Assert.ThrowsAsync<HttpRequestException>(()=>service.CurrentAsync(35,51,default));
        Assert.Equal(1,handler.Calls);
    }
    private sealed class Clock : TimeProvider { public override DateTimeOffset GetUtcNow() => DateTimeOffset.FromUnixTimeSeconds(1790000000); }
    private sealed class Factory(Handler handler) : IHttpClientFactory { public HttpClient CreateClient(string name) => new(handler,false); }
    private sealed class Handler(HttpStatusCode first,HttpStatusCode second) : HttpMessageHandler {
        public int Calls {get; private set;}
        public bool LongDelay {get;init;}
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken token) {
            var response = new HttpResponseMessage(++Calls==1 ? first : second) {Content=new StringContent(Json)};
            response.Headers.RetryAfter=new RetryConditionHeaderValue(TimeSpan.FromSeconds(LongDelay ? 60 : 0));
            return Task.FromResult(response);
        }
    }
}
