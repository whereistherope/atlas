# Atlas roadmap

1. **v0.12.4 Me-only connection/auth — complete.** Optional Supabase Auth and read-only owned-vault/profile verification.
2. **v0.12.5 safe append-only Me cloud backup — complete.** Explicit Preview → Confirm, deterministic snapshots, no overwrite/delete/upsert; IndexedDB remains authoritative.
3. **v0.12.6 safe Me cloud restore/pull — complete.** Explicit Preview → Confirm, independently validated and re-hashed remote snapshots, preview binding, full local safety backup, and Me-slice-only replacement; no cloud writes or background sync.
4. **v0.12.7 authenticated Me-only Relay cloud transport — complete.** Append-only carriage, deterministic fingerprints, duplicate/conflict safety, and explicit local validation/preview; no sender or ingestion.
5. **v0.12.8 automatic Me-only Send to Atlas — complete.** Isolated RPC ingress, automatic local ingestion, safe acknowledgements, and `create_area`; IndexedDB remains authoritative.
6. **Cross-device/normalised sync design as needed.** Conflict semantics must precede general sync.
7. **Alyssa/Us/Entangle cloud design later.** They remain local-only until separately designed.
8. **AI-backed Predict later.** No procedural Predict expansion is part of cloud backup work.
