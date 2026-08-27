# Atlas canonical sync · r23

## Source of truth

After the one-time r23 recovery promotion, the shared Atlas Cloud record set is the canonical cross-device source of truth.

Each browser/device keeps IndexedDB as an offline working mirror and recovery store. A device is not a master and cannot become authoritative merely by opening Atlas.

## Canonical epoch

The cloud sync metadata contains a `canonicalEpoch`.

Each device stores the epoch of the cloud record set it has actually acknowledged together with its record-level reconciliation base.

- **Matching epoch:** normal record-level three-way reconciliation is allowed. Offline edits made from an acknowledged base can merge when the device reconnects.
- **Missing or different epoch:** the local device is considered stale/untrusted for upload. Atlas first makes a local IndexedDB backup, then pulls the canonical cloud record set without uploading local leftovers. The device stores the new epoch only after that pull succeeds.
- **No canonical epoch in cloud:** automatic reconciliation is blocked. Atlas reports `RECOVERY REQUIRED`; neither local nor cloud records are automatically selected as authoritative.

This prevents an old iPad, old browser profile, restored backup, or newly opened device from overwriting the current Atlas merely because its local IndexedDB differs.

## One-time recovery promotion

Because the pre-r23 cloud baseline may itself be older than the trusted desktop state, r23 requires one explicit recovery action on the device whose Atlas is known to be correct.

The Sync widget provides **Preview canonical promotion** followed by **Make this Atlas canonical**.

Before any canonical records are changed, Atlas must successfully preserve:

1. a local IndexedDB backup of the trusted device state;
2. an append-only cloud recovery snapshot of the existing cloud entity records;
3. an append-only cloud recovery snapshot of the trusted local entity records; and
4. the normal append-only Me backup snapshot where available.

Only then are the per-record cloud entities replaced/tombstoned to match the trusted local Atlas and a new `canonicalEpoch` written to the sync metadata.

## Normal operation after recovery

Once the canonical epoch exists:

1. make/edit a note, project, calendar item, todo, etc. on any aligned device;
2. local IndexedDB saves immediately, so offline work remains possible;
3. when online, that change reconciles to the canonical cloud records;
4. another device pulls the same canonical records on load, focus, visibility return, or the regular sync poll;
5. concurrent edits are reconciled at record/field level using the acknowledged base rather than whole-Atlas snapshot replacement.

There is no device-by-device source of truth. Desktop, iPad and phone are peers using one canonical cloud Atlas plus local offline mirrors.

## Safety rules

- Whole-Atlas snapshot sync remains retired from the boot path.
- A stale/unknown epoch never uploads its local state automatically.
- Remote apply creates a local backup when it would change local Atlas.
- Recovery promotion is explicit and preview/confirm gated.
- Previous cloud and trusted-local record sets are retained as append-only recovery snapshots before promotion.
- Layout/theme settings remain device-local unless separately designed for sync; content/state records are the canonical cross-device domain.
