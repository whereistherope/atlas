const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/cloud.js','utf8');
const queries=[];
let authChange;
function query(table){
  const q={table,filters:[],select(columns){this.columns=columns;return this},eq(column,value){this.filters.push([column,value]);return this},async single(){queries.push(this);return{data:{id:'vault-rls',name:'Atlas',created_by:'user-rls'},error:null}},async maybeSingle(){queries.push(this);return{data:{vault_id:'vault-rls',profile_key:'me',name:'Me',kind:'person',owner_user_id:'user-rls'},error:null}}};
  return q;
}
const auth={getSession:async()=>({data:{session:{user:{id:'user-rls',email:'me@example.test'}}},error:null}),getUser:async()=>({data:{user:{id:'user-rls',email:'me@example.test'}},error:null}),onAuthStateChange:callback=>{authChange=callback;return{data:{subscription:{}}}},signInWithPassword:async credentials=>({data:{session:{user:{id:'user-rls',email:credentials.email}}},error:null}),signOut:async()=>({error:null})};
const listeners={};const context={navigator:{onLine:true},CustomEvent:function(type,options){this.type=type;this.detail=options.detail},window:{ATLAS_CLOUD_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'},supabase:{createClient:()=>({auth,from:query})},addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:()=>{}},console};context.window.window=context.window;vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  const cloud=context.window.AtlasCloud;await cloud.init();const result=await cloud.testAccess();
  assert.equal(result.ok,true);assert.equal(cloud.getStatus().verified,true);assert.deepEqual(queries.map(q=>q.table),['atlas_vaults','atlas_profiles']);
  assert.deepEqual(queries[0].filters,[['created_by','user-rls'],['name','Atlas']]);assert.equal(queries[0].limitValue,undefined);assert.deepEqual(queries[1].filters,[['vault_id','vault-rls'],['profile_key','me'],['kind','person'],['owner_user_id','user-rls']]);
  authChange('SIGNED_OUT',null);assert.equal(cloud.getStatus().verified,false);assert.equal(cloud.getStatus().authenticated,false);
  assert.doesNotMatch(source,/\.limit\(1\)|\.insert\(|\.update\(|\.delete\(|from\(['"]atlas_records/);assert.doesNotMatch(source,/localStorage|indexedDB|console\./);
  context.navigator.onLine=false;listeners.offline();assert.equal(cloud.getStatus().state,'OFFLINE');console.log('Cloud runtime contracts: PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
