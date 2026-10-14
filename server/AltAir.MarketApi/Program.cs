using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using AltAir.MarketApi;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<NavasanOptions>(builder.Configuration.GetSection("Navasan"));
builder.Services.AddSingleton(TimeProvider.System);
var authDirectory = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "auth");
var protection = builder.Services.AddDataProtection().SetApplicationName("AltAir.LocalAuth")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(authDirectory, "keys")));
if (OperatingSystem.IsWindows()) protection.ProtectKeysWithDpapi();
builder.Services.AddSingleton(services => new ProfileStore(services.GetRequiredService<IDataProtectionProvider>(), Path.Combine(authDirectory, "profiles.protected")));
builder.Services.AddSingleton<AuthService>();
builder.Services.AddHttpClient("navasan", client => client.Timeout = TimeSpan.FromSeconds(10))
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
// Navasan authenticates in its URL. Never log provider request URLs.
builder.Logging.AddFilter("System.Net.Http.HttpClient", LogLevel.None);
builder.Services.AddSingleton<NavasanService>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<WeatherService>();
builder.Services.AddHttpClient("weather", client => client.Timeout = TimeSpan.FromSeconds(10))
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [])
        .WithMethods("GET", "POST").WithHeaders("Content-Type", "Authorization")));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
    options.AddFixedWindowLimiter("quotes", limiter =>
    {
        limiter.PermitLimit = 60;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
});

var app = builder.Build();
app.UseCors();
app.UseRateLimiter();
app.MapGet("/api/market/usd", async (NavasanService service, HttpContext context, IWebHostEnvironment environment, CancellationToken cancellationToken) =>
{
    try
    {
        var localDevelopment = environment.IsDevelopment() &&
            context.Connection.RemoteIpAddress is { } remote && System.Net.IPAddress.IsLoopback(remote);
        return Results.Ok(await service.GetQuoteAsync(cancellationToken, localDevelopment));
    }
    catch (MarketUnavailableException)
    {
        return Results.Json(new { code = "market_unavailable" }, statusCode: 503);
    }
}).RequireRateLimiting("quotes");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

bool WeatherAllowed(HttpContext context, IWebHostEnvironment environment) =>
    environment.IsDevelopment() && context.Connection.RemoteIpAddress is { } remote && System.Net.IPAddress.IsLoopback(remote);

app.MapGet("/api/weather/cities", async (string name, WeatherService service, HttpContext context, IWebHostEnvironment environment, CancellationToken token) =>
{
    if (!WeatherAllowed(context, environment)) return Results.Json(new { code = "weather_not_configured" }, statusCode: 503);
    name = name.Trim();
    if (name.Length is < 2 or > 80) return Results.BadRequest();
    try { return Results.Ok(await service.SearchAsync(name, token)); }
    catch (Exception error) when (error is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException or InvalidOperationException or KeyNotFoundException or InvalidDataException or FormatException)
    { return Results.Json(new { code = "weather_unavailable" }, statusCode: 503); }
}).RequireRateLimiting("quotes");
app.MapGet("/api/weather/current", async (double latitude, double longitude, WeatherService service, HttpContext context, IWebHostEnvironment environment, CancellationToken token) =>
{
    if (!WeatherAllowed(context, environment)) return Results.Json(new { code = "weather_not_configured" }, statusCode: 503);
    if (!WeatherService.ValidCoordinates(latitude, longitude)) return Results.BadRequest();
    try { return Results.Ok(await service.CurrentAsync(latitude, longitude, token)); }
    catch (Exception error) when (error is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException or InvalidOperationException or KeyNotFoundException or InvalidDataException or FormatException or ArgumentOutOfRangeException)
    { return Results.Json(new { code = "weather_unavailable" }, statusCode: 503); }
}).RequireRateLimiting("quotes");

app.MapLocalAuth();
app.MapGet("/api/weather/day", async (double latitude, double longitude, string date, WeatherService service, HttpContext context, IWebHostEnvironment environment, CancellationToken token) =>
{
    if (!WeatherAllowed(context, environment)) return Results.Json(new { code = "weather_not_configured" }, statusCode: 503);
    if (!WeatherService.ValidCoordinates(latitude,longitude) || !DateOnly.TryParseExact(date,"yyyy-MM-dd",System.Globalization.CultureInfo.InvariantCulture,System.Globalization.DateTimeStyles.None,out var day)) return Results.BadRequest();
    try { return Results.Ok(await service.DayAsync(latitude,longitude,day,token)); }
    catch (ArgumentOutOfRangeException) { return Results.Json(new {code="date_out_of_range"},statusCode:422); }
    catch (Exception error) when (error is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException or InvalidOperationException or KeyNotFoundException or InvalidDataException or FormatException or TimeZoneNotFoundException)
    { return Results.Json(new {code="weather_unavailable"},statusCode:503); }
}).RequireRateLimiting("quotes");
app.Run();
