const fs=require('fs');
const assert=require('assert');
const layout=fs.readFileSync('js/network-layout.js','utf8');
const css=fs.readFileSync('styles/network-layout.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'AtlasNetworkLayout','computeBaseLayout','guidedPositions','leafCount','assignRootAngles',
  'PREFERRED_ROOT_SLOT','localOffset','mapOffsetX','mapOffsetY','mapOffsetZ',
  'delete mapDraftLayouts[profileId]'
]) assert(layout.includes(token),`missing guided-layout contract: ${token}`);

assert(layout.includes("const gd=baseGraphData(scope),positions=guidedPositions(activeProfileId(),true)"),'scope/filter rendering must use stable guided geometry');
assert(layout.includes("p.x-base[n.id].x-parent.x"),'Anchor must persist local hierarchical offsets rather than unrelated absolute replacement');
assert(layout.includes('anchorMapLayout=anchorGuidedLayout'),'Anchor must use guided offset persistence');
assert(layout.includes("button.onclick=()=>reformGuidedLayout(scope)"),'Reform must return to deterministic base geometry');
assert(bootstrap.includes("./js/network-layout.js"),'network layout runtime not loaded');
assert(bootstrap.includes("./styles/network-layout.css"),'network layout CSS not loaded');
assert(sw.includes("'./js/network-layout.js'"),'network layout runtime missing from offline shell');
assert(sw.includes("'./styles/network-layout.css'"),'network layout CSS missing from offline shell');
assert(css.includes('fill:transparent!important')&&css.includes('stroke:transparent!important'),'functional hit target must remain visually transparent');

console.log('Atlas durable guided network layout contracts: PASS');
