const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const ui=read('js/sync-recovery-ui.js');
const telemetry=read('js/runtime-telemetry.js');
const bootstrap=read('js/bootstrap.js');

for(const token of [
  'ATLAS CLOUD SETUP REQUIRED',
  'Preview Atlas Cloud setup',
  'Establish Atlas Cloud from this copy',
  'equal clients of one Atlas'
]) assert(ui.includes(token),`one-Atlas setup language missing: ${token}`);

assert(!ui.includes('Shared Atlas'),'Shared Atlas must not remain user-facing in setup UI');
assert(telemetry.includes('ATLAS CLOUD SETUP REQUIRED'),'telemetry must explain the pre-canonical state as Atlas Cloud setup');
assert(!bootstrap.includes('Atlas Shared'),'boot labels must use Atlas Cloud, not Shared Atlas');
assert(bootstrap.includes("'Atlas Cloud setup engine'"),'Atlas Cloud setup engine label missing');
assert(bootstrap.includes("'Atlas Cloud sync engine'"),'Atlas Cloud sync engine label missing');
console.log('Atlas one-cloud language contract: PASS');
