namespace AltAir.MarketApi;

public sealed record MarketFailure(DateTimeOffset At, string Code, int? HttpStatus);
public sealed record MarketFetchAttempt(DateTimeOffset StartedAt, DateTimeOffset CompletedAt,
    long DurationMs, bool Successful, string? ErrorCode, int? HttpStatus);
public sealed record MarketBudget(string MonthUtc, int Used, int Limit, int Remaining, DateTimeOffset ResetsAt);
public sealed record MarketDiagnostics(DateTimeOffset CheckedAt, DateTimeOffset ProcessStartedAt,
    bool Configured, string State, bool CacheAvailable, DateTimeOffset? ProviderUpdatedAt,
    DateTimeOffset? LastSuccessAt, DateTimeOffset? LastAttemptAt, long? LastAttemptDurationMs,
    DateTimeOffset? NextEligibleAt, bool FetchFailed, int AssetCount, int StaleAssetCount,
    DateTimeOffset? OldestAssetAt, DateTimeOffset? NewestAssetAt, int? CacheStaleAfterSeconds,
    AdminSettings Settings, MarketBudget Budget, MarketFailure? LastFailure,
    IReadOnlyList<MarketFetchAttempt> RecentAttempts);
