using AltAir.MarketApi;

namespace AltAir.MarketApi.Tests;
public sealed class AdTests : IDisposable
{
    private readonly string directory = Path.Combine(Path.GetTempPath(), "altair-ads-" + Guid.NewGuid());
    private readonly AdStore store;
    public AdTests() { store = new(directory); }
    private static byte[] Gif() => Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    private static AdCampaign Campaign(string media) => new(Guid.NewGuid().ToString(), "test-brand", "برند آزمایشی", "پیشنهاد", "https://example.com/", "sidebar", "slider", [new(media, "تصویر")], true, 0, 8, null, null);
    [Fact]
    public async Task PersistsMediaAndCatalogWithConflictProtection()
    {
        Assert.False((await store.ReadAsync()).Enabled);
        var media = await store.UploadAsync(Gif());
        var campaign = Campaign(media);
        var saved = await store.SaveAsync(new(0, true, [campaign]));
        Assert.Equal(1, saved.Revision);
        Assert.Equal(campaign.Id, (await new AdStore(directory).ReadAsync()).Campaigns.Single().Id);
        Assert.Equal(Gif(), await File.ReadAllBytesAsync(store.MediaPath(media)));
        await Assert.ThrowsAsync<AdConflict>(() => store.SaveAsync(new(0, false, [])));
        await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(saved with { Campaigns = [campaign with { BrandId = "changed-brand" }] }));
        var stopped = await store.SaveAsync(saved with { Enabled = false });
        Assert.False(stopped.Enabled);
        var deleted = await store.SaveAsync(stopped with { Campaigns = [] });
        Assert.Empty(deleted.Campaigns);
    }
    [Fact]
    public async Task RejectsScriptsMissingMediaAndOversizeUploads()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => store.UploadAsync(System.Text.Encoding.UTF8.GetBytes("<svg onload='alert(1)'></svg>")));
        await Assert.ThrowsAsync<ArgumentException>(() => store.UploadAsync(new byte[3 * 1024 * 1024 + 1]));
        Assert.Throws<ArgumentException>(() => store.MediaPath("../catalog.json"));
        await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(new(0, true, [Campaign(Guid.NewGuid().ToString())])));
        var media = await store.UploadAsync(Gif());
        await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(new(0, true, [Campaign(media) with { DestinationUrl = "javascript:alert(1)" }])));
        await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(new(0, true, [Campaign(media) with { DestinationUrl = "https://user:pass@example.com/" }])));
    }
    [Fact]
    public void RespectsScheduleAndPause()
    {
        var start = DateTimeOffset.Parse("2026-10-18T10:00:00Z");
        var campaign = Campaign(Guid.NewGuid().ToString()) with { StartsAt = start, EndsAt = start.AddHours(1) };
        Assert.False(campaign.Active(start.AddSeconds(-1)));
        Assert.True(campaign.Active(start));
        Assert.False(campaign.Active(start.AddHours(1)));
        Assert.False((campaign with { Enabled = false }).Active(start));
        Assert.False((campaign with { EndsAt = start }).Valid());
        Assert.False((campaign with { Slides = [] }).Valid());
    }
    public void Dispose() { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
}
