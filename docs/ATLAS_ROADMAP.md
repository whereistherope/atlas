# Atlas roadmap

1. **v0.12.4 Me-only connection/auth — complete.** Optional Supabase Auth and read-only owned-vault/profile verification.
2. **v0.12.5 safe append-only Me cloud backup — complete.** Explicit Preview → Confirm, deterministic snapshots, no overwrite/delete/upsert; IndexedDB remains authoritative.
3. **Safe Me cloud restore/pull from snapshot.** Design validation and non-destructive recovery before enabling restore.
4. **Authenticated Relay transport / Send to Atlas foundation.** Network carriage without changing Relay v0.12.3 local compatibility.
5. **Relay → Atlas ingestion.** Preserve validation, idempotency, and preview binding across transport.
6. **Cross-device/normalised sync design as needed.** Conflict semantics must precede general sync.
7. **Alyssa/Us/Entangle cloud design later.** They remain local-only until separately designed.
8. **AI-backed Predict later.** No procedural Predict expansion is part of cloud backup work.
