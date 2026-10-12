using System.Globalization;
using System.Text.Json;

namespace AltAir.MarketApi;

public static class NavasanParser
{
    public static DollarQuote Parse(string json, string unit, DateTimeOffset now, int staleAfterMinutes)
    {
        if (unit is not ("rial" or "toman")) throw new InvalidDataException("Unverified price unit.");
        using var document = JsonDocument.Parse(json, new JsonDocumentOptions { MaxDepth = 16 });
        var usd = ParseRate(document.RootElement.GetProperty("usd_sell"), "USD", unit, now);
        var rates = new List<CurrencyRate> { usd };
        var codes = new Dictionary<string, string> {
            ["eur"] = "EUR", ["gbp"] = "GBP", ["aed_sell"] = "AED", ["try"] = "TRY",
            ["cad"] = "CAD", ["aud"] = "AUD", ["chf"] = "CHF", ["cny"] = "CNY"
        };
        foreach (var (key, code) in codes)
        {
            if (!document.RootElement.TryGetProperty(key, out var item)) continue;
            try { rates.Add(ParseRate(item, code, unit, now)); }
            catch (Exception error) when (error is InvalidDataException or InvalidOperationException
                or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException)
            { /* One unavailable currency must not discard valid rates. */ }
        }
        return new DollarQuote("USD_FREE_SELL", usd.PriceToman, usd.UpdatedAt, now,
            checked(staleAfterMinutes * 60), false, "نوسان", "https://www.navasan.net/", rates);
    }

    private static CurrencyRate ParseRate(JsonElement item, string code, string unit, DateTimeOffset now)
    {
        var value = item.GetProperty("value");
        var rawPrice = value.ValueKind == JsonValueKind.String
            ? decimal.Parse(value.GetString()!, CultureInfo.InvariantCulture) : value.GetDecimal();
        var price = unit == "rial" ? rawPrice / 10m : rawPrice;
        var updated = DateTimeOffset.FromUnixTimeSeconds(item.GetProperty("timestamp").GetInt64());
        if (price <= 0 || price > 1_000_000_000_000m || updated < DateTimeOffset.UnixEpoch || updated > now.AddMinutes(5))
            throw new InvalidDataException("Invalid market data.");
        decimal? change = null;
        if (item.TryGetProperty("change", out var changeElement) &&
            changeElement.ValueKind is JsonValueKind.String or JsonValueKind.Number &&
            decimal.TryParse(changeElement.ValueKind == JsonValueKind.String
                ? changeElement.GetString() : changeElement.GetRawText(),
                NumberStyles.Float, CultureInfo.InvariantCulture, out var rawChange))
        {
            var converted = unit == "rial" ? rawChange / 10m : rawChange;
            if (converted >= -1_000_000_000_000m && converted <= 1_000_000_000_000m && price - converted > 0)
                change = converted;
        }
        return new CurrencyRate(code, price, updated, change);
    }
}
