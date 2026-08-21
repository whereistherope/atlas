const fs=require('fs');
const assert=require('assert');

const css=fs.readFileSync('styles/lock-topography.css','utf8');
const runtime=fs.readFileSync('js/lock-topography.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const auth=fs.readFileSync('js/auth.js','utf8');

for(const token of [
  'Atlas v0.16.7-r1',
  '.atlas-lock-topography',
  '.atlas-lock-ghost',
  '.atlas-lock-status',
  '.atlas-lock-query',
  '.network-stage .map-wrap::before',
  'perspective(900px) rotateX(61deg)',
]) assert(css.includes(token),`missing lock presentation contract: ${token}`);

for(const token of [
  "QUERIES=['SHOULD YOU BE HERE?'",
  "MEL_TZ='Australia/Melbourne'",
  "timeParts('UTC')",
  'ghostMarkup()',
  "root.AtlasLockTopography=Object.freeze({version:'0.16.7-r1'",
]) assert(runtime.includes(token),`missing lock runtime contract: ${token}`);

assert(bootstrap.includes("const BUILD='0167r1'"),'bootstrap build must be v0.16.7-r1');
assert(bootstrap.includes("loadStyle('./styles/lock-topography.css')"),'lock stylesheet must load');
assert(bootstrap.includes("loadScript('./js/lock-topography.js','Atlas lock topography v0.16.7')"),'lock runtime must load');
assert(sw.includes("atlas-shell-0.16.7-r1"),'service worker cache must be bumped');
assert(sw.includes("'./styles/lock-topography.css'"),'lock stylesheet must be cached');
assert(sw.includes("'./js/lock-topography.js'"),'lock runtime must be cached');

// Presentation must remain additive: authentication still owns lock state and PIN verification.
for(const token of ['function attemptUnlock()','function lockOpen()','function lockClose()','async function initAtlasLock()']) assert(auth.includes(token),`auth contract missing: ${token}`);
assert(!runtime.includes('deriveVerifier('),'presentation runtime must not duplicate PIN verification');
assert(!runtime.includes('authSet('),'presentation runtime must not mutate lock configuration');

console.log('Atlas v0.16.7 lock topography presentation: PASS');
