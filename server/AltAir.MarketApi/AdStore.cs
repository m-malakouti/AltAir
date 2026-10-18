using System.Text.Json;
using System.Text.RegularExpressions;

namespace AltAir.MarketApi;

public sealed record AdSlide(string MediaId, string AltText);
public sealed record AdCampaign(string Id, string BrandId, string Brand, string Title, string DestinationUrl,
    string Placement, string Mode, AdSlide[] Slides, bool Enabled, int Order, int IntervalSeconds,
    DateTimeOffset? StartsAt, DateTimeOffset? EndsAt)
{
    public bool Active(DateTimeOffset now) => Enabled && (!StartsAt.HasValue || StartsAt <= now) && (!EndsAt.HasValue || EndsAt > now);
    public bool Valid() => Guid.TryParseExact(Id, "D", out _) &&
        BrandId is not null && Regex.IsMatch(BrandId, "^[a-z0-9_-]{2,60}$") &&
        !string.IsNullOrWhiteSpace(Brand) && Brand.Length <= 80 &&
        !string.IsNullOrWhiteSpace(Title) && Title.Length <= 120 &&
        DestinationUrl is { Length: <= 2048 } && Uri.TryCreate(DestinationUrl, UriKind.Absolute, out var url) &&
        url.Scheme == "https" && string.IsNullOrEmpty(url.UserInfo) &&
        Placement is "sidebar" or "footer" && Mode is "single" or "slider" &&
        Slides is { Length: >= 1 and <= 8 } && (Mode != "single" || Slides.Length == 1) &&
        Slides.All(s => s is not null && Guid.TryParseExact(s.MediaId, "D", out _) && s.AltText is { Length: <= 200 }) &&
        IntervalSeconds is >= 5 and <= 60 && Order is >= 0 and <= 999 &&
        (!StartsAt.HasValue || !EndsAt.HasValue || StartsAt < EndsAt);
}
public sealed record AdCatalog(int Revision, bool Enabled, AdCampaign[] Campaigns);
public sealed class AdConflict : Exception;

public sealed class AdStore(string directory)
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private string CatalogPath => Path.Combine(directory, "catalog.json");
    private async Task<AdCatalog> ReadCore(CancellationToken token)
    {
        if (!File.Exists(CatalogPath)) return new(0, false, []);
        var value = JsonSerializer.Deserialize<AdCatalog>(await File.ReadAllTextAsync(CatalogPath, token));
        return value is not null && Valid(value) ? value : throw new InvalidDataException("Invalid ad catalog");
    }
    private static bool Valid(AdCatalog catalog) => catalog.Revision >= 0 && catalog.Campaigns is { Length: <= 50 } &&
        catalog.Campaigns.All(c => c is not null && c.Valid()) &&
        catalog.Campaigns.Select(c => c.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count() == catalog.Campaigns.Length;
    public async Task<AdCatalog> ReadAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try { return await ReadCore(token); }
        finally { gate.Release(); }
    }
    public async Task<AdCatalog> SaveAsync(AdCatalog catalog, CancellationToken token = default)
    {
        if (!Valid(catalog)) throw new ArgumentException("Invalid campaign");
        await gate.WaitAsync(token);
        try
        {
            var previous = await ReadCore(token);
            if (previous.Revision != catalog.Revision) throw new AdConflict();
            foreach (var campaign in catalog.Campaigns)
            {
                var old = previous.Campaigns.FirstOrDefault(c => c.Id == campaign.Id);
                if (old is not null && old.BrandId != campaign.BrandId) throw new ArgumentException("Brand identifier is immutable");
                if (campaign.Slides.Any(s => !File.Exists(MediaPath(s.MediaId)))) throw new ArgumentException("Missing media");
            }
            var saved = catalog with { Revision = checked(previous.Revision + 1) };
            Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(CatalogPath + ".tmp", JsonSerializer.Serialize(saved), token);
            File.Move(CatalogPath + ".tmp", CatalogPath, true);
            return saved;
        }
        finally { gate.Release(); }
    }
    public string MediaPath(string id) => Guid.TryParseExact(id, "D", out _) ? Path.Combine(directory, "media", id) : throw new ArgumentException("Invalid media ID");
    public static string? MediaType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 16) return null;
        if (bytes[..6].SequenceEqual("GIF87a"u8) || bytes[..6].SequenceEqual("GIF89a"u8)) return "image/gif";
        if (bytes[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return "image/png";
        if (bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255) return "image/jpeg";
        if (bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8, 4).SequenceEqual("WEBP"u8)) return "image/webp";
        return null;
    }
    public async Task<string> UploadAsync(byte[] bytes, CancellationToken token = default)
    {
        if (bytes.Length > 3 * 1024 * 1024 || MediaType(bytes) is null) throw new ArgumentException("Invalid image");
        var id = Guid.NewGuid().ToString();
        Directory.CreateDirectory(Path.Combine(directory, "media"));
        await File.WriteAllBytesAsync(MediaPath(id), bytes, token);
        return id;
    }
}
