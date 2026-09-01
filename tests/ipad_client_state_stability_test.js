const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const js=read('js/client-state-stability.js');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  "if(requested==='split'&&result?.settings)result.settings.mapViewMode='split'",
  "const syncDriven=args[0]===false",
  "if(syncDriven&&nextSignature&&nextSignature===lastSignature)return",
  "const scrollY=syncDriven?",
  "const splitList=document.querySelector('.network-split-list')",
  "nextList.scrollTop=splitScroll",
  "root.AtlasClientStateStability=Object.freeze({version:'0.16.9-r1'"
]) assert(js.includes(token),`client stability contract missing: ${token}`);

assert(bootstrap.includes("loadScript('./js/client-state-stability.js','Atlas cross-device client state stability')"),'client stability runtime must boot');
assert(sw.includes("'./js/client-state-stability.js'"),'client stability runtime must be available offline');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');
console.log('Atlas iPad client state stability contract: PASS');
