using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.DataProtection;

namespace AltAir.MarketApi;

public sealed record UserProfile(string Id, string Phone, string FirstName, string LastName, string BirthDate, string Gender);
public sealed record ProfileInput(string FirstName, string LastName, string BirthDate, string Gender);
public sealed record OtpChallenge(string ChallengeId, DateTimeOffset ExpiresAt, int RetryAfterSeconds, string DevelopmentCode);
public sealed record AuthSession(string Token, DateTimeOffset ExpiresAt, UserProfile? User);
public sealed class AuthFailure(string code, int status = 400) : Exception(code) { public int Status { get; } = status; }

public sealed class ProfileStore
{
    private readonly IDataProtector protector;
    private readonly string path;
    public ProfileStore(IDataProtectionProvider protection, string path)
    {
        protector = protection.CreateProtector("AltAir.LocalProfiles.v1");
        this.path = path;
    }
    public Dictionary<string, UserProfile> Read() => !File.Exists(path) ? [] :
        JsonSerializer.Deserialize<Dictionary<string, UserProfile>>(protector.Unprotect(File.ReadAllText(path)))
            ?? throw new InvalidDataException("Invalid profile store.");
    public void Write(Dictionary<string, UserProfile> profiles)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, protector.Protect(JsonSerializer.Serialize(profiles)));
        File.Move(temporary, path, true);
    }
}

// Local-only authentication scaffold. Routes refuse non-development/non-loopback requests.
// A real SMS provider and durable distributed limits/session store are required for production.
public sealed class AuthService(TimeProvider clock, ProfileStore store)
{
    private sealed record Challenge(string Phone, byte[] Hash, DateTimeOffset ExpiresAt) { public int Attempts { get; set; } }
    private sealed record Session(string Phone, DateTimeOffset ExpiresAt)
    {
        public DateTimeOffset? LastSeenAt { get; set; }
    }
    private sealed record Window(DateTimeOffset Start) { public int Count { get; set; } public DateTimeOffset Last { get; set; } }
    private readonly object gate = new();
    private readonly Dictionary<string, Challenge> challenges = [];
    private readonly Dictionary<string, Session> sessions = [];
    private readonly Dictionary<string, Window> windows = [];
    private static string RandomToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private static byte[] Hash(string value) => SHA256.HashData(Encoding.UTF8.GetBytes(value));
    private static string Key(string value) => Convert.ToHexString(Hash(value));

