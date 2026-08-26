const fs=require('fs');
const assert=require('assert');
const sync=fs.readFileSync('js/cloud-sync.js','utf8');
const hotfix=fs.readFileSync('js/cloud-sync-hotfix.js','utf8');

for(const token of [
  "const DIRTY_KEY='atlas_canonical_dirty_v2'",
  "const ACK_PREFIX='atlas_canonical_ack_v2:'",
  "const BASE_PREFIX='atlas_canonical_base_v2:'",
  'async function readStoredBase()',
  'async function storeAck(payload,fp,revision)',
  "markDirty();schedulePush()",
  'async function reconcileJoinedDivergence(local)',
  "before canonical divergence reconciliation",
  'unionPayload(latest.payload,local)',
  "before canonical remote refresh",
]) assert(sync.includes(token),`missing durable sync contract: ${token}`);

assert(!sync.includes("if(joined||localFp===remoteFp)"),'joined marker must never make a divergent local state eligible for blind cloud replacement');
assert(!hotfix.includes('disarmPersistentJoinTrust'),'emergency join-marker clearing must not remain in permanent architecture');
assert(!hotfix.includes('keys.forEach(key=>localStorage.removeItem(key))'),'hotfix must not clear persisted join markers');
assert(sync.includes("dirty:isDirty()"),'sync status must expose pending local work');
assert(sync.includes("const localUnacknowledged=isDirty()||!ackFp||localFp!==ackFp"),'startup must identify unacknowledged local work');
assert(sync.includes("base&&validPayload(base)?mergePayload(base,latest.payload,local):unionPayload(latest.payload,local)"),'concurrent save must use three-way merge or conservative union fallback');

console.log('Canonical sync safety contracts: PASS');
