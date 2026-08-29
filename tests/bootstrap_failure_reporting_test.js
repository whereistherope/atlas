const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/bootstrap.js','utf8');

for(const token of [
  'const bootFailures=[]',
  'function recordBootFailure',
  'AtlasBootStatus',
  'required:true'
]) assert(src.includes(token),`missing bootstrap reporting contract: ${token}`);

assert(!src.includes('catch (_) {}'),'bootstrap must not silently swallow module failures');
console.log('Atlas bootstrap failure reporting contract: PASS');
