const fs=require('fs');
const assert=require('assert');
const controls=fs.readFileSync('js/network-controls.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.12-r1",
  "installUnifiedGraphControls(scope=null)",
  "control.classList.add('atlas-graph-control')",
  "control.dataset.networkControls=''",
  "summary.textContent='Controls'",
  "data-map-controls-group",
  "body.appendChild(hud)",
  "ensureAnchorControl(hud,svg.dataset.scope||scope)",
  "anchor.dataset.mapAnchor=''",
  "anchor.textContent='Anchor'",
  "control.open=false",
  "version:'0.15.12-r1'",
]) assert(controls.includes(token),`missing unified graph-controls contract: ${token}`);

assert(css.includes('.map-controls .atlas-graph-control'),'unified controls styling missing');
assert(css.includes('grid-template-columns:minmax(0,1fr)!important'),'existing HUD must stack inside the collapsed panel');
assert(css.includes('max-height:min(72vh,560px)'),'expanded control panel must remain bounded');
assert(bootstrap.includes("const BUILD='0162r1'"),'bootstrap build not bumped');
assert(bootstrap.includes("./js/network-controls.js"),'unified graph-controls runtime not loaded');
assert(sw.includes("atlas-shell-0.16.2-r1"),'service worker cache not bumped');
assert(sw.includes("'./js/network-controls.js'"),'graph controls missing from offline shell');
assert(docs.includes('zoom/fit percentage, Reform, Anchor, Depth, Type opacity, Links opacity'),'handoff must document all unified controls');
assert(docs.includes('collapsed by default'),'unified panel must remain collapsed by default');

console.log('Atlas v0.15.12 unified collapsible graph controls: PASS');
