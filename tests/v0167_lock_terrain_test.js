const fs=require('fs');
const assert=require('assert');
const terrain=fs.readFileSync('js/lock-terrain.js','utf8');
const css=fs.readFileSync('styles/lock-terrain.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'lock-screen animated terrain asset shell',
  "GIF_SRC='./assets/lock-terrain.gif?v=0167r2'",
  'atlas-lock-terrain-gif',
  "Australia/Melbourne",
]) assert(terrain.includes(token),`missing lock GIF contract: ${token}`);

assert(terrain.includes("img.src=GIF_SRC"),'lock screen must render the animated terrain asset directly');
assert(!terrain.includes('ringPath('),'generated SVG terrain must not remain in the GIF implementation');
assert(!terrain.includes('terrain-glyph'),'generated ASCII terrain must not remain in the GIF implementation');
assert(!terrain.includes('authConfig'),'visual layer must not own authentication state');
assert(!terrain.includes('deriveVerifier'),'visual layer must not perform PIN verification');

for(const token of [
  '.atlas-lock-terrain{',
  '.atlas-lock-terrain-gif{',
  '.atlas-lock-meta{',
  'left:calc(50% - 112px)!important',
  'left:calc(50% + 2px)',
  'top:calc(50% - 180px)',
  'background:transparent',
  'mix-blend-mode:screen',
  '@media(prefers-reduced-motion:reduce)',
]) assert(css.includes(token),`missing lock GIF placement contract: ${token}`);

assert(css.includes('width:clamp(170px,19vw,260px)'),'terrain animation must remain compact beside the login block');
assert(!css.includes('pointer-events:none;overflow:hidden;background:#000'),'terrain container must not reintroduce a black tile behind the graphic');
assert(bootstrap.includes("const BUILD='0168r3'"),'bootstrap build must advance while preserving the v0.16.7 lock shell');
assert(bootstrap.includes("loadStyle('./styles/lock-terrain.css')"),'lock terrain stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-terrain.js','Atlas topographic lock identity v0.16.7')"),'lock terrain shell must load');
assert(sw.includes("atlas-shell-0.16.8-r3"),'service worker cache must advance with the current build');
assert(sw.includes("'./styles/lock-terrain.css'"),'lock terrain stylesheet must be cached');
assert(sw.includes("'./js/lock-terrain.js'"),'lock terrain shell must be cached');
assert(sw.includes("'./assets/lock-terrain.gif'"),'lock terrain asset must be available in the offline shell');

console.log('Atlas v0.16.7 animated terrain lock-screen identity: PASS');
