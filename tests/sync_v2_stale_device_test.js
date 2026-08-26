const assert=require('assert/strict');
const Core=require('../js/sync-v2-core.js');

function entries(records){const out={};for(const record of Object.values(records)){const key=Core.keyFor(record.kind,record.id);out[key]={record,revision:1}}return out}
function state(extra={}){return{profiles:[{id:'me',name:'Me'}],areas:[{id:'work',name:'Work'}],links:[],projects:[],notes:[],daily:[],calendar:[],quickTodos:[],activity:[],scratch:{me:''},...extra}}

const baseState=state();
const baseLocal=Core.flattenState(baseState);const baseEntries=entries(baseLocal);

const desktopState=state({
  areas:[{id:'work',name:'Work'},{id:'go-safe',name:'Go Safe'}],
  projects:[{id:'p-go-safe',title:'Go Safe rollout',areaId:'go-safe',createdAt:100}],
  scratch:{me:'Desktop morning scratch'}
});
const desktopRecords=Core.flattenState(desktopState);
const desktopPlan=Core.reconcile(baseEntries,baseEntries,desktopRecords,true);
assert.ok(desktopPlan.mutations[Core.keyFor('areas','go-safe')],'desktop addition must be a cloud mutation');
assert.ok(desktopPlan.mutations[Core.keyFor('projects','p-go-safe')],'desktop project must be a cloud mutation');

const remoteAfterDesktop={...baseEntries};
for(const [key,record] of Object.entries(desktopPlan.mutations))remoteAfterDesktop[key]={record,revision:2};

const staleIpadLocal=Core.flattenState(baseState);
const ipadPlan=Core.reconcile(baseEntries,remoteAfterDesktop,staleIpadLocal,true);
assert.equal(Object.keys(ipadPlan.mutations).length,0,'opening an unchanged stale device must never write deletions or stale replacements');
assert.ok(ipadPlan.final[Core.keyFor('areas','go-safe')],'new desktop node must survive stale-device reconciliation');
assert.ok(ipadPlan.final[Core.keyFor('projects','p-go-safe')],'new desktop project must survive stale-device reconciliation');
assert.equal(ipadPlan.final[Core.keyFor('scratch','me')].data,'Desktop morning scratch','newer remote scratch must pull to stale device');

const remoteWork=Core.makeRecord('areas','work',{id:'work',name:'Work — updated on desktop'});
const remoteChanged={...baseEntries,[Core.keyFor('areas','work')]:{record:remoteWork,revision:3}};
const sameIdPlan=Core.reconcile(baseEntries,remoteChanged,staleIpadLocal,true);
assert.equal(Object.keys(sameIdPlan.mutations).length,0,'unchanged stale same-ID data must not overwrite remote edits');
assert.equal(sameIdPlan.final[Core.keyFor('areas','work')].data.name,'Work — updated on desktop');

const deleteLocal=Core.flattenState(desktopState);delete deleteLocal[Core.keyFor('projects','p-go-safe')];
const desktopBase={...remoteAfterDesktop};
const deletePlan=Core.reconcile(desktopBase,remoteAfterDesktop,deleteLocal,true);
assert.equal(deletePlan.mutations[Core.keyFor('projects','p-go-safe')].deleted,true,'acknowledged record removal must produce a tombstone');

const editedLocal={...desktopRecords,[Core.keyFor('projects','p-go-safe')]:Core.makeRecord('projects','p-go-safe',{id:'p-go-safe',title:'Locally edited',areaId:'go-safe',createdAt:100})};
const remoteDeleted={...desktopBase,[Core.keyFor('projects','p-go-safe')]:{record:Core.tombstoneFor(desktopBase[Core.keyFor('projects','p-go-safe')].record),revision:4}};
const conflictPlan=Core.reconcile(desktopBase,remoteDeleted,editedLocal,true);
assert.equal(conflictPlan.final[Core.keyFor('projects','p-go-safe')].deleted,false,'concurrent edit must survive a remote deletion');
assert.equal(conflictPlan.final[Core.keyFor('projects','p-go-safe')].data.title,'Locally edited');

// First contact: a stale browser has no durable v2 base. Its boot state is an ephemeral base.
const staleWithLeftover=state({
  areas:[{id:'work',name:'Work'},{id:'old-local-only',name:'Old local leftover'}],
  scratch:{me:'Old stale scratch'}
});
const staleBoot=Core.flattenState(staleWithLeftover);
const firstContact=Core.reconcileFirstContact(remoteAfterDesktop,staleBoot,staleBoot);
assert.equal(Object.keys(firstContact.mutations).length,0,'unchanged first-contact device must be read-only');
assert.ok(firstContact.final[Core.keyFor('areas','go-safe')],'first-contact stale device must pull newer cloud node');
assert.ok(!firstContact.final[Core.keyFor('areas','old-local-only')],'unchanged local-only leftovers must not upload or survive first contact');
assert.equal(firstContact.final[Core.keyFor('scratch','me')].data,'Desktop morning scratch','cloud scratch must win unchanged first-contact stale scratch');

// Genuine edits made after the browser session loaded can still sync on first contact.
const editedAfterBoot=Core.clone(staleBoot);
editedAfterBoot[Core.keyFor('areas','new-session-node')]=Core.makeRecord('areas','new-session-node',{id:'new-session-node',name:'Created while offline'});
const offlineEditPlan=Core.reconcileFirstContact(remoteAfterDesktop,staleBoot,editedAfterBoot);
assert.ok(offlineEditPlan.mutations[Core.keyFor('areas','new-session-node')],'new first-session edit must be uploaded');
assert.ok(!offlineEditPlan.mutations[Core.keyFor('areas','old-local-only')],'unchanged stale leftover must remain inert even when another item was edited');

console.log('Atlas Sync v2 stale-device safety: PASS');
