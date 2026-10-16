# Focus Time

Focus Time replaces the analog clock with a countdown while a session is running
or paused. The New Tab has an optional quiet view which hides other cards without
unmounting them. Exit restores the same workspace and drafts. The Side Panel uses
the same timer state. Tasks appear above advertisements and can prefill a session.
Completing a timer never marks a task done.

## Behavior

- Default focus/short/long durations are 25/5/15 minutes. Quick focus presets are
  25/45/60; custom durations accept 1–180 minutes. Short/long breaks accept 1–60
  and 1–120 minutes. Changes apply to future phases.
- A session can run, pause, resume, finish, or be cancelled after confirmation.
  Paused time is excluded from focus duration. A cancelled focus records elapsed
  focus time separately from a complete session. Breaks are not focus time.
- Each complete focus suggests a short break, except every fourth complete focus
  suggests a long break. Breaks lead back to focus. Skipping a break is explicit.
- Automatic transitions default to off. If enabled, a focused, visible workspace
  can start the next phase within ten seconds of the previous deadline. Restoring
  after sleep or a long absence completes only the expired phase and waits for the
  user. No sequence of unattended sessions is created.
- Daily totals use Tehran days and attribute a session to its completion or
  cancellation day. The last 2,000 focus records are retained locally; the UI
  shows the latest five. Active/paused sessions are not in daily totals.

## Persistence and reminders

`altAir.focus.v1` contains validated preferences, current session, completion count,
and history. All writes reread state under an exclusive Web Lock. Session IDs
prevent stale controls from affecting a new session. Views and the worker reconcile
expired sessions idempotently.

The timer stores an absolute deadline and pause remainder instead of saving every
second. Rendering ticks do not determine elapsed time. The worker schedules one
`alarms` reminder and reconstructs it when it starts. Closing all workspace tabs
does not require keeping a page alive. A closed browser cannot notify; the session
is reconciled on reopening. Browser alarms may be delayed by device sleep, but the
recorded end time remains the deadline. System wall-clock changes affect absolute
deadlines; remaining time is bounded by the last saved remainder.

Notifications are optional and permission is requested from the explicit settings
control. Denying it leaves the timer usable. Notifications exclude task titles and
are claimed once across views. Notifications more than five minutes late are not
replayed. Clicking one opens the workspace. Native notification sound depends on
the operating system. With notifications disabled, an opted-in local tone plays
in an open view after user interaction unlocks audio. The localhost preview
uses localStorage and page reconciliation; it has no extension background worker
or native notifications. No server, account, or remote service is involved.

## Acceptance checks

1. Reload the unpacked extension from `.output/chrome-mv3` after this update.
2. Start one-minute focus sessions with and without a task. Verify the countdown
   replaces the clock and pause/resume excludes the pause interval.
3. Open New Tab and Side Panel together; pause in one, resume in the other. Reload
   either and verify the same session and remaining time.
4. Close workspace tabs while keeping the browser open. Reopen after the deadline:
   exactly one completion and one break suggestion should exist.
5. Opt into notifications; verify one end notification. Repeat with access denied,
   notifications off, and after restarting the browser.
6. After sleep beyond the deadline, verify no automatic unattended phases. With a
   focused page and auto-start enabled, verify one transition even with two views.
7. Check cancellation confirmation, incomplete records, fourth-session long break,
   task selection, unchanged task completion state, and Tehran totals.
8. Check keyboard controls, narrow widths, light/dark themes, and quiet view draft
   preservation on exit.

Unit tests cover lifecycle, recovery, stale commands, shared writes, storage failure,
validation, alarm restoration, and notification deduplication. Automated tests and
the localhost preview do not replace installed-extension checks.
