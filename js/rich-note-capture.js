// Atlas v0.13.1-r3: use the rich note editor for new note-like captures.
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

  function openRichCapture(type='note', areaId=''){
    if(legacyTypes.has(type)) return legacyOpenCapture?.(type, areaId);
    if(!root.AtlasMarkdown?.openNote) return legacyOpenCapture?.(type, areaId);

    const draft = makeDraft(type, areaId);
    pendingDraft = draft;

    // The existing editor expects a note id already present in state. Insert the
    // draft only long enough for the editor to populate, then remove it again so
    // closing an unsaved note can never leak into local or canonical state.
    state.notes.unshift(draft);
    try{
      root.AtlasMarkdown.openNote(draft.id);
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

  function abandonDraft(){
    pendingDraft = null;
  }

  // Window-capture listeners run before the editor's document-capture handlers.
  // That lets Save materialise the draft just before the existing save pipeline
  // runs, while Close/Escape simply discard the in-memory draft.
  root.addEventListener('click',event=>{
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
      version:'0.13.1-r3',
      open:openRichCapture,
      pending:()=>!!pendingDraft
    });
  }
})(window);
