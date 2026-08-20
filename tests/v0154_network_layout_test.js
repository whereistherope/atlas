const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "AtlasNetworkLayout",
  "computeBaseLayout",
  "guidedPositions",
  "leafCount",
  "assignRootAngles",
  "PREFERRED_ROOT_SLOT",
  "RADII",
  "localOffset",
  "mapOffsetX",
  "mapOffsetY",
  "mapOffsetZ",
  "delete mapDraftLayouts[profileId]",
  "Guided constellation restored",
  "Guided constellation anchored",
]) assert(layout.includes(token),`missing guided-layout contract: ${token}`);

assert(layout.includes("const gd=baseGraphData(scope),positions=guidedPositions(activeProfileId(),true)"),'scope/filter rendering must use the same guided geometry');
assert(layout.includes("total=cs.reduce((s,c)=>s+leafCount(c.id),0)"),'branch sectors must be weighted by descendant leaves');
assert(layout.includes("usable*(leafCount(c.id)/Math.max(1,total))"),'child branch width must scale by descendant leaf share');
assert(layout.includes("p.x-base[n.id].x-parent.x"),'anchor must persist local hierarchical offsets rather than absolute map replacement');
assert(layout.includes("anchorMapLayout=anchorGuidedLayout"),'Anchor must use guided offset persistence');
assert(layout.includes("button.onclick=()=>reformGuidedLayout(scope)"),'Reform must restore the deterministic guided constellation');
assert(bootstrap.includes("./js/network-layout.js"),'guided layout runtime not loaded');
assert(bootstrap.includes("./styles/network-layout.css"),'network layout CSS not loaded');
assert(sw.includes("'./js/network-layout.js'"),'guided layout runtime missing from offline shell');
assert(sw.includes("'./styles/network-layout.css'"),'network layout CSS missing from offline shell');
assert(css.includes('fill:transparent!important')&&css.includes('stroke:transparent!important'),'functional hit target must not alter node appearance');

console.log('Atlas v0.15.4 guided network layout: PASS');
