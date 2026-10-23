using System.Text.Json;

namespace AltAir.MarketApi;

public sealed record CompanionSettings(bool Enabled = false, bool MotionEnabled = true, bool DragEnabled = true, int HorizontalRange = 48)
{
    public bool Valid() => HorizontalRange is >= 0 and <= 64;
}

public sealed class CompanionSettingsStore(string path)
{
    private readonly SemaphoreSlim gate = new(1, 1);
    public async Task<CompanionSettings> ReadAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try {
            if (!File.Exists(path)) return new();
            var settings = JsonSerializer.Deserialize<CompanionSettings>(await File.ReadAllTextAsync(path, token));
            return settings?.Valid() == true ? settings : throw new InvalidDataException("Invalid companion settings");
        } finally { gate.Release(); }
    }
    public async Task SaveAsync(CompanionSettings settings, CancellationToken token = default)
    {
        if (!settings.Valid()) throw new ArgumentException("Invalid companion settings");
        await gate.WaitAsync(token);
        try {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var temporary = path + ".tmp";
            await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(settings), token);
            File.Move(temporary, path, true);
        } finally { gate.Release(); }
    }
}
