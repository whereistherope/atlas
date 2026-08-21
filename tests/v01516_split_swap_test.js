const fs=require('fs');
const assert=require('assert');
const split=fs.readFileSync('js/network-split.js','utf8');
const css=fs.readFileSync('styles/network-split.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.16-r1",
  "MAP_FIRST='map-first',LIST_FIRST='list-first'",
  "state.settings.mapSplitOrder=splitOrder()",
  "data-network-split-swap",
  "function applyOrder(order",
  "function toggleOrder()",
  "return splitOrder()===MAP_FIRST?firstPct:100-firstPct",
  "version:'0.15.16-r1'",
]) assert(split.includes(token),`missing split-swap contract: ${token}`);

assert(css.includes('.network-split.order-map-first'),'map-first split layout missing');
assert(css.includes('.network-split.order-list-first'),'list-first split layout missing');
assert(css.includes('grid-template-areas:"map divider list"'),'desktop map-first order missing');
assert(css.includes('grid-template-areas:"list divider map"'),'desktop list-first order missing');
assert(css.includes('grid-template-areas:"map" "divider" "list"'),'mobile map-first order missing');
assert(css.includes('grid-template-areas:"list" "divider" "map"'),'mobile list-first order missing');
assert(bootstrap.includes("const BUILD='0166r1'"),'bootstrap build not bumped');
assert(bootstrap.includes('Atlas switchable split network/list view v0.15.16'),'bootstrap split label missing');
assert(sw.includes("atlas-shell-0.16.6-r1"),'service worker cache not bumped');
assert(docs.includes('Split order is switchable with a compact Swap control'),'handoff must document swap control');
assert(docs.includes('mapSplitOrder'),'handoff must document persisted pane order');

console.log('Atlas v0.15.16 switchable split pane order: PASS');
