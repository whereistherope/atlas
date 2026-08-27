const fs=require('fs');
const assert=require('assert');
const sync=fs.readFileSync('js/sync-v3.js','utf8');
const recovery=fs.readFileSync('js/sync-v2-recovery.js','utf8');
const ui=fs.readFileSync('js/sync-recovery-ui.js','utf8');

for(const token of [
  "BASE_PREFIX='atlas_entity_sync_v3_base:'",
  'function canonicalEpoch(meta)',
  "version:3,canonicalEpoch:String(epoch||'')",
  'const base=await readBase(),hasMatchingBase=!!base&&base.canonicalEpoch===epoch',
  'Core.reconcile({},remote,local,false)',
  "before canonical epoch pull / stale-device quarantine",
  "emit('RECOVERY REQUIRED'",
  "root.addEventListener?.('atlascanonicalrecovered'",
]) assert(sync.includes(token),`missing canonical epoch contract: ${token}`);

assert(!sync.includes('reconcileFirstContact(remote,bootRecords,local)'),'unknown/new epoch must not upload first-session local edits');
for(const token of [
  "RECOVERY_TYPE='entity_recovery_snapshot_v1'",
  "idbBackup(Core.clone(state),'before canonical cloud promotion')",
  "appendRecoverySnapshot('old-cloud-before-promotion'",
  "appendRecoverySnapshot('trusted-local-before-promotion'",
  'const trustedBackupId=await appendTrustedMeBackup()',
  'canonicalEpoch:newEpoch',
]) assert(recovery.includes(token),`missing recovery safeguard: ${token}`);
assert(ui.includes('Preview canonical promotion'),'recovery UI must preview before confirmation');
assert(ui.includes('Make this Atlas canonical'),'recovery UI must require explicit canonical promotion');
assert(ui.includes('root.confirm?.'),'canonical promotion must have a final explicit confirmation');

console.log('Atlas Sync v3 canonical epoch safety: PASS');
