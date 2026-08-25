const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('styles/ops-refinement.css','utf8');
const material=fs.readFileSync('styles/window-material.css','utf8');
const js=fs.readFileSync('js/ops-refinement.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'body[data-skin="ops"]',
  '.atlas-network-minimap',
  '.map-wrap:before',
  '.atlas-widget',
]) assert(css.includes(token),`missing Ops presentation contract: ${token}`);

for(const token of [
  "const SKIN='ops'",
  'function renderMinimap(scope=null)',
  "class:'mini-viewport'",
  "fitMap(scope)",
  "AtlasOpsRefinement=Object.freeze({version:'0.16.8-r1'",
]) assert(js.includes(token),`missing Ops runtime contract: ${token}`);

for(const token of [
  '--atlas-field-surface:',
  '.atlas-vnote-body,',
  'border-width:0!important',
  'border-radius:2px!important',
  'backdrop-filter:blur(9px)',
]) assert(material.includes(token),`missing Ops frameless material contract: ${token}`);

assert(!js.includes('MutationObserver'),'Ops refinement must remain explicit/event-driven');
assert(!js.includes('state.settings.skin='),'Ops refinement must not add a persisted skin schema');
assert(bootstrap.includes("const BUILD='0168r3'"),'bootstrap build must advance to v0.16.8-r3');
assert(bootstrap.includes("loadStyle('./styles/ops-refinement.css')"),'Ops CSS must load late');
assert(bootstrap.includes("loadStyle('./styles/window-material.css')"),'shared window material must load after Ops refinement');
assert(bootstrap.includes("loadScript('./js/ops-refinement.js','Atlas Ops refinement v0.16.8')"),'Ops runtime must load');
assert(sw.includes("atlas-shell-0.16.8-r3"),'service worker cache must be v0.16.8-r3');
assert(sw.includes("'./styles/ops-refinement.css'"),'Ops CSS must be cached');
assert(sw.includes("'./styles/window-material.css'"),'shared window material must be cached');
assert(sw.includes("'./js/ops-refinement.js'"),'Ops runtime must be cached');
assert(sw.includes("'./js/capture-flow-fix.js'"),'capture handoff patch must be cached');
assert(sw.includes("'./assets/lock-terrain.gif'"),'lock terrain must be offline-critical now');

console.log('Atlas v0.16.8 Ops refinement through r3 frameless windows: PASS');
