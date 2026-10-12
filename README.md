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
- No backend or local data features in this foundation.

The current styles are a minimal dark foundation. The complete light/dark theme
engine, glass components, and bundled Vazirmatn/Inter fonts belong to later work.
System fonts provide the current fallback.

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
permission from the Side Panel entrypoint. This is the only requested permission.
There are no host permissions, background service worker, or content scripts.

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
10. Verify the built Manifest requests only `sidePanel`, with no host access.

A production build and static checks do not replace these browser checks.
There is currently no automated test runner in the project.

## Dependency security

Audit checked on 2026-10-12:

- `npm audit`: 6 findings (3 high, 3 critical), all in development dependency chains.
- `npm audit --omit=dev`: 0 findings.
- Affected chains: `web-ext → @devicefarmer/adbkit → node-forge` and
  `web-ext → fx-runner → shell-quote`, with inherited findings on WXT.
- npm proposed breaking downgrades; no automatic fix or dependency upgrade was applied.

Investigate compatible dependency updates before release. A production-only audit
with zero findings does not establish overall security.
