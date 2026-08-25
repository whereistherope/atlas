const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('styles/ops-refinement.css','utf8');
const material=fs.readFileSync('styles/window-material.css','utf8');
const tokens=fs.readFileSync('styles/tokens.css','utf8');
const js=fs.readFileSync('js/ops-refinement.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'body[data-skin="ops"]',
  'body[data-skin="ops"][data-theme="night"]',
  '--bg:#030303',
  '--green:#bcbcbc',
  '.atlas-network-minimap',
  '.atlas-vnote-sheet',
  '.atlas-vnote-toolbar button',
  'filter:grayscale(1)',
]) assert(css.includes(token),`missing Ops workstation contract: ${token}`);

for(const token of [
  "const SKIN='ops'",
  'function renderMinimap(scope=null)',
  "class:'mini-viewport'",
  "fitMap(scope)",
  "AtlasOpsRefinement=Object.freeze({version:'0.16.8-r1'",
]) assert(js.includes(token),`missing Ops runtime contract: ${token}`);

for(const token of [
  'body[data-skin="ops"][data-theme="night"]',
  '--atlas-window-surface:#080808',
  '--atlas-field-surface:#050505',
  'border-radius:0!important',
  'backdrop-filter:blur(9px)',
]) assert(material.includes(token),`missing neutral Ops material contract: ${token}`);

for(const token of [
  'html:not(.atlas-ready){background:#050505}',
  'html:not(.atlas-ready) body>.shell',
]) assert(tokens.includes(token),`missing pre-auth paint guard: ${token}`);

assert(!js.includes('MutationObserver'),'Ops refinement must remain explicit/event-driven');
assert(!js.includes('state.settings.skin='),'Ops refinement must not add a persisted skin schema');
assert(bootstrap.includes("const BUILD='0168r4'"),'bootstrap build must advance to v0.16.8-r4');
assert(bootstrap.includes("document.documentElement.classList.add('atlas-ready')"),'boot guard must release only after load resolves');
assert(bootstrap.includes("loadStyle('./styles/ops-refinement.css')"),'Ops CSS must load late');
assert(bootstrap.includes("loadStyle('./styles/window-material.css')"),'shared window material must load after Ops refinement');
assert(sw.includes("atlas-shell-0.16.8-r4"),'service worker cache must be v0.16.8-r4');
assert(sw.includes("'./styles/ops-refinement.css'"),'Ops CSS must be cached');
assert(sw.includes("'./styles/window-material.css'"),'shared window material must be cached');
assert(sw.includes("'./js/capture-flow-fix.js'"),'capture handoff patch must be cached');
assert(sw.includes("'./assets/lock-terrain.gif'"),'lock terrain must remain offline-critical');

console.log('Atlas v0.16.8-r4 neutral Ops workstation + boot guard: PASS');
