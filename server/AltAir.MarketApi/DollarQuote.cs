namespace AltAir.MarketApi;

public sealed record DollarQuote(
    string Instrument,
    decimal PriceToman,
    DateTimeOffset UpdatedAt,
    DateTimeOffset FetchedAt,
    int StaleAfterSeconds,
    bool FetchFailed,
    string Source,
    string SourceUrl, IReadOnlyList<CurrencyRate>? Rates = null,
    IReadOnlyList<CryptoRate>? CryptoRates = null,
    IReadOnlyList<ExchangeAsset>? Assets = null);

public sealed record CurrencyRate(string Code, decimal PriceToman, DateTimeOffset UpdatedAt, decimal? ChangeToman = null);

public sealed record CryptoRate(string Code, decimal PriceUsd, DateTimeOffset UpdatedAt,
    decimal? ChangeUsd = null, decimal? Percent = null,
    decimal? PriceToman = null, DateTimeOffset? TomanUpdatedAt = null);
