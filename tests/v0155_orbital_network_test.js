const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');

for(const token of [
  'computeBaseLayout',
  'guidedPositions',
  'localOffset',
  'mapOffsetX',
  'mapOffsetY',
  'mapOffsetZ',
  'anchorGuidedLayout',
  'reformGuidedLayout',
]) assert(layout.includes(token),`missing durable guided-layout contract: ${token}`);

assert(layout.includes('positions[child.id]={'),'hierarchical children must retain deterministic positions');
assert(layout.includes('p.x-base[n.id].x-parent.x'),'manual layout must remain relative to hierarchical base geometry');
assert(!layout.includes('RADII={'),'global level-ring model must not return');

console.log('Atlas guided network compatibility contracts: PASS');
