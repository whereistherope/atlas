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
  "root.AtlasVisualNoteEditor?.open",
  "root.AtlasProjectWorkspace?.open",
  "const note=byId(state?.notes,activeNoteId)",
  "if(!overlay?.classList.contains('open')||!scroll||!note)",
  "const indexed=Number.isInteger(index)?state?.projects?.[index]:null",
  "root.AtlasItemDeleteTools=Object.freeze({version:'0.16.9-r3'"
]) assert(js.includes(token),`item deletion contract missing: ${token}`);

assert(js.indexOf("root.confirm(`Delete note")<js.indexOf('state.notes.splice(index,1)'),'note deletion must confirm before mutating state');
assert(js.indexOf("root.confirm(`Delete project")<js.indexOf('state.projects.splice(index,1)'),'project deletion must confirm before mutating state');
assert(css.includes('.atlas-item-delete-footer{display:flex'),'delete action footer must be anchored in the edit surface');
assert(css.includes('.atlas-item-delete-footer .btn.danger{margin-right:auto}'),'destructive action must stay on the left');
assert(bootstrap.includes("loadStyle('./styles/item-delete-tools.css')"),'item deletion CSS must boot');
assert(bootstrap.includes("loadScript('./js/item-delete-tools.js','Atlas item deletion tools')"),'item deletion JS must boot');
const deletePos=bootstrap.indexOf("loadScript('./js/item-delete-tools.js','Atlas item deletion tools')");
const docR3Pos=bootstrap.indexOf("loadScript('./js/atlas-document-r3.js','Atlas Document v1 r3')");
const docR4Pos=bootstrap.indexOf("loadScript('./js/atlas-document-r4-ui.js','Atlas Document UI r4')");
const capturePos=bootstrap.indexOf("loadScript('./js/capture-polish-r8.js','Atlas Capture polish r8')");
assert(deletePos>docR3Pos&&deletePos>docR4Pos&&deletePos>capturePos,'delete tools must boot after final editor/document wrappers');
assert(sw.includes("'./styles/item-delete-tools.css'"),'item deletion CSS must be offline');
assert(sw.includes("'./js/item-delete-tools.js'"),'item deletion JS must be offline');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');
console.log('Atlas item deletion editor contract: PASS');
