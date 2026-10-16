using AltAir.MarketApi;
using System.Net;
using Microsoft.Extensions.Options;

namespace AltAir.MarketApi.Tests;
public sealed class CommuteTests
{
    private const string Json = """{"routes":[{"overview_polyline":{"points":"_p~iF~ps|U_ulLnnqC_mqNvxq`@"},"legs":[{"duration":{"value":1800.5},"distance":{"value":12000},"summary":"Main road"}]}]}""";
    [Fact] public void ParsesNeshanMetricsAndGeometry() {
        var now = DateTimeOffset.UtcNow;
        var route = CommuteService.Parse(Json, now);
        Assert.Equal(1800.5, route.DurationSeconds); Assert.Null(route.BaselineSeconds);
        Assert.Equal(12000, route.DistanceMeters); Assert.Equal(now, route.FetchedAt); Assert.NotEmpty(route.EncodedPolyline);
    }
    [Fact] public void HandlesNoRoute() => Assert.Throws<NoCommuteRouteException>(() => CommuteService.Parse("{\"routes\":[]}", DateTimeOffset.UtcNow));
    [Theory]
    [InlineData("1800.5", "-5")]
    [InlineData("1800.5", "0")]
    [InlineData("12000", "-1")]
    public void RejectsInvalidProviderMetrics(string before, string after) => Assert.ThrowsAny<Exception>(() => CommuteService.Parse(Json.Replace(before, after), DateTimeOffset.UtcNow));
    [Theory]
    [InlineData(null)] [InlineData("a")] [InlineData("abc\n")]
    public void RejectsInvalidAddress(string? value) => Assert.False(CommuteService.ValidAddress(value));
    [Theory]
    [InlineData("35.7,51.4")]
    [InlineData("۳۵.۷،۵۱.۴")]
    public void ReadsCoordinatesWithoutGeocoding(string input) => Assert.Equal(new CommutePoint(35.7, 51.4), CommuteService.Coordinates(input));
    [Fact] public void RejectsInvalidCoordinates() => Assert.Throws<ArgumentException>(() => CommuteService.Coordinates("91,51"));
    [Fact] public void NeverSilentlySelectsAmbiguousGeocoding() {
        Assert.Throws<AmbiguousCommuteAddressException>(() => CommuteService.ParseAddress("{\"items\":[]}"));
        Assert.Throws<AmbiguousCommuteAddressException>(() => CommuteService.ParseAddress("{\"items\":[{},{}]}"));
        Assert.Equal(new CommutePoint(35.7, 51.4), CommuteService.ParseAddress("{\"items\":[{\"location\":{\"latitude\":35.7,\"longitude\":51.4}}]}"));
    }
    [Fact] public async Task DoesNotCallNeshanWithoutKey() {
        var handler = new Handler();
        var service = new CommuteService(new Factory(handler), Options.Create(new NeshanOptions()), TimeProvider.System);
        Assert.False(service.Configured);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetRouteAsync(new("Home address", "Work address"), default));
        Assert.Empty(handler.Urls);
    }
    [Fact] public async Task RequestsLiveAndNoTrafficAndKeepsKeyInHeader() {
        var handler = new Handler();
        var service = new CommuteService(new Factory(handler), Options.Create(new NeshanOptions { ServiceApiKey = "test-key" }), TimeProvider.System);
        var route = await service.GetRouteAsync(new("35.7,51.4", "35.8,51.5"), default);
        Assert.Equal(1800.5, route.DurationSeconds); Assert.Equal(1200, route.BaselineSeconds); Assert.Equal(2, handler.Urls.Count);
        Assert.StartsWith("https://api.neshan.org/v4/direction?", handler.Urls[0]);
        Assert.Contains("/no-traffic?", handler.Urls[1]); Assert.All(handler.Urls, url => Assert.DoesNotContain("test-key", url));
        Assert.All(handler.Keys, key => Assert.Equal("test-key", key));
    }
    [Fact] public async Task PreservesLiveResultWhenComparisonFails() {
        var handler = new Handler { BaselineFails = true };
        var service = new CommuteService(new Factory(handler), Options.Create(new NeshanOptions { ServiceApiKey = "test-key" }), TimeProvider.System);
        var route = await service.GetRouteAsync(new("35.7,51.4", "35.8,51.5"), default);
        Assert.Equal(1800.5, route.DurationSeconds); Assert.Null(route.BaselineSeconds); Assert.Single(route.Warnings);
    }
    private sealed class Factory(Handler handler) : IHttpClientFactory { public HttpClient CreateClient(string name) => new(handler, false); }
    private sealed class Handler : HttpMessageHandler {
        public List<string> Urls { get; } = [];
        public List<string> Keys { get; } = [];
        public bool BaselineFails { get; init; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) {
            var url = request.RequestUri!.ToString(); Urls.Add(url); Keys.Add(request.Headers.GetValues("Api-Key").Single());
            var baseline = url.Contains("/no-traffic?");
            return Task.FromResult(new HttpResponseMessage(baseline && BaselineFails ? HttpStatusCode.ServiceUnavailable : HttpStatusCode.OK) { Content = new StringContent(baseline ? Json.Replace("1800.5", "1200") : Json) });
        }
    }
}
