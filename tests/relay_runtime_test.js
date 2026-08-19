const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const relay=fs.readFileSync('js/relay.js','utf8');
const base={
  areas:[
    {id:'creative',name:'Creative',code:'CRTV',profile:'me',space:'personal',parentId:'atlas'},
    {id:'quantum-story',name:'Quantum Story',code:'QNTM',profile:'me',space:'personal',parentId:'creative'},
    {id:'decoherence',name:'Decoherence',code:'DECO',profile:'me',space:'personal',parentId:'quantum-story'},
    {id:'aly-creative',name:'Creative',code:'CRTV',profile:'alyssa',space:'personal',parentId:'atlas'}
  ],notes:[
    {id:'n-existing',profile:'me',space:'personal',areaId:'quantum-story',topicId:'decoherence',title:'Existing',body:'First',tags:['Quantum'],createdAt:1},
    {id:'n-dupe-1',profile:'me',space:'personal',areaId:'creative',topicId:'',title:'Duplicate',body:'A',tags:[]},
    {id:'n-dupe-2',profile:'me',space:'personal',areaId:'creative',topicId:'',title:'Duplicate',body:'B',tags:[]}
  ],relayReceipts:[],relayLedger:{},activity:[],settings:{activeProfile:'me'}};
const context={window:{},state:structuredClone(base),Date,console,uid:p=>`${p}-test-${Math.random()}`,save:async()=>{context.saved=structuredClone(context.state)},log:(text,profile)=>context.state.activity.unshift({text,profile,time:Date.now()})};
vm.createContext(context);vm.runInContext(relay,context);const api=context.window.AtlasRelay;
const envelope=(overrides={})=>({version:1,relayId:'relay-1',operation:'create_note',profileId:'me',target:{areaId:'quantum-story',topicId:'decoherence'},content:{title:'Created',body:'Body',type:'idea',tags:['Quantum','quantum','New'],showOnMap:true},source:{provider:'local-test',threadKey:'creative/quantum-story',sentAt:'2026-08-17T00:00:00Z'},...overrides});

