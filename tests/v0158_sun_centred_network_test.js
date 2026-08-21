const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');

for(const token of [
  "ROOT_RADIUS=184",
  "assignRootAngles(roots)",
  "Math.PI*2/Math.max(1,ordered.length)",
  "BASE_CHILD_RADIUS=84",
  "MIN_SIBLING_CLEARANCE=58",
  "childFanAngles(count,outward)",
  "childRadius(count,angles)",
  "placeLabelsBelow(scope)",
  "dominant-baseline','hanging'",
  "boxesOverlap",
]) assert(layout.includes(token),`missing durable sun-centred contract: ${token}`);

assert(!layout.includes('ROOT_RX'),'root orbit must remain circular, not elliptical');
assert(!layout.includes('ROOT_RY'),'root orbit must remain circular, not elliptical');
assert(!layout.includes("signedUnit(child.id+':radius')"),'direct sibling radius must not contain random jitter');
assert(layout.includes('const radius=childRadius(cs.length,angles)'),'all direct siblings must share one resolved radius');
assert(layout.includes('outward-span/2+i*step'),'siblings must use equal angular intervals');
assert(layout.includes("y=node.y+visualRadius(node)+LABEL_GAP"),'labels must begin below their own node');
assert(css.includes('font-size:8.3px!important'),'all normal node labels must use level-4 type size');
assert(css.includes('#network .node.level1 .label')&&css.includes('#network .node.level5 .label'),'uniform label rule must cover every hierarchy level');

console.log('Atlas durable v0.15.8 sun-centred geometry: PASS');
