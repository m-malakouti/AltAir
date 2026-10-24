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
            ["cad"] = "CAD", ["aud"] = "AUD", ["chf"] = "CHF", ["cny"] = "CNY",
            ["18ayar"] = "GOLD_18", ["abshodeh"] = "GOLD_MELTED",
            ["sekkeh"] = "COIN_IMAMI", ["bahar"] = "COIN_BAHAR",
            ["nim"] = "COIN_HALF", ["rob"] = "COIN_QUARTER", ["gerami"] = "COIN_GRAM"
        };
        foreach (var (key, code) in codes)
        {
            if (!document.RootElement.TryGetProperty(key, out var item)) continue;
            try { rates.Add(ParseRate(item, code, unit, now)); }
            catch (Exception error) when (error is InvalidDataException or InvalidOperationException
                or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException)
            { /* One unavailable currency must not discard valid rates. */ }
        }
        var cryptoRates = new List<CryptoRate>();
        foreach (var code in new[] { "BTC", "ETH", "SOL", "USDT", "XRP", "DOGE", "ADA", "AVAX" })
        {
            if (!document.RootElement.TryGetProperty(code.ToLowerInvariant(), out var item)) continue;
            try { cryptoRates.Add(ParseCrypto(item, code, unit, now)); }
            catch (Exception error) when (error is InvalidDataException or InvalidOperationException
                or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException)
            { /* An unavailable crypto must not discard valid market rates. */ }
        }
        return new DollarQuote("USD_FREE_SELL", usd.PriceToman, usd.UpdatedAt, now,
            checked(staleAfterMinutes * 60), false, "نوسان", "https://www.navasan.net/", rates, cryptoRates,
            ExchangeParser.Parse(document.RootElement, unit, now));
    }

    private static CryptoRate ParseCrypto(JsonElement item, string code, string unit, DateTimeOffset now)
    {
        var price = ReadDecimal(item.GetProperty("dollar_rate"));
        var updated = DateTimeOffset.FromUnixTimeSeconds(item.GetProperty("dollar_rate_time").GetInt64());
        if (price <= 0 || price > 1_000_000_000_000m || updated < DateTimeOffset.UnixEpoch || updated > now.AddMinutes(5))
            throw new InvalidDataException("Invalid crypto rate.");
        decimal? percent = null;
        decimal? change = null;
        if (item.TryGetProperty("dollar_rate_24h_change", out var value) &&
            value.ValueKind is JsonValueKind.String or JsonValueKind.Number &&
            decimal.TryParse(value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText(),
                NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed) && parsed > -100 && parsed <= 1_000_000)
        {
            percent = parsed;
            // The provider supplies a percentage, not a dollar amount.
            change = price - price / (1 + parsed / 100);
        }
        CurrencyRate? toman = null;
        if (code == "USDT")
        {
            try { toman = ParseRate(item, code, unit, now); }
            catch (Exception error) when (error is InvalidDataException or InvalidOperationException
                or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException)
            { /* Missing local prices must not discard a valid USD quote. */ }
        }
        return new CryptoRate(code, price, updated, change, percent, toman?.PriceToman, toman?.UpdatedAt);
    }

    private static decimal ReadDecimal(JsonElement value) => value.ValueKind == JsonValueKind.String
        ? decimal.Parse(value.GetString()!, CultureInfo.InvariantCulture) : value.GetDecimal();

    private static CurrencyRate ParseRate(JsonElement item, string code, string unit, DateTimeOffset now)
    {
        var value = item.GetProperty("value");
        var rawPrice = value.ValueKind == JsonValueKind.String
            ? decimal.Parse(value.GetString()!, CultureInfo.InvariantCulture) : value.GetDecimal();
        // Coin and melted-gold fields use thousand toman, verified with the subscription owner.
        var multiplier = code.StartsWith("COIN_", StringComparison.Ordinal) || code == "GOLD_MELTED"
            ? 1000m : unit == "rial" ? 0.1m : 1m;
        var price = rawPrice * multiplier;
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
            var converted = rawChange * multiplier;
            if (converted >= -1_000_000_000_000m && converted <= 1_000_000_000_000m && price - converted > 0)
                change = converted;
        }
        return new CurrencyRate(code, price, updated, change);
    }
}
