using AltAir.MarketApi;
namespace AltAir.MarketApi.Tests;
public sealed class CompanionSettingsTests
{
    [Fact] public async Task DisabledByDefaultAndAdminSettingsSurviveRestart()
    {
        var dir = Path.Combine(Path.GetTempPath(), "altair-companion-" + Guid.NewGuid());
        try {
            var path = Path.Combine(dir, "settings.json");
            var store = new CompanionSettingsStore(path);
            Assert.False((await store.ReadAsync()).Enabled);
            var settings = new CompanionSettings(true, false, false, 12);
            await store.SaveAsync(settings);
            Assert.Equal(settings, await new CompanionSettingsStore(path).ReadAsync());
            await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(new(true, true, true, 65)));
            Assert.Equal(settings, await store.ReadAsync());
        } finally { if (Directory.Exists(dir)) Directory.Delete(dir, true); }
    }
}
