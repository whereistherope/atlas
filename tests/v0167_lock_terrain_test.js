const fs=require('fs');
const assert=require('assert');
const terrain=fs.readFileSync('js/lock-terrain.js','utf8');
const css=fs.readFileSync('styles/lock-terrain.css','utf8');
const editorCss=fs.readFileSync('styles/editor-ux.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of ['Atlas lock-screen identity shell','Australia/Melbourne','atlas-lock-meta','identityMounted']) assert(terrain.includes(token),`missing lock identity contract: ${token}`);
assert(!terrain.includes('lock-terrain.gif'),'lock identity must not load the removed terrain GIF');
assert(!terrain.includes('buildTerrain'),'lock identity must not construct terrain artwork');
assert(!terrain.includes('authConfig'),'visual layer must not own authentication state');
assert(!terrain.includes('deriveVerifier'),'visual layer must not perform PIN verification');
for(const token of ['.atlas-lock-terrain{display:none!important}','left:42%!important','transform:translate(-50%,-50%)!important','.atlas-lock-meta{']) assert(css.includes(token),`missing artwork-free lock placement contract: ${token}`);
for(const token of ['z-index:2147483000!important','.atlas-locked .atlas-note-editor-overlay','.atlas-locked .atlas-vnote-overlay','visibility:hidden!important','pointer-events:none!important']) assert(css.includes(token),`missing lock isolation contract: ${token}`);
for(const token of ['.atlas-note-editor-sheet,.atlas-vnote-sheet{resize:both','.overlay .modal{resize:both','resize:none!important']) assert(editorCss.includes(token),`missing resizable editor contract: ${token}`);

const build=bootstrap.match(/const\s+BUILD=['"]([^'"]+)['"]/);
const cache=sw.match(/const\s+CACHE_NAME\s*=\s*['"]atlas-shell-([^'"]+)['"]/);
assert(build,'bootstrap build identity must remain explicit');
assert(cache,'service-worker cache identity must remain explicit');
const parts=build[1].match(/^0?(\d{2})(\d)r(\d+)$/);
assert(parts,'bootstrap build identity format changed unexpectedly');
assert.strictEqual(cache[1],`0.${Number(parts[1])}.${Number(parts[2])}-r${parts[3]}`,'bootstrap and service-worker build identities must advance together');

assert(bootstrap.includes("loadStyle('./styles/lock-terrain.css')"),'lock identity stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-terrain.js','Atlas lock identity v0.16.9-r17')"),'lock identity runtime must remain unchanged');
assert(sw.includes("'./styles/lock-terrain.css'"),'lock identity stylesheet must be cached');
assert(sw.includes("'./js/lock-terrain.js'"),'lock identity runtime must be cached');
assert(!sw.includes("'./assets/lock-terrain.gif'"),'removed terrain asset must not remain offline-critical');
console.log('Atlas lock isolation and editor window compatibility: PASS');
