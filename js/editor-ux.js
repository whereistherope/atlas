// Atlas v0.13.4 editor UX: document-level writing preferences + direct project edit shortcut.
(function(root){
  'use strict';

  const FONT_KEY='atlas-editor-font-v1';
  const SIZE_KEY='atlas-editor-size-v1';
  const FONT_VALUES=new Set(['sans','serif','code']);
  const SIZE_VALUES=new Set(['small','medium','large']);

  function getPref(key,allowed,fallback){
    try{const value=localStorage.getItem(key);return allowed.has(value)?value:fallback}catch(_){return fallback}
  }
  function setPref(key,value){try{localStorage.setItem(key,value)}catch(_){}}

  function applyEditorPrefs(){
    const body=document.getElementById('avBody');if(!body)return;
    const font=getPref(FONT_KEY,FONT_VALUES,'sans'),size=getPref(SIZE_KEY,SIZE_VALUES,'medium');
    body.dataset.editorFont=font;body.dataset.editorSize=size;
    const fontSelect=document.getElementById('atlasEditorFont');if(fontSelect)fontSelect.value=font;
    const sizeSelect=document.getElementById('atlasEditorSize');if(sizeSelect)sizeSelect.value=size;
  }

  function installEditorPrefs(){
    const toolbar=document.querySelector('#atlasVisualNoteEditor .atlas-vnote-toolbar');
    if(!toolbar||toolbar.querySelector('.atlas-editor-prefs'))return;
    const prefs=document.createElement('div');prefs.className='atlas-editor-prefs';prefs.innerHTML=`
      <label>Font<select id="atlasEditorFont" aria-label="Editor font"><option value="sans">Sans</option><option value="serif">Serif</option><option value="code">Code</option></select></label>
      <label>Size<select id="atlasEditorSize" aria-label="Editor text size"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>`;
    toolbar.appendChild(prefs);applyEditorPrefs();
  }

  document.addEventListener('change',event=>{
    if(event.target?.id==='atlasEditorFont'&&FONT_VALUES.has(event.target.value)){setPref(FONT_KEY,event.target.value);applyEditorPrefs()}
    if(event.target?.id==='atlasEditorSize'&&SIZE_VALUES.has(event.target.value)){setPref(SIZE_KEY,event.target.value);applyEditorPrefs()}
  });

  const observer=new MutationObserver(()=>{installEditorPrefs();applyEditorPrefs()});
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installEditorPrefs();applyEditorPrefs()},{once:true});else{installEditorPrefs();applyEditorPrefs()}

  function installProjectEditButton(){
    const modal=document.querySelector('#projectOverlay .modal-head');if(!modal||modal.querySelector('[data-direct-project-edit]'))return;
    const close=modal.querySelector('[data-close="projectOverlay"]');if(!close)return;
    const button=document.createElement('button');button.type='button';button.className='btn';button.dataset.directProjectEdit='';button.textContent='Edit';
    close.before(button);
  }

  const originalOpenProject=typeof openProject==='function'?openProject:null;
  if(originalOpenProject){
    openProject=function(id){const result=originalOpenProject.apply(this,arguments);installProjectEditButton();return result};
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-direct-project-edit]');if(!button)return;
    const id=typeof activeProjectId==='string'?activeProjectId:'';
    const index=state.projects.findIndex(p=>p.id===id);if(index<0)return root.toast?.('Project unavailable');
    closeOverlay('projectOverlay');
    state.settings.editorTab='projects';
    renderEditor();
    openOverlay('editorOverlay');
    openProjectEditor(index);
  });

  root.AtlasEditorUX=Object.freeze({version:'0.13.4',applyEditorPrefs});
})(window);
