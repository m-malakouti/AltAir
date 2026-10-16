namespace AltAir.MarketApi;

public static class CommuteEndpoints
{
    public static void MapCommute(this WebApplication app)
    {
        // Keep this billable proxy local until production authentication/quota is configured.
        static bool Allowed(HttpContext context, IWebHostEnvironment environment) => environment.IsDevelopment() &&
            context.Connection.RemoteIpAddress is { } remote && System.Net.IPAddress.IsLoopback(remote);
        app.MapGet("/api/commute/status", (CommuteService service, HttpContext context, IWebHostEnvironment environment) => {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Ok(new { configured = Allowed(context, environment) && service.Configured });
        }).RequireRateLimiting("commute");
        app.MapPost("/api/commute/route", async (CommuteRequest input, CommuteService service, HttpContext context, IWebHostEnvironment environment, CancellationToken token) => {
            context.Response.Headers.CacheControl = "no-store";
            if (!Allowed(context, environment) || !service.Configured) return Results.Json(new { code = "commute_not_configured" }, statusCode: 503);
            if (!CommuteService.ValidAddress(input.Origin) || !CommuteService.ValidAddress(input.Destination) || input.Origin!.Trim() == input.Destination!.Trim()) return Results.BadRequest();
            try { return Results.Ok(await service.GetRouteAsync(input, token)); }
            catch (AmbiguousCommuteAddressException) { return Results.Json(new { code = "commute_ambiguous_address" }, statusCode: 422); }
            catch (ArgumentException) { return Results.BadRequest(); }
            catch (NoCommuteRouteException) { return Results.Json(new { code = "commute_no_route" }, statusCode: 422); }
            catch (Exception error) when (error is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException or KeyNotFoundException or InvalidOperationException or InvalidDataException or FormatException) {
                return Results.Json(new { code = "commute_unavailable" }, statusCode: 503);
            }
        }).RequireRateLimiting("commute");
    }
}
