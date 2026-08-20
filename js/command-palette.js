// Atlas v0.15.0-r1: universal command/search palette.
(function(root){
  'use strict';

  let open=false,selected=0,results=[];
  const MAX_RESULTS=18;
  const uiFont='Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  function h(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function norm(value){return String(value??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function profileOk(x){try{return profileAllows(x?.profile)}catch(_){return (x?.profile||'me')===(state?.settings?.activeProfile||'me')}}
  function spaceOk(x){try{return spaceAllows(x?.space)}catch(_){return true}}

  function ensure(){
    let el=document.getElementById('atlasCommandPalette');
    if(el)return el;
    el=document.createElement('div');
    el.id='atlasCommandPalette';el.className='atlas-command-backdrop';el.setAttribute('aria-hidden','true');
    el.innerHTML=`<section class="atlas-command-shell" role="dialog" aria-modal="true" aria-label="Atlas command palette">
      <div class="atlas-command-input-row"><span class="atlas-command-prompt">›</span><input id="atlasCommandInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search Atlas or type a command…"><kbd>ESC</kbd></div>
      <div class="atlas-command-meta"><span>ATLAS COMMAND</span><span id="atlasCommandHint">⌘K / CTRL K</span></div>
      <div id="atlasCommandResults" class="atlas-command-results" role="listbox"></div>
      <footer><span>↑↓ SELECT</span><span>↵ OPEN</span><span>ESC CLOSE</span></footer>
    </section>`;
    document.body.appendChild(el);
    const input=el.querySelector('#atlasCommandInput');
    input.addEventListener('input',()=>{selected=0;render()});
    el.addEventListener('pointerdown',e=>{if(e.target===el)closePalette()});
    el.addEventListener('click',e=>{const row=e.target.closest('[data-command-index]');if(row){selected=Number(row.dataset.commandIndex)||0;runSelected()}});
    return el;
  }

  function goHome(mode=null){
    state.settings.activeTab='home';state.settings.selectedArea='';state.settings.subtab='overview';if(mode)state.settings.mapViewMode=mode;renderAll();save?.();
  }
  function goSimple(tab){state.settings.activeTab=tab;state.settings.selectedArea='';state.settings.subtab='overview';renderAll();save?.()}
  function goArea(id){const a=areaById(id);if(!a)return;state.settings.activeTab=getTopDomain(a)?.id||a.id;state.settings.selectedArea=a.id;state.settings.subtab='overview';renderTabs();renderArea(a.id);save?.()}
  function switchProfile(id){
    if(!state.profiles.some(p=>p.id===id))return;
    try{root.AtlasCloudBackup?.invalidate?.();root.AtlasCloudRestore?.invalidate?.();root.AtlasCloud?.invalidateVerification?.()}catch(_){}
    state.settings.activeProfile=id;state.settings.activeTab='home';state.settings.selectedArea='';state.settings.subtab='overview';state.settings.spaceFilter='all';
    try{root.AtlasRelayTransport?.profileChanged?.();mapCamera('home').needsFit=true}catch(_){}
    renderAll();save?.();toast?.(`Switched to ${activeProfile().name}`);
  }

  function commands(){
    const rows=[
      ['Capture','Open universal Capture','capture create add new','CMD',()=>root.AtlasCaptureFramework?.open?.()],
      ['New Note','Create a rich note','new note create capture','CREATE',()=>root.AtlasRichNoteCapture?.open?.('note','')],
      ['New Meeting','Create a meeting note','new meeting create capture','CREATE',()=>root.AtlasRichNoteCapture?.open?.('meeting','')],
      ['New Idea','Capture an idea','new idea create capture','CREATE',()=>root.AtlasRichNoteCapture?.open?.('idea','')],
      ['New Reference','Capture reference material','new reference create capture','CREATE',()=>root.AtlasRichNoteCapture?.open?.('reference','')],
      ['New Project','Create a project','new project create capture','CREATE',()=>openCapture?.('project','')],
      ['New Task','Create a task','new task todo create capture','CREATE',()=>openCapture?.('task','')],
      ['New Daily Entry','Create a daily entry','new daily journal create capture','CREATE',()=>openCapture?.('daily','')],
      ['Home','Go to Atlas home','home dashboard map','NAV',()=>goHome()],
      ['Nodes','Open network node view','nodes network map graph','NAV',()=>goHome('nodes')],
      ['Predict','Open Predict network','predict prediction projected network','NAV',()=>goHome('predict')],
      ['Inbox','Open Inbox','inbox unlinked notes','NAV',()=>goSimple('inbox')],
      ['Daily','Open Daily','daily journal','NAV',()=>goSimple('daily')],
      ['Calendar','Open Calendar','calendar schedule events','NAV',()=>goSimple('calendar')],
      ['Edit Atlas','Open structural editor','edit system structure settings','CMD',()=>openEditor?.()],
    ];
    (state.profiles||[]).forEach(p=>rows.push([`Switch to ${p.name}`,`Profile · ${p.name}`,`profile switch ${p.id} ${p.name}`,'PROFILE',()=>switchProfile(p.id)]));
    return rows.map((r,i)=>({key:`cmd:${i}`,title:r[0],meta:r[1],search:`${r[0]} ${r[1]} ${r[2]}`,kind:r[3],run:r[4],command:true}));
  }

  function objects(){
    const out=[];
    (profileAreas?.()||[]).filter(spaceOk).forEach(a=>out.push({key:`area:${a.id}`,kind:Number(a.level)>=4?'TOPIC':'AREA',title:a.name,meta:`${a.code||''}${a.description?` · ${a.description}`:''}`,search:[a.name,a.code,a.description].join(' '),run:()=>goArea(a.id)}));
    (state.projects||[]).filter(p=>profileOk(p)&&spaceOk(p)).forEach(p=>{
      out.push({key:`project:${p.id}`,kind:'PROJECT',title:p.title,meta:`${p.code||''} · ${p.status||''}${p.next?` · ${p.next}`:''}`,search:[p.title,p.code,p.status,p.objective,p.next,...(p.tags||[])].join(' '),run:()=>openProject?.(p.id)});
      (p.tasks||[]).forEach(t=>out.push({key:`task:${p.id}:${t.id}`,kind:'TASK',title:t.title,meta:`${p.code||''} · ${p.title}${t.done?' · DONE':' · OPEN'}`,search:[t.title,p.title,p.code,'task'].join(' '),run:()=>openProject?.(p.id)}));
      (p.milestones||[]).forEach(m=>out.push({key:`milestone:${p.id}:${m.id}`,kind:'MILESTONE',title:m.title,meta:`${p.code||''} · ${p.title}${m.done?' · DONE':m.current?' · CURRENT':' · OPEN'}`,search:[m.title,p.title,p.code,'milestone'].join(' '),run:()=>openProject?.(p.id)}));
    });
    (state.notes||[]).filter(n=>profileOk(n)&&spaceOk(n)).forEach(n=>out.push({key:`note:${n.id}`,kind:String(n.type||'NOTE').toUpperCase(),title:n.title||'Untitled',meta:`${areaById(n.topicId)?.name||areaById(n.areaId)?.name||'Inbox'}${n.body?` · ${String(n.body).replace(/\s+/g,' ').slice(0,120)}`:''}`,search:[n.title,n.type,n.body,...(n.tags||[]),areaById(n.areaId)?.name,areaById(n.topicId)?.name].join(' '),run:()=>root.AtlasMarkdown?.openNote?.(n.id)}));
    (state.daily||[]).filter(d=>profileOk(d)).forEach(d=>out.push({key:`daily:${d.id}`,kind:'DAILY',title:String(d.text||'Daily entry').slice(0,90),meta:d.date||'',search:[d.text,d.date,'daily'].join(' '),run:()=>goSimple('daily')}));
    (state.calendar||[]).filter(e=>profileOk(e)).forEach(e=>out.push({key:`calendar:${e.id}`,kind:'EVENT',title:e.title||'Calendar event',meta:`${e.date||''}${e.startTime?` · ${e.startTime}`:''}`,search:[e.title,e.date,e.startTime,e.notes,areaById(e.areaId)?.name,'calendar event'].join(' '),run:()=>openCalendarEvent?.(e.id)}));
    return out;
  }

  function score(item,q){
    const query=norm(q),title=norm(item.title),hay=norm(item.search||`${item.title} ${item.meta}`);if(!query)return item.command?30:0;
    const tokens=query.split(/\s+/).filter(Boolean);if(!tokens.every(t=>hay.includes(t)))return -1;
    let s=10;if(title===query)s+=120;else if(title.startsWith(query))s+=90;else if(title.includes(query))s+=65;
    tokens.forEach(t=>{if(title.split(' ').some(w=>w.startsWith(t)))s+=12;if(hay.includes(t))s+=4});
    if(item.command)s+=8;return s;
  }

  function collect(q){
    const all=[...commands(),...objects()];
    if(!norm(q))return commands().slice(0,10);
    return all.map(item=>({item,score:score(item,q)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title)).slice(0,MAX_RESULTS).map(x=>x.item);
  }

  function render(){
    const el=ensure(),input=el.querySelector('#atlasCommandInput'),box=el.querySelector('#atlasCommandResults'),q=input.value;results=collect(q);if(selected>=results.length)selected=Math.max(0,results.length-1);
    box.innerHTML=results.length?results.map((r,i)=>`<button type="button" class="atlas-command-result ${i===selected?'selected':''}" data-command-index="${i}" role="option" aria-selected="${i===selected}"><span class="atlas-command-kind">${h(r.kind)}</span><span class="atlas-command-copy"><strong>${h(r.title)}</strong><small>${h(r.meta||'')}</small></span><span class="atlas-command-enter">${i===selected?'↵':''}</span></button>`).join(''):`<div class="atlas-command-empty"><strong>No Atlas result</strong><span>Try a project code, note title, task, topic, tag or command.</span></div>`;
    const active=box.querySelector('.selected');active?.scrollIntoView?.({block:'nearest'});
  }

  function openPalette(seed=''){
    const el=ensure();open=true;selected=0;el.classList.add('open');el.setAttribute('aria-hidden','false');const input=el.querySelector('#atlasCommandInput');input.value=seed;render();setTimeout(()=>{input.focus();input.select()},20);
  }
  function closePalette(){const el=document.getElementById('atlasCommandPalette');if(!el)return;open=false;el.classList.remove('open');el.setAttribute('aria-hidden','true')}
  function runSelected(){const item=results[selected];if(!item)return;closePalette();try{item.run?.()}catch(err){console.error('Atlas command failed',err);toast?.('Command could not be completed')}}

  root.addEventListener('keydown',e=>{
    const cmd=(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k';if(cmd){e.preventDefault();e.stopPropagation();open?closePalette():openPalette();return}
    if(!open)return;
    if(e.key==='Escape'){e.preventDefault();closePalette();return}
    if(e.key==='ArrowDown'){e.preventDefault();selected=Math.min(results.length-1,selected+1);render();return}
    if(e.key==='ArrowUp'){e.preventDefault();selected=Math.max(0,selected-1);render();return}
    if(e.key==='Enter'){e.preventDefault();runSelected()}
  },true);

  // Replace the old modal Search button without modifying legacy UI wiring.
  document.addEventListener('click',e=>{if(e.target.closest?.('#searchBtn')){e.preventDefault();e.stopImmediatePropagation();openPalette()}},true);

  root.AtlasCommandPalette=Object.freeze({version:'0.15.0-r1',open:openPalette,close:closePalette,search:q=>collect(q).map(({run,...rest})=>rest)});
})(window);
