# Market API preparation and next workspace experience

## Delivered scope

The Popup now prioritizes fast workspace access and a compact USD card.
The Side Panel has working workspace/appearance navigation, a full USD card,
a manual refresh action, and source/freshness metadata when a valid quote exists.
Bookmarks remain the next independent feature.

The requested Navasan integration is prepared through a small ASP.NET Core 10
proxy. It is not deployed. On 2026-10-12 an authenticated local development
quote was successfully fetched. The owner confirmed the API unit as toman.
No sample price is displayed in the product; fixtures exist only in tests.

## Provider research (2026-10-12)

Official sources:

- https://www.navasan.net/en/api/
- https://www.navasan.tech/webserviceguide/

Navasan requires an API key. The published free plan lists 120 requests/month
and a two-hour update cadence. The intended instrument is `usd_sell`
(Tehran sell rate), not official exchange or futures rates.

The English overview labels rates IRR, while historic documentation examples do
not establish the unit reliably. Verify the unit with the provider and an
authenticated response. Set `Navasan:PriceUnit` explicitly to `rial` or `toman`;
the service stays unavailable until the unit is specified.

API subscription access does not by itself establish commercial redistribution
rights. Confirm the application's intended use with the provider before setting
`Navasan:RedistributionApproved` to true. No provider was contacted, no account
was created, and no subscription was purchased during this implementation.

## Local setup

Requires .NET SDK 10 and Node.js 24.

Start the unconfigured backend:

```sh
dotnet run --project server/AltAir.MarketApi --urls http://127.0.0.1:5279
```

Health: `GET /health`. Market quote: `GET /api/market/usd`.
Without verified configuration, the quote endpoint returns HTTP 503 with
`market_unavailable`; it makes no provider request.

Copy `.env.example` to the ignored `.env.local` and set only the public proxy URL:

```dotenv
WXT_MARKET_API_URL=http://127.0.0.1:5279/api/market/usd
```

Rebuild/reload the extension. The Manifest derives host access for exactly the
proxy origin. Without this configuration, no host permission is added and the
market card remains unavailable. Remote production endpoints must use HTTPS.

Keep the provider key in .NET user secrets or a server-side secret manager:

```sh
dotnet user-secrets set "Navasan:ApiKey" "<your-key>" --project server/AltAir.MarketApi
dotnet user-secrets set "Navasan:PriceUnit" "<verified-unit>" --project server/AltAir.MarketApi
dotnet user-secrets set "Navasan:RedistributionApproved" "true" --project server/AltAir.MarketApi
```

Do not put the key in a WXT_/VITE_ variable, source, settings committed to Git,
or an extension UI. Those values would be visible to users of the extension.

## Data and failure behavior

The proxy returns `USD_FREE_SELL`, `priceToman`, provider `updatedAt`, successful
`fetchedAt`, `staleAfterSeconds`, `fetchFailed`, and Navasan attribution.
The extension validates the response and persists a versioned, endpoint-specific
last-successful quote. Failed requests never replace its successful timestamps.

The UI uses Persian numerals, toman, and Tehran time. It labels stale/failed
cached rates clearly and does not claim realtime prices. Empty/unconfigured,
loading, service errors, invalid data, and cached offline data are separate states.

Default server polling is demand-driven at most every eight hours, with a
120/month call budget, request coalescing, and a 15-minute error cooldown.
This is deliberately conservative for the published free plan. Manual refresh
does not bypass server caching. Freshness is based on provider time (default
two hours), so a cached rate can correctly become stale before the next fetch.

## Deployment limits

This is a single-process preparation, not a production commercial backend.
The quote cache and quota counter are in memory and reset on restart. Before
release, persist the monthly quota/cached snapshot and verify provider HTTPS,
actual unit, licensed redistribution, hosting, CORS origins, and update cadence.
The API is public read-only, has a global request limiter, and logs no provider
URLs containing keys. Production CORS origins must be configured explicitly.

There is no database, account system, billing, synchronization, or alert backend.

## Checks

```sh
npm run check
dotnet test server/AltAir.MarketApi.Tests/AltAir.MarketApi.Tests.csproj
```

Automated checks cover quote validation, stale data, cache/error contracts,
transport restrictions, explicit rial/toman conversion, provider-call coalescing,
successful timestamp preservation, missing configuration, and monthly budget.
The CI has separate extension and market API jobs; it is not remotely run yet.

## Local development activation (2026-10-12)

The owner-provided key is stored in .NET user secrets. PriceUnit is toman.
LocalDevelopmentEnabled is enabled only in those local secrets.
A local preview bypasses the commercial redistribution gate only when the server
environment is Development AND the request peer is loopback. The verified unit
and API key are still required. Production redistribution remains false.
Restart the proxy after changing user secrets; never deploy with the local-preview
flag as a substitute for a confirmed commercial license.

## Favorite currencies

The plus control above the rate rows opens a checkbox picker in both Popup and
Side Panel. Supported codes are USD, EUR, GBP, AED, TRY, CAD, AUD, CHF, and CNY.
Preferences are stored separately at altAir.market.favorites, version 1. Changes
use an origin-scoped Web Lock and read the latest selection before writing;
storage events synchronize open views. Empty selection is allowed.

The existing /api/market/usd response remains backward compatible and now includes
a rates array with each currency's code, priceToman, and individual updatedAt.
The USD fields and shared fetchedAt/source/fetchFailed metadata remain unchanged.
Older cached USD-only responses still work; additional currencies show unavailable
until a new response supplies them. All prices use English digits and toman.

Navasan latest is fetched without an item filter, as documented at
https://www.navasan.net/en/api/webserviceguide/. Only the allowlisted currencies
are returned by the proxy. One invalid optional currency is omitted, not replaced
with a fake rate. All selections share the same provider request, cache, retry
cooldown, and monthly budget. Selecting more currencies does not add provider
requests. The current budget counter and cache are in memory and reset when the
service restarts; persistent accounting is required before production scaling.

Validation on 2026-10-12: 125 frontend tests and 15 backend tests passed, production
extension build passed, and the local authenticated proxy returned all nine
currencies. Repeated local reads reused the successful fetch timestamp. Browser
interaction and installed-extension visual checks remain pending.

## Daily change display

Each rate includes nullable changeToman from Navasan's change field (relative to
the previous day), converted with the same configured unit as its price. Missing
or invalid changes remain unavailable rather than becoming zero. The UI preserves
signed English numbers: positive green, negative red, zero neutral, unavailable
as a dash. A tooltip and expanded details specify toman and the comparison period.
Prices use 23px text in approximately 48px collapsed rows. Old cached responses
without changeToman remain compatible. A local live request confirmed daily
changes for all nine supported currencies.
