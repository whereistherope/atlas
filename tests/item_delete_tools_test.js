const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const js=read('js/item-delete-tools.js');
const css=read('styles/item-delete-tools.css');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  "data-atlas-delete-note",
  "data-atlas-delete-project",
  "state.notes.splice(index,1)",
  "state.projects.splice(index,1)",
  "Delete note “${title}”?",
  "Delete project “${title}”?",
  "log(`Note deleted: ${title}.`)",
  "log(`Project deleted: ${title}.`)",
  "await save()",
  "root.AtlasItemDeleteTools=Object.freeze({version:'0.16.9-r1'"
]) assert(js.includes(token),`item deletion contract missing: ${token}`);

assert(js.indexOf("root.confirm(`Delete note")<js.indexOf('state.notes.splice(index,1)'),'note deletion must confirm before mutating state');
assert(js.indexOf("root.confirm(`Delete project")<js.indexOf('state.projects.splice(index,1)'),'project deletion must confirm before mutating state');
assert(css.includes('.atlas-item-delete-footer{display:flex'),'delete action footer must be anchored in the edit surface');
assert(css.includes('.atlas-item-delete-footer .btn.danger{margin-right:auto}'),'destructive action must stay on the left');
assert(bootstrap.includes("loadStyle('./styles/item-delete-tools.css')"),'item deletion CSS must boot');
assert(bootstrap.includes("loadScript('./js/item-delete-tools.js','Atlas item deletion tools')"),'item deletion JS must boot');
assert(sw.includes("'./styles/item-delete-tools.css'"),'item deletion CSS must be offline');
assert(sw.includes("'./js/item-delete-tools.js'"),'item deletion JS must be offline');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');
console.log('Atlas item deletion editor contract: PASS');
