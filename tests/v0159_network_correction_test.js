const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "Atlas v0.15.9-r1",
  "const preferredStep=clamp(.66-(Math.max(0,count-4)*.045),.42,.66)",
  "const span=Math.min(Math.PI*1.48,preferredStep*(count-1))",
  "directCrossRoute(a,b)",
  "return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`",
  "svg.querySelectorAll('.edge.cross')",
  "delete path.dataset.routeLane",
  "version:'0.15.9-r1'",
]) assert(layout.includes(token),`missing v0.15.9 correction contract: ${token}`);

assert(!layout.includes('centreRoute('),'cross-links must not use a synthetic centre waypoint');
assert(!layout.includes('hub={x:CX'),'cross-links must not converge on the centre');
assert(!layout.includes('routeLane=String'),'cross-links must not use routing lanes');
assert(!layout.includes(' C ${'),'cross-links must not use Bezier detours');
assert(layout.includes('ROOT_RADIUS=184'),'v0.15.8 compact circular root orbit must be preserved');
assert(layout.includes('BASE_CHILD_RADIUS=84'),'v0.15.8 fixed recursive expansion step must be preserved');
assert(layout.includes('MIN_SIBLING_CLEARANCE=58'),'v0.15.8 sibling clearance rule must be preserved');
assert(bootstrap.includes("const BUILD='0159r1'"),'bootstrap build not bumped');
assert(sw.includes("atlas-shell-0.15.9-r1"),'service worker cache not bumped');

console.log('Atlas v0.15.9 network correction: PASS');
