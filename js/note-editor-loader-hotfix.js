// Atlas v0.13.1-r2 editor activation diagnostics and legacy-card fallback.
(function(root){
  'use strict';
  const VERSION='0.13.1-r2';

  function stateNow(){
    try{return root.AtlasState?.()||null}catch(_){return null}
  }

  function findLegacyNote(card){
    const s=stateNow();if(!s?.notes?.length)return null;
    const title=(card.querySelector?.('.note-title')?.textContent||'').trim();
    const body=(card.querySelector?.('.note-body')?.textContent||'').trim();
    let matches=s.notes.filter(n=>(n.title||'Untitled')===title);
    if(matches.length===1)return matches[0];
    if(body)matches=matches.filter(n=>String(n.body||'').trim()===body);
    return matches.length===1?matches[0]:null;
  }

  document.addEventListener('click',event=>{
    if(!root.AtlasMarkdown?.openNote)return;
    const card=event.target.closest?.('.note');
    if(!card||card.dataset?.noteOpen||event.target.closest?.('a,button,input,select,textarea'))return;
    const note=findLegacyNote(card);if(!note)return;
    event.preventDefault();event.stopPropagation();root.AtlasMarkdown.openNote(note.id);
  },true);

  function announce(){
    const ready=!!root.AtlasMarkdown?.openNote;
    root.AtlasEditorDiagnostics={version:VERSION,ready:()=>!!root.AtlasMarkdown?.openNote};
    document.documentElement.dataset.atlasNoteEditor=ready?'ready':'missing';
    if(ready){
      try{
        if(!sessionStorage.getItem('atlas_note_editor_ready_r2')){
          sessionStorage.setItem('atlas_note_editor_ready_r2','1');
          setTimeout(()=>root.toast?.('Note editor ready · v0.13.1'),450);
        }
      }catch(_){ }
    }else{
      console.error('Atlas note editor did not activate.');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',announce,{once:true});else announce();
})(window);
