const fs=require('fs');
const assert=require('assert');

const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const hierarchy=fs.readFileSync('js/graph-hierarchy-interactions.js','utf8');
const contract=fs.readFileSync('docs/ATLAS_INTERACTION_CONTRACT.md','utf8');

assert(bootstrap.includes("./js/graph-hierarchy-interactions.js"),'hierarchy runtime is not loaded');
assert(sw.includes("'./js/graph-hierarchy-interactions.js'"),'hierarchy runtime is not cached offline');
assert(hierarchy.includes("root.AtlasGraphInteractions"),'hierarchy interaction export missing');
assert(hierarchy.includes("noteBelongsToBranch"),'level-5 descendants are not included in branch movement');
assert(hierarchy.includes("isAreaBranchMember"),'structural descendant collection missing');
assert(hierarchy.includes("Object.entries(dragging.origins||{}).forEach"),'drag does not translate collected branch nodes');
assert(hierarchy.includes("node.note?'note':'area'"),'uniform area/note selection route missing');
assert(hierarchy.includes("root.AtlasActions?.note"),'level-5 note click does not open/select note');
assert(hierarchy.includes("atlas-node-hit-target"),'small-node hit target missing');
assert(hierarchy.includes("Math.max(12"),'small-node minimum pointer radius missing');
assert(hierarchy.includes("n.mapX=Number(p.x)"),'anchored level-5 X position missing');
assert(hierarchy.includes("n.mapY=Number(p.y)"),'anchored level-5 Y position missing');
assert(hierarchy.includes("n.mapZ=Number(p.mapZ)"),'anchored level-5 Z position missing');
assert(!hierarchy.includes("if(dragging.id.startsWith('n'))return"),'level-5 drag blocker reintroduced');
assert(contract.includes('Graph movement follows hierarchy'),'graph hierarchy interaction contract missing');
assert(contract.includes('moving a level 5 node moves only that node'),'level-5 individual drag contract missing');

console.log('Atlas v0.15.3 graph hierarchy contracts: PASS');
