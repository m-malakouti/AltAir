using System.Globalization;
using System.Text.Json;
namespace AltAir.MarketApi;
public sealed record WeatherDay(string Date, double Minimum, double Maximum, int Code, WeatherHour[] Hourly, string Timezone, DateTimeOffset FetchedAt, bool Historical);
public static class WeatherDayParser
{
    public static WeatherDay Parse(string json, DateOnly date, DateTimeOffset fetched, bool historical)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var timezone = root.GetProperty("timezone").GetString() ?? throw new InvalidDataException();
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timezone);
        if (root.GetProperty("daily_units").GetProperty("temperature_2m_max").GetString() != "°C" || root.GetProperty("hourly_units").GetProperty("temperature_2m").GetString() != "°C") throw new InvalidDataException();
        var daily = root.GetProperty("daily");
        var min = daily.GetProperty("temperature_2m_min")[0].GetDouble();
        var max = daily.GetProperty("temperature_2m_max")[0].GetDouble();
        var code = daily.GetProperty("weather_code")[0].GetInt32();
        if (!double.IsFinite(min) || !double.IsFinite(max) || min < -100 || max > 70 || min > max || code is < 0 or > 99) throw new InvalidDataException();
        var hourly = root.GetProperty("hourly");
        var times = hourly.GetProperty("time");
        var temps = hourly.GetProperty("temperature_2m");
        var codes = hourly.GetProperty("weather_code");
        var count = times.GetArrayLength();
        if (count is < 1 or > 25 || temps.GetArrayLength() != count || codes.GetArrayLength() != count) throw new InvalidDataException();
        var hours = new List<WeatherHour>();
        DateTimeOffset? previous = null;
        for (var i=0;i<count;i++) {
            var time = DateTimeOffset.FromUnixTimeSeconds(times[i].GetInt64());
            var local = TimeZoneInfo.ConvertTime(time, zone);
            var temp = temps[i].GetDouble();
            var c = codes[i].GetInt32();
            if (DateOnly.FromDateTime(local.DateTime) != date || (previous is not null && time <= previous) || !double.IsFinite(temp) || temp is < -100 or > 70 || c is < 0 or > 99) throw new InvalidDataException();
            previous = time;
            hours.Add(new(time,temp,c,local.Hour is >=6 and <18,null));
        }
        return new(date.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture),min,max,code,hours.ToArray(),timezone,fetched,historical);
    }
}
