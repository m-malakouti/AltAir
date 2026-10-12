# Weather and New Tab

Alt Air includes Popup, Side Panel, and a New Tab override. New Tab reuses the
workspace UI and storage adapters with a wider layout. Its manifest entry is
chrome_url_overrides.newtab = newtab.html. Chrome may ask the user to keep the
new tab replacement. Existing bookmarks, theme, and favorite currencies are shared.

## Minimal weather

The first use asks for a city; there is no implicit city or GPS access.
Search goes through the local proxy, and results include region and country.
The chosen city is stored under altAir.weather.city and synchronized between views.
Only the chosen city's coordinates are sent for forecasts, not browser location.
No additional browser permissions are introduced.

The compact row shows city, condition icon, and Celsius temperature with English
digits. Expanded details show the report time, source attribution, refresh, and
an icon for changing cities. The last validated report is stored locally with its
coordinate key. Switching cities never displays the former city's temperature.
Reports older than one hour and failures are marked stale. Requests time out after
12 seconds, and replaced searches/forecast requests are aborted. Cached successful
forecasts are reused for 15 minutes in the client and server. No weather calls are
made before selecting a city. Search accepts 2–80 characters and returns up to six
results; English spelling can help when a local name is not found.

## Service

GET /api/weather/cities?name=... proxies Open-Meteo geocoding.
GET /api/weather/current?latitude=...&longitude=... returns normalized Celsius,
WMO code, day/night, observedAt, and fetchedAt. Coordinates and response fields are
validated, endpoints are rate limited, and weather requests are coalesced on the
server. Weather is independent of the Navasan API key.

The public Open-Meteo API is for non-commercial use. The current implementation
therefore enables these endpoints only in Development for loopback clients.
Before commercial distribution, configure an authorized commercial provider and
replace the development gate. Do not distribute this local development service
as a production weather API.
Sources:

- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api
- https://open-meteo.com/en/terms

## Verification

156 extension tests, 31 backend tests, and the extension build passed.
A real local geocoding request and weather request succeeded. The test did not
save a default city. The built manifest contains all three surfaces and retains
only storage, sidePanel, and the configured local proxy host permission.
Installed-browser UI checks remain pending.

Reload the unpacked extension, then:

1. Open a new tab and confirm the Alt Air workspace appears.
2. Search and select a city, then save with the check icon.
3. Open Popup and Side Panel; verify the same city and data.
4. Change cities; verify no previous-city temperature is shown while loading.
5. Test offline behavior, stale labels, icon keyboard access, and narrow layouts.
