// Atlas v0.14.0-r7: universal Capture launcher + fresh-draft isolation.
(function(root){
  'use strict';

  let freshDraftId='';
  let freshDraftActive=false;
  let restoreWrapped=false;

  const choices=[
    ['note','Note','Full visual note editor'],
    ['meeting','Meeting','Capture meeting notes with rich text'],
    ['idea','Idea','Capture an idea with rich text'],
    ['reference','Reference','Save reference material'],
    ['project','Project','Create a structured project'],
    ['task','Task','Add a lightweight action'],
    ['daily','Daily','Add a daily entry'],
    ['area','Area','Open Atlas structure to create an area'],
    ['topic','Topic','Open Atlas structure to create a topic']
  ];

  function ensureLauncher(){
    let overlay=document.getElementById('atlasCaptureLauncher');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='atlasCaptureLauncher';
    overlay.className='overlay atlas-capture-launcher';
    overlay.innerHTML=`
      <section class="modal atlas-capture-launcher-modal" role="dialog" aria-modal="true" aria-label="Create in Atlas">
        <div class="modal-head">
          <div><div class="code">UNIVERSAL INPUT</div><h3>Create in Atlas</h3></div>
          <button class="btn" type="button" data-capture-launcher-close>Close</button>
        </div>
        <div class="modal-body">
          <div class="atlas-capture-choice-grid">
            ${choices.map(([id,title,desc])=>`<button type="button" class="atlas-capture-choice" data-atlas-capture-choice="${id}"><strong>${title}</strong><span>${desc}</span></button>`).join('')}
          </div>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function openLauncher(){ensureLauncher().classList.add('open')}
  function closeLauncher(){document.getElementById('atlasCaptureLauncher')?.classList.remove('open')}

  function clearFreshDraft(){freshDraftId='';freshDraftActive=false}

  function installRestoreGuard(){
    if(restoreWrapped||!root.AtlasDocument?.restore)return;
    const base=root.AtlasDocument.restore.bind(root.AtlasDocument);
    const guarded=async function(el,doc){
      // During a new-note opening window, never allow a previous note document
      // snapshot to overwrite the newly-created empty visual editor.
      if(freshDraftActive&&el?.id==='avBody')return false;
      return base(el,doc);
    };
    root.AtlasDocument=Object.freeze({...root.AtlasDocument,restore:guarded});
    restoreWrapped=true;
  }

  function scheduleGuardInstall(){[0,20,80,180].forEach(ms=>setTimeout(installRestoreGuard,ms))}

  function openLegacy(type){
    closeLauncher();
    const legacy=root.AtlasRichNoteCapture?.legacy;
    if(typeof legacy==='function')return legacy(type,'');
    try{return openCapture(type,'')}catch(_){ }
  }

  function openStructure(kind){
    closeLauncher();
    try{
      state.settings.editorTab='structure';
      openEditor();
      renderEditor();
      toast?.(`${kind==='area'?'Area':'Topic'} creation · Structure`);
    }catch(_){root.toast?.('Open System → Edit Atlas → Structure')}
  }

  function choose(type){
    if(['note','meeting','idea','reference'].includes(type)){
      closeLauncher();
      root.AtlasRichNoteCapture?.open?.(type,'');
      return;
    }
    if(['project','task','daily'].includes(type)){openLegacy(type);return}
    if(type==='area'||type==='topic'){openStructure(type);return}
  }

  root.addEventListener('atlas:new-note-draft',event=>{
    freshDraftId=event.detail?.id||'';
    freshDraftActive=!!freshDraftId;
    scheduleGuardInstall();
    // Clear the editor body again after the visual editor is created. This is a
    // second line of defence against any stale delayed restore already queued.
    [25,70,150,280].forEach(ms=>setTimeout(()=>{
      if(!freshDraftActive)return;
      const body=document.getElementById('avBody');
      const title=document.getElementById('avTitle');
      if(body&&title&&title.value==='')body.innerHTML='';
    },ms));
  });

  // Main Capture belongs to the universal launcher. Capture phase prevents the
  // legacy #captureBtn handler from opening a form underneath it.
  root.addEventListener('click',event=>{
    if(event.target.closest?.('#captureBtn')){
      event.preventDefault();event.stopImmediatePropagation();openLauncher();return;
    }
    const choice=event.target.closest?.('[data-atlas-capture-choice]');
    if(choice){event.preventDefault();event.stopImmediatePropagation();choose(choice.dataset.atlasCaptureChoice);return}
    if(event.target.closest?.('[data-capture-launcher-close]')){event.preventDefault();closeLauncher();return}
    if(event.target===document.getElementById('atlasCaptureLauncher'))closeLauncher();

    if(freshDraftActive&&event.target.closest?.('[data-note-save],[data-note-close]'))setTimeout(clearFreshDraft,0);
  },true);

  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.getElementById('atlasCaptureLauncher')?.classList.contains('open')){event.preventDefault();closeLauncher();return}
    if(freshDraftActive&&event.key==='Escape')setTimeout(clearFreshDraft,0);
    if(freshDraftActive&&(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s')setTimeout(clearFreshDraft,0);
  },true);

  scheduleGuardInstall();
  root.AtlasCaptureFramework=Object.freeze({version:'0.14.0-r7',open:openLauncher,close:closeLauncher});
})(window);
