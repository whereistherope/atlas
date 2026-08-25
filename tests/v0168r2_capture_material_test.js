const fs=require('fs');
const assert=require('assert');
const flow=fs.readFileSync('js/capture-flow-fix.js','utf8');
const css=fs.readFileSync('styles/window-material.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  '[data-atlas-aligned-capture]',
  'dismissLauncher()',
  "AtlasCaptureFramework?.close?.()",
  "AtlasCaptureFlowFix=Object.freeze({version:'0.16.8-r2'",
]) assert(flow.includes(token),`missing capture handoff contract: ${token}`);

for(const token of [
  '--atlas-window-blur:16px',
  '.overlay,',
  '.atlas-command-backdrop',
  '.modal,',
  '.atlas-vnote-sheet',
  'backdrop-filter:blur(7px)',
  'body[data-skin="ops"]',
]) assert(css.includes(token),`missing window material contract: ${token}`);

assert(bootstrap.includes("loadStyle('./styles/window-material.css')"),'window material must load late');
assert(bootstrap.includes("loadScript('./js/capture-flow-fix.js','Atlas capture launcher handoff v0.16.8-r2')"),'capture handoff patch must load');
assert(sw.includes("'./styles/window-material.css'"),'window material must be cached');
assert(sw.includes("'./js/capture-flow-fix.js'"),'capture handoff patch must be cached');

console.log('Atlas v0.16.8-r2 capture handoff + shared window material: PASS');
