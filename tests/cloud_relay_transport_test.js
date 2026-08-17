const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('js/cloud.js','utf8');
let user='owner',profile='me-profile',rows=[],calls=[],forcedList=null,queryError=null,insertError=null;
function query(table){
  const q={table,filters:[],select(columns){calls.push(['select',table]);this.columns=columns;return this},eq(key,value){this.filters.push([key,value]);return this},order(key,value){this.orderBy=[key,value];return this},limit(value){this.bound=value;return this},
    async single(){return{data:{id:'vault',name:'Atlas',created_by:user},error:null}},
    async maybeSingle(){if(table==='atlas_profiles')return{data:{id:profile,vault_id:'vault',profile_key:'me',kind:'person',owner_user_id:user},error:null};if(queryError)return{data:null,error:queryError};return{data:rows.find(row=>this.filters.every(([key,value])=>row[key]===value))||null,error:null}},
    async insert(row){calls.push(['insert',table,row]);if(insertError)return{error:insertError};if(rows.some(item=>item.record_id===row.record_id))return{error:{code:'23505'}};rows.push(row);return{error:null}},
    then(resolve){if(queryError)return Promise.resolve({data:null,error:queryError}).then(resolve);let data=forcedList||rows.filter(row=>this.filters.every(([key,value])=>row[key]===value));if(this.orderBy)data=[...data].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));if(this.bound)data=data.slice(0,this.bound);return Promise.resolve({data,error:null}).then(resolve)},
    update(){throw Error('no update')},upsert(){throw Error('no upsert')},delete(){throw Error('no delete')}
  };return q;
}
const auth={getSession:async()=>({data:{session:{user:{id:user}}},error:null}),getUser:async()=>({data:{user:{id:user,email:'x'}},error:null}),onAuthStateChange:()=>({}),signOut:async()=>({error:null})};
const context={navigator:{onLine:true},crypto:webcrypto,TextEncoder,Uint8Array,CustomEvent:function(){},Date,window:{ATLAS_CLOUD_CONFIG:{url:'x',publishableKey:'public'},supabase:{createClient:()=>({auth,from:query})},addEventListener:()=>{},dispatchEvent:()=>{}}};context.window.window=context.window;vm.createContext(context);vm.runInContext(source,context);
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
async function payload(envelope){const digest=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(envelope)));return{schema:'atlas_relay_envelope',version:1,fingerprint:'sha256-'+Buffer.from(digest).toString('hex'),envelope}}
const envelope=(overrides={})=>({version:1,relayId:'r-1',operation:'create_note',profileId:'me',target:{inbox:true},content:{title:'Cloud'},...overrides});
const record=async value=>({recordType:'relay_envelope_v1',recordId:value.relayId,payload:await payload(value),clientUpdatedAt:Date.now()});
(async()=>{
  const cloud=context.window.AtlasCloud;await cloud.init();const base=envelope(),baseRecord=await record(base);
  assert.equal((await cloud.appendMeRelayEnvelope(baseRecord)).ok,false,'verification required');await cloud.testAccess();assert.equal((await cloud.appendMeRelayEnvelope(baseRecord)).ok,true);assert.equal(calls.filter(call=>call[0]==='insert').length,1);assert.equal(rows[0].profile_id,profile,'exact Me target');assert.equal((await cloud.appendMeRelayEnvelope(baseRecord)).duplicate,true,'exact duplicate no-op');
  const changed=envelope({content:{title:'Different'}});assert.match((await cloud.appendMeRelayEnvelope(await record(changed))).error,/conflict/i);
  for(const bad of [envelope({profileId:'alyssa'}),envelope({profileId:'us'}),envelope({relayId:' bad'}),envelope({relayId:'x'.repeat(301)}),envelope({operation:'remove'}),envelope({target:[]})])assert.equal((await cloud.appendMeRelayEnvelope(await record(bad))).ok,false);
  const unicode=envelope({relayId:'unicode-100k',content:{body:'😀'.repeat(100000)}});assert.equal((await cloud.appendMeRelayEnvelope(await record(unicode))).ok,true,'100k multibyte characters remain compatible');
  const huge=envelope({relayId:'huge',content:{body:'😀'.repeat(130000)}});assert.match((await cloud.appendMeRelayEnvelope(await record(huge))).error,/large/i);assert.equal((await cloud.appendMeRelayEnvelope({...baseRecord,recordId:'wrong'})).ok,false);assert.equal((await cloud.appendMeRelayEnvelope({...baseRecord,payload:{...baseRecord.payload,fingerprint:'sha256-'+'0'.repeat(64)}})).ok,false);
  const valid=rows[0],tampered={...valid,record_id:'bad\u0000id',payload:{...valid.payload,fingerprint:'sha256-'+'f'.repeat(64),envelope:{secret:'must-not-escape'}}},wrongProfile={...valid,record_id:'wrong-profile',profile_id:'other'},wrongType={...valid,record_id:'wrong-type',record_type:'other'};
  forcedList=[tampered,valid,wrongProfile,wrongType];let listed=await cloud.listMeRelayEnvelopes();assert.equal(listed.ok,true);assert.equal(listed.records.length,1,'valid row survives malformed neighbours');assert.equal(listed.records[0].record_id,valid.record_id);assert.equal(listed.rejected.length,3);assert.deepEqual(Object.keys(listed.rejected[0]).sort(),['error','recordId']);assert.equal(listed.rejected[0].recordId,'badid');assert.equal('envelope' in listed.rejected[0],false);assert.doesNotMatch(JSON.stringify(listed.rejected),/must-not-escape/);assert.match(listed.rejected[1].error,/invalid me cloud relay row/i);assert.match(listed.rejected[2].error,/invalid me cloud relay row/i);
  forcedList=null;assert.equal((await cloud.listMeRelayEnvelopes({limit:51})).ok,false);assert.equal(cloud.getStatus().verified,true,'local validation does not invalidate access');
  queryError={message:'RLS denied'};listed=await cloud.listMeRelayEnvelopes();assert.equal(listed.ok,false);assert.equal(cloud.getStatus().verified,false,'query/access failure invalidates verification');assert.equal(cloud.getStatus().state,'ERROR');queryError=null;await cloud.testAccess();
  insertError={message:'JWT expired'};const fresh=envelope({relayId:'fresh'});assert.equal((await cloud.appendMeRelayEnvelope(await record(fresh))).ok,false);assert.equal(cloud.getStatus().verified,false,'insert access failure invalidates verification');insertError=null;await cloud.testAccess();queryError={message:'session expired'};assert.equal((await cloud.getMeRelayEnvelope('r-1')).ok,false);assert.equal(cloud.getStatus().verified,false,'exact read access failure invalidates verification');queryError=null;
  assert.match(source,/row\.profile_id!==profileId\|\|row\.record_type!==RELAY_TYPE/);assert.doesNotMatch(source,/AtlasCloud=.*\b(client|from|query|database|supabase)\b/);assert.ok(!calls.some(call=>['update','upsert','delete'].includes(call[0])));console.log('Cloud Relay transport contracts: PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
