using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace AltAir.MarketApi;

public sealed record WeatherCity(long Id, string Name, string Country, string Region, double Latitude, double Longitude);
public sealed record WeatherNow(double Temperature, int Code, bool IsDay, DateTimeOffset ObservedAt, DateTimeOffset FetchedAt);

public sealed class WeatherService(IHttpClientFactory clients, IMemoryCache cache, TimeProvider clock) : IDisposable
{
    private readonly SemaphoreSlim gate = new(1, 1);
    public async Task<WeatherCity[]> SearchAsync(string name, CancellationToken token)
    {
        var key = "weather-city:" + name;
        if (cache.TryGetValue<WeatherCity[]>(key, out var saved) && saved is not null) return saved;
        using var response = await clients.CreateClient("weather").GetAsync(
            "https://geocoding-api.open-meteo.com/v1/search?count=6&language=fa&format=json&name=" + Uri.EscapeDataString(name), token);
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(token));
        var result = new List<WeatherCity>();
        if (doc.RootElement.TryGetProperty("results", out var values))
            foreach (var item in values.EnumerateArray())
            {
                var lat = item.GetProperty("latitude").GetDouble();
                var lon = item.GetProperty("longitude").GetDouble();
                if (!ValidCoordinates(lat, lon)) continue;
                result.Add(new WeatherCity(item.GetProperty("id").GetInt64(), item.GetProperty("name").GetString() ?? "",
                    item.TryGetProperty("country", out var country) ? country.GetString() ?? "" : "",
                    item.TryGetProperty("admin1", out var region) ? region.GetString() ?? "" : "", lat, lon));
            }
        var cities = result.ToArray();
        cache.Set(key, cities, TimeSpan.FromMinutes(30));
        return cities;
    }
    public static bool ValidCoordinates(double latitude, double longitude) =>
        double.IsFinite(latitude) && double.IsFinite(longitude) && latitude is >= -90 and <= 90 && longitude is >= -180 and <= 180;

    public async Task<WeatherNow> CurrentAsync(double latitude, double longitude, CancellationToken token)
    {
        if (!ValidCoordinates(latitude, longitude)) throw new InvalidDataException();
        var key = FormattableString.Invariant($"weather:{latitude:F4}:{longitude:F4}");
        await gate.WaitAsync(token);
        try {
            if (cache.TryGetValue<WeatherNow>(key, out var saved) && saved is not null) return saved;
            var url = FormattableString.Invariant($"https://api.open-meteo.com/v1/forecast?latitude={latitude:F4}&longitude={longitude:F4}&current=temperature_2m,weather_code,is_day&temperature_unit=celsius&timeformat=unixtime&timezone=GMT");
            using var response = await clients.CreateClient("weather").GetAsync(url, token);
            response.EnsureSuccessStatusCode();
            var weather = Parse(await response.Content.ReadAsStringAsync(token), clock.GetUtcNow());
            cache.Set(key, weather, TimeSpan.FromMinutes(15));
            return weather;
        } finally { gate.Release(); }
    }
    public static WeatherNow Parse(string json, DateTimeOffset now)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.GetProperty("current_units").GetProperty("temperature_2m").GetString() != "°C") throw new InvalidDataException();
        var current = root.GetProperty("current");
        var temp = current.GetProperty("temperature_2m").GetDouble();
        var code = current.GetProperty("weather_code").GetInt32();
        var day = current.GetProperty("is_day").GetInt32();
        var observed = DateTimeOffset.FromUnixTimeSeconds(current.GetProperty("time").GetInt64());
        if (!double.IsFinite(temp) || temp is < -100 or > 70 || code is < 0 or > 99 ||
            day is < 0 or > 1 || observed < DateTimeOffset.UnixEpoch || observed > now.AddMinutes(10))
            throw new InvalidDataException();
        return new WeatherNow(temp, code, day == 1, observed, now);
    }
    public void Dispose() => gate.Dispose();
}
