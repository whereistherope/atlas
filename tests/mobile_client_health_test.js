const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const telemetry=read('js/runtime-telemetry.js');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  'LOCAL CACHE · CLOUD SIGN-IN REQUIRED',
  'LOCAL CACHE · CLOUD SYNC STARTING',
  'NOT CONFIGURED ON THIS DEVICE',
  "emit('IDB','local cache committed')",
  'atlas-telemetry-health',
  'buildLabel()'
]) assert(telemetry.includes(token),`mobile client health contract missing: ${token}`);

assert(bootstrap.includes('window.ATLAS_BUILD=BUILD'),'bootstrap must expose the running build to telemetry');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1];
const shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service-worker versions must remain aligned');
console.log('Atlas mobile client health contract: PASS');
