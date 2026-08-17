# Atlas Sync foundation

## v0.12.5 boundary

Atlas is local-first: the existing IndexedDB record remains the source of truth. v0.12.5 adds Atlas's first cloud content write, an explicit **Preview → Confirm** append-only backup for the active local `me` profile. It is not restore, two-way sync, cross-device conflict handling, Relay network transport, or a background process.

The preview builds and canonically serializes a whitelist-only Me snapshot, hashes it with browser-native SHA-256, reports content counts and encoded size, and checks only that exact Me snapshot ID remotely. Confirm rebuilds live local data and refuses if its fingerprint differs. Only Confirm can insert. An identical deterministic ID is reported as already backed up.

Each `public.atlas_records` row uses the RLS-resolved Me profile UUID as `profile_id`, fixed `record_type = backup_snapshot_v1`, `record_id = sha256-<64 lowercase hex characters>`, the generated snapshot as `payload`, and the local state's finite positive integer millisecond timestamp as bigint `client_updated_at`. Database defaults supply revision and creation fields. Atlas never updates, upserts, deletes, or overwrites a cloud row, and never writes vault, membership, profile, or Auth rows.

```json
{"profile_id":"<owned Me UUID>","record_type":"backup_snapshot_v1","record_id":"sha256-<64 lowercase hex>","payload":{"schema":"atlas_me_backup_snapshot","version":1,"profileKey":"me","dataVersion":8,"areas":[],"links":[],"projects":[],"notes":[],"daily":[],"calendar":[],"quickTodos":[],"scratch":""},"client_updated_at":1700000000000}
```

The cloud transport validates the payload allowlist and timestamp, independently canonicalizes and hashes the payload, and uses that recomputed ID for both the existence query and insert. A supplied mismatched ID is rejected rather than trusted.

## Selection and isolation

The payload contains schema/version markers plus Me-owned areas, safe links whose endpoints are both Me areas, projects (including milestones/tasks), notes, daily entries, calendar entries, quick todos, and `scratch.me`. Legacy records with no `profile` field retain Atlas's established ownership rule and belong to Me. Field allowlists exclude transient settings, profiles, activity logs, Relay receipts/ledger, layout state, backups, browser storage, and calendar Entangle linkage fields. Alyssa and Us records are excluded. Atlas Lock PIN/hash/config/recovery material, the auth store, Supabase sessions/tokens, passwords, credentials, and unrelated browser data are never selected.

Supabase Auth remains separate from Atlas Lock. Preview and Confirm require active Me, online state, an authenticated session, and successful current Test Access. Both operations resolve again through the unique owned `Atlas` vault and its `me`/`person` profile owned by that authenticated user. Auth loss, offline state, client failure, failed verification, or any profile switch invalidates the prepared preview; returning to Me requires Test Access again.

## Failure and offline behavior

The Supabase v2 CDN remains optional and outside `APP_SHELL`; local cloud modules remain cached. Cloud failures are contained and do not block local Atlas. There is no polling, retry loop, startup backup, sign-in backup, Test Access backup, or automatic write.

## Staged roadmap

1. v0.12.4 Me-only connection/auth — complete.
2. v0.12.5 safe append-only Me cloud backup — complete.
3. Safe Me cloud restore/pull from snapshot.
4. v0.12.7 authenticated Me-only Relay transport — complete; manual validation/preview only.
5. v0.12.8 ChatGPT ingress + explicit Relay → Atlas ingestion.
6. Cross-device/normalised sync design as needed.
7. Alyssa/Us/Entangle cloud design later.
8. AI-backed Predict later.

## v0.12.7 Relay carriage

Authenticated Relay carriage reuses `atlas_records` with insert-only `relay_envelope_v1` rows targeted to the freshly resolved owned Me profile. The exact transport payload contains only `schema`, transport `version`, a deterministic canonical-envelope SHA-256 `fingerprint`, and the Relay v1 `envelope`. Exact duplicates are no-ops; reuse of a Relay ID for different content is rejected without overwriting the original.

The Relay widget checks at most the newest 50 records only after **CHECK CLOUD** is pressed. Remote rows are treated as untrusted and independently validated and re-hashed at the cloud boundary. A malformed row produces only sanitized rejection metadata and does not poison valid neighbours; its envelope never reaches local Relay. Validated envelopes are passed to local `AtlasRelay.validate()` and `AtlasRelay.preview()`, and local ledger matches are labelled already accepted. The check is locally read-only and does not save or ingest. The hard 512,000-byte transport ceiling safely accommodates approximately 100,000 multi-byte characters while remaining bounded. Genuine auth, session, RLS, and access failures invalidate verified readiness, but content validation failures do not.

This release does **not** add automatic sync or ingestion, a ChatGPT sender, Alyssa/Us cloud Relay, background polling, cloud overwrite/delete, or cloud authority over IndexedDB. v0.12.8 is the planned ChatGPT ingress and explicit Relay-to-Atlas ingestion step; “Send to Atlas” is not complete in v0.12.7.
