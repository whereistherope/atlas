const fs=require('fs');
const assert=require('assert');
const organic=fs.readFileSync('js/network-organic.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "const ITERATIONS=440",
  "const DAMPING=.79",
  "function settle(nodes,links,p)",
  "links.filter(l=>l.type==='tree'",
  "charge:800+repel*22",
  "desiredLink(child,p)",
  "collisionRadius(n,p)",
  "const centroidX=ids.reduce",
  "rootGravity",
  "graphData=function(scope)",
]) assert(organic.includes(token),`missing durable organic network contract: ${token}`);

assert(!organic.includes('targetDirection'),'final organic settle must not preserve seed fan angles');
assert(!organic.includes('const envelopes={}'),'final organic settle must not use rigid branch envelope translation');
assert(!organic.includes('profileLinks()'),'associative links must not influence organic placement');
assert(organic.includes("tree=links.filter(l=>l.type==='tree'"),'only structural links may act as springs');
assert(organic.includes('(CX-centroidX)*p.centerShift'),'Center must recenter the graph centroid rather than pull every node inward');
assert(docs.includes('organic velocity-based settle'),'handoff must document organic final settle');
assert(docs.includes('centroid recentering'),'handoff must document centroid centring');

console.log('Atlas durable organic Obsidian-style network settle: PASS');
