# AltAir360

Your Space. Your Tools.

Persian (fa-IR), RTL browser extension for Chrome and Microsoft Edge, built with
WXT, React, TypeScript, and Manifest V3.

## Extension Foundation scope

- Compact branded Popup with an action to open the Side Panel.
- Minimal React Side Panel with shared brand header and base styles.
- Browser API calls isolated in `lib/browser/side-panel.ts`.
- Persian document language, RTL direction, and UTF-8 metadata on both pages.
- TypeScript strict mode.
- Local free features remain independent of the optional market proxy.

The shared design system includes glass surfaces, semantic color tokens, light/dark
and system themes, persistent appearance preferences, and keyboard focus styles.
See [design system](docs/design-system.md) for behavior and acceptance checks.
Vazir 13.0.1 is bundled locally in regular, medium, and bold weights for offline use.
Font source and licenses are included in public/fonts/vazir.

## Free bookmark foundation

Versioned local bookmark and category storage, immutable CRUD, Persian search,
URL validation, and coordinated writes are implemented. The Side Panel includes a bookmark manager with compact icon-only add, edit, delete, and search controls. Import/export is a future issue. No account or network connection is required.
See [bookmark storage](docs/bookmark-storage.md).

## Development

Commercial planning is maintained in the reusable
[`altair-commercial` skill](skills/altair-commercial/SKILL.md), with its Persian
[commercial blueprint](skills/altair-commercial/references/commercial-blueprint.md).
It covers proposed sponsored placements, valid-click billing, dashboards and
rollout; it does not activate advertising or tracking.

Use Node.js 24 and npm. Install dependencies with `npm ci`, then run:

```sh
npm run dev
npm run compile
npm run build
```

On Windows, use `npm.cmd` if PowerShell script policy blocks `npm`.
The production extension is generated at `.output/chrome-mv3`.

## Permissions and browser support

WXT derives `side_panel.default_path: "sidepanel.html"` and the `sidePanel`
permission from the Side Panel entrypoint. The storage permission persists the
appearance preferences, market cache, and bookmarks in chrome.storage.local.
An optional market proxy adds host access only for its configured origin. A background
service worker uses `alarms` to restore Focus Time deadlines. Notifications are an
optional permission requested only when enabled in Focus Time settings. There is no
content script.

## Focus Time

The clock becomes a shared focus timer with pause/resume, task selection, short and
long breaks, optional quiet view, sound, notifications, and local daily totals.
Defaults are 25/5/15 minutes with a long break every four completed focus sessions.
Starting the next phase is manual by default. See [Focus Time](docs/focus-time.md)
for recovery behavior, limits, and installed-extension acceptance checks.

The minimum Chrome version is 116 because opening the Side Panel from the Popup
uses `sidePanel.open()`. Edge must support the same API; verify with a current
Edge build before declaring compatibility.

## Manual acceptance check

1. Build the extension.
2. In Chrome, open `chrome://extensions`; in Edge, open `edge://extensions`.
3. Enable Developer mode and load `.output/chrome-mv3` as an unpacked extension.
4. Open the Popup and check AltAir360 branding, Persian text, RTL layout, and title.
5. Use Tab to focus the Side Panel button; check visible focus and activate with Enter.
6. Confirm the Side Panel opens in the current browser window and the Popup closes.
7. Confirm the Side Panel renders Persian text and remains usable at narrow widths.
8. Navigate to another tab and verify the global panel remains available.
9. Inspect both pages for console errors. Reload the extension and repeat.
10. Verify the built Manifest requests only `sidePanel` and `storage`, plus only the configured market proxy origin when enabled.

A production build and static checks do not replace these browser checks.
Vitest covers the browser-adapter contracts. Run `npm run check` for formatting,
lint, TypeScript, tests, and build. See [engineering standards](docs/engineering.md)
for architecture, workflow, and CI details.

## Dependency security

Audit checked on 2026-10-12:

- `npm audit`: 6 findings (3 high, 3 critical), all in development dependency chains.
- `npm audit --omit=dev`: 0 findings.
- Affected chains: `web-ext → @devicefarmer/adbkit → node-forge` and
  `web-ext → fx-runner → shell-quote`, with inherited findings on WXT.
- npm proposed breaking downgrades; no automatic fix or dependency upgrade was applied.

