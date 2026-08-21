const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');

for(const token of [
  "Atlas v0.15.7-r1",
  "CHILD_RADIUS_BY_PARENT",
  "childFanAngles(parent,count,outward)",
  "const radius=CHILD_RADIUS_BY_PARENT[parentLevel]",
  "const actualStep=span/(count-1)",
  "outward-span/2+i*actualStep",
  "placeFan(parent,ancestorPos)",
  "placeFan(child,pp)",
  "version:'0.15.7-r1'",
]) assert(layout.includes(token),`missing recursive radial fan contract: ${token}`);

assert(!layout.includes('useTwoRings'),'siblings must not split across unequal radial rings');
assert(!layout.includes("child.id+':radius'"),'siblings must not receive random individual radii');
assert(!layout.includes('leafCount(child.id)>1'),'subtree weight must not change a direct child sibling radius');
assert(layout.includes('pp.x+Math.cos(angle)*radius')&&layout.includes('pp.y+Math.sin(angle)*radius*.92'),'every sibling must be emitted from the parent using the shared radius');
assert(layout.includes("if(count===1)return[outward]"),'single-child continuation must follow the parent outward direction');

console.log('Atlas v0.15.7 recursive radial fan geometry: PASS');
