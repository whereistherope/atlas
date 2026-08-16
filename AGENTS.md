# Atlas development rules

These rules apply to the entire repository.

## User data is a compatibility contract

- **Never delete, clear, reseed, or replace an existing IndexedDB database during an application update.** Do not call `indexedDB.deleteDatabase`, clear an object store, or overwrite a readable state with demo data.
- Keep the database name, object-store names, primary state key, fallback local-storage keys, auth key, and profile identifiers stable. Existing values are documented in `docs/ATLAS_ARCHITECTURE.md`.
- Database upgrades must be additive. Preserve every prior migration, migrate a cloned/loaded value rather than creating a replacement, and make a backup before changing persisted data.
- Treat `Me`, `Alyssa`, and `Us` profile IDs and isolation rules as persisted API values, not display-only labels.
- Keep Atlas Lock configuration independent from application state. Preserve the four-digit PIN, recovery, throttling, session unlock, and idle-lock behavior.
- Never use demo state because a migration failed. A failure must leave the original IndexedDB record intact and should fall back only to an already-existing compatible fallback record.
- Any intentional schema change requires a documented migration, a data-version increment, upgrade/backward-compatibility tests, and review focused on data loss.

## Architecture and compatibility

- Keep Atlas framework-free unless a separately approved architectural decision establishes a strong reason otherwise.
- Preserve the script order in `index.html`: storage and migrations, auth, runtime, calendar, map, UI, widgets/views, then bootstrap.
- Preserve relative URLs so the app works at a GitHub Pages project path rather than only at `/`.
- Add every new offline-critical asset to `APP_SHELL` in `sw.js`, and increment the cache name when the shell changes.
- Do not silently change persisted setting names, widget zones/order/coordinates, theme values, calendar links, or graph identifiers.
- Keep `index.html` as the DOM shell. Put behavior in `js/` and styling in `styles/`.

## Verification before committing

At minimum, syntax-check JavaScript, verify every local shell asset exists and is cached, serve the site over HTTP, and smoke-test lock setup/unlock, all profiles, widgets, Nodes/List/Predict, Calendar/Entangle, theme switching, and reload persistence. Never test destructive migration behavior against the only copy of real user data.
