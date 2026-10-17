using System.Text.Json;

namespace AltAir.MarketApi;

public sealed record AdminSettings(int PollMinutes, int StaleAfterMinutes, int MaxRequestsPerMonth)
{
    public bool Valid() => PollMinutes is >= 15 and <= 10080 && StaleAfterMinutes is >= 5 and <= 10080 && MaxRequestsPerMonth is >= 1 and <= 10000;
}

public sealed class AdminSettingsStore(string path)
{
    private readonly SemaphoreSlim gate = new(1, 1);
    public async Task<AdminSettings?> ReadAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try
        {
            if (!File.Exists(path)) return null;
            var settings = JsonSerializer.Deserialize<AdminSettings>(await File.ReadAllTextAsync(path, token));
            return settings?.Valid() == true ? settings : throw new InvalidDataException("Invalid admin settings");
        }
        finally { gate.Release(); }
    }
    public async Task SaveAsync(AdminSettings settings, CancellationToken token)
    {
        if (!settings.Valid()) throw new ArgumentException("Invalid admin settings");
        await gate.WaitAsync(token);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var temporary = path + ".tmp";
            await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(settings), token);
            File.Move(temporary, path, true);
        }
        finally { gate.Release(); }
    }
}
