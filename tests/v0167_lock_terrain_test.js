const fs=require('fs');
const assert=require('assert');
const terrain=fs.readFileSync('js/lock-terrain.js','utf8');
const css=fs.readFileSync('styles/lock-terrain.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "deterministic exploded topographic lock-screen hero",
  "atlas-lock-terrain",
  "atlas-terrain-stack",
  "terrain-silhouette",
  "terrain-contour",
  "terrain-glyph",
  "SHOULD YOU BE HERE?",
  "WHERE ARE YOU GOING?",
  "Australia/Melbourne",
  "prefers-reduced-motion",
]) assert(terrain.includes(token),`missing lock terrain contract: ${token}`);

assert(terrain.includes('const total=6'),'terrain must render an exploded six-layer stack');
assert(terrain.includes("GLYPHS=['·','.',':','-','_','/','\\\\','+']"),'terrain surface must retain ASCII material glyphs');
assert(!terrain.includes('authConfig'),'terrain renderer must not own authentication state');
assert(!terrain.includes('deriveVerifier'),'terrain renderer must not perform PIN verification');

for(const token of [
  '.atlas-lock-terrain{',
  '.atlas-lock-meta{',
  '.terrain-silhouette{',
  '.terrain-contour{',
  '.terrain-glyph{',
  'atlasTerrainResolve',
  '@media(prefers-reduced-motion:reduce)',
]) assert(css.includes(token),`missing lock terrain style contract: ${token}`);

assert(css.includes('width:min(880px,72vw)'),'terrain hero must remain compositionally dominant on desktop');
assert(css.includes('position:fixed!important;left:32px!important;top:26px!important'),'Atlas brand must remain upper-left on the lock screen');
assert(css.includes('right:32px;top:27px'),'MEL/UTC metadata must remain upper-right');
assert(bootstrap.includes("const BUILD='0167r1'"),'bootstrap build must be v0.16.7-r1');
assert(bootstrap.includes("loadStyle('./styles/lock-terrain.css')"),'lock terrain stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-terrain.js','Atlas topographic lock identity v0.16.7')"),'lock terrain renderer must load');
assert(sw.includes("atlas-shell-0.16.7-r1"),'service worker cache must be v0.16.7-r1');
assert(sw.includes("'./styles/lock-terrain.css'"),'lock terrain stylesheet must be cached');
assert(sw.includes("'./js/lock-terrain.js'"),'lock terrain renderer must be cached');

console.log('Atlas v0.16.7 topographic lock-screen identity: PASS');
