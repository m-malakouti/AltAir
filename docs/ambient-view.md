# Ambient New Tab view

The floating «نمای آرام» button on New Tab switches to a full-window scenic view:
a large digital clock with Latin numerals and a compact
current-temperature/city control at the upper right. There is no greeting, date,
or closing line beneath the clock in the connected state. Time uses
Asia/Tehran, consistently with the workspace clock. This is a visual view inside
the browser, not an operating-system security lock.

Ambient mode rotates bundled Iranian nature photographs every two hours, separately
from the saved workspace background. Every four consecutive scenes contain three
daytime landscapes and one night sky; the night photographs alternate between
the Milky Way over Damavand and Lut Desert. Absolute two-hour time slots keep tabs
and reloads synchronized, and focus/visibility updates catch up after sleep.
No remote photo request or API key is needed at runtime. Photo attribution and
license links remain accessible at the bottom. The online clock is raised by 10%
of viewport height (bounded to 32–110px) above its previous centered position.
The clock follows Momentum's default typography: locally bundled Pretendard on
Windows, weight 500, 152px desktop size, -4px tracking, 1.15 line height, and a
slightly raised colon. Compact heights and mobile widths use smaller sizes.
The previous text outline and heavy shadows are removed; a soft, borderless scrim
preserves contrast over bright photos. The Persian interface retains Vazirmatn.
The navigation control retains a frosted surface with an opaque fallback for
unsupported blur and reduced transparency.

Clock digits count upward on entry and whenever their value changes, including
9-to-0 rollovers. Each transition settles in 850ms; time is still read directly
from the current Tehran time, so returning to a backgrounded tab cannot create a
backlog of missed minutes. Reduced-motion preferences show the final value directly.
The accessible time label reports only the actual time, hiding decorative reels.

The offline scene's Persian copy uses locally bundled Estedad, selected as a
compact, low-contrast Persian companion to the clock's Pretendard. The rest of the
Persian interface retains Vazirmatn. The collapsed weather control has no fill,
border, shadowed panel or backdrop blur; only text shadows preserve legibility.
The expanded city picker retains its solid surface for readability.
Live score fetching is paused in ambient mode while its existing state stays mounted.

The same WeatherCard instance switches between detailed and compact rendering.
City choice, cache, stale-data indicators, and refresh behavior remain shared;
ambient mode always shows current weather even when a calendar date was selected.
Selecting the compact control opens the existing city picker. No city or unavailable
weather uses an explicit placeholder; no synthetic temperature is displayed.

The view is stored as `workspace` or `ambient` at `altAir.workspace.view.v1` in
extension local storage (localStorage in browser previews). Writes are serialized
and changes propagate to other New Tab pages. A failed save leaves the chosen view
usable and offers retry. Side Panel and Popup keep their regular composition.

The workspace remains mounted while hidden, preserving unsaved inputs, notes, and
focus-timer state. «بازگشت به میزکار» or Escape restores it. If the city picker is
open, the first Escape closes the picker and the next returns to the workspace.
This view does not stop a running focus timer or its configured alerts.

## Offline scene

Ambient mode replaces the photo with a local navy/lavender space illustration
when the browser reports offline, or after two failed connectivity checks.
The clock keeps running above a floating cloud, ringed planet and satellite.
Weather is hidden in this scene. The retry control checks connectivity immediately;
successful checks restore the scenic view automatically. Reduced-motion disables
the decorative animation. All illustration, gradients and fonts are bundled locally.

`navigator.onLine === false` shows «اینترنت قطع است» immediately. Since an active
network adapter does not guarantee Internet access, visible ambient pages also
probe `https://www.gstatic.com/generate_204` and
`https://cp.cloudflare.com/generate_204` every 30 seconds, on reconnect, and on
returning to a visible tab. Requests omit credentials and referrers, bypass cache,
and time out after six seconds. The extension declares these two host permissions.
One reachable provider suffices; both must fail twice (three seconds between
rounds) before showing «دسترسی به اینترنت برقرار نیست». A blocked provider alone
does not trigger the scene. Failure of both providers can also indicate filtering
or a captive portal, so this state does not claim the whole Internet is down.
Local API availability and ESPN failures do not determine connectivity.

Checks pause when the page is hidden and stop on leaving ambient mode. Browser
online/offline events trigger recovery or an immediate disconnected state. No
bookmarks, city, workspace contents or user identifiers are sent in these checks.

## Verification

- Run `npm run check` (view storage tests cover startup races, rapid toggles,
  changes from another tab, and failed writes).
- In New Tab, type an unsaved task or note; toggle ambient and back; confirm the
  draft remains. Verify Escape from both the picker and ambient view.
- Reload with ambient selected and verify restoration; open another New Tab and
  check that mode changes propagate.
- Check light/dark workspace themes, photo choices, keyboard focus, and 320px width.
- Disconnect networking in ambient mode: confirm the local scene and ticking clock,
  then reconnect and confirm automatic restoration. Check the retry control,
  reduced-motion, and both probe providers blocked versus only one blocked.
- With the weather backend available, choose a city and confirm the compact value
  matches the current detailed report. Check offline/stale and no-city states.
- Reload the installed extension for final Chrome/Edge acceptance; localhost
  preview does not exercise extension storage or privileged browser APIs.
