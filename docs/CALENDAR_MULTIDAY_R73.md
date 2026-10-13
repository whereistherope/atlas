# Calendar multi-day events — r73

Atlas calendar events now support an optional inclusive `endDate`.

## Persisted contract

- `date` remains the start date.
- `endDate` is optional. Empty or missing means a normal one-day event.
- A multi-day event exists only when `endDate` is later than `date`.
- Data version 9 adds an empty `endDate` to existing calendar records and clears invalid ranges. The normal pre-update IndexedDB snapshot protects the previous state before migration.
- Entangled Us copies mirror `endDate`.
- Canonical record sync carries the field automatically as calendar entity data. Manual backup/restore allowlists also preserve it.

## Interaction

The normal event form stays unchanged until **Spans multiple days** is selected. Atlas then reveals an end-date field, seeded to the following day.

Travel uses the same field but labels it **Arrives on another date / Arrival date**, and arrival time-zone conversion uses that arrival calendar date.

## Presentation

- The month view renders the same event ID on every included date with start, continuation and end styling.
- The visual span breaks cleanly at week boundaries and resumes on the next row.
- Upcoming surfaces include events whose ranges overlap the requested window, including events already underway.
- Atlas House and legacy House mini calendars mark every included date.
- Clicking any displayed segment opens the one underlying event, so edit/delete never creates or manages duplicate day records.
