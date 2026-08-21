const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "Atlas v0.15.9-r1",
  "ROOT_RADIUS=204",
  "assignRootAngles(roots)",
  "Math.PI*2/Math.max(1,ordered.length)",
  "BASE_CHILD_RADIUS=92",
  "MIN_SIBLING_CLEARANCE=64",
  "childFanAngles(count,outward)",
  "childRadius(count,angles)",
  "directCrossRoute(a,b)",
  "placeLabelsBelow(scope)",
  "dominant-baseline','hanging'",
  "boxesOverlap",
]) assert(layout.includes(token),`missing sun-centred contract: ${token}`);

assert(!layout.includes('ROOT_RX'),'root orbit must remain circular, not elliptical');
assert(!layout.includes('ROOT_RY'),'root orbit must remain circular, not elliptical');
assert(!layout.includes('PREFERRED_ROOT_SLOT'),'roots must remain evenly spaced rather than use preferred slots');
assert(!layout.includes("signedUnit(child.id+':radius')"),'direct sibling radius must not contain random jitter');
assert(layout.includes('const radius=childRadius(cs.length,angles)'),'all direct siblings must share one resolved radius');
assert(layout.includes('outward-span/2+i*step'),'siblings must use equal angular intervals');
assert(layout.includes("svg.querySelectorAll('.edge.cross')"),'routing override must apply only to associative cross-links');
assert(layout.includes("return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`"),'cross-links must be one straight clipped source-to-target segment');
assert(!layout.includes('centreRoute('),'cross-links must not route through a synthetic centre waypoint');
assert(!layout.includes('hub={x:CX'),'cross-links must not converge on a central hub');
assert(!layout.includes('crossCurve('),'cross-links must not use curved detours around the network');
assert(!layout.includes('routeLane'),'cross-links must not use artificial routing lanes');
assert(layout.includes("y=node.y+visualRadius(node)+LABEL_GAP"),'labels must begin below their own node');
assert(css.includes('font-size:8.3px!important'),'all normal node labels must use level-4 type size');
assert(css.includes('#network .node.level1 .label')&&css.includes('#network .node.level5 .label'),'uniform label rule must cover every hierarchy level');
assert(bootstrap.includes("const BUILD='0159r1'"),'bootstrap build not bumped');
assert(sw.includes("atlas-shell-0.15.9-r1"),'service worker cache not bumped');
assert(layout.includes("version:'0.15.9-r1'"),'network layout export version missing');

console.log('Atlas v0.15.9 sun-centred network correction: PASS');
