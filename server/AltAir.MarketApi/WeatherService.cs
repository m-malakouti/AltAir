using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace AltAir.MarketApi;

public sealed record WeatherCity(long Id, string Name, string Country, string Region, double Latitude, double Longitude);
public sealed record WeatherNow(double Temperature, int Code, bool IsDay, DateTimeOffset ObservedAt, DateTimeOffset FetchedAt)
{ public WeatherHour[] Hourly { get; init; } = []; public string Timezone { get; init; } = "UTC"; }
public sealed record WeatherHour(DateTimeOffset Time, double Temperature, int Code, bool IsDay, int? PrecipitationProbability);

public sealed class WeatherService(IHttpClientFactory clients, IMemoryCache cache, TimeProvider clock) : IDisposable
{
    private readonly SemaphoreSlim gate = new(1, 1);
    public async Task<WeatherCity[]> SearchAsync(string name, CancellationToken token)
    {
        var key = "weather-city:" + name;
        if (cache.TryGetValue<WeatherCity[]>(key, out var saved) && saved is not null) return saved;
        using var response = await GetAsync(
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
    // A brief upstream overload must not immediately blank the weather card.
    // Retry only once and stay inside the frontend's 12-second request deadline.
    private async Task<HttpResponseMessage> GetAsync(string url, CancellationToken token)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(TimeSpan.FromSeconds(10));
        var client = clients.CreateClient("weather");
        var response = await client.GetAsync(url, deadline.Token);
        if (response.StatusCode is not (System.Net.HttpStatusCode.ServiceUnavailable
            or System.Net.HttpStatusCode.BadGateway or System.Net.HttpStatusCode.GatewayTimeout
            or System.Net.HttpStatusCode.TooManyRequests)) return response;
        var retryAfter = response.Headers.RetryAfter;
        var delay = retryAfter?.Delta ?? (retryAfter?.Date - clock.GetUtcNow()) ?? TimeSpan.FromMilliseconds(500);
        if (delay > TimeSpan.FromSeconds(2)) return response;
        response.Dispose();
        if (delay > TimeSpan.Zero) await Task.Delay(delay, deadline.Token);
        return await client.GetAsync(url, deadline.Token);
    }
    public static bool ValidCoordinates(double latitude, double longitude) =>
        double.IsFinite(latitude) && double.IsFinite(longitude) && latitude is >= -90 and <= 90 && longitude is >= -180 and <= 180;
    public async Task<WeatherDay> DayAsync(double latitude, double longitude, DateOnly date, CancellationToken token)
    {
        if (!ValidCoordinates(latitude, longitude)) throw new InvalidDataException();
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(),TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran")).DateTime);
        if (date < new DateOnly(1940,1,1) || date > today.AddDays(15)) throw new ArgumentOutOfRangeException(nameof(date));
        var key = FormattableString.Invariant($"weather-day:{latitude:F4}:{longitude:F4}:{date:yyyy-MM-dd}");
        await gate.WaitAsync(token);
        try {
            if (cache.TryGetValue<WeatherDay>(key, out var saved) && saved is not null) return saved;
            var archive = date < today.AddDays(-5);
            var host = archive ? "https://archive-api.open-meteo.com/v1/archive" : "https://api.open-meteo.com/v1/forecast";
            var url = FormattableString.Invariant($"{host}?latitude={latitude:F4}&longitude={longitude:F4}&start_date={date:yyyy-MM-dd}&end_date={date:yyyy-MM-dd}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&temperature_unit=celsius&timeformat=unixtime&timezone=auto");
            using var response = await GetAsync(url,token);
            response.EnsureSuccessStatusCode();
            var result = WeatherDayParser.Parse(await response.Content.ReadAsStringAsync(token),date,clock.GetUtcNow(), date < today);
            cache.Set(key,result,TimeSpan.FromMinutes(15));
            return result;
        } finally { gate.Release(); }
    }

    public async Task<WeatherNow> CurrentAsync(double latitude, double longitude, CancellationToken token)
    {
        if (!ValidCoordinates(latitude, longitude)) throw new InvalidDataException();
        var key = FormattableString.Invariant($"weather:{latitude:F4}:{longitude:F4}");
        await gate.WaitAsync(token);
        try {
            if (cache.TryGetValue<WeatherNow>(key, out var saved) && saved is not null) return saved;
            var url = FormattableString.Invariant($"https://api.open-meteo.com/v1/forecast?latitude={latitude:F4}&longitude={longitude:F4}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day,precipitation_probability&forecast_hours=25&temperature_unit=celsius&timeformat=unixtime&timezone=auto");
            using var response = await GetAsync(url, token);
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
        var hours = new List<WeatherHour>();
        if (root.TryGetProperty("hourly", out var hourly))
        {
            if (root.GetProperty("hourly_units").GetProperty("temperature_2m").GetString() != "°C") throw new InvalidDataException();
            var times = hourly.GetProperty("time");
            var temperatures = hourly.GetProperty("temperature_2m");
            var codes = hourly.GetProperty("weather_code");
            var days = hourly.GetProperty("is_day");
            var rain = hourly.GetProperty("precipitation_probability");
            var count = times.GetArrayLength();
            if (count > 48 || new[] { temperatures, codes, days, rain }.Any(a => a.GetArrayLength() != count)) throw new InvalidDataException();
            DateTimeOffset? previous = null;
            for (var i = 0; i < count; i++)
            {
                var time = DateTimeOffset.FromUnixTimeSeconds(times[i].GetInt64());
                if (previous is not null && time <= previous) throw new InvalidDataException();
                previous = time;
                var t = temperatures[i].GetDouble();
                var c = codes[i].GetInt32();
                var d = days[i].GetInt32();
                int? p = rain[i].ValueKind == JsonValueKind.Null ? null : rain[i].GetInt32();
                if (!double.IsFinite(t) || t is < -100 or > 70 || c is < 0 or > 99 || d is < 0 or > 1 || p is < 0 or > 100) throw new InvalidDataException();
                if (time > now && time <= now.AddHours(24)) hours.Add(new(time, t, c, d == 1, p));
            }
        }
        return new WeatherNow(temp, code, day == 1, observed, now) {
            Hourly = hours.ToArray(),
            Timezone = root.TryGetProperty("timezone", out var timezone) ? timezone.GetString() ?? "UTC" : "UTC"
        };
    }
    public void Dispose() => gate.Dispose();
}
