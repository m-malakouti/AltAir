using System.Globalization;
using System.Text.Json;
namespace AltAir.MarketApi;

public sealed record ExchangeAsset(string Id, string Symbol, string Name, string Category, string Basis,
    decimal Price, string Unit, DateTimeOffset UpdatedAt, decimal? Change, decimal? Percent,
    string ChangePeriod, bool Variant = false, bool UnitVerified = true,
    decimal? PriceToman = null, DateTimeOffset? TomanUpdatedAt = null,
    decimal? ChangeToman = null, decimal? PercentToman = null, decimal? VolumeUsd = null);

public static class ExchangeParser
{
    private sealed record Description(string Name, string Category, string Basis, bool Verified = true, decimal? Scale = null, bool Variant = false, string? Unit = null);
    private static readonly Dictionary<string, Description> Specials = new() {
        ["usd_sell"] = new("دلار تهران · فروش", "fiat", "هر دلار · بازار تهران"),
        ["usd_buy"] = new("دلار تهران · خرید", "fiat", "هر دلار · بازار تهران", Variant: true),
        ["usd_farda_sell"] = new("دلار فردایی · فروش", "remittance", "هر دلار · فردایی"),
        ["usd_farda_buy"] = new("دلار فردایی · خرید", "remittance", "هر دلار · فردایی", Variant: true),
        ["harat_naghdi_buy"] = new("دلار هرات · خرید", "remittance", "هر دلار · نقدی هرات", Variant: true),
        ["harat_naghdi_sell"] = new("دلار هرات · فروش", "remittance", "هر دلار · نقدی هرات"),
        ["dolar_harat_sell"] = new("دلار هرات · فروش نقد", "remittance", "هر دلار · هرات", Variant: true),
        ["aed_sell"] = new("درهم دوبی · فروش", "fiat", "هر درهم · فروش دوبی"),
        ["dirham_dubai"] = new("درهم دوبی · نام جایگزین", "fiat", "هر درهم", Variant: true),
        ["sekkeh"] = new("سکه امامی", "metals", "هر قطعه سکه امامی", Scale: 1000),
        ["bahar"] = new("سکه بهار آزادی", "metals", "هر قطعه بهار آزادی", Scale: 1000),
        ["nim"] = new("نیم‌سکه", "metals", "هر قطعه نیم‌سکه", Scale: 1000),
        ["rob"] = new("ربع‌سکه", "metals", "هر قطعه ربع‌سکه", Scale: 1000),
        ["gerami"] = new("سکه گرمی", "metals", "هر قطعه سکه گرمی", Scale: 1000),
        ["18ayar"] = new("طلای ۱۸ عیار", "metals", "هر گرم طلای ۱۸ عیار"),
        ["abshodeh"] = new("طلای آب‌شده", "metals", "هر مثقال طلای آب‌شده", Scale: 1000),
        ["usd_xau"] = new("اونس جهانی طلا", "metals", "هر اونس تروا", Scale: 1, Unit: "USD"),
        ["xau"] = new("طلا · XAU", "metals", "مبنای منبع؛ نیازمند تأیید", false),
        ["xag"] = new("نقره · XAG", "metals", "مبنای منبع؛ نیازمند تأیید", false),
        ["usd_pp"] = new("دلار پی‌پال", "remittance", "هر دلار · پی‌پال"),
        ["eur_pp"] = new("یورو پی‌پال", "remittance", "هر یورو · پی‌پال"),
        ["usd_shakhs"] = new("حواله دلار شخص", "remittance", "هر دلار · حواله شخص"),
        ["usd_sherkat"] = new("حواله دلار شرکت", "remittance", "هر دلار · حواله شرکت"),
        ["cad_cash"] = new("دلار کانادا · نقدی", "remittance", "هر دلار کانادا"),
        ["aed_note"] = new("اسکناس درهم", "remittance", "هر درهم · اسکناس"),
        ["hav_cad_my"] = new("حواله کانادا · MY", "remittance", "قرارداد منبع؛ نیازمند تأیید", false),
        ["hav_cad_cheque"] = new("حواله کانادا · چک", "remittance", "قرارداد منبع؛ نیازمند تأیید", false),
        ["hav_cad_cash"] = new("حواله کانادا · نقد", "remittance", "قرارداد منبع؛ نیازمند تأیید", false),
        ["gbp_wht"] = new("پوند · WHT", "remittance", "قرارداد منبع؛ نیازمند تأیید", false),
        ["aud_wht"] = new("دلار استرالیا · WHT", "remittance", "قرارداد منبع؛ نیازمند تأیید", false),
    };
    private static Description? Describe(string id)
    {
        if (Specials.TryGetValue(id, out var special)) return special;
        if (ExchangeNames.Crypto.TryGetValue(id, out var coin)) return new(coin, "crypto", "هر واحد " + coin);
        if (id.StartsWith("usd_") && ExchangeNames.Crypto.TryGetValue(id[4..], out var alias))
            return new(alias + " · نام جایگزین", "crypto", "نرخ محلی منبع؛ پیشوند USD واحد قیمت نیست", Variant: true);
        if (id.StartsWith("bub_") && Specials.TryGetValue(id[4..], out var bubble))
            return new("حباب " + bubble.Name, "bubbles", "قرارداد واحد حباب نیازمند تأیید", false);
        if (id.EndsWith("_hav") && ExchangeNames.Currencies.TryGetValue(id[..^4], out var currency))
            return new("حواله " + currency, "remittance", "هر واحد ارز · حواله");
        if (id.StartsWith("mex_") && (id.EndsWith("_buy") || id.EndsWith("_sell")) && ExchangeNames.Currencies.TryGetValue(id.Substring(4, 3), out var bank))
            return new(bank + " صرافی ملی · " + (id.EndsWith("_buy") ? "خرید" : "فروش"), "remittance", "واحد نرخ قدیمی صرافی ملی نیازمند تأیید", false, Variant: id.EndsWith("_buy"));
        if (id.StartsWith("mob_") && ExchangeNames.Currencies.TryGetValue(id[4..], out var exchange))
            return new(exchange + " مبادله‌ای", "remittance", "واحد نرخ قدیمی مبادله‌ای نیازمند تأیید", false);
        if (ExchangeNames.Currencies.TryGetValue(id, out var name))
            return new(name, "fiat", "هر واحد ارز · کد منبع " + id.ToUpperInvariant(), Variant: id is "usd" or "aed");
        return null;
    }
    private static decimal Number(JsonElement item) => item.ValueKind == JsonValueKind.String
        ? decimal.Parse(item.GetString()!, CultureInfo.InvariantCulture) : item.GetDecimal();
    private static decimal? Change(JsonElement item, string field, decimal multiplier)
    {
        if (!item.TryGetProperty(field, out var value) || value.ValueKind is not (JsonValueKind.String or JsonValueKind.Number)) return null;
        return decimal.TryParse(value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            && Math.Abs(parsed) <= 10_000_000_000_000_000m ? parsed * multiplier : null;
    }
    private static decimal? Percent(decimal price, decimal? change) => change.HasValue && price - change.Value > 0
        ? Math.Round(change.Value / (price - change.Value) * 100, 8) : null;
    private static DateTimeOffset Time(JsonElement item, string field, DateTimeOffset now)
    {
        var time = DateTimeOffset.FromUnixTimeSeconds(item.GetProperty(field).GetInt64());
        return time >= DateTimeOffset.UnixEpoch && time <= now.AddMinutes(5) ? time : throw new InvalidDataException("Invalid timestamp");
    }
    public static IReadOnlyList<ExchangeAsset> Parse(JsonElement root, string unit, DateTimeOffset now)
    {
        if (unit is not ("rial" or "toman")) throw new InvalidDataException("Unverified unit");
        var result = new List<ExchangeAsset>();
        foreach (var entry in root.EnumerateObject().Take(500))
        {
            var description = Describe(entry.Name);
            if (description is null || entry.Value.ValueKind != JsonValueKind.Object || result.Any(a => a.Id == entry.Name)) continue;
            try {
                var item = entry.Value;
                var scale = description.Verified ? description.Scale ?? (unit == "rial" ? .1m : 1m) : 1m;
                decimal? price = null;
                DateTimeOffset? updated = null;
                decimal? change = null;
                try {
                    var local = Number(item.GetProperty("value")) * scale;
                    var localTime = Time(item, "timestamp", now);
                    if ((local > 0 || description.Category == "bubbles") && Math.Abs(local) <= 10_000_000_000_000_000m) {
                        price = local;
                        updated = localTime;
                        change = Change(item, "change", scale);
                        if (change.HasValue && local - change.Value <= 0) change = null;
                    }
                } catch (Exception error) when (error is InvalidDataException or InvalidOperationException or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException) { }
                var percent = price.HasValue ? Percent(price.Value, change) : null;
                var symbol = entry.Name.ToUpperInvariant();
                var displayUnit = description.Verified ? description.Unit ?? "toman" : "source";
                if (description.Category == "crypto" && !description.Variant && item.TryGetProperty("dollar_rate", out var usd)) {
                    // Optional dollar fields never erase a valid local quote.
                    try {
                        var dollar = Number(usd);
                        var dollarTime = Time(item, "dollar_rate_time", now);
                        if (dollar > 0 && dollar <= 1_000_000_000_000m) {
                            var daily = Change(item, "dollar_rate_24h_change", 1);
                            if (daily is <= -100 or > 1_000_000) daily = null;
                            var volume = Change(item, "dollar_rate_24h_vol", 1);
                            result.Add(new(entry.Name, symbol, description.Name, description.Category, description.Basis,
                                dollar, "USD", dollarTime, daily.HasValue ? dollar - dollar / (1 + daily.Value / 100) : null,
                                daily, "24h", false, true, price, updated, change, percent, volume >= 0 ? volume : null));
                            continue;
                        }
                    } catch (Exception error) when (error is InvalidDataException or InvalidOperationException or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException) { }
                }
                if (price.HasValue && updated.HasValue) result.Add(new(entry.Name, symbol, description.Name, description.Category, description.Basis,
                    price.Value, displayUnit, updated.Value, change, percent, "day", description.Variant, description.Verified));
            } catch (Exception error) when (error is InvalidDataException or InvalidOperationException or KeyNotFoundException or FormatException or OverflowException or ArgumentOutOfRangeException) {
                // One malformed optional instrument must not erase the valid snapshot.
            }
        }
        return result;
    }
}
