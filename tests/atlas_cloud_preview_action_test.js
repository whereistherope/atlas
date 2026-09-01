const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const ui=read('js/sync-recovery-ui.js');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  'async function ensurePreviewAccess()',
  "typeof cloud?.testAccess!=='function'",
  'const result=await cloud.testAccess()',
  'const result=await root.AtlasSyncRecovery.preview()',
  "if(!result?.ok)uiError=String(result?.error||'Atlas Cloud setup preview failed.')",
  "catch(error){uiError=String(error?.message||'Atlas Cloud setup failed.');}",
  "if(uiError)detail=escText(uiError)"
]) assert(ui.includes(token),`Atlas Cloud preview fix missing: ${token}`);

assert(!ui.includes("button.dataset.syncRecovery==='preview')await root.AtlasSyncRecovery.preview()"),'preview must no longer silently discard a failed result');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1];
const shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'preview fix requires aligned bootstrap/offline build versions');
console.log('Atlas Cloud preview action contract: PASS');
