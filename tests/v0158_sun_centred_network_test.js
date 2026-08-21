const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');

for(const token of [
  "assignRootAngles(roots)",
  "Math.PI*2/Math.max(1,ordered.length)",
  "MIN_SIBLING_CLEARANCE",
  "childFanAngles(count,outward)",
  "childRadius(parentLevel,count,angles)",
  "placeLabelsBelow(scope)",
  "dominant-baseline','hanging'",
  "boxesOverlap",
]) assert(layout.includes(token),`missing durable network contract: ${token}`);

assert(!layout.includes("signedUnit(child.id+':radius')"),'direct sibling radius must not contain random jitter');
assert(layout.includes('const radius=childRadius(parentLevel,cs.length,angles)'),'all direct siblings must share one resolved radius');
assert(layout.includes('outward-span/2+i*step'),'siblings must use equal angular intervals');
assert(layout.includes("svg.querySelectorAll('.edge.cross')"),'associative cross-links must remain independently routable');
assert(layout.includes("y=node.y+visualRadius(node)+LABEL_GAP"),'labels must begin below their own node');
assert(css.includes('font-size:8.3px!important'),'all normal node labels must use level-4 type size');
assert(css.includes('#network .node.level1 .label')&&css.includes('#network .node.level5 .label'),'uniform label rule must cover every hierarchy level');

console.log('Atlas durable deterministic network contracts: PASS');
