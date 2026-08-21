const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "computeSeedLayout(profileId=activeProfileId())",
  "relaxLayout(nodes,seed,options={})",
  "topRootId(id,byId)",
  "collisionRadius(node)",
  "const branches={}",
  "const envelopes={}",
  "const pinned=options.pinned||new Set()",
  "return pinned.size?relaxLayout(nodes,out,{pinned,iterations:110}):out",
]) assert(layout.includes(token),`missing durable constrained-force contract: ${token}`);

assert(layout.includes("tree=nodes.filter(n=>n.parentId&&n.parentId!=='atlas'"),'structural hierarchy must supply spring links');
assert(layout.includes("branchOf=Object.fromEntries(ids.map(id=>[id,topRootId(id,byId)]))"),'nodes must be grouped by top-level branch');
assert(layout.includes('const want=a.radius+b.radius+physics.branchGap'),'branch envelopes must repel before overlap');
assert(layout.includes('delta[id].x+=(CX-pos[id].x)*physics.centerStrength'),'graph must retain a weak common centre force');
assert(!layout.includes('profileLinks()'),'associative cross-links must not participate in force placement');
assert(layout.includes('const seed=computeSeedLayout(profileId),layout=relaxLayout(nodes,seed,{physics:resolvedPhysics()})'),'radial geometry must be a seed followed by relaxation');
assert(docs.includes('deterministic constrained-force graph'),'current-state handoff must record the force layout model');
assert(docs.includes('Associative/dotted cross-links are visual relationships only and exert zero layout force'),'handoff must protect zero-force cross-links');

console.log('Atlas durable deterministic constrained-force network: PASS');
