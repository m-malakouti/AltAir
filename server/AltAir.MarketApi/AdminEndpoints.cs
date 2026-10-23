using System.Net;
using Microsoft.Extensions.Options;

namespace AltAir.MarketApi;

public static class AdminEndpoints
{
    public static bool Allowed(bool development, HttpContext http)
    {
        if (!development || http.Connection.RemoteIpAddress is not { } ip || !IPAddress.IsLoopback(ip)) return false;
        var host = http.Request.Host.Host;
        if (host is not ("localhost" or "127.0.0.1" or "[::1]" or "::1")) return false;
        if (http.Request.Headers["Sec-Fetch-Site"] == "cross-site") return false;
        var origin = http.Request.Headers.Origin.ToString();
        return origin.Length == 0 || origin == $"{http.Request.Scheme}://{http.Request.Host}";
    }
    public static void MapAdmin(this WebApplication app)
    {
        var routes = app.MapGroup("/admin");
        routes.MapAdAdmin();
        routes.AddEndpointFilter(async (context, next) =>
        {
            var http = context.HttpContext;
            http.Response.Headers.CacheControl = "no-store";
            http.Response.Headers["X-Content-Type-Options"] = "nosniff";
            http.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
            if (!Allowed(app.Environment.IsDevelopment(), http)) return Results.NotFound();
            if (http.Request.Method != "GET" && http.Request.Headers["X-AltAir-Admin"] != "1") return Results.StatusCode(403);
            try { return await next(context); }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
            { return Results.Json(new { code = "admin_storage_unavailable" }, statusCode: 503); }
        });
        foreach (var (route, file, mime) in new[] { ("/", "index.html", "text/html"), ("/admin.js", "admin.js", "text/javascript"), ("/ads.js", "ads.js", "text/javascript"), ("/admin.css", "admin.css", "text/css") })
            routes.MapGet(route, () => Results.File(Path.Combine(app.Environment.ContentRootPath, "Admin", file), mime));
        routes.MapGet("/fonts/Vazirmatn-Variable.woff2", () => Results.File(
            Path.Combine(AppContext.BaseDirectory, "Admin", "fonts", "Vazirmatn-Variable.woff2"), "font/woff2"));
        routes.MapGet("/api/overview", async (IOptions<NavasanOptions> options, IConfiguration config, AdminSettingsStore store, CancellationToken token) =>
        {
            var n = options.Value;
            var settings = await store.ReadAsync(token) ?? new AdminSettings(n.PollMinutes, n.StaleAfterMinutes, n.MaxRequestsPerMonth);
            return Results.Ok(new {
                environment = app.Environment.EnvironmentName, checkedAt = DateTimeOffset.UtcNow,
                settings, marketConfigured = n.IsConfigured(true), marketKeyPresent = !string.IsNullOrWhiteSpace(n.ApiKey),
                priceUnit = n.PriceUnit, redistributionApproved = n.RedistributionApproved,
                neshanKeyPresent = !string.IsNullOrWhiteSpace(config["Neshan:ServiceApiKey"]),
                storage = "local-browser", adminMode = "local-development"
            });
        });
        routes.MapPost("/api/settings", async (AdminSettings settings, AdminSettingsStore store, CancellationToken token) =>
        {
            if (!settings.Valid()) return Results.BadRequest(new { code = "invalid_settings" });
            await store.SaveAsync(settings, token);
            return Results.Ok(new { saved = true, settings });
        }).RequireRateLimiting("auth");
        routes.MapGet("/api/users", (AuthService auth) => Results.Ok(auth.AdminUsers()));
        routes.MapGet("/api/companion", async (CompanionSettingsStore store, CancellationToken token) => Results.Ok(await store.ReadAsync(token)));
        routes.MapPost("/api/companion", async (CompanionSettings settings, CompanionSettingsStore store, CancellationToken token) => {
            if (!settings.Valid()) return Results.BadRequest(new { code = "invalid_companion_settings" });
            await store.SaveAsync(settings, token);
            return Results.Ok(settings);
        }).RequireRateLimiting("auth");
    }
}
