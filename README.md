# Alt Air

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
An optional market proxy adds host access only for its configured origin. There is no background service worker or content script.

The minimum Chrome version is 116 because opening the Side Panel from the Popup
uses `sidePanel.open()`. Edge must support the same API; verify with a current
Edge build before declaring compatibility.

## Manual acceptance check

1. Build the extension.
2. In Chrome, open `chrome://extensions`; in Edge, open `edge://extensions`.
3. Enable Developer mode and load `.output/chrome-mv3` as an unpacked extension.
4. Open the Popup and check Alt Air branding, Persian text, RTL layout, and title.
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