    public static string Phone(string? raw)
    {
        var digits = (raw ?? "").Trim().Replace(" ", "").Replace("-", "");
        for (var i = 0; i < 10; i++) digits = digits.Replace((char)('۰' + i), (char)('0' + i)).Replace((char)('٠' + i), (char)('0' + i));
        if (digits.StartsWith("+98")) digits = "0" + digits[3..];
        if (!Regex.IsMatch(digits, "^09[0-9]{9}$")) throw new AuthFailure("invalid_phone");
        return digits;
    }
    public OtpChallenge Request(string? phone)
    {
        phone = Phone(phone);
        lock (gate)
        {
            var now = clock.GetUtcNow();
            foreach (var key in challenges.Where(x => x.Value.ExpiresAt <= now).Select(x => x.Key).ToArray()) challenges.Remove(key);
            foreach (var key in sessions.Where(x => x.Value.ExpiresAt <= now).Select(x => x.Key).ToArray()) sessions.Remove(key);
            foreach (var key in windows.Where(x => x.Value.Start.AddHours(1) <= now).Select(x => x.Key).ToArray()) windows.Remove(key);
            if (!windows.TryGetValue(phone, out var window)) windows[phone] = window = new(now);
            if (window.Count >= 5 || (window.Count > 0 && now < window.Last.AddSeconds(60)))
                throw new AuthFailure("otp_rate_limited", 429);
            if (challenges.Count >= 1000 || sessions.Count >= 5000) throw new AuthFailure("auth_busy", 503);
            window.Count++;
            window.Last = now;
            foreach (var key in challenges.Where(x => x.Value.Phone == phone).Select(x => x.Key).ToArray()) challenges.Remove(key);
            var id = RandomToken();
            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var expires = now.AddMinutes(5);
            challenges[id] = new(phone, Hash(id + code), expires);
            return new(id, expires, 60, code);
        }
    }
    public AuthSession Verify(string? challengeId, string? code)
    {
        lock (gate)
        {
            var now = clock.GetUtcNow();
            if (challengeId is null || !challenges.TryGetValue(challengeId, out var challenge))
                throw new AuthFailure("invalid_otp");
            if (challenge.ExpiresAt <= now || challenge.Attempts >= 5)
            {
                challenges.Remove(challengeId);
                throw new AuthFailure("invalid_otp");
            }
            challenge.Attempts++;
            if (code is null || !Regex.IsMatch(code, "^[0-9]{6}$") ||
                !CryptographicOperations.FixedTimeEquals(challenge.Hash, Hash(challengeId + code)))
            {
                if (challenge.Attempts >= 5) challenges.Remove(challengeId);
                throw new AuthFailure("invalid_otp");
            }
            // Read before consuming the challenge: storage failures must not erase an account.
            var user = store.Read().GetValueOrDefault(challenge.Phone);
            challenges.Remove(challengeId);
            var token = RandomToken();
            var expiry = now.AddHours(user is null ? 1 : 24);
            sessions[Key(token)] = new(challenge.Phone, expiry);
            return new(token, expiry, user);
        }
    }
    private Session Authorized(string? token)
    {
        if (string.IsNullOrEmpty(token) || token.Length != 64 || !sessions.TryGetValue(Key(token), out var session) || session.ExpiresAt <= clock.GetUtcNow())
            throw new AuthFailure("unauthorized", 401);
        return session;
    }
    public UserProfile? Me(string? token)
    {
        lock (gate)
        {
            var session = Authorized(token);
            var user = store.Read().GetValueOrDefault(session.Phone);
            session.LastSeenAt = clock.GetUtcNow();
            return user;
        }
    }
    public object AdminUsers()
    {
        lock (gate)
        {
            var now = clock.GetUtcNow();
            var users = store.Read().Values.Select(user =>
            {
                var lastSeen = sessions.Values.Where(s => s.Phone == user.Phone && s.ExpiresAt > now)
                    .Select(s => s.LastSeenAt).Max();
                return new { user.Id, user.FirstName, user.LastName, user.Phone,
                    lastSeenAt = lastSeen, active = lastSeen.HasValue && lastSeen.Value > now.AddMinutes(-5) };
            }).OrderBy(user => user.LastName).ThenBy(user => user.FirstName).ToArray();
            return new { users, total = users.Length, active = users.Count(user => user.active), checkedAt = now };
        }
    }
    public UserProfile Complete(string? token, ProfileInput input)
    {
        lock (gate)
        {
            var session = Authorized(token);
            var profiles = store.Read();
            if (profiles.TryGetValue(session.Phone, out var existing)) return existing;
            var first = Name(input.FirstName);
            var last = Name(input.LastName);
            if (!DateOnly.TryParseExact(input.BirthDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var birth) ||
                birth > DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime) || birth < DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime).AddYears(-120))
                throw new AuthFailure("invalid_birth_date");
            if (input.Gender is not ("female" or "male" or "other" or "undisclosed")) throw new AuthFailure("invalid_gender");
            var user = new UserProfile(Guid.NewGuid().ToString(), session.Phone, first, last, birth.ToString("yyyy-MM-dd"), input.Gender);
            profiles.Add(session.Phone, user);
            store.Write(profiles);
            session.LastSeenAt = clock.GetUtcNow();
            return user;
        }
    }
    private static string Name(string? input)
    {
        var value = (input ?? "").Trim();
        if (value.Length is < 1 or > 60 || !Regex.IsMatch(value, @"^[\p{L}\p{M}\u200c '\-]+$"))
            throw new AuthFailure("invalid_name");
        return value;
    }
    public void Logout(string? token) { lock (gate) { if (token is not null) sessions.Remove(Key(token)); } }
}
