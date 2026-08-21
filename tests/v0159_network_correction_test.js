const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');

for(const token of [
  "const preferredStep=clamp(.66-(Math.max(0,count-4)*.045),.42,.66)",
  "const span=Math.min(Math.PI*1.48,preferredStep*(count-1))",
  "directCrossRoute(a,b)",
  "return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`",
  "svg.querySelectorAll('.edge.cross')",
  "delete path.dataset.routeLane",
]) assert(layout.includes(token),`missing durable direct-link correction contract: ${token}`);

assert(!layout.includes('centreRoute('),'cross-links must not use a synthetic centre waypoint');
assert(!layout.includes('hub={x:CX'),'cross-links must not converge on the centre');
assert(!layout.includes('routeLane=String'),'cross-links must not use routing lanes');
assert(!layout.includes(' C ${'),'cross-links must not use Bezier detours');
assert(layout.includes('ROOT_RADIUS=184'),'compact circular root seed must be preserved');
assert(layout.includes('BASE_CHILD_RADIUS=84'),'recursive seed expansion step must be preserved');
assert(layout.includes('MIN_SIBLING_CLEARANCE=58'),'sibling seed-clearance rule must be preserved');

console.log('Atlas durable v0.15.9 network correction contracts: PASS');
