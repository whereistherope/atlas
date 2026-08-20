// Atlas v0.15.1-r1: interaction contract alignment and shared action layer.
(function(root){
  'use strict';

  let createKind='';
  let createContext='';

  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function currentContextAreaId(){
    try{
      const selected=state?.settings?.selectedArea||'';
      const selectedArea=selected?areaById(selected):null;
      if(selectedArea&&profileAllows(selectedArea.profile)&&spaceAllows(selectedArea.space))return selectedArea.id;
      const tab=state?.settings?.activeTab||'';
      const tabArea=tab?areaById(tab):null;
      if(tabArea&&profileAllows(tabArea.profile)&&spaceAllows(tabArea.space))return tabArea.id;
    }catch(_){ }
    return '';
  }

  function contextArea(preferred=''){
    const id=preferred||currentContextAreaId();
    try{return id?areaById(id):null}catch(_){return null}
  }

  function goHome(mode=null){
    state.settings.activeTab='home';state.settings.selectedArea='';state.settings.subtab='overview';
    if(mode)state.settings.mapViewMode=mode;
    renderAll();return save?.();
  }

  function goTab(tab){
    state.settings.activeTab=tab;state.settings.selectedArea='';state.settings.subtab='overview';
    renderAll();return save?.();
  }

  function openArea(id){
    const a=areaById(id);if(!a||!profileAllows(a.profile))return root.toast?.('Area unavailable');
    state.settings.activeTab=getTopDomain(a)?.id||a.id;state.settings.selectedArea=a.id;state.settings.subtab='overview';
    renderTabs();renderArea(a.id);return save?.();
  }

  function openProjectAction(id){
    const p=projectById(id);if(!p||!profileAllows(p.profile))return root.toast?.('Project unavailable');
    return openProject?.(id);
  }

  function openNoteAction(id){
    const n=state.notes.find(x=>x.id===id);if(!n||!profileAllows(n.profile))return root.toast?.('Note unavailable');
    return root.AtlasMarkdown?.openNote?.(id);
  }

  function openEventAction(id){
    const e=state.calendar.find(x=>x.id===id);if(!e||!profileAllows(e.profile))return root.toast?.('Event unavailable');
    return openCalendarEvent?.(id);
  }

  function closeLauncher(){try{root.AtlasCaptureFramework?.close?.()}catch(_){document.getElementById('atlasCaptureLauncher')?.classList.remove('open')}}

  function profileAreaOptions(selected=''){
    const items=profileAreas().filter(a=>spaceAllows(a.space)).sort((a,b)=>a.name.localeCompare(b.name));
    return `<option value="">Inbox / unlinked</option>`+items.map(a=>`<option value="${h(a.id)}" ${a.id===selected?'selected':''}>${h(a.name)} · ${h(a.code||'')}</option>`).join('');
  }

  function projectOptions(areaId=''){
    const all=visibleProjects(areaId).filter(p=>p.status!=='COMPLETE');
    const active=all.filter(p=>p.status==='ACTIVE');
    const suggested=active.length===1?active[0].id:'';
    return {suggested,html:`<option value="">Unassigned</option>`+all.map(p=>`<option value="${h(p.id)}" ${p.id===suggested?'selected':''}>${h(p.code||'PROJECT')} · ${h(p.title)}</option>`).join('')};
  }

  function ensureCreateOverlay(){
    let overlay=document.getElementById('atlasDirectCreate');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='atlasDirectCreate';overlay.className='overlay atlas-direct-create';
    overlay.innerHTML=`<section class="modal atlas-direct-create-modal" role="dialog" aria-modal="true" aria-labelledby="atlasDirectCreateTitle"><div class="modal-head"><div><div class="code" id="atlasDirectCreateCode">DIRECT CREATE</div><h3 id="atlasDirectCreateTitle">Create</h3></div><button type="button" class="btn" data-atlas-direct-close>Close</button></div><form id="atlasDirectCreateForm" class="modal-body"></form></section>`;
    document.body.appendChild(overlay);return overlay;
  }

  function openTaskCreate(areaId=''){
    closeLauncher();createKind='task';createContext=areaId||currentContextAreaId();
    const overlay=ensureCreateOverlay(),area=contextArea(createContext),projects=projectOptions(createContext);
    overlay.querySelector('#atlasDirectCreateCode').textContent='QUICK ACTION';overlay.querySelector('#atlasDirectCreateTitle').textContent='New Task';
    overlay.querySelector('#atlasDirectCreateForm').innerHTML=`
      <div class="field"><label>Task</label><input id="atlasDirectTitle" autocomplete="off" placeholder="What needs doing?" required></div>
      <div class="row2"><div class="field"><label>Project</label><select id="atlasDirectProject">${projects.html}</select></div><div class="field"><label>Area</label><select id="atlasDirectArea">${profileAreaOptions(createContext)}</select></div></div>
      <p class="atlas-direct-help">${area?`Context inherited from ${h(area.name)}. `:''}Choose a Project when the task belongs to one; otherwise it stays an unassigned Atlas task.</p>
      <div class="atlas-direct-actions"><button type="button" class="btn" data-atlas-direct-close>Cancel</button><button type="submit" class="btn primary">Create Task</button></div>`;
    const areaSelect=overlay.querySelector('#atlasDirectArea');if(areaSelect)areaSelect.value=createContext||'';
    overlay.classList.add('open');setTimeout(()=>overlay.querySelector('#atlasDirectTitle')?.focus(),30);
  }

  function topicParents(){return profileAreas().filter(a=>Number(a.level)<4&&spaceAllows(a.space)).sort((a,b)=>Number(a.level)-Number(b.level)||a.name.localeCompare(b.name))}

  function preferredTopicParent(areaId=''){
    const ctx=contextArea(areaId);if(ctx&&Number(ctx.level)<4)return ctx.id;
    if(ctx&&Number(ctx.level)>=4){const parent=areaById(ctx.parentId);if(parent&&Number(parent.level)<4)return parent.id}
    return topicParents().find(a=>Number(a.level)===2)?.id||topicParents()[0]?.id||'';
  }

  function openStructureCreate(kind,areaId=''){
    closeLauncher();createKind=kind;createContext=areaId||currentContextAreaId();
    const overlay=ensureCreateOverlay(),ctx=contextArea(createContext),form=overlay.querySelector('#atlasDirectCreateForm');
    overlay.querySelector('#atlasDirectCreateCode').textContent='STRUCTURE';overlay.querySelector('#atlasDirectCreateTitle').textContent=kind==='area'?'New Area':'New Topic';
    if(kind==='area'){
      const defaultSpace=ctx?.space||(state.settings.spaceFilter==='work'?'work':'personal');
      form.innerHTML=`<div class="field"><label>Name</label><input id="atlasDirectTitle" autocomplete="off" placeholder="Area name" required></div><div class="field"><label>Space</label><select id="atlasDirectSpace"><option value="personal" ${defaultSpace==='personal'?'selected':''}>Personal</option><option value="work" ${defaultSpace==='work'?'selected':''}>Work</option></select></div><div class="field"><label>Description</label><textarea id="atlasDirectDescription" rows="3" placeholder="Optional description"></textarea></div><p class="atlas-direct-help">Creates a top-level Area directly. You can refine its structure later if needed.</p><div class="atlas-direct-actions"><button type="button" class="btn" data-atlas-direct-close>Cancel</button><button type="submit" class="btn primary">Create Area</button></div>`;
    }else{
      const parents=topicParents(),selected=preferredTopicParent(createContext);
      form.innerHTML=`<div class="field"><label>Name</label><input id="atlasDirectTitle" autocomplete="off" placeholder="Topic name" required></div><div class="field"><label>Parent</label><select id="atlasDirectParent" ${parents.length?'':'disabled'}>${parents.length?parents.map(a=>`<option value="${h(a.id)}" ${a.id===selected?'selected':''}>${h(a.name)} · ${h(a.code||'')}</option>`).join(''):'<option>No Area available</option>'}</select></div><div class="field"><label>Description</label><textarea id="atlasDirectDescription" rows="3" placeholder="Optional description"></textarea></div><p class="atlas-direct-help">${parents.length?'Parent context is inherited where possible and can be changed before creation.':'Create an Area first; a Topic needs a structural parent.'}</p><div class="atlas-direct-actions"><button type="button" class="btn" data-atlas-direct-close>Cancel</button>${parents.length?'<button type="submit" class="btn primary">Create Topic</button>':'<button type="button" class="btn primary" data-atlas-create-area-instead>Create Area</button>'}</div>`;
    }
    overlay.classList.add('open');setTimeout(()=>overlay.querySelector('#atlasDirectTitle')?.focus(),30);
  }

  function closeDirectCreate(){const overlay=document.getElementById('atlasDirectCreate');if(overlay)overlay.classList.remove('open');createKind='';createContext=''}

  async function saveTask(){
    const title=(document.getElementById('atlasDirectTitle')?.value||'').trim();if(!title)return root.toast?.('Add a task first');
    const projectId=document.getElementById('atlasDirectProject')?.value||'',areaId=document.getElementById('atlasDirectArea')?.value||'';
    if(projectId){
      const p=projectById(projectId);if(!p)return root.toast?.('Project unavailable');p.tasks=p.tasks||[];p.tasks.push({id:uid('t'),title,done:false});log?.(`Task added to ${p.title}: ${title}.`);
      await save();renderAll();closeDirectCreate();root.toast?.(`Task added to ${p.title}`);return;
    }
    const area=areaId?areaById(areaId):null,profile=state.settings.activeProfile||'me',space=area?.space||(state.settings.spaceFilter==='work'?'work':'personal');
    state.notes.unshift({id:uid('n'),profile,space,areaId:areaId||'',topicId:area?.level>=4?area.id:'',type:'task',title,body:'',tags:[],createdAt:now(),showOnMap:false});
    log?.(`Unassigned task captured: ${title}.`);await save();renderAll();closeDirectCreate();root.toast?.('Task created');
  }

  async function saveStructure(){
    const name=(document.getElementById('atlasDirectTitle')?.value||'').trim();if(!name)return root.toast?.(`Add a ${createKind==='area'?'name':'topic name'} first`);
    const profile=state.settings.activeProfile||'me';let level,parentId,space;
    if(createKind==='area'){
      level=2;parentId='atlas';space=document.getElementById('atlasDirectSpace')?.value||'personal';
    }else{
      parentId=document.getElementById('atlasDirectParent')?.value||'';const parent=areaById(parentId);if(!parent)return root.toast?.('Choose a Topic parent');level=Math.min(4,Number(parent.level||2)+1);space=parent.space||'personal';
    }
    const item={id:uid('area'),profile,name,code:makeNodeCode(name),space,level,parentId,description:(document.getElementById('atlasDirectDescription')?.value||'').trim(),x:600,y:340,mapZ:0,status:'default'};
    state.areas.push(item);organiseSphericalLayout(state,profile);log?.(`${createKind==='area'?'Area':'Topic'} created: ${name}.`);await save();closeDirectCreate();renderAll();openArea(item.id);root.toast?.(`${createKind==='area'?'Area':'Topic'} created`);
  }

  async function submitDirectCreate(event){
    event.preventDefault();if(createKind==='task')return saveTask();if(createKind==='area'||createKind==='topic')return saveStructure();
  }

  function alignedCapture(type='note',areaId=''){
    const ctx=areaId||currentContextAreaId();
    if(type==='task')return openTaskCreate(ctx);
    if(type==='area'||type==='topic')return openStructureCreate(type,ctx);
    if(['note','meeting','idea','reference'].includes(type))return root.AtlasRichNoteCapture?.open?.(type,ctx);
    return openCapture?.(type,ctx);
  }

  function installAlignedLauncher(){
    document.getElementById('atlasCaptureLauncher')?.remove();
    const overlay=document.createElement('div');overlay.id='atlasCaptureLauncher';overlay.className='overlay atlas-capture-launcher';
    const choices=[['note','Note','Full visual note editor'],['meeting','Meeting','Meeting notes with rich text'],['idea','Idea','Capture an idea'],['reference','Reference','Save reference material'],['project','Project','Create a structured project'],['task','Task','Create an action with explicit Project choice'],['daily','Daily','Add a daily entry'],['area','Area','Create a top-level Area directly'],['topic','Topic','Create a Topic directly']];
    overlay.innerHTML=`<section class="modal atlas-capture-launcher-modal" role="dialog" aria-modal="true" aria-label="Create in Atlas"><div class="modal-head"><div><div class="code">UNIVERSAL INPUT</div><h3>Create in Atlas</h3><div id="atlasCaptureContext" class="atlas-capture-context"></div></div><button class="btn" type="button" data-capture-launcher-close>Close</button></div><div class="modal-body"><div class="atlas-capture-choice-grid">${choices.map(([id,title,desc])=>`<button type="button" class="atlas-capture-choice" data-atlas-aligned-capture="${id}"><strong>${title}</strong><span>${desc}</span></button>`).join('')}</div></div></section>`;
    document.body.appendChild(overlay);updateLauncherContext();
  }

  function updateLauncherContext(){
    const el=document.getElementById('atlasCaptureContext');if(!el)return;const area=contextArea();
    el.textContent=area?`Context · ${area.name}`:'Context · Inbox / unlinked';
  }

  function installCaptureWrappers(){
    const baseRich=root.AtlasRichNoteCapture;
    if(baseRich?.open){
      const baseOpen=baseRich.open.bind(baseRich),baseLegacy=baseRich.legacy?.bind(baseRich);
      root.AtlasRichNoteCapture=Object.freeze({...baseRich,
        open:(type='note',areaId='')=>type==='task'?openTaskCreate(areaId||currentContextAreaId()):baseOpen(type,areaId||currentContextAreaId()),
        legacy:(type='note',areaId='')=>type==='task'?openTaskCreate(areaId||currentContextAreaId()):baseLegacy?.(type,areaId||currentContextAreaId())
      });
    }
    if(typeof openCapture==='function'){
      const baseOpenCapture=openCapture;
      openCapture=function(type='note',areaId=''){if(type==='task')return openTaskCreate(areaId||currentContextAreaId());return baseOpenCapture(type,areaId||currentContextAreaId())};
    }
    const baseFramework=root.AtlasCaptureFramework;
    if(baseFramework?.open){
      root.AtlasCaptureFramework=Object.freeze({...baseFramework,open:()=>{updateLauncherContext();return baseFramework.open()}});
    }
  }

  function installActionableWidgets(){
    if(typeof activeWidget==='function'){
      activeWidget=function(){
        const ps=visibleProjects(null).filter(p=>p.status==='ACTIVE'||p.status==='WATCHING').slice(0,4);
        return widgetShell('active',`<div class="widget-list">${ps.length?ps.map(p=>`<button type="button" class="widget-row atlas-action-row" data-atlas-open-project="${h(p.id)}"><i></i><div><strong>${h(p.next||p.title)}</strong><small>${h(p.title)}</small></div><em>${h(p.status)}</em></button>`).join(''):'<div class="widget-empty">No active moves.</div>'}</div>`,`${ps.length} OPEN`);
      };
    }
    if(typeof milestonesWidget==='function'){
      milestonesWidget=function(){
        const rows=visibleProjects(null).flatMap(p=>(p.milestones||[]).filter(m=>!m.done).map(m=>({m,p}))).slice(0,10);
        return widgetShell('milestones',`<div class="widget-list">${rows.length?rows.map(({m,p})=>`<button type="button" class="widget-row atlas-action-row" data-atlas-open-project="${h(p.id)}"><i></i><div><strong>${h(m.title)}</strong><small>${h(p.code)} · ${h(p.title)}</small></div><em>${m.current?'CURRENT':'OPEN'}</em></button>`).join(''):'<div class="widget-empty">No open milestones.</div>'}</div>`,`${rows.length} OPEN`);
      };
    }
    if(typeof notesWidget==='function'){
      notesWidget=function(){
        const ns=visibleNotes(null).slice(0,8);
        return widgetShell('notes',ns.length?ns.map(n=>`<button type="button" class="widget-note atlas-action-note" data-atlas-open-note="${h(n.id)}"><strong>${h(n.title||'Untitled')}</strong><p>${h(n.body||'')}</p><small class="code">${fmtDate(n.createdAt)} · ${h(areaById(n.topicId)?.code||areaById(n.areaId)?.code||'INBOX')}</small></button>`).join(''):'<div class="widget-empty">No notes.</div>',`${ns.length} RECENT`);
      };
    }
  }

  installAlignedLauncher();installCaptureWrappers();installActionableWidgets();

  const actions={
    contextAreaId:currentContextAreaId,
    home:goHome,
    tab:goTab,
    area:openArea,
    project:openProjectAction,
    note:openNoteAction,
    event:openEventAction,
    capture:alignedCapture
  };
  root.AtlasActions=Object.freeze(actions);

  document.addEventListener('pointerdown',event=>{if(event.target.closest?.('#captureBtn'))updateLauncherContext()},true);
  document.addEventListener('click',event=>{
    const choice=event.target.closest?.('[data-atlas-aligned-capture]');if(choice){event.preventDefault();alignedCapture(choice.dataset.atlasAlignedCapture);return}
    if(event.target.closest?.('[data-atlas-direct-close]')){event.preventDefault();closeDirectCreate();return}
    if(event.target.closest?.('[data-atlas-create-area-instead]')){event.preventDefault();openStructureCreate('area',createContext);return}
    const p=event.target.closest?.('[data-atlas-open-project]');if(p){event.preventDefault();openProjectAction(p.dataset.atlasOpenProject);return}
    const n=event.target.closest?.('[data-atlas-open-note]');if(n){event.preventDefault();openNoteAction(n.dataset.atlasOpenNote);return}
    if(event.target===document.getElementById('atlasDirectCreate'))closeDirectCreate();
  },true);
  document.addEventListener('submit',event=>{if(event.target?.id==='atlasDirectCreateForm')submitDirectCreate(event)},true);
  root.addEventListener('keydown',event=>{if(event.defaultPrevented)return;if(event.key==='Escape'&&document.getElementById('atlasDirectCreate')?.classList.contains('open')){event.preventDefault();closeDirectCreate()}},true);
})(window);
