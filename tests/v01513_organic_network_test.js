const fs=require('fs');
const assert=require('assert');
const organic=fs.readFileSync('js/network-organic.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.13-r1",
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
  "version:'0.15.13-r1'",
]) assert(organic.includes(token),`missing organic network contract: ${token}`);

assert(!organic.includes('targetDirection'),'final organic settle must not preserve seed fan angles');
assert(!organic.includes('const envelopes={}'),'final organic settle must not use rigid branch envelope translation');
assert(!organic.includes('profileLinks()'),'associative links must not influence organic placement');
assert(organic.includes("tree=links.filter(l=>l.type==='tree'"),'only structural links may act as springs');
assert(organic.includes('(CX-centroidX)*p.centerShift'),'Center must recenter the graph centroid rather than pull every node inward');
assert(bootstrap.includes("const BUILD='0163r1'"),'bootstrap build not bumped');
assert(bootstrap.includes("./js/network-organic.js"),'organic settle runtime not loaded');
assert(sw.includes("atlas-shell-0.16.3-r1"),'service worker cache not bumped');
assert(sw.includes("'./js/network-organic.js'"),'organic settle missing from offline shell');
assert(docs.includes('final organic velocity-based settle'),'handoff must document organic final settle');
assert(docs.includes('recentres the graph centroid'),'handoff must document centroid centring');

console.log('Atlas v0.15.13 organic Obsidian-style network settle: PASS');
