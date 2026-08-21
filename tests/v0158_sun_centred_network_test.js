const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "Atlas v0.15.9-r1",
  "ROOT_RADIUS=184",
  "assignRootAngles(roots)",
  "Math.PI*2/Math.max(1,ordered.length)",
  "CHILD_RADIUS_BY_PARENT={2:112,3:86,4:66,5:54,6:48}",
  "MIN_SIBLING_CLEARANCE=58",
  "childFanAngles(count,outward)",
  "childRadius(parentLevel,count,angles)",
  "directCrossRoute(a,b)",
  "placeLabelsBelow(scope)",
  "dominant-baseline','hanging'",
  "boxesOverlap",
]) assert(layout.includes(token),`missing v0.15.9 network contract: ${token}`);

assert(!layout.includes('ROOT_RX'),'root orbit must remain circular, not elliptical');
assert(!layout.includes('ROOT_RY'),'root orbit must remain circular, not elliptical');
assert(!layout.includes('PREFERRED_ROOT_SLOT'),'root domains must remain equal-angle, not preferred-slot positioned');
assert(!layout.includes('centreRoute('),'cross-links must not route through a synthetic centre waypoint');
assert(!layout.includes('hub={x:CX'),'cross-links must not use a centre hub');
assert(!layout.includes('routeLane'),'cross-links must not be offset into artificial routing lanes');
assert(!layout.includes(' Q '),'cross-links must not use quadratic detours');
assert(!layout.includes(' C '),'cross-links must not use cubic detours');
assert(!layout.includes("signedUnit(child.id+':radius')"),'direct sibling radius must not contain random jitter');
assert(layout.includes('const radius=childRadius(parentLevel,cs.length,angles)'),'every direct sibling fan must share one resolved radius');
assert(layout.includes('outward-span/2+i*step'),'siblings must use equal angular intervals');
assert(layout.includes("svg.querySelectorAll('.edge.cross')"),'only associative cross-links should be re-routed');
assert(layout.includes(' L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`'),'cross-link path must be one straight source-to-target segment');
assert(layout.includes("y=node.y+visualRadius(node)+LABEL_GAP"),'labels must begin below their own node');
assert(css.includes('font-size:8.3px!important'),'all normal node labels must use level-4 type size');
assert(css.includes('#network .node.level1 .label')&&css.includes('#network .node.level5 .label'),'uniform label rule must cover every hierarchy level');
assert(bootstrap.includes("const BUILD='0159r1'"),'bootstrap build not bumped');
assert(sw.includes("atlas-shell-0.15.9-r1"),'service worker cache not bumped');
assert(layout.includes("version:'0.15.9-r1'"),'network layout export version missing');

console.log('Atlas v0.15.9 sun-centred network with restored radial fans: PASS');
