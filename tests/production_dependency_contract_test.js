const fs=require('fs');
const path=require('path');
const assert=require('assert');

const read=file=>fs.readFileSync(file,'utf8');
const index=read('index.html');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

const unique=list=>[...new Set(list)];
const isLocal=asset=>asset.startsWith('./');
const toFile=asset=>asset.replace(/^\.\//,'').split('?')[0];

function indexAssets(html){
  const styles=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)].map(m=>m[1]);
  return {styles,scripts};
}

function bootstrapAssets(source){
  const styles=[...source.matchAll(/loadStyle\(["']([^"']+)["']\)/g)].map(m=>m[1]);
  const scripts=[...source.matchAll(/loadScript\(["']([^"']+)["']/g)].map(m=>m[1]);
  return {styles,scripts:unique(scripts)};
}

function appShellAssets(source){
  const match=source.match(/const\s+APP_SHELL\s*=\s*\[([\s\S]*?)\];/);
  assert(match,'service worker APP_SHELL must remain explicit');
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map(m=>m[1]);
}

function assertSubsequence(haystack,needles,label){
  let cursor=-1;
  for(const needle of needles){
    const next=haystack.indexOf(needle,cursor+1);
    assert(next!==-1,`${label}: missing ${needle}`);
    assert(next>cursor,`${label}: ${needle} is out of order`);
    cursor=next;
  }
}

const staticAssets=indexAssets(index);
const dynamicAssets=bootstrapAssets(bootstrap);
const shell=appShellAssets(sw);
const production=unique([
  ...staticAssets.styles.filter(isLocal),
  ...staticAssets.scripts.filter(isLocal),
  ...dynamicAssets.styles.filter(isLocal),
  ...dynamicAssets.scripts.filter(isLocal)
]);

for(const asset of production){
  assert(fs.existsSync(path.join(process.cwd(),toFile(asset))),`production asset missing: ${asset}`);
}
for(const asset of shell.filter(isLocal)){
  if(asset==='./')continue;
  assert(fs.existsSync(path.join(process.cwd(),toFile(asset))),`offline shell asset missing: ${asset}`);
}
for(const asset of production){
  assert(shell.includes(asset),`production asset is not available offline: ${asset}`);
}

assert.deepStrictEqual(staticAssets.styles.filter(isLocal),[
  './styles/tokens.css',
  './styles/app.css',
  './styles/widgets.css',
  './styles/map.css'
],'static stylesheet order is a production compatibility contract');

assert.deepStrictEqual(staticAssets.scripts.filter(isLocal),[
  './js/db.js',
  './js/auth.js',
  './js/cloud-config.js',
  './js/cloud.js',
  './js/cloud-backup.js',
  './js/app.js',
  './js/cloud-restore.js',
  './js/relay.js',
  './js/relay-transport.js',
  './js/calendar.js',
  './js/map.js',
  './js/ui.js',
  './js/widgets.js',
  './js/bootstrap.js'
],'classic module order is a production compatibility contract');

assertSubsequence(dynamicAssets.scripts,[
  './js/sync-v2-core.js',
  './js/sync-v2-recovery.js',
  './js/sync-v3.js',
  './js/sync-recovery-ui.js'
],'Shared Atlas runtime');

assertSubsequence(dynamicAssets.scripts,[
  './js/graph-hierarchy-interactions.js',
  './js/network-layout.js',
  './js/network-organic.js',
  './js/network-controls.js',
  './js/network-split.js',
  './js/network-overview.js'
],'network runtime');

for(const rejected of [
  './js/sync-v2.js',
  './js/cloud-sync.js',
  './js/cloud-sync-hotfix.js',
  './js/sync-quarantine.js',
  './js/window-drag.js'
]){
  assert(!production.includes(rejected),`retired runtime must not boot: ${rejected}`);
}

assert(!production.includes('./assets/lock-terrain.gif'),'retired lock artwork must not boot');
assert(!shell.includes('./assets/lock-terrain.gif'),'retired lock artwork must not be offline-critical');

const cacheOnly=shell.filter(asset=>isLocal(asset)&&asset!=='./'&&!production.includes(asset));
console.log(`Atlas production dependency contract: PASS (${production.length} boot assets, ${cacheOnly.length} cache-only assets)`);
if(cacheOnly.length)console.log(`Cache-only audit candidates: ${cacheOnly.join(', ')}`);
