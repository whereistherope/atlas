// Atlas v0.14.0-r8: note-type selector + Capture typography polish.
(function(root){
  'use strict';

  const noteTypes=[
    ['note','Note'],
    ['meeting','Meeting'],
    ['idea','Idea'],
    ['reference','Reference']
  ];

  function ensureTypeSelect(){
    const current=document.getElementById('avType');
    if(!current||current.tagName==='SELECT')return;
    const select=document.createElement('select');
    select.id='avType';
    select.className=current.className||'';
    select.setAttribute('aria-label','Note type');
    select.innerHTML=noteTypes.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    const existing=String(current.value||'note').toLowerCase();
    if(!noteTypes.some(([value])=>value===existing)){
      const option=document.createElement('option');option.value=existing;option.textContent=existing||'Note';select.append(option);
    }
    select.value=existing||'note';
    current.replaceWith(select);
  }

  function activate(){
    const overlay=document.getElementById('atlasVisualNoteEditor');
    if(!overlay?.classList.contains('open'))return;
    ensureTypeSelect();
  }

  function schedule(){[0,20,70,160,300].forEach(ms=>setTimeout(activate,ms))}

  root.addEventListener('click',event=>{
    if(event.target.closest?.('[data-atlas-capture-choice],[data-note-open],[data-ed-action="add-note"],[data-ed-action="edit-note"],[data-quick-add]'))schedule();
  },true);
  root.addEventListener('atlas:note-editor-open',schedule);
  document.addEventListener('focusin',event=>{if(event.target.closest?.('#atlasVisualNoteEditor'))schedule()});

  schedule();
  root.AtlasCapturePolish=Object.freeze({version:'0.14.0-r8',activate});
})(window);
