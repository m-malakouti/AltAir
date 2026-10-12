# Persian calendar Hero

The Side Panel and New Tab Hero show today's Persian date, a Tehran clock,
Gregorian date, and an RTL Saturday-first monthly calendar. It works offline.
Date conversion uses the browser's Intl Persian calendar, explicitly in
Asia/Tehran. The view refreshes at most every 30 seconds and on focus/visibility.

## Holiday provenance

Only 1405 is verified. The 26 distinct public-holiday dates were transcribed from
the final official University of Tehran Calendar Center calendar, checked
2026-10-13. Source PDF pages 3–14 (one-based):
https://calendar.ut.ac.ir/documents/2139738/7092644/Calendar-1405.pdf/64228cbb-f4de-dc32-4d2b-57db3c8e322f?t=1761972997587

Monthly counts excluding ordinary Fridays: 7, 0, 3, 2, 4, 1, 0, 1, 0, 2, 2, 4.
Some holidays overlap each other or Fridays. Combined labels preserve overlapping
occasions, e.g. Nowruz/Eid and Ghadir/14 Khordad. Only entries marked as holidays
in the official calendar are included; ordinary observances are not holidays.

The UI links to the source and distinguishes weekly Fridays from named holidays.
Unverified years show an explicit coverage notice, never a claim of no holidays.
Emergency, provincial, and subsequently announced closures are outside this
versioned offline dataset. There is no lunar-date approximation or live update.
Before adding a year, obtain its final official calendar, verify each date, add
provenance and regression tests, then extend the UI coverage metadata.
