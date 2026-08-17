# Atlas architecture (v0.12.4)

Atlas is a framework-free, browser-based local-first PWA. The v0.12 refactor separates the previously inline implementation without changing the DOM contracts, data schema, migrations, or user-facing design.

## File layout

- `index.html` contains metadata and the stable application DOM shell. Styles and deferred classic scripts use relative URLs for GitHub Pages project deployments.
- `styles/tokens.css` owns day/night colour, shadow, and shared design tokens.
- `styles/app.css` owns the shell, shared controls, overlays, editor, calendar, lock screen, and responsive foundations. It intentionally retains historical override order; later rules are the effective refinements.
- `styles/widgets.css` owns the workspace board, widget zones, widget surfaces, and compact widget internals.
- `styles/map.css` owns the later Nodes/List/Predict presentation and refinements.
- `js/db.js` owns constants, initial/demo data used only for a genuinely new install, data normalization, all historical migrations, IndexedDB transactions, and backup primitives.
- `js/auth.js` owns Atlas Lock cryptography, four-digit PIN flows, recovery, throttling, and idle/session locking.
- `js/cloud-config.js` contains only the browser-public Supabase project URL and publishable key. `js/cloud.js` owns the optional Supabase Auth client and read-only RLS access test.
- `js/app.js` owns loading/saving, shared selectors, profile/space filtering, theme application, and primary non-calendar views.
- `js/relay.js` owns the local-only Relay Envelope v1 validation, deterministic target preview, note create/append ingestion, provenance, and idempotent receipt interface. It contains no transport or network integration; see `docs/ATLAS_RELAY.md`.
- `js/calendar.js` owns calendar rendering and linked `Us` Entangle event synchronization.
- `js/map.js` owns graph data, spherical layout, camera state, Nodes rendering, pan, and zoom.
- `js/ui.js` owns capture/search/editor overlays, menus, import/export, shared event delegation, and editing actions.
- `js/widgets.js` owns persisted widget layout and interaction plus the List and Predict extensions. Its final render functions intentionally extend/replace the base render hooks defined earlier.
- `js/bootstrap.js` starts Atlas only after all modules are evaluated and registers `sw.js`.
- `sw.js` provides the versioned application-shell cache and network-first updates with offline fallback.

The JavaScript files remain ordered classic scripts rather than ES modules. This preserves the original shared lexical bindings and inline-event-free runtime while allowing responsibility-based maintenance. Load order is therefore an API and must not be rearranged casually.

## Boot sequence

1. The browser parses the unchanged shell and downloads deferred styles/scripts.
2. `db.js` establishes constants, the state shape, normalization/migrations, and storage functions.
3. Auth and runtime establish their primitives, Relay establishes its receiving interface, then calendar, map, UI, and widget/view extensions establish their handlers in dependency order.
4. `bootstrap.js` calls `load()`.
5. `load()` opens IndexedDB, reads the existing state, snapshots it before an app/data-version transition, applies existing migrations in memory, and saves the compatible result. Demo data is selected only when neither IndexedDB state nor a recognized legacy record exists.
6. The UI renders and Atlas Lock initializes from its separate auth store.

Cloud initialization is started independently and is never awaited by `load()`. A missing CDN library, offline browser, expired session, or Supabase error therefore changes only the Sync widget status; local boot and IndexedDB use continue normally. Atlas Lock is the local device/application lock, while Supabase Auth is a separate cloud identity and session managed by the official client.

## Persistence compatibility contract

Current stable identifiers are:

| Purpose | Identifier |
| --- | --- |
| IndexedDB database | `atlas_personal_os` |
| IndexedDB version | `3` |
| State store / key | `state` / `atlas-v1` |
| Backup store | `backups` |
| Auth store / key | `auth` / `atlas-lock` |
| State fallback | `atlas_v1_fallback` |
| Auth fallback | `atlas_lock_config_v1` |
| Legacy imports | `groundOpsControlBoard_v2`, then `groundOpsControlBoard_v1` |
| Current data version | `8` |

v0.12.4 makes no data migration and changes none of these identifiers. IndexedDB remains the current source of truth; no Atlas content is uploaded by the cloud connection layer.

The database upgrade creates missing stores only. It does not clear or recreate stores. Data migrations retain the original migration sequence, and a version/app transition creates a timestamped backup before normalization is persisted. JSON import also creates a pre-import backup. Manual reset remains an explicit user action in the editor and must never become part of boot or deployment.

Profiles use stable IDs (`me`, `alyssa`, and `us`). Filtering is applied to Areas, links, projects, notes, daily entries, quick todos, scratch state, events, activity, and rendered graph data. Entangle creates or updates a linked `us` calendar record through `entangledId`/`sourceEventId` rather than merging profile calendars.

Data version 7 additively initializes `relayReceipts` in the primary state record. Data version 8 additively initializes the `relayLedger` object, which durably retains compact accepted-request fingerprints independently of the newest-200 receipt UI history. Existing version-7 receipts are preserved and seed conservative ledger entries; no existing content is replaced. Neither migration changes the IndexedDB schema, database/store/key names, or prior records, and the normal pre-migration backup path protects the loaded snapshot before it is saved. Optional `relaySource`/`relaySources` metadata lives on Relay-touched normal notes; non-Relay notes require no new fields.

## CSS audit and cascade

The pre-refactor stylesheet accumulated sequential release passes (`0.10.2` through `0.11.3`). Many later selectors intentionally override earlier shell, command-rail, map, panel, and responsive declarations, frequently with higher specificity or `!important`. Removing those apparent duplicates during a structural refactor would change computed layout. The extraction therefore preserves source order across `tokens.css`, `app.css`, `widgets.css`, and `map.css`. Consolidation should be a separate visual-regression task.

## Offline and GitHub Pages

All application URLs are `./` relative. `manifest.webmanifest` keeps a relative ID, start URL, scope, and icon paths. The service worker caches the HTML shell, manifest, icons, all extracted styles, and all extracted scripts. Navigation remains network-first and falls back to cached `index.html`/`./`; same-origin assets are refreshed network-first and served from cache offline.

When adding an offline-critical local file, add it to `APP_SHELL` and increment `CACHE_NAME`. Do not change paths to root-absolute URLs because `/` points outside a GitHub Pages project deployment.

The pinned Supabase UMD dependency is remote and deliberately excluded from `APP_SHELL`, so installing or loading the local shell never depends on the CDN. Local `cloud-config.js` and `cloud.js` are cached.

## Safe change checklist

1. Read `AGENTS.md` and identify all persisted names touched by a change.
2. Keep migrations additive and backup before transforming existing records.
3. Verify profile isolation and Atlas Lock independently.
4. Verify persisted widget layout, map modes, calendar/Entangle, and themes after reload.
5. Test both online first-load and offline reload from a non-root path when deployment-related files change.
