const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');

for(const token of [
  "computeBaseLayout",
  "guidedPositions",
  "cumulativeOffsets",
  "routeCrossEdges(scope)",
  "mapOffsetX",
  "mapOffsetY",
  "mapOffsetZ",
]) assert(layout.includes(token),`missing durable constellation contract: ${token}`);

assert(!layout.includes('headings[parent.id]'),'descendants must not inherit a trajectory heading from their parent');
assert(layout.includes("svg.querySelectorAll('.edge.cross')"),'only secondary cross-links should be rerouted');
assert(layout.includes('p.x-base[n.id].x-parent.x'),'manual anchors must remain hierarchical relative offsets');

console.log('Atlas durable clustered constellation contracts: PASS');
