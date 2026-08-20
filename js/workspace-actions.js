// Atlas v0.15.2-r1: actionable Area/Topic workspace panels.
(function(root){
  'use strict';

  let action='',scopeId='';
  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function scope(){try{return areaById(scopeId)}catch(_){return null}}
  function projects(){try{return visibleProjects(scopeId).filter(p=>p.status!=='COMPLETE')}catch(_){return[]}}
  function notes(){try{return visibleNotes(scopeId)}catch(_){return[]}}
  function projectOptions(){const ps=projects();return ps.map(p=>`<option value="${h(p.id)}">${h(p.code||'PROJECT')} · ${h(p.title)}</option>`).join('')}
  function ensure(){
    let el=document.getElementById('atlasWorkspaceAction');if(el)return el;
    el=document.createElement('div');el.id='atlasWorkspaceAction';el.className='overlay atlas-workspace-action';
    el.innerHTML=`<section class="modal atlas-workspace-action-modal" role="dialog" aria-modal="true" aria-labelledby="atlasWorkspaceActionTitle"><div class="modal-head"><div><div class="code" id="atlasWorkspaceActionCode">WORKSPACE ACTION</div><h3 id="atlasWorkspaceActionTitle">Create</h3><div id="atlasWorkspaceActionContext" class="atlas-workspace-action-context"></div></div><button type="button" class="btn" data-workspace-action-close>Close</button></div><form id="atlasWorkspaceActionForm" class="modal-body"></form></section>`;
    document.body.appendChild(el);return el;
  }
  function close(){document.getElementById('atlasWorkspaceAction')?.classList.remove('open');action='';scopeId=''}
  function open(kind,id){
    action=kind;scopeId=id;const area=scope();if(!area)return root.toast?.('Area unavailable');
    if(kind==='project'||kind==='note'){return root.AtlasActions?.capture?.(kind,id)}
    const el=ensure(),form=el.querySelector('#atlasWorkspaceActionForm'),ps=projects();
    el.querySelector('#atlasWorkspaceActionContext').textContent=`${area.name} · ${area.code||''}`;
    if(kind==='next'){
      el.querySelector('#atlasWorkspaceActionCode').textContent='PROJECT ACTION';el.querySelector('#atlasWorkspaceActionTitle').textContent='Set Next Move';
      form.innerHTML=ps.length?`<div class="field"><label>Project</label><select id="awaProject">${projectOptions()}</select></div><div class="field"><label>Next Move</label><textarea id="awaText" rows="4" placeholder="What happens next?" required></textarea></div><div class="atlas-workspace-action-help">Updates the selected Project directly from ${h(area.name)}.</div><div class="atlas-workspace-action-buttons"><button type="button" class="btn" data-workspace-action-close>Cancel</button><button type="submit" class="btn primary">Save Next Move</button></div>`:noProjects('Next Moves need a Project. Create one here first.');
    }else if(kind==='milestone'){
      el.querySelector('#atlasWorkspaceActionCode').textContent='PROJECT ACTION';el.querySelector('#atlasWorkspaceActionTitle').textContent='Add Milestone';
      form.innerHTML=ps.length?`<div class="field"><label>Project</label><select id="awaProject">${projectOptions()}</select></div><div class="field"><label>Milestone</label><input id="awaText" autocomplete="off" placeholder="Milestone" required></div><label class="atlas-workspace-check"><input id="awaCurrent" type="checkbox"> Mark as current</label><div class="atlas-workspace-action-help">Adds the milestone to the selected Project without leaving ${h(area.name)}.</div><div class="atlas-workspace-action-buttons"><button type="button" class="btn" data-workspace-action-close>Cancel</button><button type="submit" class="btn primary">Add Milestone</button></div>`:noProjects('Milestones need a Project. Create one here first.');
    }else if(kind==='topic'){
      el.querySelector('#atlasWorkspaceActionCode').textContent='STRUCTURE';el.querySelector('#atlasWorkspaceActionTitle').textContent='New Topic';
      const candidates=notes().filter(n=>(n.areaId===id||!n.topicId)&&n.topicId!==id).slice(0,30);
      form.innerHTML=`<div class="field"><label>Name</label><input id="awaText" autocomplete="off" placeholder="Topic name" required></div><div class="field"><label>Description</label><textarea id="awaDescription" rows="3" placeholder="Optional description"></textarea></div>${candidates.length?`<fieldset class="atlas-workspace-attach"><legend>Attach existing notes <span>optional</span></legend><div class="atlas-workspace-note-picker">${candidates.map(n=>`<label><input type="checkbox" data-awa-note="${h(n.id)}"><span><strong>${h(n.title||'Untitled')}</strong><small>${h(n.type||'note')}</small></span></label>`).join('')}</div><p>Selected notes stay in ${h(area.name)} and are linked to this new Topic.</p></fieldset>`:`<div class="atlas-workspace-action-help">No existing notes in this Area need attaching. You can add notes to the Topic later.</div>`}<div class="atlas-workspace-action-buttons"><button type="button" class="btn" data-workspace-action-close>Cancel</button><button type="submit" class="btn primary">Create Topic</button></div>`;
    }
    el.classList.add('open');setTimeout(()=>el.querySelector('#awaText')?.focus(),30);
  }
  function noProjects(message){return `<div class="atlas-workspace-action-empty"><strong>No Project yet</strong><p>${h(message)}</p><button type="button" class="btn primary" data-workspace-create-project>Create Project</button></div>`}
  async function submit(event){
    event.preventDefault();const area=scope();if(!area)return;
    if(action==='next'){
      const p=projectById(document.getElementById('awaProject')?.value||''),text=(document.getElementById('awaText')?.value||'').trim();if(!p||!text)return root.toast?.('Choose a Project and add a Next Move');p.next=text;p.updatedAt=now();log?.(`Next move updated: ${p.title}.`);await save();close();renderAll();root.toast?.(`Next Move updated · ${p.title}`);return;
    }
    if(action==='milestone'){
      const p=projectById(document.getElementById('awaProject')?.value||''),title=(document.getElementById('awaText')?.value||'').trim();if(!p||!title)return root.toast?.('Choose a Project and add a Milestone');p.milestones=p.milestones||[];const current=!!document.getElementById('awaCurrent')?.checked;if(current)p.milestones.forEach(m=>m.current=false);p.milestones.push({id:uid('m'),title,done:false,current});p.updatedAt=now();log?.(`Milestone added to ${p.title}: ${title}.`);await save();close();renderAll();root.toast?.(`Milestone added · ${p.title}`);return;
    }
    if(action==='topic'){
      const name=(document.getElementById('awaText')?.value||'').trim();if(!name)return root.toast?.('Add a Topic name');
      const level=Math.min(4,Number(area.level||2)+1),item={id:uid('area'),profile:state.settings.activeProfile||'me',name,code:makeNodeCode(name),space:area.space||'personal',level,parentId:area.id,description:(document.getElementById('awaDescription')?.value||'').trim(),x:600,y:340,mapZ:0,status:'default'};
      state.areas.push(item);const chosen=[...document.querySelectorAll('[data-awa-note]:checked')].map(x=>x.dataset.awaNote);chosen.forEach(id=>{const n=state.notes.find(x=>x.id===id);if(n){n.areaId=area.id;n.topicId=item.id;n.space=area.space||n.space;n.updatedAt=now()}});organiseSphericalLayout(state,state.settings.activeProfile||'me');log?.(`Topic created: ${name}${chosen.length?` · ${chosen.length} note${chosen.length===1?'':'s'} attached`:''}.`);await save();close();renderAll();root.AtlasActions?.openArea?.(item.id);root.toast?.(`Topic created${chosen.length?` · ${chosen.length} notes attached`:''}`);return;
    }
  }

  function panelAction(panel,kind,label,id){
    if(!panel||panel.querySelector(`[data-workspace-add="${kind}"]`))return;
    const head=panel.querySelector(':scope > .panel-head');if(head){const existing=head.querySelector('.code');const b=document.createElement('button');b.type='button';b.className='btn small atlas-panel-add';b.dataset.workspaceAdd=kind;b.dataset.area=id;b.textContent=`+ ${label}`;existing?.replaceWith(b)||head.appendChild(b)}
    const empty=panel.querySelector('.empty');if(empty){const b=document.createElement('button');b.type='button';b.className='empty atlas-empty-action';b.dataset.workspaceAdd=kind;b.dataset.area=id;b.innerHTML=`<strong>+ ${h(label)}</strong><span>${h(empty.textContent.trim())}</span>`;empty.replaceWith(b)}
  }
  function enhance(id){
    const ws=document.getElementById('workspace');if(!ws)return;const st=state.settings.subtab;
    if(st==='overview'){
      const panels=[...ws.querySelectorAll('.panel')];
      panels.forEach(panel=>{const title=panel.querySelector(':scope > .panel-head h3')?.textContent?.trim();if(title==='Projects')panelAction(panel,'project','Project',id);else if(title==='Next moves')panelAction(panel,'next','Next Move',id);else if(title==='Milestones')panelAction(panel,'milestone','Milestone',id);else if(title==='Recent Notes')panelAction(panel,'note','Note',id);else if(title==='Topics')panelAction(panel,'topic','Topic',id)});
    }else if(st==='milestones'){panelAction(ws.querySelector('.panel'),'milestone','Milestone',id)}
  }
  const baseRenderWorkspace=typeof renderWorkspace==='function'?renderWorkspace:null;
  if(baseRenderWorkspace){renderWorkspace=function(id){const result=baseRenderWorkspace.apply(this,arguments);enhance(id);return result}}

  document.addEventListener('click',event=>{
    const add=event.target.closest?.('[data-workspace-add]');if(add){event.preventDefault();event.stopPropagation();open(add.dataset.workspaceAdd,add.dataset.area);return}
    if(event.target.closest?.('[data-workspace-action-close]')){event.preventDefault();close();return}
    if(event.target===document.getElementById('atlasWorkspaceAction')){close();return}
    if(event.target.closest?.('[data-workspace-create-project]')){const id=scopeId;close();root.AtlasActions?.capture?.('project',id);return}
  },true);
  document.addEventListener('submit',event=>{if(event.target?.id==='atlasWorkspaceActionForm')submit(event)},true);
  root.addEventListener('keydown',event=>{if(event.defaultPrevented)return;if(event.key==='Escape'&&document.getElementById('atlasWorkspaceAction')?.classList.contains('open')){event.preventDefault();close()}},true);

  root.AtlasWorkspaceActions=Object.freeze({version:'0.15.2-r1',open,enhance});
})(window);