Investigate compatible dependency updates before release. A production-only audit
with zero findings does not establish overall security.

## Market API preparation

The Navasan USD widget and ASP.NET Core proxy support a verified local development
connection with prices in toman. Production use requires server configuration and
redistribution approval; API credentials stay outside extension source and output.
See [market setup and limitations](docs/market-api.md).

## New Tab and weather

Popup, Side Panel, and New Tab share the workspace preferences. A minimal weather
widget asks for a city on first use. See [weather and New Tab](docs/weather-newtab.md)
for local setup, commercial-provider requirements, and acceptance checks.

New Tab also includes a persistent «نمای آرام» toggle: a scenic background,
centered digital clock, and compact weather in the upper right. When connectivity
is lost, a locally rendered animated space scene offers retry and automatic recovery.
Return with the same control or Escape; unsaved workspace drafts stay mounted.
See [ambient view](docs/ambient-view.md) for behavior and verification.

Live scores limit simultaneous ESPN requests to four. Automatic polling pauses
after a failed refresh; use the refresh button or reconnect to retry. Fetching is
also paused while the New Tab ambient view is active.

## Movable workspace and sticky notes

Side Panel and New Tab contain four independently movable sections: bookmarks,
weather, currencies, and notes. Drag a section by its grip onto another section,
or use the up/down buttons (also usable with keyboard or touch). Order is saved
locally and shared between workspace views.

Sticky notes support adding, editing, three colors, and confirmed deletion.
Press Save after editing; unsaved changes are explicitly indicated. Notes stay
on this device in extension storage. Storage writes use an exclusive Web Lock
and preserve other notes written by another open view.

Weather shows a horizontally scrollable forecast for the next 24 hours, including
temperature, conditions, and precipitation probability. Times use the selected
city's timezone. The backend requests hourly data from
[Open-Meteo](https://open-meteo.com/en/docs), caches it for 15 minutes, and omits
elapsed forecast hours. Restart the local API after updating its code and reload
the extension. Old weather caches remain readable and trigger an hourly refresh.

## Custom page layout

The New Tab uses a 12-track CSS Grid inspired by
[Grid by Example: Nested Grid](https://gridbyexample.com/examples/example21/).
Calendar, bookmarks, weather, currencies and notes participate in the same grid;
the calendar defaults to 8 tracks and other cards to 4. Each widget contains its
own inner layout. Below 900px the cards use the full width for readability.

The icon-only customization control reveals drag handles, accessible previous/
next controls, width cycling (4/6/8/12), taller-card toggle, visibility toggles,
and layout reset. Changes persist in `altAir.workspace.layout.v2`, synchronizing
open views. Existing v1 order is migrated without rewriting user content. Hidden
widgets remain mounted so unsaved drafts survive hide/show. Reset affects only
layout. Calendar date numbers remain visible; action buttons use icons with
accessible names and tooltips.

## Search and commute carousel

New Tab groups Google search and bookmarks on the first slide and home/work
commuting on the second. Icon tabs, arrow/Home/End keys and touch control a
responsive slider with automatic content height and reduced-motion support.
Home/work addresses stay in local browser storage. The second slide now uses
Google Maps Embed API for displaying driving directions, distance and travel time
inside Google's map. Set `WXT_GOOGLE_MAPS_EMBED_KEY` and rebuild to activate it.
Existing saved addresses are preserved. The map loads only on the active slide;
this mode does not select coordinates into the form or call the Neshan backend.
See [commute setup and behavior](docs/commute.md).

## Local asset portfolio

New Tab and Side Panel include a local portfolio for currency, gold, coins and
crypto holdings. It values quantities using the shared market snapshot, shows
toman/rial/USD/BTC equivalents, labels stale or incomplete estimates, and masks
private numbers with a persistent eye control. No account is required and holdings
are not sent to the server. See [portfolio behavior and checks](docs/portfolio.md).

## Sponsored image and GIF placements

The local admin dashboard manages image/GIF campaigns and multi-slide creatives, scheduling, placement and a global stop switch. New Tab and Side Panel fetch eligible campaigns independently of personal bookmarks. Users can hide a brand or disable ads; ambient/offline views remain ad-free. See [advertising](docs/advertising.md).
