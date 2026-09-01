// Atlas v0.14.0-r7: route note-like creation into the visual editor without hijacking main Capture.
(function(root){
  'use strict';

  const legacyOpenCapture = typeof openCapture === 'function' ? openCapture : null;
  const legacyTypes = new Set(['project','task','daily']);
  let pendingDraft = null;

  function activeProfileId(){
    try{return state?.settings?.activeProfile || 'me'}catch(_){return 'me'}
  }

  function makeDraft(type='note', areaId=''){
    const area = areaById(areaId);
    const profile = activeProfileId();
    const space = area?.space || (state.settings.spaceFilter === 'work' ? 'work' : 'personal');
    return {
      id: uid('n'),
      profile,
      space,
      areaId: areaId || '',
      topicId: area?.level >= 4 ? area.id : '',
      type: type || 'note',
      title: '',
      body: '',
      tags: [],
      createdAt: now(),
      showOnMap: false
    };
  }

  function centreVisualEditor(){
    const sheet=document.querySelector('#atlasVisualNoteEditor .atlas-vnote-sheet');
    root.AtlasWindowDragLocal?.resetPlacement?.(sheet,{preserveSize:true});
  }

  function openRichCapture(type='note', areaId=''){
    if(legacyTypes.has(type)) return legacyOpenCapture?.(type, areaId);
    if(!root.AtlasMarkdown?.openNote) return legacyOpenCapture?.(type, areaId);

    const draft = makeDraft(type, areaId);
    pendingDraft = draft;

    // Tell the rich-document UI that this is a genuinely fresh note before any
    // editor activation retries can restore a previously opened document.
    root.dispatchEvent(new CustomEvent('atlas:new-note-draft',{detail:{id:draft.id,type:draft.type}}));

    // The editor expects a note id to exist while it populates. Keep the draft in
    // state only for that synchronous open, then remove it again. Save materialises
    // it immediately before the normal note save pipeline runs.
    state.notes.unshift(draft);
    try{
      root.AtlasMarkdown.openNote(draft.id);
      centreVisualEditor();
    } finally {
      const index = state.notes.findIndex(n=>n.id===draft.id);
      if(index >= 0) state.notes.splice(index,1);
    }
  }

  function materialiseDraftForSave(){
    if(!pendingDraft) return;
    if(!state.notes.some(n=>n.id===pendingDraft.id)) state.notes.unshift(pendingDraft);
    pendingDraft = null;
  }

  function abandonDraft(){pendingDraft = null}

  function noteCreateIntent(event){
    const target = event.target;
    if(!target?.closest)return null;

    // Main #captureBtn is intentionally NOT intercepted here. v0.14.0-r7 restores
    // it as the universal creation launcher.

    // Area / Inbox quick-add controls can create several record types. Only route
    // note-like types through the visual editor; specialised types stay legacy.
    const quick = target.closest('[data-quick-add]');
    if(quick){
      const type = quick.dataset.quickAdd || 'note';
      if(!legacyTypes.has(type)) return {type,areaId:quick.dataset.area || '',closeEditor:false};
    }

    // Notes management + Note button.
    if(target.closest('[data-ed-action="add-note"]')) return {type:'note',areaId:'',closeEditor:true};

    return null;
  }

  root.addEventListener('click',event=>{
    const intent = noteCreateIntent(event);
    if(intent){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(intent.closeEditor){try{closeOverlay('editorOverlay')}catch(_){}}
      openRichCapture(intent.type,intent.areaId);
      return;
    }

    if(!pendingDraft) return;
    if(event.target.closest?.('[data-note-save]')) materialiseDraftForSave();
    else if(event.target.closest?.('[data-note-close]')) abandonDraft();
  },true);

  root.addEventListener('keydown',event=>{
    if(!pendingDraft) return;
    if(event.key === 'Escape') abandonDraft();
    else if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') materialiseDraftForSave();
  },true);

  if(legacyOpenCapture){
    openCapture = openRichCapture;
    root.AtlasRichNoteCapture = Object.freeze({
      version:'0.14.0-r7',
      open:openRichCapture,
      pending:()=>!!pendingDraft,
      legacy:legacyOpenCapture
    });
  }
})(window);
