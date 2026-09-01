const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const js=read('js/runtime-telemetry.js');
const css=read('styles/runtime-telemetry.css');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  "const MAX_LINES=10",
  "host.className='atlas-runtime-telemetry'",
  "root.addEventListener('atlascanonicalstatus'",
  "root.addEventListener('atlascloudstatus'",
  "root.addEventListener('atlasrelaystatus'",
  "emit('IDB','state committed')",
  "emit('GRAPH',`${camera()} · ${counts()}`)",
  "root.AtlasRuntimeTelemetry=Object.freeze({version:'0.16.9-r1',emit,sample})"
]) assert(js.includes(token),`runtime telemetry contract missing: ${token}`);

for(const token of [
  '.atlas-runtime-telemetry{position:absolute',
  'pointer-events:none',
  'background:'
]) {
  if(token==='background:') assert(!css.includes(token),'runtime telemetry must stay transparent without a panel background');
  else assert(css.includes(token),`runtime telemetry presentation missing: ${token}`);
}
assert(css.includes('mask-image:linear-gradient(to bottom,transparent'),'telemetry should fade older trace lines');
assert(!js.includes('n.body')&&!js.includes('note.body')&&!js.includes('project.body'),'telemetry must not expose note/project contents');
assert(!js.includes('access_token')&&!js.includes('refresh_token')&&!js.includes('password'),'telemetry must not expose credentials or tokens');

assert(bootstrap.includes("loadStyle('./styles/runtime-telemetry.css')"),'telemetry CSS must boot');
assert(bootstrap.includes("loadScript('./js/runtime-telemetry.js','Atlas live runtime telemetry')"),'telemetry JS must boot');
assert(!bootstrap.includes('network-overview'),'obsolete minimap must not boot');
assert(sw.includes("'./styles/runtime-telemetry.css'"),'telemetry CSS must be offline');
assert(sw.includes("'./js/runtime-telemetry.js'"),'telemetry JS must be offline');
assert(!sw.includes('network-overview'),'obsolete minimap must not be cached');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');

console.log('Atlas transparent runtime telemetry contract: PASS');
