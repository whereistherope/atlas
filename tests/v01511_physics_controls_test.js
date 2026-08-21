const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/ATLAS_CURRENT_STATE.md','utf8');

for(const token of [
  "Atlas v0.15.11-r1",
  "PHYSICS_DEFAULTS=Object.freeze({center:50,repel:50,linkStrength:50,linkDistance:50,collision:50})",
  "state?.settings?.networkPhysics",
  "resolvedPhysics()",
  "nodeRepel:500+p.repel*19",
  "linkStrength:.018+p.linkStrength*.0008",
  "centerStrength:.0006+p.center*.00006",
  "linkDistanceScale:.65+p.linkDistance*.007",
  "collisionSpacing:6+p.collision*.22",
  "installPhysicsControls(scope=null)",
  "control=document.createElement('details')",
  "data-network-physics",
  "data-physics-reset",
  "schedulePhysicsRedraw",
  "version:'0.15.11-r1'",
]) assert(layout.includes(token),`missing v0.15.11 physics contract: ${token}`);

assert(!layout.includes("control.open=true"),'physics control must not force itself open');
assert(css.includes('.atlas-physics-control')&&css.includes('.atlas-physics-panel'),'physics control styling missing');
assert(css.includes('position:absolute'),'physics panel must float rather than consume map layout space');
assert(bootstrap.includes("const BUILD='0161r1'"),'bootstrap build not bumped');
assert(bootstrap.includes('Atlas tunable constrained-force network grammar v0.15.11'),'bootstrap label missing');
assert(sw.includes("atlas-shell-0.16.1-r1"),'service worker cache not bumped');
assert(docs.includes('Center, Repel, Link, Distance and Collision'),'handoff must document the five physics controls');
assert(docs.includes('collapsed by default'),'handoff must protect collapsible-by-default behavior');

console.log('Atlas v0.15.11 collapsible live physics controls: PASS');
