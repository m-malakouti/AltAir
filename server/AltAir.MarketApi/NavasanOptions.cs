namespace AltAir.MarketApi;

public sealed class NavasanOptions
{
    public string ApiKey { get; set; } = "";
    public string PriceUnit { get; set; } = "";
    public bool RedistributionApproved { get; set; }
    public bool LocalDevelopmentEnabled { get; set; }
    public int PollMinutes { get; set; } = 480;
    public int StaleAfterMinutes { get; set; } = 120;
    public int MaxRequestsPerMonth { get; set; } = 120;

    public bool IsConfigured(bool localDevelopment = false) =>
        !string.IsNullOrWhiteSpace(ApiKey) &&
        (RedistributionApproved || (localDevelopment && LocalDevelopmentEnabled)) &&
        PriceUnit is "rial" or "toman" && PollMinutes >= 1 &&
        StaleAfterMinutes >= 1 && MaxRequestsPerMonth >= 1;
}
