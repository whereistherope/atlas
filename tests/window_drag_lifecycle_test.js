const fs=require('fs');
const assert=require('assert');
const drag=fs.readFileSync('js/window-drag-local.js','utf8');

for(const token of [
  "const windowSel='.modal,.atlas-note-editor-sheet,.atlas-vnote-sheet,.atlas-command-shell'",
  "const handleSel='.modal-head,.atlas-note-editor-head,.atlas-vnote-head,.atlas-command-input-row,[data-atlas-window-handle]'",
  "handle.addEventListener('pointerdown'",
  "observer.observe(document.body,{childList:true})",
  'function resetPlacement',
  'root.AtlasWindowDragLocal=Object.freeze({scan,bind,resetPlacement})'
]) assert(drag.includes(token),`missing local window drag contract: ${token}`);

assert(!drag.includes('subtree:true'),'window discovery must not observe the full document subtree');
assert(!drag.includes("document.addEventListener('pointerdown'"),'window drag must not use document-level pointer interception');
console.log('Atlas bounded window-drag lifecycle: PASS');
