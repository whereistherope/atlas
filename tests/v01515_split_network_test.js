const fs=require('fs');
const assert=require('assert');
const split=fs.readFileSync('js/network-split.js','utf8');
const css=fs.readFileSync('styles/network-split.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.15-r1",
  "requested==='split'",
  "state.settings.mapSplitRatio=splitRatio()",
  "data-map-view=\"split\"",
  "data-network-split",
  "data-network-split-handle",
  "role=\"separator\"",
  "MIN_RATIO=25,MAX_RATIO=75,DEFAULT_RATIO=60",
  "state.settings.mapSplitRatio=Math.round(ratio*10)/10",
  "ArrowLeft",
  "ArrowRight",
  "window.matchMedia?.('(max-width:700px)').matches",
  "drawNetwork(scope)",
  "version:'0.15.15-r1'",
]) assert(split.includes(token),`missing split-view contract: ${token}`);

assert(split.includes('branchTreeHtml(scope)'),'Split must reuse the existing List branch tree renderer');
assert(split.includes('id=\"network\"'),'Split must reuse the live relationship-map SVG contract');
assert(css.includes('grid-template-columns:minmax(0,var(--atlas-split,60%))'),'desktop Split must be left/right');
assert(css.includes('grid-template-rows:minmax(0,var(--atlas-split,60%))'),'mobile Split must become top/bottom');
assert(css.includes('cursor:col-resize')&&css.includes('cursor:row-resize'),'divider must advertise the correct resize axis');
assert(bootstrap.includes("const BUILD='0165r1'"),'bootstrap build not bumped');
assert(bootstrap.includes("./styles/network-split.css"),'split CSS not loaded');
assert(bootstrap.includes("./js/network-split.js"),'split runtime not loaded');
assert(sw.includes("atlas-shell-0.16.5-r1"),'service worker cache not bumped');
assert(sw.includes("'./styles/network-split.css'")&&sw.includes("'./js/network-split.js'"),'split assets missing from offline shell');
assert(docs.includes('Nodes, List, Split and Predict'),'handoff must document the four network modes');
assert(docs.includes('60% map / 40% list'),'handoff must document the default ratio');
assert(docs.includes('clamped to 25–75%'),'handoff must document safe split limits');

console.log('Atlas v0.15.15 resizable network/list split view: PASS');
