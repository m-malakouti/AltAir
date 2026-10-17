using AltAir.MarketApi;
using Microsoft.AspNetCore.Http;
using System.Net;

namespace AltAir.MarketApi.Tests;
public sealed class AdminTests
{
    [Theory]
    [InlineData(true, "127.0.0.1", "localhost", "", true)]
    [InlineData(false, "127.0.0.1", "localhost", "", false)]
    [InlineData(true, "192.168.1.2", "localhost", "", false)]
    [InlineData(true, "127.0.0.1", "evil.example", "", false)]
    [InlineData(true, "127.0.0.1", "localhost", "https://evil.example", false)]
    [InlineData(true, "127.0.0.1", "localhost", "http://localhost", true)]
    public void RestrictsAdminToLocalDevelopment(bool dev, string ip, string host, string origin, bool allowed)
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse(ip);
        http.Request.Host = new HostString(host);
        http.Request.Scheme = "http";
        http.Request.Headers.Origin = origin;
        Assert.Equal(allowed, AdminEndpoints.Allowed(dev, http));
    }
    [Fact] public async Task PersistsPolicyAndRejectsInvalidChanges()
    {
        var dir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        try {
            var path = Path.Combine(dir, "settings.json");
            var store = new AdminSettingsStore(path);
            Assert.Null(await store.ReadAsync());
            var policy = new AdminSettings(480, 120, 100);
            await store.SaveAsync(policy, default);
            Assert.Equal(policy, await new AdminSettingsStore(path).ReadAsync());
            await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(new(0, 120, 100), default));
            Assert.Equal(policy, await store.ReadAsync());
        } finally { if (Directory.Exists(dir)) Directory.Delete(dir, true); }
    }
}
