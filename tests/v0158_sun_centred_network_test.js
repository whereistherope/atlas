const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "Atlas v0.15.9-r1",
  "ROOT_RADIUS=184",
  "ROOT_START=-Math.PI*.76",
  "assignRootAngles(roots)",
  "Math.PI*2/Math.max(1,ordered.length)",
  "BASE_CHILD_RADIUS=84",
  "MIN_SIBLING_CLEARANCE=64",
  "DENSE_FAN_RADIUS=92",
  "childFanAngles(count,outward)",
  "childRadius(count,angles)",
  "directCrossRoute(a,b)",
  " L ${end.x.toFixed(2)} ${end.y.toFixed(2)}",
  "placeLabelsBelow(scope)",
  "dominant-baseline','hanging'",
  "boxesOverlap",
]) assert(layout.includes(token),`missing canonical constellation contract: ${token}`);

assert(!layout.includes('ROOT_RX'),'v0.15.8 root circle must not be replaced by a different root model');
assert(!layout.includes('ROOT_RY'),'v0.15.8 root circle must not be replaced by a different root model');
assert(!layout.includes('centreRoute('),'cross-links must not be routed through an imaginary centre hub');
assert(!layout.includes('hub={x:CX'),'centre-hub routing must not return');
assert(!layout.includes('routeLane'),'cross-link lane detours must not return');
assert(!layout.includes("signedUnit(child.id+':radius')"),'direct sibling radius must not contain random jitter');
assert(layout.includes('const base=count>=5?DENSE_FAN_RADIUS:BASE_CHILD_RADIUS'),'spacing adjustment must be local to dense sibling fans');
assert(layout.includes('const radius=childRadius(cs.length,angles)'),'all direct siblings must share one resolved radius');
assert(layout.includes('outward-span/2+i*step'),'siblings must retain equal angular intervals');
assert(layout.includes("svg.querySelectorAll('.edge.cross')"),'only associative cross-links should be rerouted');
assert(layout.includes("state.areas||[]")&&layout.includes("state.notes||[]"),'network must render from the currently loaded Atlas state');
assert(!layout.includes('localStorage')&&!layout.includes('indexedDB'),'layout module must not create a second local source of truth');
assert(layout.includes("y=node.y+visualRadius(node)+LABEL_GAP"),'labels must begin below their own node');
assert(css.includes('font-size:8.3px!important'),'all normal node labels must use level-4 type size');
assert(css.includes('#network .node.level1 .label')&&css.includes('#network .node.level5 .label'),'uniform label rule must cover every hierarchy level');
assert(bootstrap.includes("const BUILD='0159r1'"),'bootstrap build not bumped');
assert(sw.includes("atlas-shell-0.15.9-r1"),'service worker cache not bumped');
assert(layout.includes("version:'0.15.9-r1'"),'network layout export version missing');

console.log('Atlas v0.15.9 canonical constellation routing: PASS');
