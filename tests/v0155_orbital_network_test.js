const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');

for(const token of [
  "Atlas v0.15.5-r1",
  "placeChildren(parent)",
  "const pp=positions[parent.id]",
  "headings[parent.id]",
  "STEP={2:0,3:132,4:94,5:68,6:54}",
  "angleJitter",
  "radialJitter",
  "tangent",
  "edgeCurve",
  "type==='cross'",
  " Q ",
  "routeEdges(scope)",
  "orbital-route",
]) assert(layout.includes(token),`missing orbital network contract: ${token}`);

assert(!layout.includes('RADII={'),'global level-ring radius model must not return');
assert(layout.includes('positions[child.id]={')&&layout.includes('pp.x+nx*distance'),'children must be positioned locally from their parent nucleus');
assert(layout.includes("const bend=type==='cross'"),'cross-links need distinct routing curvature');
assert(layout.includes("Math.min(22,Math.max(5,d*.055))"),'tree links should retain restrained curvature');
assert(layout.includes("Math.min(72,Math.max(18,d*.18"),'cross-links should use wider tracking lanes');
assert(layout.includes("version:'0.15.5-r1'"),'orbital network version export missing');

console.log('Atlas v0.15.5 orbital network grammar: PASS');