(async function(){
assert.equal(api.validate(envelope()).ok,true,'valid create envelope');
assert.equal(api.validate(envelope({profileId:'other'})).ok,false,'invalid profile');
assert.equal(api.preview(envelope()).route.topicId,'decoherence','valid target');
const beforePreview=JSON.stringify(context.state);api.preview(envelope());assert.equal(JSON.stringify(context.state),beforePreview,'preview does not mutate');
assert.equal(api.validate(envelope({target:{areaId:'Creative',topicId:'Missing'}})).ok,false,'unknown/ambiguous target rejected');
const invalidBefore=JSON.stringify(context.state);await api.ingest(envelope({relayId:'bad',profileId:'other'}));assert.equal(JSON.stringify(context.state),invalidBefore,'invalid envelope does not mutate');
const created=await api.ingest(envelope());assert.equal(created.ok,true);assert.equal(context.state.notes[0].title,'Created','normal note created');assert.deepEqual(Array.from(context.state.notes[0].tags),['Quantum','New'],'tags deduplicate');assert.equal(context.state.notes[0].profile,'me','profile isolated');assert.equal(context.saved.relayReceipts[0].relayId,'relay-1','receipt persisted through save');
const count=context.state.notes.length;const retry=await api.ingest(envelope());assert.equal(retry.duplicate,true);assert.equal(context.state.notes.length,count,'create retry does not duplicate');
const conflict=async (changed,label)=>{const result=await api.ingest(envelope(changed));assert.equal(result.ok,false,label);assert.match(result.errors.join(' '),/Relay ID conflict/i,label)};
await conflict({content:{title:'Created',body:'Changed body',type:'idea',tags:['Quantum'],showOnMap:true}},'changed body conflicts');
await conflict({target:{areaId:'creative'}},'changed target conflicts');
await conflict({profileId:'alyssa',target:{areaId:'aly-creative'}},'changed profile conflicts');
await conflict({operation:'append_note',target:{noteId:'n-existing'},content:{body:'Changed operation'}},'changed operation conflicts');
context.state.relayReceipts=[];const oldRetry=await api.ingest(envelope());assert.equal(oldRetry.duplicate,true,'ledger survives receipt eviction');assert.equal(context.state.notes.length,count,'evicted receipt retry does not duplicate');
const append=envelope({relayId:'relay-append',operation:'append_note',target:{noteId:'n-existing'},content:{body:'Second',tags:['quantum','Causality']}});assert.equal(api.validate(append).ok,true,'append by ID');await api.ingest(append);assert.equal(context.state.notes.find(n=>n.id==='n-existing').body,'First\n\nSecond');assert.deepEqual(Array.from(context.state.notes.find(n=>n.id==='n-existing').tags),['Quantum','Causality']);await api.ingest(append);assert.equal(context.state.notes.find(n=>n.id==='n-existing').body,'First\n\nSecond','append retry does not duplicate paragraph');
assert.equal(api.validate(envelope({relayId:'ambiguous-note',operation:'append_note',target:{noteTitle:'Duplicate'},content:{body:'No'}})).ok,false,'ambiguous title rejected');
assert.equal(api.validate(envelope({relayId:'cross-profile',operation:'append_note',profileId:'alyssa',target:{noteId:'n-existing'},content:{body:'No'}})).ok,false,'note ID cannot cross profiles');

const dbSource=fs.readFileSync('js/db.js','utf8'),migration=dbSource.match(/function migrateData\(s\)\{[\s\S]*?\n\}\nfunction ensureState/)[0].replace(/\nfunction ensureState$/,'');
const migrationContext={DATA_VERSION:8};vm.createContext(migrationContext);vm.runInContext(`${migration};this.migrateData=migrateData`,migrationContext);
const v7={version:7,meta:{keep:'yes'},notes:[{id:'keep-note',body:'untouched'}],areas:[{id:'keep-area'}],relayReceipts:[{relayId:'legacy-relay',profileId:'me',operation:'create_note',recordId:'keep-note',time:12,status:'accepted'}],custom:{preserved:true}};
const migrated=migrationContext.migrateData(structuredClone(v7));assert.equal(migrated.version,8);assert.deepEqual(migrated.notes,v7.notes,'migration preserves notes');assert.deepEqual(migrated.areas,v7.areas,'migration preserves areas');assert.deepEqual(migrated.custom,v7.custom,'migration preserves unknown data');assert.equal(migrated.relayReceipts.length,1,'migration preserves receipts');assert.equal(migrated.relayLedger['legacy-relay'].recordId,'keep-note','migration builds conservative ledger entry');

const widgets=fs.readFileSync('js/widgets.js','utf8');assert.match(widgets,/e\.target\.id==='relayEnvelope'.*relayPreviewPayload=''.*Preview required\./,'textarea edit invalidates preview');assert.match(widgets,/raw!==relayPreviewPayload.*Preview required/s,'accept requires exact preview payload');
const areaEnvelope=envelope({relayId:'area-1',operation:'create_area',target:{parentId:'quantum-story'},content:{name:'Harvest Now, Decrypt Later',code:'HNDL',space:'personal'}});assert.equal(api.validate(areaEnvelope).ok,true,'exact area parent');const areaResult=await api.ingest(areaEnvelope);assert.equal(areaResult.ok,true);const newArea=context.state.areas.find(a=>a.id===areaResult.recordId);assert.equal(newArea.parentId,'quantum-story');assert.equal(newArea.profile,'me');const areaCount=context.state.areas.length;assert.equal((await api.ingest(areaEnvelope)).duplicate,true);assert.equal(context.state.areas.length,areaCount,'area duplicate idempotent');
const coordinates=context.state.areas.map(a=>[a.id,a.x,a.y]);const initialArea=envelope({relayId:'area-initial',operation:'create_area',target:{parentId:'quantum-story'},content:{name:'With Initial Note',initialNote:{title:'Seed',body:'Initial body',tags:['Seed']}}});const initialResult=await api.ingest(initialArea);const initialNode=context.state.areas.find(a=>a.id===initialResult.recordId);assert.ok(Number.isFinite(initialNode.x)&&Number.isFinite(initialNode.y),'new node positioned in map');assert.equal(context.state.notes.filter(n=>n.title==='Seed'&&n.topicId===initialNode.id).length,1,'optional initial note uses note schema');coordinates.forEach(([id,x,y])=>{const area=context.state.areas.find(a=>a.id===id);assert.equal(area.x,x,'existing x preserved');assert.equal(area.y,y,'existing y preserved')});
context.state.relayLedger['legacy-conservative']={relayId:'legacy-conservative',profileId:'me',operation:'create_note',recordId:'n-existing',time:1};const legacyResult=await api.ingest(envelope({relayId:'legacy-conservative'}));assert.equal(legacyResult.ok,false,'legacy ledger is not silently accepted');assert.match(legacyResult.errors.join(' '),/Relay ID conflict/);
const rootArea=envelope({relayId:'area-root',operation:'create_area',target:{root:true},content:{name:'Top Level'}});assert.equal((await api.ingest(rootArea)).ok,true);assert.equal(context.state.areas.find(a=>a.name==='Top Level').parentId,'atlas');
assert.equal(api.validate(envelope({relayId:'area-missing',operation:'create_area',target:{parentId:'Missing'},content:{name:'No'}})).ok,false,'unknown parent rejected');assert.equal(api.validate(envelope({relayId:'area-ambiguous',operation:'create_area',target:{parentId:'Creative'},content:{name:'No'}})).ok,true,'profile-scoped exact parent');assert.equal(api.validate(envelope({relayId:'area-other',operation:'create_area',profileId:'alyssa',target:{parentId:'quantum-story'},content:{name:'No'}})).ok,false,'area parent profile isolation');
assert.equal(api.validate(envelope({relayId:'destructive',operation:'delete',target:{root:true},content:{name:'No'}})).ok,false,'destructive operations forbidden');
console.log('Relay runtime contracts: PASS');

})().catch(error=>{console.error(error);process.exitCode=1});
