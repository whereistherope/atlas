const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');

for(const token of [
  "Atlas v0.15.6-r1",
  "ORBIT={3:[92,132],4:[62,88],5:[43,61],6:[36,50]}",
  "placeCluster(parent,ancestorPos)",
  "useTwoRings=cs.length>5",
  "orbitAngles(parent,count,ringIndex,ringCount,outward)",
  "crossCurve(a,b,lane=0)",
  "routeCrossEdges(scope)",
  "placeRadialLabels(scope)",
  "tracked-cross-route",
]) assert(layout.includes(token),`missing clustered constellation contract: ${token}`);

assert(!layout.includes('headings[parent.id]'),'descendants must not inherit a trajectory heading from their parent');
assert(!layout.includes("Math.min(22,Math.max(5,d*.055))"),'tree links should not retain orbital curvature');
assert(layout.includes("svg.querySelectorAll('.edge.cross')"),'only secondary cross-links should be rerouted');
assert(layout.includes("label.setAttribute('text-anchor'"),'labels must be positioned radially away from their parent connection');
assert(layout.includes("version:'0.15.6-r1'"),'clustered constellation version export missing');

console.log('Atlas v0.15.6 clustered constellation grammar: PASS');
