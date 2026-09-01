const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const js=read('js/network-overview.js');
const css=read('styles/network-overview.css');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  "const COLLAPSE_KEY='atlas_network_minimap_collapsed'",
  'function boundsFor(nodes)',
  'function viewportFor(view,box)',
  'function pointInMini',
  'function setCameraCenter',
  "event.target.closest?.('.mini-viewport')",
  'svg.setPointerCapture(event.pointerId)',
  "toggle.textContent=collapsed?'MAP':'−'",
  "class:'mini-viewport'",
  "class:'mini-label'",
  "root.AtlasNetworkOverview=Object.freeze({version:'0.16.9-r3',render})"
]) assert(js.includes(token),`interactive minimap contract missing: ${token}`);

assert(!js.includes('boundsFor(nodes,view)'),'minimap bounds must frame graph content, not the potentially huge current viewport');
assert(!js.includes('data-mini-fit'),'minimap must not expose the redundant FIT control');

for(const token of [
  '.atlas-network-minimap{position:absolute;z-index:18;left:14px;bottom:14px;width:300px;height:194px',
  '.atlas-network-minimap .mini-viewport{fill:',
  'cursor:grab',
  '.atlas-network-minimap.is-collapsed{width:52px;height:28px',
  '.atlas-network-minimap.is-collapsed [data-mini-toggle]{display:block;width:100%;height:27px',
  '.atlas-network-minimap .mini-node.level-2{fill:var(--ink);opacity:.98}',
  '.atlas-network-minimap .mini-label{fill:var(--ink);opacity:.9;font:700 20px/1'
]) assert(css.includes(token),`minimap presentation contract missing: ${token}`);

assert(bootstrap.includes("loadStyle('./styles/network-overview.css')"),'network overview CSS must boot');
assert(bootstrap.includes("loadScript('./js/network-overview.js','Atlas network overview v0.16.9')"),'network overview JS must boot');
assert(sw.includes("'./styles/network-overview.css'"),'network overview CSS must be offline');
assert(sw.includes("'./js/network-overview.js'"),'network overview JS must be offline');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');

console.log('Atlas graph-framed interactive minimap contract: PASS');
