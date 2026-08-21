const fs=require('fs');
const assert=require('assert');
const organic=fs.readFileSync('js/network-organic.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.14-r1",
  "function pinnedIds()",
  "Object.keys(active?.origins||{}).forEach(id=>out.add(id))",
  "rootRepel:1.9",
  "rootPair=a.level<=2&&b.level<=2",
  "*(rootPair?p.rootRepel:1)",
  "rootPair?p.collisionGap*.9:0",
  "version:'0.15.14-r1'",
]) assert(organic.includes(token),`missing responsive-anchor/core contract: ${token}`);

assert(!organic.includes('moved>.5'),'persisted map offsets must not permanently pin nodes');
assert(!organic.includes('record.mapOffsetX'),'organic pinning must not inspect stored offsets');
assert(organic.includes("dragging?.kind==='node-group'"),'the actively dragged branch must remain pinned');
assert(organic.includes("tree=links.filter(l=>l.type==='tree'"),'only structural links may act as springs');
assert(bootstrap.includes("const BUILD='0164r1'"),'bootstrap build not bumped');
assert(bootstrap.includes('Atlas responsive organic network settle v0.15.14'),'bootstrap organic label missing');
assert(sw.includes("atlas-shell-0.16.4-r1"),'service worker cache not bumped');
assert(docs.includes('Persisted manual offsets are soft starting preferences, not permanent pins'),'handoff must document responsive anchors');
assert(docs.includes('root-to-root repulsion is stronger'),'handoff must document core-node separation');

console.log('Atlas v0.15.14 responsive anchors + root separation: PASS');
