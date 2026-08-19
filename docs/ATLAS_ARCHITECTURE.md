# Atlas architecture (v0.12.8)

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

v0.12.8 makes no data migration and changes none of these identifiers. IndexedDB remains the current source of truth.

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

## v0.12.5 Me cloud backup boundary

The first cloud content path is `js/cloud-backup.js`, loaded after the connection layer and before the runtime. It creates a field-whitelisted, canonical Me snapshot from profile-owned areas, safe intra-Me links, projects and nested work items, notes, daily entries, calendar entries without Entangle linkage, quick todos, and Me scratch. Missing legacy `profile` values follow the existing Me ownership convention. UI settings, layouts, activity, Relay metadata, Alyssa/Us records, Atlas Lock/auth stores, Supabase sessions, and credentials are excluded.

`js/cloud.js` exposes only purpose-specific existence and append methods. Before every records query or insert it re-resolves the authenticated user's unique owned `Atlas` vault and exact owned `me` person profile. Rows are append-only `backup_snapshot_v1` records addressed by the canonical payload's SHA-256 fingerprint, independently recomputed and validated at the transport boundary. `client_updated_at` is the validated positive integer millisecond value written to the existing bigint column, not ISO text. IndexedDB identifiers and `DATA_VERSION = 8` are unchanged; no local migration or restore occurs.


## v0.12.6 safe Me cloud restore/pull boundary

`js/cloud-restore.js` provides a deliberately manual Me-only recovery path: **Preview restore → Restore Me**. Preview reads exactly the newest append-only `backup_snapshot_v1` row for the freshly re-resolved authenticated user's owned `Atlas` vault and exact `me` person profile. It independently validates the untrusted row, validates the exact payload shape and recursive values, rejects future data versions and security/auth, Relay, or Entangle fields, re-canonicalises the payload, and requires its SHA-256 fingerprint to equal `record_id`. A corrupt newest row is rejected rather than skipped. No restore is triggered by boot, sign-in, Test Access, reconnect, recency, or background work, and the restore path performs no cloud mutation.

Preview does not mutate memory or storage and retains only the remote record ID plus a fingerprint of the current cloud-backed local Me slices. Confirm rechecks profile/auth/online/Test Access eligibility, recomputes that local fingerprint, re-fetches the exact prepared row, and repeats transport validation and hashing. A changed local Me snapshot requires a new preview. Confirm builds from a clone of the current full state, replaces only Me areas, safe links, projects, notes, daily, calendar, quick todos, and `scratch.me`, and preserves matching local-only fields (including Relay provenance and local Entangle linkage). Remote Entangle/Relay metadata is never accepted. Snapshot absence removes only cloud-backed Me records; Alyssa, Us, profiles, settings/theme/layout/map/navigation, activity, Relay receipts/ledger, Atlas Lock, Supabase auth, and unrelated top-level state remain untouched.

Immediately before persistence, Confirm writes one full copy of the current state through `idbBackup()` with a restore-specific reason. It then uses the strict IndexedDB state write directly and changes the in-memory state only after that write succeeds. IndexedDB remains Atlas's normal source of truth. Prepared restores are invalidated by profile changes, sign-out/auth or verification loss, access errors, offline transitions, and every terminal Confirm attempt. Alyssa and Us remain `LOCAL ONLY`.

Confirm closes asynchronous edit races by checking the local Me fingerprint both before and after the exact remote fetch, cloning the bound full local state, and checking again after the safety-backup await. A non-persisted interaction guard blocks normal Atlas UI mutations throughout the backup/write critical section and is always removed on success or failure. Remote validation also enforces graph integrity: area IDs are non-empty and unique, area parents remain inside the snapshot (or the historical Atlas root), and every link/project/note/daily/calendar area reference resolves inside that same Me snapshot. Broken references reject the entire row; Atlas never repairs or redirects them during restore.

## v0.12.7 authenticated Relay transport boundary

`js/cloud.js` adds three narrow Me-only operations over the existing RLS-protected `atlas_records` table: append, list, and exact get for `relay_envelope_v1`. Every operation freshly resolves the authenticated user's exact owned Atlas vault and `me` person profile and requires successful Test Access. Rows are insert-only; duplicate IDs are independently re-read and re-hashed, returning a no-op only for identical envelopes and a conflict for changed content. Relay transport never updates, upserts, deletes, or exposes the Supabase client.

The exact payload has four top-level fields: `schema: "atlas_relay_envelope"`, `version: 1`, `fingerprint: "sha256-…"`, and the existing Relay v1 `envelope`. The fingerprint is SHA-256 over deterministic canonical JSON for the envelope. Reads validate profile, type, IDs, schema and versions, operation, object shapes, a 512,000-byte hard ceiling, and fingerprint as untrusted input. The ceiling remains bounded while accommodating the local Relay contract's approximately 100,000-character bodies even when they use multi-byte UTF-8. Each row in a bounded list is validated independently: malformed or tampered rows become sanitized rejection descriptors, never expose their envelope, and do not prevent valid neighbouring rows from continuing. Atlas never repairs, skips, updates, or deletes those rows.

`js/relay-transport.js` is a read-only runtime bridge. Only an explicit **CHECK CLOUD** action fetches the newest 50 Me rows. Cloud-boundary rejections are displayed without being passed to local Relay; validated envelopes alone proceed to `AtlasRelay.validate()` and `AtlasRelay.preview()`. The bridge compares IDs with the unchanged local `relayLedger` and prepares compact pending/already-accepted/rejected UI results. It never calls `AtlasRelay.ingest()`, saves, or mutates Atlas state. Auth, session, RLS, or access failures invalidate verified readiness; malformed envelope data alone does not masquerade as auth loss. Auth loss, Test Access loss, offline state, or leaving Me discards the in-memory result. There is no boot/reconnect/sign-in fetch, timer, background polling, Alyssa/Us cloud Relay, ChatGPT sender, automatic ingestion, cloud overwrite/delete, or change to local-first authority.


## v0.12.8 isolated automatic Relay ingress

Automatic Send-to-Atlas transport is separate from the main Supabase backup/restore client. It uses only the isolated Relay project's `fetch_atlas_relay` and `ack_atlas_relay` RPCs. The user-supplied access key is stored under `atlas-relay-access-v1` as a separate record in the existing `auth` object store; it is never placed in the primary Atlas state record. The database version remains 3 and data version remains 8.

Only Me receives isolated cloud Relay instructions. Atlas validates each untrusted envelope, ingests it into local IndexedDB, and then acknowledges compact status metadata. The persisted relay ledger makes an acknowledgement retry idempotent after a successful local save. Main cloud backup/restore, Atlas Lock, Alyssa, and Us remain independent.
