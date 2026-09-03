const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const read=file=>fs.readFileSync(file,'utf8');
const js=read('js/profile-management.js');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

const listeners={};
const context={
  console,
  state:{settings:{activeProfile:'alyssa'},profiles:[
    {id:'me',name:'Me',kind:'person'},
    {id:'alyssa',name:'Alyssa',kind:'person'},
    {id:'us',name:'Us',kind:'shared'}
  ]},
  document:{addEventListener:(name,fn)=>{listeners[name]=fn},getElementById:()=>null},
  ensureState:value=>value,
  renderTabs:()=>{},
  editorProfiles:()=>'',
  openCalendarEvent:()=>{},
  profileById:id=>context.state.profiles.find(p=>p.id===id)||{id:'me',name:'Fraser'},
  esc:value=>String(value??''),
  field:(label,html)=>`<label>${label}${html}</label>`,
  log:()=>{},save:()=>{},renderEditor:()=>{},toast:()=>{}
};
context.window=context;
vm.runInNewContext(js,context,{filename:'profile-management.js'});

const api=context.AtlasProfileManagement;
assert(api,'profile management API must load');
api.normaliseProfiles(context.state);
assert.strictEqual(context.state.profiles.find(p=>p.id==='me').name,'Fraser','legacy Me display name should become Fraser');
assert.strictEqual(context.state.profiles.find(p=>p.id==='me').closed,false,'Fraser profile should stay open');
assert.strictEqual(context.state.profiles.find(p=>p.id==='alyssa').closed,true,'Alyssa should default closed');
assert.strictEqual(context.state.profiles.find(p=>p.id==='us').closed,true,'Us should default closed');
assert.strictEqual(context.state.settings.activeProfile,'me','closed active profile should fall back to an open profile');

const alyssa=context.state.profiles.find(p=>p.id==='alyssa');
alyssa.name='Ally';alyssa.closed=false;
api.normaliseProfiles(context.state);
assert.strictEqual(alyssa.name,'Ally','custom profile names must be preserved');
assert.strictEqual(alyssa.closed,false,'reopened profile must remain open');

for(const token of [
  "profile.closed=profile.id==='alyssa'||profile.id==='us'",
  "profile.id==='me'&&legacyName(profile.name)",
  "data-profile-toggle",
  "Reopen",
  "Closed profiles and their data remain in Atlas Cloud",
  "if(row&&shared?.closed)row.style.display='none'"
]) assert(js.includes(token),`profile management contract missing: ${token}`);

const build=bootstrap.match(/const BUILD='0169r(\d+)'/);
const cache=sw.match(/const CACHE_NAME = 'atlas-shell-0\.16\.9-r(\d+)'/);
assert(build,'bootstrap build marker missing');
assert(cache,'service worker cache marker missing');
assert.strictEqual(build[1],cache[1],'bootstrap and service worker releases must stay aligned');
assert(bootstrap.includes("loadScript('./js/profile-management.js','Atlas profile management')"),'profile management must boot');
assert(sw.includes("'./js/profile-management.js'"),'profile management must be available offline');
console.log('Atlas profile management contract: PASS');
