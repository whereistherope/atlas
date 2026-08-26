const assert=require('assert/strict');
const Core=require('../js/sync-v2-core.js');

function entries(records){const out={};for(const record of Object.values(records)){const key=Core.keyFor(record.kind,record.id);out[key]={record,revision:1}}return out}
function state(extra={}){return{profiles:[{id:'me',name:'Me'}],areas:[{id:'work',name:'Work'}],links:[],projects:[],notes:[],daily:[],calendar:[],quickTodos:[],activity:[],scratch:{me:''},...extra}}

// Baseline acknowledged by both devices.
const baseState=state();
const baseLocal=Core.flattenState(baseState);const baseEntries=entries(baseLocal);

// Desktop adds Go Safe + project after the shared baseline.
const desktopState=state({
  areas:[{id:'work',name:'Work'},{id:'go-safe',name:'Go Safe'}],
  projects:[{id:'p-go-safe',title:'Go Safe rollout',areaId:'go-safe',createdAt:100}],
  scratch:{me:'Desktop morning scratch'}
});
const desktopRecords=Core.flattenState(desktopState);
const desktopPlan=Core.reconcile(baseEntries,baseEntries,desktopRecords,true);
assert.ok(desktopPlan.mutations[Core.keyFor('areas','go-safe')],'desktop addition must be a cloud mutation');
assert.ok(desktopPlan.mutations[Core.keyFor('projects','p-go-safe')],'desktop project must be a cloud mutation');

// Treat the desktop result as the newer remote cloud state.
const remoteAfterDesktop={...baseEntries};
for(const [key,record] of Object.entries(desktopPlan.mutations))remoteAfterDesktop[key]={record,revision:2};

// Stale iPad opens with its unchanged, old local state and old acknowledged base.
const staleIpadLocal=Core.flattenState(baseState);
const ipadPlan=Core.reconcile(baseEntries,remoteAfterDesktop,staleIpadLocal,true);
assert.equal(Object.keys(ipadPlan.mutations).length,0,'opening an unchanged stale device must never write deletions or stale replacements');
assert.ok(ipadPlan.final[Core.keyFor('areas','go-safe')],'new desktop node must survive stale-device reconciliation');
assert.ok(ipadPlan.final[Core.keyFor('projects','p-go-safe')],'new desktop project must survive stale-device reconciliation');
assert.equal(ipadPlan.final[Core.keyFor('scratch','me')].data,'Desktop morning scratch','newer remote scratch must pull to stale device');

// A stale device also must not revert a same-ID remote edit when its local record is unchanged from base.
const remoteWork=Core.makeRecord('areas','work',{id:'work',name:'Work — updated on desktop'});
const remoteChanged={...baseEntries,[Core.keyFor('areas','work')]:{record:remoteWork,revision:3}};
const sameIdPlan=Core.reconcile(baseEntries,remoteChanged,staleIpadLocal,true);
assert.equal(Object.keys(sameIdPlan.mutations).length,0,'unchanged stale same-ID data must not overwrite remote edits');
assert.equal(sameIdPlan.final[Core.keyFor('areas','work')].data.name,'Work — updated on desktop');

// Intentional deletion only exists when the deleting device previously acknowledged that record.
const deleteLocal=Core.flattenState(desktopState);delete deleteLocal[Core.keyFor('projects','p-go-safe')];
const desktopBase={...remoteAfterDesktop};
const deletePlan=Core.reconcile(desktopBase,remoteAfterDesktop,deleteLocal,true);
assert.equal(deletePlan.mutations[Core.keyFor('projects','p-go-safe')].deleted,true,'acknowledged record removal must produce a tombstone');

// Concurrent edit versus delete preserves the edited record rather than losing it.
const editedLocal={...desktopRecords,[Core.keyFor('projects','p-go-safe')]:Core.makeRecord('projects','p-go-safe',{id:'p-go-safe',title:'Locally edited',areaId:'go-safe',createdAt:100})};
const remoteDeleted={...desktopBase,[Core.keyFor('projects','p-go-safe')]:{record:Core.tombstoneFor(desktopBase[Core.keyFor('projects','p-go-safe')].record),revision:4}};
const conflictPlan=Core.reconcile(desktopBase,remoteDeleted,editedLocal,true);
assert.equal(conflictPlan.final[Core.keyFor('projects','p-go-safe')].deleted,false,'concurrent edit must survive a remote deletion');
assert.equal(conflictPlan.final[Core.keyFor('projects','p-go-safe')].data.title,'Locally edited');

// A new device with no base cannot delete or replace established same-ID cloud records merely because its local snapshot is stale.
const noBasePlan=Core.reconcile({},remoteAfterDesktop,staleIpadLocal,false);
assert.equal(noBasePlan.final[Core.keyFor('areas','go-safe')].data.name,'Go Safe');
assert.ok(!noBasePlan.mutations[Core.keyFor('areas','work')],'no-base stale same-ID record must not be pushed over established cloud data');

console.log('Atlas Sync v2 stale-device safety: PASS');
