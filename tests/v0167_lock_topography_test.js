const fs=require('fs');
const assert=require('assert');

const css=fs.readFileSync('styles/lock-topography.css','utf8');
const runtime=fs.readFileSync('js/lock-topography.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const auth=fs.readFileSync('js/auth.js','utf8');

for(const token of [
  'Atlas v0.16.7-r2',
  '.atlas-lock-relief',
  '.atlas-lock-layer.layer-1',
  '.atlas-lock-layer.layer-6',
  '.atlas-lock-status',
  '.atlas-lock-profile',
  '.network-stage .map-wrap::before',
  '.lock-screen .lock-card::before{display:none!important',
  'border-bottom:1px solid rgba(182,194,184,.22)',
]) assert(css.includes(token),`missing lock presentation contract: ${token}`);

for(const token of [
  "MEL_TZ='Australia/Melbourne'",
  "timeParts('UTC')",
  'terrainMarkup()',
  "root.AtlasLockTopography=Object.freeze({version:'0.16.7-r2'",
]) assert(runtime.includes(token),`missing lock runtime contract: ${token}`);

assert(!runtime.includes('SHOULD YOU BE HERE?'),'lock screen must not use hacker-style rotating prompts');
assert(!runtime.includes('atlas-lock-query'),'lock screen must not render terminal query chrome');
assert(!css.includes('content:"ATLAS / ACCESS"'),'lock screen must not render terminal access copy');
assert(!css.includes('background-size:32px 32px'),'lock screen must not use the old full-screen grid treatment');
assert(!css.includes('.atlas-lock-ghost'),'node-field ghost must not compete with the relief composition');

assert(bootstrap.includes("const BUILD='0167r2'"),'bootstrap build must be v0.16.7-r2');
assert(bootstrap.includes("loadStyle('./styles/lock-topography.css')"),'lock stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-topography.js','Atlas lock topography v0.16.7-r2')"),'lock runtime must load');
assert(sw.includes("atlas-shell-0.16.7-r2"),'service worker cache must be bumped');
assert(sw.includes("'./styles/lock-topography.css'"),'lock stylesheet must be cached');
assert(sw.includes("'./js/lock-topography.js'"),'lock runtime must be cached');

// Presentation remains additive: authentication still owns lock state and PIN verification.
for(const token of ['function attemptUnlock()','function lockOpen()','function lockClose()','async function initAtlasLock()']) assert(auth.includes(token),`auth contract missing: ${token}`);
assert(!runtime.includes('deriveVerifier('),'presentation runtime must not duplicate PIN verification');
assert(!runtime.includes('authSet('),'presentation runtime must not mutate lock configuration');

console.log('Atlas v0.16.7-r2 layered lock topography presentation: PASS');
