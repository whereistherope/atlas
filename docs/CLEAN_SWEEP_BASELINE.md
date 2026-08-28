# Atlas clean-sweep baseline

Frozen reference: `2889607595ecabe23da3b560ee300b33b8d55249` (`v0.16.9-r25`).

This document records the production assembly before cleanup. It is an audit aid, not a new architecture contract.

## Production boot

Static CSS in `index.html`:

1. `styles/tokens.css`
2. `styles/app.css`
3. `styles/widgets.css`
4. `styles/map.css`

Static JavaScript in `index.html`:

1. `js/db.js`
2. `js/auth.js`
3. Supabase browser client
4. `js/cloud-config.js`
5. `js/cloud.js`
6. `js/cloud-backup.js`
7. `js/app.js`
8. `js/cloud-restore.js`
9. `js/relay.js`
10. `js/relay-transport.js`
11. `js/calendar.js`
12. `js/map.js`
13. `js/ui.js`
14. `js/widgets.js`
15. `js/bootstrap.js`

`bootstrap.js` then appends the current late CSS and JavaScript modules in serial source order. `tests/production_dependency_contract_test.js` derives that list from production files rather than duplicating it here.

## Safety boundaries for cleanup

Do not change during early cleanup:

- IndexedDB database/store/key names or migrations
- persisted profile IDs
- load/save/backup semantics
- Shared Atlas sync/recovery semantics
- auth/PIN behaviour
- network layout/physics/drag semantics
- widget visibility behaviour
- handle-scoped movable-window behaviour
- Day/Night persisted theme names

## Current cascade debt

The current visual result is assembled through a late override chain:

`theme-system.css` → `r18-stability-hotfix.css` → `r21-material-balance.css` → `r22-material-fields.css` → `r25-note-field-polish.css`.

The cleanup target is to preserve the final computed behaviour while moving ownership into canonical theme/material rules. Tests must describe the winning behaviour, not require those historical filenames to exist.

## Known audit candidates

These are candidates only. Nothing in this list is authorised for deletion until references and behavioural tests prove it safe.

- `styles/r18-stability-hotfix.css`
- `styles/r21-material-balance.css`
- `styles/r22-material-fields.css`
- `styles/r25-note-field-polish.css`
- `js/widget-visibility-hotfix.js`
- `js/capture-flow-fix.js`
- broad body observer in `js/window-drag-local.js`
- `js/window-drag.js`
- `js/sync-v2.js` (not `js/sync-v2-core.js`)
- `js/cloud-sync.js`
- `js/cloud-sync-hotfix.js`
- `js/sync-quarantine.js`
- `js/note-editor-loader-hotfix.js`
- older document variants not in the production loader
- service-worker-only assets that are not production boot dependencies
- `assets/lock-terrain.gif`
- historical backup/prototype files

## Definition of a safe cleanup step

Each cleanup change should:

1. start from protected `main` on a feature branch;
2. preserve the behaviour contracts in the Smoke Gate;
3. make one ownership/consolidation change at a time;
4. avoid mixing sync, graph, persistence and visual refactors in the same PR;
5. merge only after `smoke` passes and the branch is current with `main`.
