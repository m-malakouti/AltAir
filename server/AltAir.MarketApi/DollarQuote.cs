namespace AltAir.MarketApi;

public sealed record DollarQuote(
    string Instrument,
    decimal PriceToman,
    DateTimeOffset UpdatedAt,
    DateTimeOffset FetchedAt,
    int StaleAfterSeconds,
    bool FetchFailed,
    string Source,
    string SourceUrl, IReadOnlyList<CurrencyRate>? Rates = null);

public sealed record CurrencyRate(string Code, decimal PriceToman, DateTimeOffset UpdatedAt, decimal? ChangeToman = null);