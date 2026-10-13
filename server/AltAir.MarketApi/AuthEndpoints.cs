namespace AltAir.MarketApi;
public static class AuthEndpoints
{
    public sealed record PhoneRequest(string Phone);
    public sealed record VerifyRequest(string ChallengeId, string Code);
    public static bool Allowed(bool development, System.Net.IPAddress? address) =>
        development && address is not null && System.Net.IPAddress.IsLoopback(address);
    private static string? Token(HttpContext context)
    {
        var header = context.Request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.Ordinal) ? header[7..] : null;
    }
    public static void MapLocalAuth(this WebApplication app)
    {
        var routes = app.MapGroup("/api/auth").RequireRateLimiting("auth");
        routes.AddEndpointFilter(async (context, next) =>
        {
            var http = context.HttpContext;
            http.Response.Headers.CacheControl = "no-store";
            if (!Allowed(app.Environment.IsDevelopment(), http.Connection.RemoteIpAddress))
                return Results.Json(new { code = "sms_not_configured" }, statusCode: 503);
            try { return await next(context); }
            catch (AuthFailure error) { return Results.Json(new { code = error.Message }, statusCode: error.Status); }
            catch (Exception error) when (error is IOException or System.Security.Cryptography.CryptographicException or System.Text.Json.JsonException or UnauthorizedAccessException)
            { return Results.Json(new { code = "auth_storage_unavailable" }, statusCode: 503); }
        });
        routes.MapPost("/request", (PhoneRequest request, AuthService service) => Results.Ok(service.Request(request.Phone)));
        routes.MapPost("/verify", (VerifyRequest request, AuthService service) => Results.Ok(service.Verify(request.ChallengeId, request.Code)));
        routes.MapGet("/me", (HttpContext context, AuthService service) => Results.Ok(new { user = service.Me(Token(context)) }));
        routes.MapPost("/profile", (ProfileInput input, HttpContext context, AuthService service) => Results.Ok(new { user = service.Complete(Token(context), input) }));
        routes.MapPost("/logout", (HttpContext context, AuthService service) => { service.Logout(Token(context)); return Results.Ok(new { ok = true }); });
    }
}
