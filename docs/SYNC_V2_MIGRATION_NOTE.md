# Atlas Sync v2 migration

Atlas has no authoritative device. The shared database is the source of cross-device truth.

When Sync v2 is first encountered, Atlas automatically reads the existing shared `canonical_state_v1` cloud record and converts that shared content into per-record `entity_state_v2` rows. The device that happens to open first only performs the migration request; its local state is not selected as the migration source while shared cloud data exists.

If the cloud has never contained a shared Atlas at all, the first local Atlas may bootstrap the empty cloud. That is initial creation, not an ongoing master-device role.

After migration:

- Nodes, projects, notes, daily entries, calendar items, todos, activity records and scratch values sync independently.
- Opening a stale device does not create deletions.
- A record can only be deleted through a tombstone derived from a device that previously acknowledged that record and then removed it.
- A device with no previous Sync v2 history is pull-first. Unchanged local-only leftovers are ignored rather than uploaded.
- Genuine edits made after that browser session starts can still be reconciled once connectivity is available.
- The old whole-Atlas `canonical_state_v1` row is not read during normal Sync v2 operation after migration.

The intended user experience is ordinary application sync: make a change on one device, then see the same change on another device without selecting or maintaining a master device.
