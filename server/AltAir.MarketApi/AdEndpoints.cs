namespace AltAir.MarketApi;

public static class AdEndpoints
{
    public sealed record Upload(string Base64);
    public static void MapAdAdmin(this RouteGroupBuilder routes)
    {
        routes.MapGet("/api/ads", async (AdStore store, CancellationToken token) => Results.Ok(await store.ReadAsync(token)));
        routes.MapPost("/api/ads", async (AdCatalog catalog, AdStore store, CancellationToken token) =>
        {
            try { return Results.Ok(await store.SaveAsync(catalog, token)); }
            catch (ArgumentException) { return Results.BadRequest(new { code = "invalid_campaign" }); }
            catch (AdConflict) { return Results.Conflict(new { code = "catalog_changed" }); }
        });
        routes.MapPost("/api/ads/upload", async (Upload upload, AdStore store, CancellationToken token) =>
        {
            if (upload.Base64 is null || upload.Base64.Length > 4_194_304) return Results.BadRequest(new { code = "image_too_large" });
            try { return Results.Ok(new { mediaId = await store.UploadAsync(Convert.FromBase64String(upload.Base64), token) }); }
            catch (Exception error) when (error is ArgumentException or FormatException) { return Results.BadRequest(new { code = "invalid_image" }); }
        });
        routes.MapGet("/api/ads/media/{id:guid}", async (Guid id, AdStore store, CancellationToken token) => await Media(id.ToString(), store, token));
    }
    private static async Task<IResult> Media(string id, AdStore store, CancellationToken token)
    {
        var path = store.MediaPath(id);
        if (!File.Exists(path)) return Results.NotFound();
        var bytes = await File.ReadAllBytesAsync(path, token);
        var mime = AdStore.MediaType(bytes);
        return mime is null ? Results.NotFound() : Results.Bytes(bytes, mime);
    }
    public static void MapAds(this WebApplication app)
    {
        var routes = app.MapGroup("/api/ads");
        routes.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            context.HttpContext.Response.Headers["X-Content-Type-Options"] = "nosniff";
            try { return await next(context); }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
            { return Results.StatusCode(503); }
        });
        routes.MapGet("/", async (AdStore store, TimeProvider clock, CancellationToken token) =>
        {
            var catalog = await store.ReadAsync(token);
            var now = clock.GetUtcNow();
            return Results.Ok(new { checkedAt = now, campaigns = catalog.Enabled
                ? catalog.Campaigns.Where(c => c.Active(now)).OrderBy(c => c.Order).ThenBy(c => c.Id).ToArray() : [] });
        });
        routes.MapGet("/media/{id:guid}", async (Guid id, AdStore store, TimeProvider clock, CancellationToken token) =>
        {
            var catalog = await store.ReadAsync(token);
            if (!catalog.Enabled || !catalog.Campaigns.Any(c => c.Active(clock.GetUtcNow()) && c.Slides.Any(s => s.MediaId == id.ToString()))) return Results.NotFound();
            return await Media(id.ToString(), store, token);
        });
    }
}
