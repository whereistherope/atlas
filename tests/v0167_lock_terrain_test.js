const fs=require('fs');
const assert=require('assert');
const terrain=fs.readFileSync('js/lock-terrain.js','utf8');
const css=fs.readFileSync('styles/lock-terrain.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of ['Atlas lock-screen identity shell','Australia/Melbourne','atlas-lock-meta','identityMounted']) assert(terrain.includes(token),`missing lock identity contract: ${token}`);
assert(!terrain.includes('lock-terrain.gif'),'lock identity must not load the removed terrain GIF');
assert(!terrain.includes('buildTerrain'),'lock identity must not construct terrain artwork');
assert(!terrain.includes('authConfig'),'visual layer must not own authentication state');
assert(!terrain.includes('deriveVerifier'),'visual layer must not perform PIN verification');

for(const token of ['.atlas-lock-terrain{display:none!important}','left:42%!important','transform:translate(-50%,-50%)!important','.atlas-lock-meta{']) assert(css.includes(token),`missing artwork-free lock placement contract: ${token}`);
assert(bootstrap.includes("const BUILD='0169r21'"),'bootstrap build must advance with r21 material/window refinement');
assert(bootstrap.includes("loadStyle('./styles/lock-terrain.css')"),'lock identity stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-terrain.js','Atlas lock identity v0.16.9-r17')"),'lock identity runtime must remain unchanged through r21');
assert(sw.includes("atlas-shell-0.16.9-r21"),'service worker cache must advance with r21');
assert(sw.includes("'./styles/lock-terrain.css'"),'lock identity stylesheet must be cached');
assert(sw.includes("'./js/lock-terrain.js'"),'lock identity runtime must be cached');
assert(!sw.includes("'./assets/lock-terrain.gif'"),'removed terrain asset must not remain offline-critical');

console.log('Atlas artwork-free lock identity preserved through r21: PASS');
