# Atlas Shared Sync · r24

## Product model

Atlas is one shared application state in Atlas Cloud.

Desktop, iPad, phone and other browsers are clients of that same Shared Atlas. No device is a master, primary, owner, upstream, downstream, feeder or source of truth in normal use.

Each browser keeps IndexedDB only as an offline working cache, an unsynced-change queue and a recovery store. It is not a competing Atlas.

## Shared revision epoch

The cloud sync metadata contains a technical `canonicalEpoch`. Despite the historical field name, this is only a revision/compatibility marker for the shared cloud state. It does **not** identify an authoritative device.

Each browser stores the epoch of Shared Atlas that its local cache has acknowledged, together with its record-level reconciliation base.

- **Matching epoch:** normal record-level reconciliation is allowed. Offline edits made from an acknowledged base can merge into Shared Atlas when connectivity returns.
- **Missing or different epoch:** that browser cache may be stale. Atlas first creates a local recovery backup, then refreshes from Shared Atlas without uploading stale local leftovers. The browser stores the new epoch only after the refresh succeeds.
- **No epoch in Shared Atlas:** automatic reconciliation is blocked until the one-time recovery is completed. Neither the browser cache nor the existing cloud records are silently selected as correct.

This prevents an old iPad, old browser profile, restored backup or newly opened device from replacing newer Shared Atlas data merely because its local IndexedDB differs.

## One-time recovery after the stale-cloud incident

The pre-r24 cloud state may be older than the good Atlas currently open in one browser. Recovery therefore needs one explicit import operation from a known-good local recovery copy.

This is **not** master-device setup. The selected browser is only the temporary source for the recovery import because it contains the copy being recovered. As soon as recovery completes, it returns to ordinary client status.

The Sync widget provides **Preview Shared Atlas recovery** followed by **Restore Shared Atlas from this copy**.

Before Shared Atlas is changed, Atlas must successfully preserve:

1. a local IndexedDB backup of the browser copy being used for recovery;
2. an append-only cloud recovery snapshot of the existing Shared Atlas entity records;
3. an append-only cloud recovery snapshot of the local recovery copy; and
4. the normal append-only Me backup snapshot where available.

Only after those safeguards exist are the per-record Shared Atlas entities replaced/tombstoned to match the recovery copy and a fresh shared revision epoch written.

## Normal operation after recovery

Once Shared Atlas has a valid epoch:

1. open Atlas on any device;
2. Atlas authenticates and reads Shared Atlas;
3. if that device has an acknowledged current cache, legitimate offline mutations reconcile record-by-record;
4. if the cache is stale or from an older epoch, Atlas backs it up and refreshes it from Shared Atlas before accepting uploads;
5. edits save locally immediately and sync to Shared Atlas when online;
6. other devices read those same Shared Atlas records on load, focus, visibility return and regular sync polling.

There is no desktop-to-iPad or iPad-to-desktop direction. Both read and write the same Shared Atlas.

## Conflict and offline behaviour

Normal concurrent edits use the acknowledged record base and existing record/field reconciliation rules rather than whole-Atlas snapshot replacement.

A device may continue working offline from a current acknowledged cache. Those edits are queued locally and reconciled when the connection returns. A stale/unknown cache cannot upload until it has refreshed from Shared Atlas.

## Safety rules

- Whole-Atlas snapshot sync remains retired from the boot path.
- No browser becomes authoritative by opening Atlas.
- A stale/unknown epoch never uploads its cached state automatically.
- A remote refresh creates a local recovery backup when it would change local Atlas.
- One-time recovery is explicit and preview/confirm gated.
- Previous cloud and local recovery record sets are retained as append-only recovery snapshots before restore.
- Layout/theme settings remain device-local unless separately designed for sync; content/state records belong to Shared Atlas.
