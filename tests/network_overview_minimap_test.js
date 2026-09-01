const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const js=read('js/network-overview.js');
const css=read('styles/network-overview.css');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  "const COLLAPSE_KEY='atlas_network_minimap_collapsed'",
  'function pointInMini',
  'function setCameraCenter',
  "event.target.closest?.('.mini-viewport')",
  'svg.setPointerCapture(event.pointerId)',
  "mini.querySelector('[data-mini-fit]')",
  "mini.querySelector('[data-mini-toggle]')",
  "class:'mini-viewport'",
  "class:'mini-label'",
  "root.AtlasNetworkOverview=Object.freeze({version:'0.16.9-r2',render})"
]) assert(js.includes(token),`interactive minimap contract missing: ${token}`);

for(const token of [
  '.atlas-network-minimap{position:absolute;z-index:18;left:14px;bottom:14px;width:286px;height:182px',
  '.atlas-network-minimap .mini-viewport{fill:',
  'cursor:grab',
  '.atlas-network-minimap.is-collapsed{width:40px;height:32px}',
  '.atlas-network-minimap .mini-node.level-2{fill:var(--ink);opacity:.96}',
  '.atlas-network-minimap .mini-label{fill:var(--ink);opacity:.82'
]) assert(css.includes(token),`minimap presentation contract missing: ${token}`);

assert(!js.includes('fitMap(scope);render(scope)}catch(_){ }});host.appendChild(mini)'), 'legacy whole-minimap fit-only click behaviour must be gone');
assert(bootstrap.includes("loadStyle('./styles/network-overview.css')"),'network overview CSS must boot');
assert(bootstrap.includes("loadScript('./js/network-overview.js','Atlas network overview v0.16.9')"),'network overview JS must boot');
assert(sw.includes("'./styles/network-overview.css'"),'network overview CSS must be offline');
assert(sw.includes("'./js/network-overview.js'"),'network overview JS must be offline');
assert(bootstrap.includes("const BUILD='0169r37'"),'r37 bootstrap expected');
assert(sw.includes("atlas-shell-0.16.9-r37"),'r37 shell expected');

console.log('Atlas interactive network minimap contract: PASS');
