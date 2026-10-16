using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AltAir.MarketApi;

public sealed class NeshanOptions
{
    public string ServiceApiKey { get; set; } = "";
    public string GeocodingApiKey { get; set; } = "";
    public bool CompareWithoutTraffic { get; set; } = true;
}
public sealed record CommuteRequest(string? Origin, string? Destination);
public sealed record CommuteRoute(double DurationSeconds, double? BaselineSeconds, double DistanceMeters, DateTimeOffset FetchedAt, string Description, string[] Warnings, string EncodedPolyline);
public sealed class NoCommuteRouteException : Exception;
public sealed class AmbiguousCommuteAddressException : Exception;
public sealed record CommutePoint(double Latitude, double Longitude)
{
    public override string ToString() => FormattableString.Invariant($"{Latitude},{Longitude}");
}
public sealed class CommuteService(IHttpClientFactory clients, IOptions<NeshanOptions> options, TimeProvider clock)
{
    public bool Configured => !string.IsNullOrWhiteSpace(options.Value.ServiceApiKey);
    public static bool ValidAddress(string? address) => address is not null && address.Trim().Length is >= 3 and <= 240 && !address.Any(char.IsControl);
    public static CommutePoint? Coordinates(string address)
    {
        address = string.Concat(address.Select(c => c is >= '۰' and <= '۹' ? (char)('0' + c - '۰') : c is >= '٠' and <= '٩' ? (char)('0' + c - '٠') : c == '،' ? ',' : c));
        var parts = address.Split(',');
        if (parts.Length != 2 || !double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat) || !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon)) return null;
        if (!WeatherService.ValidCoordinates(lat, lon)) throw new ArgumentException("Invalid coordinates.");
        return new(lat, lon);
    }
    private async Task<string> ProviderAsync(string path, string key, CancellationToken token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.neshan.org/" + path);
        request.Headers.Add("Api-Key", key);
        using var response = await clients.CreateClient("commute").SendAsync(request, token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(token);
    }
    private async Task<CommutePoint> ResolveAsync(string address, CancellationToken token)
    {
        if (Coordinates(address) is { } point) return point;
        var key = string.IsNullOrWhiteSpace(options.Value.GeocodingApiKey) ? options.Value.ServiceApiKey : options.Value.GeocodingApiKey;
        var json = await ProviderAsync("geocoding/v1?json=" + Uri.EscapeDataString(JsonSerializer.Serialize(new { address })), key, token);
        return ParseAddress(json);
    }
    public static CommutePoint ParseAddress(string json)
    {
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("items", out var items) || items.GetArrayLength() != 1) throw new AmbiguousCommuteAddressException();
        var location = items[0].GetProperty("location");
        var lat = location.GetProperty("latitude").GetDouble();
        var lon = location.GetProperty("longitude").GetDouble();
        if (!WeatherService.ValidCoordinates(lat, lon)) throw new InvalidDataException("Invalid geocoding coordinates.");
        return new(lat, lon);
    }
    public async Task<CommuteRoute> GetRouteAsync(CommuteRequest input, CancellationToken token)
    {
        if (!Configured) throw new InvalidOperationException("Routes service not configured.");
        if (!ValidAddress(input.Origin) || !ValidAddress(input.Destination) || input.Origin!.Trim() == input.Destination!.Trim()) throw new ArgumentException("Invalid route addresses.");
        var origin = await ResolveAsync(input.Origin.Trim(), token);
        var destination = await ResolveAsync(input.Destination.Trim(), token);
        if (origin == destination) throw new NoCommuteRouteException();
        var query = "?type=car&origin=" + Uri.EscapeDataString(origin.ToString()) + "&destination=" + Uri.EscapeDataString(destination.ToString()) + "&alternative=false";
        var live = Parse(await ProviderAsync("v4/direction" + query, options.Value.ServiceApiKey, token), clock.GetUtcNow());
        if (!options.Value.CompareWithoutTraffic) return live;
        try
        {
            var baseline = Parse(await ProviderAsync("v4/direction/no-traffic" + query, options.Value.ServiceApiKey, token), live.FetchedAt);
            return live with { BaselineSeconds = baseline.DurationSeconds };
        }
        catch (Exception error) when (error is HttpRequestException or NoCommuteRouteException or JsonException or InvalidOperationException or InvalidDataException or KeyNotFoundException or FormatException || (error is TaskCanceledException && !token.IsCancellationRequested))
        {
            return live with { Warnings = ["زمان مسیر بدون ترافیک در دسترس نیست؛ مقایسهٔ تأخیر انجام نشد."] };
        }
    }
    public static CommuteRoute Parse(string json, DateTimeOffset fetchedAt)
    {
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0) throw new NoCommuteRouteException();
        var route = routes[0];
        var legs = route.GetProperty("legs");
        if (legs.GetArrayLength() != 1) throw new InvalidDataException("Unexpected route legs.");
        var leg = legs[0];
        var duration = leg.GetProperty("duration").GetProperty("value").GetDouble();
        var distance = leg.GetProperty("distance").GetProperty("value").GetDouble();
        if (!double.IsFinite(duration) || duration is <= 0 or > 10_000_000 || !double.IsFinite(distance) || distance is <= 0 or > 10_000_000) throw new InvalidDataException("Invalid route metrics.");
        var description = leg.TryGetProperty("summary", out var summary) ? summary.GetString() ?? "" : "";
        var polyline = route.GetProperty("overview_polyline").GetProperty("points").GetString() ?? "";
        if (description.Length > 500 || polyline.Length is < 4 or > 100_000 || polyline.Any(c => c is < '?' or > '~')) throw new InvalidDataException("Invalid route geometry.");
        return new(duration, null, distance, fetchedAt, description, [], polyline);
    }
}
