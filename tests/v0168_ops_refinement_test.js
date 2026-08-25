const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('styles/ops-refinement.css','utf8');
const r5=fs.readFileSync('styles/ops-r5.css','utf8');
const material=fs.readFileSync('styles/window-material.css','utf8');
const tokens=fs.readFileSync('styles/tokens.css','utf8');
const js=fs.readFileSync('js/ops-refinement.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'body[data-skin="ops"]',
  '.atlas-network-minimap',
  '.atlas-vnote-sheet',
  '.atlas-vnote-toolbar button',
]) assert(css.includes(token),`missing Ops workstation base contract: ${token}`);

for(const token of [
  'body[data-skin="ops"][data-theme="night"]',
  '--bg:#050505!important',
  '--ink:#d2d2d2!important',
  'body[data-skin="ops"][data-theme="day"]',
  '--bg:#303234!important',
  '--surface-1:#393b3e!important',
  'body[data-skin="ops"]:after{background:none!important}',
  '.atlas-widget{background:var(--ops-panel)!important',
  '.network-stage,',
  '.atlas-vnote-sheet,',
]) assert(r5.includes(token),`missing resolved Ops r5 palette contract: ${token}`);

for(const token of [
  "const SKIN='ops'",
  'function renderMinimap(scope=null)',
  "class:'mini-viewport'",
  "fitMap(scope)",
]) assert(js.includes(token),`missing Ops runtime contract: ${token}`);

for(const token of [
  'body[data-skin="ops"][data-theme="night"]',
  '--atlas-window-surface:#080808',
  '--atlas-field-surface:#050505',
]) assert(material.includes(token),`missing neutral Ops material contract: ${token}`);

for(const token of [
  'html:not(.atlas-ready){background:#050505;overflow:hidden}',
  'html:not(.atlas-ready)::before',
  "url('./../assets/lock-terrain.gif?v=0167r2')",
  '@keyframes atlasBootField',
  '@keyframes atlasBootTerrain',
]) assert(tokens.includes(token),`missing animated pre-auth boot field: ${token}`);

assert(!js.includes('MutationObserver'),'Ops refinement must remain explicit/event-driven');
assert(!js.includes('state.settings.skin='),'Ops refinement must not add a persisted skin schema');
assert(bootstrap.includes("const BUILD='0168r5'"),'bootstrap build must advance to v0.16.8-r5');
assert(bootstrap.includes("document.documentElement.classList.add('atlas-ready')"),'boot guard must release only after load resolves');
assert(bootstrap.includes("loadStyle('./styles/ops-r5.css')"),'resolved Ops r5 CSS must load last');
assert(sw.includes("atlas-shell-0.16.8-r5"),'service worker cache must be v0.16.8-r5');
assert(sw.includes("'./styles/ops-r5.css'"),'Ops r5 CSS must be cached');
assert(sw.includes("'./assets/lock-terrain.gif'"),'lock terrain must remain offline-critical');

console.log('Atlas v0.16.8-r5 resolved Ops palettes + animated boot field: PASS');
