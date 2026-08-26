const fs=require('fs');
const assert=require('assert');
const sync=fs.readFileSync('js/sync-v2.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

assert(sync.includes("const LEGACY_TYPE='canonical_state_v1',LEGACY_ID='primary'"),'v2 migration must read the old shared cloud state');
assert(sync.includes('async function readLegacyCanonical()'),'legacy shared cloud reader missing');
assert(sync.includes('async function migrateSharedCloud()'),'automatic shared-cloud migration missing');
assert(sync.includes("await seedMissingRecords(Core.flattenState(sourceState))"),'migration must seed v2 from shared cloud content');
assert(sync.includes("await insertMeta('canonical_state_v1'"),'migration must record canonical cloud as its source');
assert(sync.includes("await insertMeta('empty_cloud_bootstrap'"),'local bootstrap is allowed only for a genuinely empty cloud');
assert(sync.includes('Core.reconcileFirstContact(remote,bootRecords,local)'),'first contact must use pull-first reconciliation');
assert(!sync.includes('USE THIS DEVICE AS BASELINE'),'no device may be presented as an authoritative baseline');
assert(!sync.includes('migrationBanner'),'baseline-device migration UI must be removed');
assert(!sync.includes('initialiseFromThisDevice'),'sync v2 must not expose device-authoritative initialisation');
assert(bootstrap.includes("const BUILD='0169r6'"),'automatic migration build must be r6');
assert(sw.includes("atlas-shell-0.16.9-r6"),'automatic migration cache must be r6');
assert(!bootstrap.includes("loadScript('./js/cloud-sync.js'"),'legacy whole-snapshot sync must remain retired');

console.log('Atlas Sync v2 automatic shared-cloud migration: PASS');
