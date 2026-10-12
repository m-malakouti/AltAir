# Shared design system

## Scope

Popup and Side Panel share typography, semantic color tokens, glass surfaces,
buttons, notices, a brand header, theme controls, and a workspace shell.
This issue does not implement bookmarks, market data, accounts, or widget sorting.

## Tokens and components

- `styles/tokens.css`: dark/light semantic palettes, 4/8/12/16/24/32px spacing,
  12/16/20px radii, 16px blur, and 180ms interaction timing.
- `styles/base.css`: local Vazir faces, layout, shared component styles,
  keyboard focus, reduced motion, and solid-surface fallbacks.
- `components/ui/`: Button (primary/secondary/ghost), GlassCard, and Notice.
- `components/ThemeSelector.tsx`: native radio controls for light/dark/system.
- `components/WorkspaceShell.tsx`: shared header, main landmark, feedback, and footer.

Use semantic colors instead of raw color values in component styles. Text uses
foreground/muted tokens; success, warning, and error have separate surface pairs.
Glass blur is opt-in via `@supports`; without it, cards are solid. A reduced
transparency preference also selects solid surfaces. Reduced motion disables
transitions and animations. Essential controls do not depend on hover.

## Theme behavior and persistence

`features/appearance/` contains preference validation, theme resolution, the
external store, and its React hook. `lib/browser/theme-preference.ts` owns browser
storage access. Both entrypoints initialize the store before mounting React.

The canonical extension preference is `chrome.storage.local['altAir.theme']`:

```json
{ "version": 1, "mode": "system" }
```

Modes are `light`, `dark`, and `system`. Missing, malformed, or unknown-version
data defaults to system. System mode responds to live OS theme changes.

A best-effort localStorage cache avoids an initial incorrect theme when possible;
it is not the canonical extension data. Startup then reads extension storage.
Storage events synchronize the two extension surfaces. Writes are serialized,
and a revision guard prevents a slow startup read overwriting a newer selection.
Persistence failure keeps the selected appearance visible and provides a retry.

The localhost preview uses localStorage instead of privileged extension storage.
It supports visual preview, reload persistence, and cross-tab updates, but cannot
verify actual extension permissions or privileged Side Panel behavior.

## Accessibility verification

Automated tests derive the actual palettes from the CSS tokens and verify:

- normal text and semantic notices: at least 4.5:1;
- focus indicators against base/solid/soft surfaces: at least 3:1.

These tests cover defined color pairs, not every translucent rendered pixel.
Inspect the rendered glass surfaces in both themes in addition to token tests.

Manual acceptance:

1. Inspect Popup and Side Panel in light and dark.
2. Use Tab/Shift+Tab, Space/Enter, and native radio arrow keys.
3. Confirm focus remains visible and selected mode is announced by native radios.
4. Check the Side Panel at 320px and wider, with no horizontal overflow.
5. Select a mode, reopen/reload both surfaces, and confirm it remains selected.
6. Change one surface and confirm the other follows.
7. In system mode, change the device appearance.
8. Check reduced motion, reduced transparency, and solid fallback behavior.
9. Verify the Manifest requests only `sidePanel` and `storage`.
10. Repeat privileged storage and Side Panel checks in real Chrome and Edge.

## Limits

No third-party visual dependency or remote font is required. Tailwind remains
optional for future styling; the current shared CSS establishes the token system.
The original starter toolbar icons are still pending a separate brand-asset task.
