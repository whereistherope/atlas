const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "Atlas v0.15.9-r1",
  "ROOT_RX=318,ROOT_RY=214",
  "BASE_CHILD_RADIUS_BY_PARENT={2:112,3:90,4:72,5:58,6:52}",
  "MIN_SIBLING_CLEARANCE=64",
  "straightCrossRoute(a,b)",
  "direct-cross-route",
  "version:'0.15.9-r1'",
]) assert(layout.includes(token),`missing v0.15.9 network contract: ${token}`);

assert(layout.includes("return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`"),'cross-links must be direct straight segments');
assert(!layout.includes('centreRoute('),'centre-hub cross-link routing must not return');
assert(!layout.includes('hub={x:CX'),'cross-links must not converge on an imaginary centre point');
assert(!layout.includes('routeLane=String'),'cross-links must not use artificial centre lanes');
assert(!layout.includes(' Q ')&&!layout.includes(' C '),'network-layout must not introduce curved cross-link routing');
assert(layout.includes('CX+Math.cos(a)*ROOT_RX')&&layout.includes('CY+Math.sin(a)*ROOT_RY'),'major domains must use the broader ellipse');
assert(bootstrap.includes("const BUILD='0159r1'"),'bootstrap build not bumped');
assert(bootstrap.includes('Atlas direct-link constellation v0.15.9'),'bootstrap network runtime label not updated');
assert(sw.includes("atlas-shell-0.15.9-r1"),'service worker cache not bumped');

console.log('Atlas v0.15.9 direct-link spacing contracts: PASS');
