// Atlas item lifecycle tools: destructive actions belong in the item editor itself.
(function(root){
  'use strict';
  let activeNoteId='',activeProjectId='';

  const byId=(list,id)=>Array.isArray(list)?list.find(item=>item?.id===id):null;
  const cleanTitle=value=>String(value||'Untitled').replace(/[\r\n]+/g,' ').trim().slice(0,100)||'Untitled';

  function noteFooter(){
    const overlay=document.getElementById('atlasVisualNoteEditor');
    const scroll=overlay?.querySelector('.atlas-vnote-scroll');
    const existing=scroll?.querySelector('[data-atlas-delete-note]')?.closest('.atlas-item-delete-footer');
    const note=byId(state?.notes,activeNoteId);
    if(!overlay?.classList.contains('open')||!scroll||!note){existing?.remove();return false}
    if(existing)return true;
    const row=document.createElement('div');row.className='atlas-item-delete-footer atlas-note-delete-footer';
    row.innerHTML='<button type="button" class="btn danger" data-atlas-delete-note>Delete Note</button>';
    const status=scroll.querySelector('#avStatus');status?.before(row);if(!status)scroll.appendChild(row);return true;
  }

  function projectFooter(){
    const editor=document.querySelector('.atlas-project-workspace .project-editor');
    if(!editor)return false;
    const save=editor.querySelector('[data-ed-action="save-project-detail"]');
    const index=Number(save?.dataset?.index);
    const indexed=Number.isInteger(index)?state?.projects?.[index]:null;
    if(indexed?.id)activeProjectId=indexed.id;
    const project=byId(state?.projects,activeProjectId);
    const existing=editor.querySelector('[data-atlas-delete-project]')?.closest('.atlas-item-delete-footer');
    if(!project){existing?.remove();return false}
    if(existing)return true;
    const row=document.createElement('div');row.className='atlas-item-delete-footer atlas-project-delete-footer';
    row.innerHTML='<button type="button" class="btn danger" data-atlas-delete-project>Delete Project</button>';
    if(save){save.before(row);row.appendChild(save)}else editor.appendChild(row);return true;
  }

  function scheduleNoteFooter(){[0,16,60,180].forEach(delay=>setTimeout(noteFooter,delay))}
  function scheduleProjectFooter(){[0,16,60,180].forEach(delay=>setTimeout(projectFooter,delay))}

  function trackNote(id){if(id){activeNoteId=String(id);scheduleNoteFooter()}}
  function trackProjectByIndex(index){const p=state?.projects?.[Number(index)];if(p?.id){activeProjectId=p.id;scheduleProjectFooter()}}
  function trackProjectById(id){const p=byId(state?.projects,String(id||''));if(p){activeProjectId=p.id;scheduleProjectFooter()}}

  // This module intentionally boots after the final editor/document wrappers. Wrap both
  // public APIs and legacy aliases so desktop, iPad/touch and internal editor routes converge.
  if(root.AtlasMarkdown?.openNote){
    const base=root.AtlasMarkdown,open=base.openNote;
    root.AtlasMarkdown=Object.freeze({...base,openNote(id){trackNote(id);return open.apply(this,arguments)}});
  }
  if(root.AtlasVisualNoteEditor?.open){
    const base=root.AtlasVisualNoteEditor,open=base.open;
    root.AtlasVisualNoteEditor=Object.freeze({...base,open(id){trackNote(id);return open.apply(this,arguments)}});
  }
  if(typeof root.openNoteEditor==='function'){
    const open=root.openNoteEditor;root.openNoteEditor=function(index){const n=state?.notes?.[Number(index)];if(n?.id)trackNote(n.id);return open.apply(this,arguments)};
  }
  if(root.AtlasProjectWorkspace?.open){
    const base=root.AtlasProjectWorkspace,open=base.open;
    root.AtlasProjectWorkspace=Object.freeze({...base,open(index){const p=state?.projects?.[Number(index)];if(p?.id)trackProjectById(p.id);return open.apply(this,arguments)}});
  }
  if(typeof root.openProjectEditor==='function'){
    const open=root.openProjectEditor;root.openProjectEditor=function(index){trackProjectByIndex(index);return open.apply(this,arguments)};
  }

  document.addEventListener('pointerdown',event=>{
    const noteOpen=event.target.closest?.('[data-note-open]');if(noteOpen?.dataset?.noteOpen)trackNote(noteOpen.dataset.noteOpen);
    const projectOpen=event.target.closest?.('[data-ed-action="edit-project"]');if(projectOpen)trackProjectByIndex(projectOpen.dataset.index);
  },true);
  document.addEventListener('focusin',event=>{
    if(event.target.closest?.('#atlasVisualNoteEditor'))scheduleNoteFooter();
    if(event.target.closest?.('.atlas-project-workspace'))scheduleProjectFooter();
  },true);

  async function deleteNote(){
    const note=byId(state?.notes,activeNoteId);if(!note)return root.toast?.('Note is no longer available');
    const title=cleanTitle(note.title);if(!root.confirm(`Delete note “${title}”?\n\nThis removes it from Atlas.`))return;
    const index=state.notes.findIndex(item=>item?.id===note.id);if(index<0)return;
    state.notes.splice(index,1);log(`Note deleted: ${title}.`);await save();
    document.getElementById('atlasVisualNoteEditor')?.classList.remove('open');activeNoteId='';renderAll();root.toast?.('Note deleted');
  }

  async function deleteProject(){
    const project=byId(state?.projects,activeProjectId);if(!project)return root.toast?.('Project is no longer available');
    const title=cleanTitle(project.title);if(!root.confirm(`Delete project “${title}”?\n\nIts embedded tasks and milestones will also be removed.`))return;
    const index=state.projects.findIndex(item=>item?.id===project.id);if(index<0)return;
    state.projects.splice(index,1);log(`Project deleted: ${title}.`);await save();activeProjectId='';
    if(state?.settings)state.settings.editorTab='projects';renderEditor?.();renderAll();root.toast?.('Project deleted');
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-atlas-delete-note]')){event.preventDefault();event.stopPropagation();deleteNote();return}
    if(event.target.closest?.('[data-atlas-delete-project]')){event.preventDefault();event.stopPropagation();deleteProject()}
  });

  root.AtlasItemDeleteTools=Object.freeze({version:'0.16.9-r3',noteFooter,projectFooter});
})(window);
