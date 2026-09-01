// Atlas item lifecycle tools: destructive actions belong in the item editor itself.
(function(root){
  'use strict';
  let activeNoteId='',activeProjectId='';

  const byId=(list,id)=>Array.isArray(list)?list.find(item=>item?.id===id):null;
  const cleanTitle=value=>String(value||'Untitled').replace(/[\r\n]+/g,' ').trim().slice(0,100)||'Untitled';

  function noteFooter(){
    const scroll=document.querySelector('#atlasVisualNoteEditor .atlas-vnote-scroll');
    if(!scroll||scroll.querySelector('[data-atlas-delete-note]'))return;
    const row=document.createElement('div');row.className='atlas-item-delete-footer atlas-note-delete-footer';
    row.innerHTML='<button type="button" class="btn danger" data-atlas-delete-note>Delete Note</button>';
    const status=scroll.querySelector('#avStatus');status?.before(row);if(!status)scroll.appendChild(row);
  }

  function projectFooter(){
    const editor=document.querySelector('.atlas-project-workspace .project-editor');
    if(!editor||editor.querySelector('[data-atlas-delete-project]'))return;
    const save=editor.querySelector('[data-ed-action="save-project-detail"]');
    const row=document.createElement('div');row.className='atlas-item-delete-footer atlas-project-delete-footer';
    row.innerHTML='<button type="button" class="btn danger" data-atlas-delete-project>Delete Project</button>';
    if(save){save.before(row);row.appendChild(save)}else editor.appendChild(row);
  }

  const scheduleNoteFooter=()=>requestAnimationFrame(()=>requestAnimationFrame(noteFooter));
  const scheduleProjectFooter=()=>requestAnimationFrame(()=>requestAnimationFrame(projectFooter));

  function trackNote(id){if(id){activeNoteId=String(id);scheduleNoteFooter()}}
  function trackProjectByIndex(index){const p=state?.projects?.[Number(index)];if(p?.id){activeProjectId=p.id;scheduleProjectFooter()}}

  // Cover the direct editor entry points as well as note-card clicks that open internally.
  if(root.AtlasMarkdown?.openNote){
    const base=root.AtlasMarkdown,open=base.openNote;
    root.AtlasMarkdown=Object.freeze({...base,openNote(id){trackNote(id);return open.apply(this,arguments)}});
  }
  if(typeof root.openNoteEditor==='function'){
    const open=root.openNoteEditor;root.openNoteEditor=function(index){const n=state?.notes?.[Number(index)];if(n?.id)trackNote(n.id);return open.apply(this,arguments)};
  }
  if(typeof root.openProjectEditor==='function'){
    const open=root.openProjectEditor;root.openProjectEditor=function(index){trackProjectByIndex(index);return open.apply(this,arguments)};
  }

  document.addEventListener('click',event=>{
    const noteOpen=event.target.closest?.('[data-note-open]');if(noteOpen?.dataset?.noteOpen)trackNote(noteOpen.dataset.noteOpen);
    const projectOpen=event.target.closest?.('[data-ed-action="edit-project"]');if(projectOpen)trackProjectByIndex(projectOpen.dataset.index);
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

  root.AtlasItemDeleteTools=Object.freeze({version:'0.16.9-r1',noteFooter,projectFooter});
})(window);
