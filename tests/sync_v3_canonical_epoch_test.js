const fs=require('fs');
const assert=require('assert');
const sync=fs.readFileSync('js/sync-v3.js','utf8');
const recovery=fs.readFileSync('js/sync-v2-recovery.js','utf8');
const ui=fs.readFileSync('js/sync-recovery-ui.js','utf8');
const docs=fs.readFileSync('docs/CANONICAL_SYNC_R23.md','utf8');

for(const token of [
  "BASE_PREFIX='atlas_entity_sync_v3_base:'",
  'function sharedEpoch(meta)',
  "version:3,canonicalEpoch:String(epoch||'')",
  'const base=await readBase(),hasMatchingBase=!!base&&base.canonicalEpoch===epoch',
  'Core.reconcile({},remote,local,false)',
  "before Shared Atlas pull / stale-client quarantine",
  "emit('RECOVERY REQUIRED'",
  "root.addEventListener?.('atlascanonicalrecovered'",
]) assert(sync.includes(token),`missing Shared Atlas epoch contract: ${token}`);

assert(!sync.includes('reconcileFirstContact(remote,bootRecords,local)'),'unknown/new epoch must not upload first-session local edits');
assert(sync.includes('one Shared Atlas in the cloud'),'sync runtime must declare the one-Shared-Atlas model');
assert(sync.includes("'Shared Atlas loaded; this browser is now aligned.'"),'stale client must rejoin Shared Atlas without becoming authoritative');

for(const token of [
  "RECOVERY_TYPE='entity_recovery_snapshot_v1'",
  "idbBackup(Core.clone(state),'before Shared Atlas recovery')",
  "appendRecoverySnapshot('old-shared-atlas-before-recovery'",
  "appendRecoverySnapshot('local-recovery-copy-before-restore'",
  'const localBackupId=await appendRecoveryMeBackup()',
  'canonicalEpoch:newEpoch',
  "recoverySource:'local_recovery_copy'",
]) assert(recovery.includes(token),`missing Shared Atlas recovery safeguard: ${token}`);

assert(ui.includes('Preview Shared Atlas recovery'),'recovery UI must preview Shared Atlas recovery');
assert(ui.includes('Restore Shared Atlas from this copy'),'recovery UI must describe a one-time restore, not device promotion');
assert(ui.includes('not a master-device setup'),'recovery UI must explicitly reject master-device semantics');
assert(ui.includes('ordinary client'),'recovery UI must explain equal post-recovery device status');
assert(ui.includes('root.confirm?.'),'Shared Atlas restore must have a final explicit confirmation');
assert(!ui.includes('Make this Atlas canonical'),'old device-authority label must be removed');
assert(!ui.includes('Preview canonical promotion'),'old promotion label must be removed');
assert(!ui.includes('trusted desktop'),'desktop must not be presented as a continuing authority');

assert(docs.includes('Atlas is one shared application state in Atlas Cloud.'),'docs must define one Shared Atlas');
assert(docs.includes('No device is a master'),'docs must reject master-device architecture');
assert(docs.includes('There is no desktop-to-iPad or iPad-to-desktop direction.'),'docs must define equal clients of one Shared Atlas');

console.log('Atlas Sync v3 one Shared Atlas safety: PASS');
