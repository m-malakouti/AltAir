using AltAir.MarketApi;
using Microsoft.AspNetCore.DataProtection;
using System.Net;
namespace AltAir.MarketApi.Tests;
public sealed class AuthTests : IDisposable
{
    private sealed class Clock : TimeProvider { public DateTimeOffset Now = new(2026, 10, 13, 8, 0, 0, TimeSpan.Zero); public override DateTimeOffset GetUtcNow() => Now; }
    private readonly string directory = Path.Combine(Path.GetTempPath(), "altair-auth-test-" + Guid.NewGuid());
    private readonly Clock clock = new();
    private readonly ProfileStore store;
    private readonly AuthService service;
    public AuthTests()
    {
        store = new(new EphemeralDataProtectionProvider(), Path.Combine(directory, "profiles.protected"));
        service = new(clock, store);
    }
    private AuthSession SignIn(string phone = "09120000000")
    {
        var challenge = service.Request(phone);
        return service.Verify(challenge.ChallengeId, challenge.DevelopmentCode);
    }
    private static ProfileInput Profile(string birth = "1995-05-12", string gender = "undisclosed") => new("آزمایشی", "کاربر", birth, gender);
    [Theory]
    [InlineData("+989123456789", "09123456789")]
    [InlineData("۰۹۱۲۳۴۵۶۷۸۹", "09123456789")]
    [InlineData("٠٩١٢٣٤٥٦٧٨٩", "09123456789")]
    public void PhoneNormalization(string input, string expected) => Assert.Equal(expected, AuthService.Phone(input));
    [Theory]
    [InlineData("123")] [InlineData("+12025550123")] [InlineData("02112345678")]
    public void InvalidPhone(string phone) => Assert.Throws<AuthFailure>(() => service.Request(phone));
    [Fact]
    public void AdminActivityExpiresAndLogoutKeepsRegisteredAccount()
    {
        var session = SignIn();
        service.Complete(session.Token, Profile());
        System.Text.Json.JsonElement Snapshot() => System.Text.Json.JsonSerializer.SerializeToElement(service.AdminUsers());
        Assert.Equal(1, Snapshot().GetProperty("active").GetInt32());
        clock.Now = clock.Now.AddMinutes(6);
        Assert.Equal(0, Snapshot().GetProperty("active").GetInt32());
        service.Me(session.Token);
        Assert.Equal(1, Snapshot().GetProperty("active").GetInt32());
        service.Logout(session.Token);
        var result = Snapshot();
        Assert.Equal(1, result.GetProperty("total").GetInt32());
        Assert.Equal(0, result.GetProperty("active").GetInt32());
        Assert.DoesNotContain(session.Token, result.ToString());
    }
    [Fact]
    public void RegistrationPersistsEncryptedAndLoginReturnsSameAccount()
    {
        var session = SignIn();
        Assert.Null(session.User);
        var user = service.Complete(session.Token, Profile());
        Assert.Equal(user, service.Me(session.Token));
        Assert.DoesNotContain(user.Phone, File.ReadAllText(Path.Combine(directory, "profiles.protected")));
        var restarted = new AuthService(clock, store);
        var challenge = restarted.Request(user.Phone);
        var login = restarted.Verify(challenge.ChallengeId, challenge.DevelopmentCode);
        Assert.Equal(user, login.User);
        Assert.Throws<AuthFailure>(() => restarted.Me(session.Token));
    }
    [Fact]
    public void CodeIsSingleUse()
    {
        var challenge = service.Request("09120000000");
        service.Verify(challenge.ChallengeId, challenge.DevelopmentCode);
        Assert.Throws<AuthFailure>(() => service.Verify(challenge.ChallengeId, challenge.DevelopmentCode));
    }
    [Fact]
    public void CodeExpiresAtFiveMinutes()
    {
        var challenge = service.Request("09120000000");
        clock.Now = clock.Now.AddMinutes(5);
        Assert.Throws<AuthFailure>(() => service.Verify(challenge.ChallengeId, challenge.DevelopmentCode));
    }
    [Fact]
    public void FiveWrongAttemptsInvalidateCode()
    {
        var challenge = service.Request("09120000000");
        var wrong = challenge.DevelopmentCode == "000000" ? "111111" : "000000";
        for (var i = 0; i < 5; i++) Assert.Throws<AuthFailure>(() => service.Verify(challenge.ChallengeId, wrong));
        Assert.Throws<AuthFailure>(() => service.Verify(challenge.ChallengeId, challenge.DevelopmentCode));
    }
    [Fact]
    public void ResendWaitsAndInvalidatesOldCode()
    {
        var original = service.Request("09120000000");
        Assert.Equal(429, Assert.Throws<AuthFailure>(() => service.Request("09120000000")).Status);
        clock.Now = clock.Now.AddSeconds(60);
        var next = service.Request("09120000000");
        Assert.Throws<AuthFailure>(() => service.Verify(original.ChallengeId, original.DevelopmentCode));
        Assert.NotNull(service.Verify(next.ChallengeId, next.DevelopmentCode));
    }
    [Fact]
    public void HourlyQuotaIsEnforced()
    {
        for (var i = 0; i < 5; i++) { service.Request("09120000000"); clock.Now = clock.Now.AddMinutes(1); }
        Assert.Equal(429, Assert.Throws<AuthFailure>(() => service.Request("09120000000")).Status);
        clock.Now = clock.Now.AddHours(1);
        Assert.NotNull(service.Request("09120000000"));
    }
    [Fact]
    public void LogoutRevokesToken()
    {
        var session = SignIn();
        service.Logout(session.Token);
        Assert.Equal(401, Assert.Throws<AuthFailure>(() => service.Me(session.Token)).Status);
        Assert.Throws<AuthFailure>(() => service.Complete(session.Token, Profile()));
    }
    [Fact]
    public void PendingRegistrationSessionExpires()
    {
        var session = SignIn();
        clock.Now = clock.Now.AddHours(1);
        Assert.Equal(401, Assert.Throws<AuthFailure>(() => service.Me(session.Token)).Status);
    }
    [Fact]
    public void ExistingAccountCannotBeOverwrittenByRegistration()
    {
        var session = SignIn();
        var user = service.Complete(session.Token, Profile());
        Assert.Equal(user, service.Complete(session.Token, new("دیگر", "کاربر", "2000-01-01", "male")));
    }
    [Theory]
    [InlineData("2027-01-01")] [InlineData("1800-01-01")] [InlineData("2000-02-30")] [InlineData("invalid")]
    public void InvalidBirthDatesAreRejected(string birth)
    {
        var session = SignIn();
        Assert.Throws<AuthFailure>(() => service.Complete(session.Token, Profile(birth)));
        Assert.Null(service.Me(session.Token));
    }
    [Fact]
    public void InvalidNamesGenderAndUnauthorizedRegistrationRejected()
    {
        Assert.Throws<AuthFailure>(() => service.Complete(null, Profile()));
        var session = SignIn();
        Assert.Throws<AuthFailure>(() => service.Complete(session.Token, new("<script>", "نام", "2000-01-01", "male")));
        Assert.Throws<AuthFailure>(() => service.Complete(session.Token, Profile(gender: "invalid")));
    }
    [Fact]
    public void LocalCodesNeverEnabledInProductionOrForRemoteClients()
    {
        Assert.True(AuthEndpoints.Allowed(true, IPAddress.Loopback));
        Assert.False(AuthEndpoints.Allowed(false, IPAddress.Loopback));
        Assert.False(AuthEndpoints.Allowed(true, IPAddress.Parse("203.0.113.7")));
        Assert.False(AuthEndpoints.Allowed(true, null));
    }
    [Fact]
    public void ConcurrentVerificationOnlySucceedsOnce()
    {
        var challenge = service.Request("09120000000");
        var success = 0;
        Parallel.For(0, 12, _ => { try { service.Verify(challenge.ChallengeId, challenge.DevelopmentCode); Interlocked.Increment(ref success); } catch (AuthFailure) { } });
        Assert.Equal(1, success);
    }
    public void Dispose() { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
}
