// Atlas v0.13.3 Project Workspace: rich substantive fields + folded tasks/milestones.
(function(root){
  'use strict';

  const BUCKET='atlas-note-assets';
  const ASSET_SCHEME='atlas-asset://';
  let activeProjectIndex=-1, activeRichTarget='', assetClient=null, savedRange=null;

  function project(){return state.projects[activeProjectIndex]||null}
  function richEl(id){return document.getElementById(id)}
  function areas(){return profileAreas().filter(a=>spaceAllows(a.space)).sort((a,b)=>a.name.localeCompare(b.name))}

  function toolbar(target){
    return `<div class="atlas-project-rich-toolbar" data-rich-toolbar="${target}">
      <button type="button" data-prich="h2" data-target="${target}">H2</button>
      <button type="button" data-prich="h3" data-target="${target}">H3</button>
      <button type="button" data-prich="bold" data-target="${target}"><strong>B</strong></button>
      <button type="button" data-prich="italic" data-target="${target}"><em>I</em></button>
      <button type="button" data-prich="bullet" data-target="${target}">• List</button>
      <button type="button" data-prich="number" data-target="${target}">1. List</button>
      <button type="button" data-prich="quote" data-target="${target}">Quote</button>
      <button type="button" data-prich="code" data-target="${target}">Code</button>
      <button type="button" data-prich="link" data-target="${target}">Link</button>
      <button type="button" data-prich="table" data-target="${target}">Table</button>
      <button type="button" data-prich="image" data-target="${target}">Image</button>
    </div>`;
  }

  function richField(label,id,value){
    const rendered=root.AtlasMarkdown?.render?.(value||'')||esc(value||'');
    return `<div class="atlas-project-rich-field"><div class="field-label">${label}</div>${toolbar(id)}<div id="${id}" class="atlas-project-rich-body atlas-markdown" contenteditable="true" spellcheck="true" data-placeholder="Write ${label.toLowerCase()}…">${rendered}</div></div>`;
  }

  function milestoneSummary(p){
    const total=(p.milestones||[]).length,done=(p.milestones||[]).filter(m=>m.done).length;
    return `Milestones · ${done}/${total}`;
  }
  function taskSummary(p){
    const total=(p.tasks||[]).length,open=(p.tasks||[]).filter(t=>!t.done).length;
    return `Tasks · ${open} open${total?` / ${total}`:''}`;
  }

  function enhancedProjectEditor(i){
    const p=state.projects[i];if(!p||!profileAllows(p.profile))return;activeProjectIndex=i;
    const ar=areas();
    document.getElementById('editorPane').innerHTML=`
      <button class="btn small" data-ed-action="back-projects">← Projects</button>
      <section class="editor-section atlas-project-workspace" style="margin-top:9px">
        <div class="editor-section-head"><h4>${esc(p.code)} · Project Detail</h4><span class="code">${esc(activeProfile().name)}</span></div>
        <div class="editor-section-body"><div class="project-editor">
          <div class="row3">
            ${field('Title',`<input id="epTitle" value="${esc(p.title)}">`)}
            ${field('Status',`<select id="epStatus">${['ACTIVE','WATCHING','PAUSED','COMPLETE'].map(v=>`<option ${p.status===v?'selected':''}>${v}</option>`).join('')}</select>`)}
            ${field('Area',`<select id="epArea"><option value="">Unlinked</option>${ar.map(a=>`<option value="${a.id}" ${p.areaId===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`)}
          </div>
          ${richField('Objective','epObjectiveRich',p.objective||'')}
          ${richField('Next Move','epNextRich',p.next||'')}
          <textarea id="epObjective" hidden>${esc(p.objective||'')}</textarea>
          <textarea id="epNext" hidden>${esc(p.next||'')}</textarea>
          ${field('Tags',`<input id="epTags" value="${esc((p.tags||[]).join(', '))}">`)}

          <details class="atlas-project-fold">
            <summary><span>${milestoneSummary(p)}</span><span class="code">FOLD</span></summary>
            <div class="atlas-project-fold-body">
              <div class="atlas-project-fold-actions"><button class="btn small" data-ed-action="add-milestone" data-index="${i}">+ Milestone</button></div>
              <div class="mini-list">${(p.milestones||[]).length?(p.milestones||[]).map((m,mi)=>`<div class="mini-row"><input type="checkbox" data-ep-milestone="${mi}" ${m.done?'checked':''}><input type="text" data-ep-milestone-title="${mi}" value="${esc(m.title)}"><button class="btn small danger" data-ed-action="remove-milestone" data-index="${i}" data-subindex="${mi}">×</button></div>`).join(''):'<div class="empty">No milestones yet.</div>'}</div>
            </div>
          </details>

          <details class="atlas-project-fold">
            <summary><span>${taskSummary(p)}</span><span class="code">FOLD</span></summary>
            <div class="atlas-project-fold-body">
              <div class="atlas-project-fold-actions"><button class="btn small" data-ed-action="add-task" data-index="${i}">+ Task</button></div>
              <div class="mini-list">${(p.tasks||[]).length?(p.tasks||[]).map((t,ti)=>`<div class="mini-row"><input type="checkbox" data-ep-task="${ti}" ${t.done?'checked':''}><input type="text" data-ep-task-title="${ti}" value="${esc(t.title)}"><button class="btn small danger" data-ed-action="remove-task" data-index="${i}" data-subindex="${ti}">×</button></div>`).join(''):'<div class="empty">No tasks yet.</div>'}</div>
            </div>
          </details>

          <button class="btn primary" data-ed-action="save-project-detail" data-index="${i}">Save Project</button>
          <input id="atlasProjectImageInput" type="file" accept="image/*" hidden>
          <div id="atlasProjectStatus" class="atlas-project-status"></div>
        </div></div>
      </section>`;
    root.AtlasMarkdown?.hydrateImages?.(document.getElementById('editorPane'));
  }

  function targetEditor(id=activeRichTarget){return richEl(id)}
  function selectionInside(el){const sel=root.getSelection?.();return !!(el&&sel&&sel.rangeCount&&el.contains(sel.anchorNode))}
  function rememberSelection(id){
    const el=targetEditor(id);if(!selectionInside(el))return;activeRichTarget=id;savedRange=root.getSelection().getRangeAt(0).cloneRange();
  }
  function restoreSelection(id){
    const el=targetEditor(id);if(!el)return false;el.focus();const sel=root.getSelection();sel.removeAllRanges();
    if(savedRange&&el.contains(savedRange.commonAncestorContainer)){sel.addRange(savedRange);return true}
    const r=document.createRange();r.selectNodeContents(el);r.collapse(false);sel.addRange(r);savedRange=r.cloneRange();return false;
  }
  function command(id,name,value=null){activeRichTarget=id;restoreSelection(id);document.execCommand(name,false,value);rememberSelection(id)}
  function insertNode(id,node){
    activeRichTarget=id;restoreSelection(id);const sel=root.getSelection();if(!sel?.rangeCount)return;const r=sel.getRangeAt(0);r.deleteContents();r.insertNode(node);const spacer=document.createElement('p');spacer.innerHTML='<br>';node.after(spacer);const nr=document.createRange();nr.selectNodeContents(spacer);nr.collapse(false);sel.removeAllRanges();sel.addRange(nr);savedRange=nr.cloneRange();
  }
  function insertTable(id){
    const wrap=document.createElement('div');wrap.className='atlas-table-wrap';const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody'),hr=document.createElement('tr');
    ['Column 1','Column 2'].forEach(text=>{const th=document.createElement('th');th.textContent=text;hr.append(th)});thead.append(hr);
    for(let r=0;r<2;r++){const tr=document.createElement('tr');tr.append(document.createElement('td'),document.createElement('td'));tbody.append(tr)}
    table.append(thead,tbody);wrap.append(table);insertNode(id,wrap);
  }
  function selectedText(id){restoreSelection(id);return root.getSelection()?.toString()||''}

  async function ensureAssetClient(){
    if(assetClient)return assetClient;const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;
    if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas Cloud is unavailable.');
    assetClient=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const session=await root.AtlasCloud?.getSession?.();if(!session?.access_token||!session?.refresh_token)throw new Error('Sign in to Atlas Cloud before inserting images.');
    const set=await assetClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});if(set.error)throw set.error;return assetClient;
  }
  async function uploadProjectImage(file){
    const p=project(),target=activeRichTarget,status=document.getElementById('atlasProjectStatus');if(!file||!p||!target)return;
    try{
      status.textContent='Uploading image…';if(file.size>10*1024*1024)throw new Error('Image must be under 10 MB.');
      const c=await ensureAssetClient(),session=await root.AtlasCloud?.getSession?.();if(!session?.user?.id)throw new Error('Sign in to Atlas Cloud first.');
      const clean=String(file.name||'image').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90),path=`${session.user.id}/projects/${p.id}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${clean}`;
      const {error}=await c.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;
      const {data,error:signError}=await c.storage.from(BUCKET).createSignedUrl(path,3600);if(signError)throw signError;
      const fig=document.createElement('figure');fig.className='atlas-md-image';fig.contentEditable='false';const img=document.createElement('img');img.src=data.signedUrl;img.alt=clean.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')||'Image';img.dataset.atlasAsset=path;img.dataset.atlasLoaded='true';fig.append(img);insertNode(target,fig);status.textContent='Image inserted';
    }catch(error){status.textContent=String(error?.message||'Image upload failed.');root.toast?.('Image upload failed')}
  }

  function syncRichFieldsBeforeSave(){
    const p=project();if(!p)return;
    const objective=richEl('epObjectiveRich'),next=richEl('epNextRich');
    if(objective&&document.getElementById('epObjective'))document.getElementById('epObjective').value=root.AtlasMarkdown?.toMarkdown?.(objective)||objective.innerText||'';
    if(next&&document.getElementById('epNext'))document.getElementById('epNext').value=root.AtlasMarkdown?.toMarkdown?.(next)||next.innerText||'';
    const areaId=document.getElementById('epArea')?.value||'';p.areaId=areaId;p.topicId='';const ar=areaById(areaId);if(ar)p.space=ar.space;
  }

  async function toolbarAction(action,id){
    if(action==='bold')command(id,'bold');else if(action==='italic')command(id,'italic');else if(action==='h2')command(id,'formatBlock','h2');else if(action==='h3')command(id,'formatBlock','h3');
    else if(action==='bullet')command(id,'insertUnorderedList');else if(action==='number')command(id,'insertOrderedList');else if(action==='quote')command(id,'formatBlock','blockquote');else if(action==='code')command(id,'formatBlock','pre');
    else if(action==='link'){const url=prompt('Link URL','https://');if(!url)return;try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error();if(selectedText(id))command(id,'createLink',u.href);else{const a=document.createElement('a');a.href=u.href;a.textContent=u.href;a.target='_blank';a.rel='noopener noreferrer';insertNode(id,a)}}catch(_){root.toast?.('Use an http or https link')}}
    else if(action==='table')insertTable(id);else if(action==='image'){activeRichTarget=id;rememberSelection(id);document.getElementById('atlasProjectImageInput')?.click()}
  }

  document.addEventListener('selectionchange',()=>{for(const id of ['epObjectiveRich','epNextRich']){const el=richEl(id);if(selectionInside(el)){rememberSelection(id);break}}});
  document.addEventListener('pointerdown',event=>{const b=event.target.closest?.('[data-prich]');if(b)rememberSelection(b.dataset.target)},true);
  document.addEventListener('click',event=>{const b=event.target.closest?.('[data-prich]');if(!b)return;event.preventDefault();event.stopPropagation();toolbarAction(b.dataset.prich,b.dataset.target)},true);
  document.addEventListener('change',event=>{if(event.target?.id==='atlasProjectImageInput'){const file=event.target.files?.[0];event.target.value='';if(file)uploadProjectImage(file)}});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-ed-action="save-project-detail"]'))syncRichFieldsBeforeSave()},true);

  try{openProjectEditor=enhancedProjectEditor}catch(_){ }
  root.AtlasProjectWorkspace=Object.freeze({version:'0.13.3',open:enhancedProjectEditor});
})(window);
