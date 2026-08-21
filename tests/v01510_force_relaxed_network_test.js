const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.10-r1",
  "computeSeedLayout(profileId=activeProfileId())",
  "relaxLayout(nodes,seed,options={})",
  "FORCE_NODE_REPEL=1450",
  "FORCE_LINK_STRENGTH=.058",
  "FORCE_CENTER_STRENGTH=.0036",
  "FORCE_BRANCH_GAP=18",
  "topRootId(id,byId)",
  "collisionRadius(node)",
  "const branches={}",
  "const envelopes={}",
  "const pinned=options.pinned||new Set()",
  "return pinned.size?relaxLayout(nodes,out,{pinned,iterations:110}):out",
  "version:'0.15.10-r1'",
]) assert(layout.includes(token),`missing constrained-force contract: ${token}`);

assert(layout.includes("tree=nodes.filter(n=>n.parentId&&n.parentId!=='atlas'"),'structural hierarchy must supply spring links');
assert(layout.includes("branchOf=Object.fromEntries(ids.map(id=>[id,topRootId(id,byId)]))"),'nodes must be grouped by top-level branch');
assert(layout.includes("const want=a.radius+b.radius+FORCE_BRANCH_GAP"),'branch envelopes must repel before overlap');
assert(layout.includes("delta[id].x+=(CX-pos[id].x)*FORCE_CENTER_STRENGTH"),'graph must retain a weak common centre force');
assert(!layout.includes('profileLinks()'),'associative cross-links must not participate in force placement');
assert(layout.includes('const nodes=sourceNodes(profileId),seed=computeSeedLayout(profileId);\n    return relaxLayout(nodes,seed);'),'radial geometry must be a seed followed by relaxation');
assert(bootstrap.includes("const BUILD='01510r1'"),'bootstrap build not bumped');
assert(bootstrap.includes('Atlas constrained-force network grammar v0.15.10'),'bootstrap label missing');
assert(sw.includes("atlas-shell-0.15.10-r1"),'service worker cache not bumped');
assert(docs.includes('deterministic constrained-force graph'),'current-state handoff must record the new layout model');
assert(docs.includes('Associative/dotted cross-links are visual relationships only and exert zero layout force'),'handoff must protect zero-force cross-links');

console.log('Atlas v0.15.10 deterministic constrained-force network: PASS');
