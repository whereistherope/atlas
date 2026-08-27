const fs=require('fs');
const assert=require('assert');
const lock=fs.readFileSync('js/lock-terrain.js','utf8');
const css=fs.readFileSync('styles/lock-terrain.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'lock-screen identity shell',
  "Australia/Melbourne",
  'atlas-lock-meta',
  'AtlasLockTerrain',
]) assert(lock.includes(token),`missing lock identity contract: ${token}`);

assert(!lock.includes('GIF_SRC'),'lock identity must not reference the removed terrain GIF');
assert(!lock.includes('atlas-lock-terrain-gif'),'lock identity must not render terrain artwork');
assert(!lock.includes('buildTerrain'),'lock identity must not construct a terrain surface');
assert(!lock.includes('authConfig'),'visual layer must not own authentication state');
assert(!lock.includes('deriveVerifier'),'visual layer must not perform PIN verification');

for(const token of [
  '.atlas-lock-meta{',
  '.lock-screen .lock-card{',
  'left:42%!important',
  'background:',
  '.atlas-logo-lock',
]) assert(css.includes(token),`missing simplified lock presentation contract: ${token}`);

assert(!css.includes('.atlas-lock-terrain{'),'terrain container styling must be removed');
assert(!css.includes('.atlas-lock-terrain-gif{'),'terrain image styling must be removed');
assert(css.includes('filter:invert(1) brightness(1.08)!important'),'dark lock must retain a light Atlas logo');
assert(bootstrap.includes("const BUILD='0169r8'"),'bootstrap build must advance with r8 refinement');
assert(bootstrap.includes("loadStyle('./styles/lock-terrain.css')"),'lock identity stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-terrain.js','Atlas lock identity v0.16.9-r8')"),'lock identity shell must load');
assert(sw.includes("atlas-shell-0.16.9-r8"),'service worker cache must advance with r8 refinement');
assert(sw.includes("'./styles/lock-terrain.css'"),'lock identity stylesheet must be cached');
assert(sw.includes("'./js/lock-terrain.js'"),'lock identity shell must be cached');
assert(!sw.includes('lock-terrain.gif'),'removed terrain GIF must not remain in the app shell');

console.log('Atlas lock identity without terrain artwork: PASS');
