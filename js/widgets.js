// Workspace widgets plus List/Predict view extensions.
const ATLAS_WIDGETS={
  scratch:{title:'Scratch',code:'NTS',zone:'top'},todo:{title:'To-do',code:'TODO',zone:'left'},upcoming:{title:'Upcoming',code:'UP',zone:'left'},calendar:{title:'Calendar',code:'CAL',zone:'right'},
  active:{title:'Active now',code:'NOW',zone:'left'},milestones:{title:'Milestones',code:'MILE',zone:'bottom'},projects:{title:'Projects',code:'PROJ',zone:'bottom'},notes:{title:'Recent notes',code:'NOTE',zone:'right'},log:{title:'System log',code:'LOG',zone:'right'}
};
function defaultWidgetLayout(){return{scratch:{open:true,zone:'top',order:0},active:{open:true,zone:'left',order:0},upcoming:{open:true,zone:'left',order:1},calendar:{open:false,zone:'right',order:0},todo:{open:false,zone:'left',order:2},milestones:{open:false,zone:'bottom',order:0},projects:{open:false,zone:'bottom',order:1},notes:{open:false,zone:'right',order:1},log:{open:false,zone:'right',order:2}}}
function ensureWidgetSettings(){
  if(!state?.settings)return; if(!state.settings.widgetLayout||typeof state.settings.widgetLayout!=='object')state.settings.widgetLayout={}; if(!state.settings.widgetFloat||typeof state.settings.widgetFloat!=='object')state.settings.widgetFloat={};
  const defs=defaultWidgetLayout();Object.keys(ATLAS_WIDGETS).forEach(id=>{const cur=state.settings.widgetLayout[id]||{};state.settings.widgetLayout[id]={open:typeof cur.open==='boolean'?cur.open:defs[id].open,zone:['top','left','right','bottom','float'].includes(cur.zone)?cur.zone:defs[id].zone,order:Number.isFinite(Number(cur.order))?Number(cur.order):defs[id].order}});
  state.settings.mapViewMode=['nodes','list','predict'].includes(state.settings.mapViewMode)?state.settings.mapViewMode:'nodes';state.settings.sidePane='';
}
function renderUtilityPane(){const pane=document.getElementById('utilityPane');if(pane){pane.classList.remove('open','floating');pane.innerHTML='<div id="utilityPaneContent"></div>'}document.body.classList.remove('tool-pane-open');document.body.dataset.toolDock=''}
function widgetCfg(id){ensureWidgetSettings();return state.settings.widgetLayout[id]}
function widgetIsOpen(id){return !!widgetCfg(id)?.open}
function widgetZoneItems(zone){return Object.keys(ATLAS_WIDGETS).filter(id=>{const c=widgetCfg(id);return c.open&&c.zone===zone}).sort((a,b)=>widgetCfg(a).order-widgetCfg(b).order)}
function setZoneOrder(zone){widgetZoneItems(zone).forEach((id,i)=>state.settings.widgetLayout[id].order=i)}
function toggleWidget(id){if(!ATLAS_WIDGETS[id])return;ensureWidgetSettings();const c=widgetCfg(id);c.open=!c.open;if(c.open&&!c.zone)c.zone=ATLAS_WIDGETS[id].zone;setZoneOrder(c.zone);save();renderTabs();if(state.settings.activeTab!=='home'){state.settings.activeTab='home';state.settings.selectedArea=''}renderHome()}
function closeWidget(id){if(!ATLAS_WIDGETS[id])return;widgetCfg(id).open=false;save();renderTabs();renderHome()}
function moveWidget(id,zone){if(!ATLAS_WIDGETS[id])return;ensureWidgetSettings();const old=widgetCfg(id).zone;widgetCfg(id).zone=zone;widgetCfg(id).open=true;widgetCfg(id).order=widgetZoneItems(zone).length;setZoneOrder(old);setZoneOrder(zone);if(zone==='float'&&!state.settings.widgetFloat[id])state.settings.widgetFloat[id]={x:Math.max(16,window.innerWidth-410),y:92};save();renderTabs();renderHome()}
function widgetPositionMenu(id){const z=widgetCfg(id).zone;return `<details class="widget-position"><summary>${z==='float'?'Dock':'Position'}</summary><div class="widget-position-panel">${[['top','Top'],['left','Left'],['right','Right'],['bottom','Bottom'],['float','Float']].map(([v,t])=>`<button type="button" data-widget-move="${id}" data-zone="${v}" class="${z===v?'active':''}">${t}</button>`).join('')}</div></details>`}
function widgetShell(id,body,meta=''){const c=widgetCfg(id),w=ATLAS_WIDGETS[id],float=c.zone==='float',pos=state.settings.widgetFloat[id]||{x:40,y:100};return `<section class="atlas-widget ${float?'widget-floating':''}" data-widget="${id}" data-zone="${c.zone}" ${float?`style="left:${Math.round(pos.x)}px;top:${Math.round(pos.y)}px"`:''}><header class="widget-head" data-widget-drag="${id}"><div class="widget-ident"><strong>${w.title}</strong><span>${meta||w.code} · ${esc(activeProfile().name)}</span></div><div class="widget-actions">${widgetPositionMenu(id)}<button type="button" data-widget-close="${id}" aria-label="Close ${w.title}">×</button></div></header><div class="widget-body ${id==='calendar'?'flush':''}">${body}</div></section>`}
function scratchWidget(){return widgetShell('scratch',`<textarea class="scratch-area" id="widgetScratch" placeholder="Fast, unstructured thinking…">${esc(activeScratch())}</textarea><div class="utility-help">Autosaves locally. Commit when it becomes worth keeping.</div><div class="utility-actions-row"><button type="button" data-widget-action="commit-scratch">Commit to Inbox</button><button type="button" data-widget-action="clear-scratch">Clear</button></div>`)}
function todoWidget(){const todos=profileQuickTodos();return widgetShell('todo',`<div class="quick-add"><input id="widgetTodoInput" type="text" placeholder="Add a quick task…"><button type="button" data-widget-action="add-todo">Add</button></div><div class="quick-list">${todos.length?todos.map(t=>`<label class="quick-todo ${t.done?'done':''}"><input type="checkbox" data-widget-todo="${t.id}" ${t.done?'checked':''}><span>${esc(t.text)}</span><button type="button" data-widget-delete-todo="${t.id}">×</button></label>`).join(''):'<div class="widget-empty">No quick tasks.</div>'}</div>`)}
function upcomingWidget(){const events=quickUpcoming(30);return widgetShell('upcoming',`<div class="widget-list">${events.length?events.slice(0,8).map(e=>`<button type="button" class="widget-row" data-calendar-id="${e.id}" style="border:0;background:transparent;color:inherit;text-align:left;width:100%"><i></i><div><strong>${esc(e.title)}${e.entangledId||e.sourceEventId?' ↔':''}</strong><small>${esc(e.date)}${e.startTime?` · ${esc(e.startTime)}`:''}${e.areaId?` · ${esc(areaById(e.areaId)?.code||'')}`:''}</small></div><em>${esc(profileById(e.profile).name)}</em></button>`).join(''):'<div class="widget-empty">Nothing scheduled.</div>'}</div>`,`${events.length} / 30D`)}
function activeWidget(){const rows=getNext(null);return widgetShell('active',`<div class="widget-list">${rows.length?rows.map(i=>`<div class="widget-row"><i></i><div><strong>${esc(i.name)}</strong><small>${esc(i.meta)}</small></div><em>${esc(i.badge||'OPEN')}</em></div>`).join(''):'<div class="widget-empty">No active moves.</div>'}</div>`,`${rows.length} OPEN`)}
function milestonesWidget(){const rows=visibleProjects(null).flatMap(p=>(p.milestones||[]).filter(m=>!m.done).map(m=>({m,p}))).slice(0,10);return widgetShell('milestones',`<div class="widget-list">${rows.length?rows.map(({m,p})=>`<div class="widget-row"><i></i><div><strong>${esc(m.title)}</strong><small>${esc(p.code)} · ${esc(p.title)}</small></div><em>${m.current?'CURRENT':'OPEN'}</em></div>`).join(''):'<div class="widget-empty">No open milestones.</div>'}</div>`,`${rows.length} OPEN`)}
function projectsWidget(){const ps=visibleProjects(null).slice(0,8);return widgetShell('projects',ps.length?ps.map(p=>{const pc=projectProgress(p);return `<button type="button" class="widget-project" data-project="${p.id}" style="border-left:0;border-right:0;border-top:0;background:transparent;color:inherit;text-align:left;width:100%"><div class="widget-project-head"><strong>${esc(p.code)} · ${esc(p.title)}</strong><small>${pc}%</small></div><div class="micro-bar"><i style="width:${pc}%"></i></div></button>`}).join(''):'<div class="widget-empty">No projects.</div>',`${ps.length} VISIBLE`)}
function notesWidget(){const ns=visibleNotes(null).slice(0,8);return widgetShell('notes',ns.length?ns.map(n=>`<div class="widget-note"><strong>${esc(n.title||'Untitled')}</strong><p>${esc(n.body||'')}</p><small class="code">${fmtDate(n.createdAt)} · ${esc(areaById(n.topicId)?.code||areaById(n.areaId)?.code||'INBOX')}</small></div>`).join(''):'<div class="widget-empty">No notes.</div>',`${ns.length} RECENT`)}
function logWidget(){const rows=state.activity.filter(a=>profileAllows(a.profile)).slice(0,12);return widgetShell('log',rows.length?rows.map(a=>`<div class="widget-log"><time>${fmtDate(a.time)}<br>${fmtTime(a.time)}</time><span>${esc(a.text)}</span></div>`).join(''):'<div class="widget-empty">No system activity.</div>',`${rows.length} EVENTS`)}
function calendarWidget(){const d=monthCursorDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay()),events=calendarEvents();let cells='';for(let i=0;i<42;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=day.toLocaleDateString('en-CA'),out=day.getMonth()!==month,today=key===todayKey(),ev=events.some(e=>e.date===key);cells+=`<button type="button" class="mini-day ${out?'out':''} ${today?'today':''} ${ev?'has-event':''}" data-widget-cal-date="${key}">${day.getDate()}</button>`}const title=new Intl.DateTimeFormat('en-AU',{month:'short',year:'numeric'}).format(first);return widgetShell('calendar',`<div style="padding:10px"><div class="mini-calendar-head"><button type="button" data-widget-cal-nav="prev">←</button><strong>${esc(title)}</strong><button type="button" data-widget-cal-nav="next">→</button></div><div class="mini-cal">${['S','M','T','W','T','F','S'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells}</div><div class="utility-actions-row" style="margin-top:10px"><button type="button" data-widget-action="open-calendar">Open Calendar</button></div></div>`,`${events.filter(e=>e.date.slice(0,7)===`${year}-${String(month+1).padStart(2,'0')}`).length} EVENTS`)}
function renderWidget(id){if(id==='scratch')return scratchWidget();if(id==='todo')return todoWidget();if(id==='upcoming')return upcomingWidget();if(id==='calendar')return calendarWidget();if(id==='active')return activeWidget();if(id==='milestones')return milestonesWidget();if(id==='projects')return projectsWidget();if(id==='notes')return notesWidget();if(id==='log')return logWidget();return''}
function adaptiveWidgetZones(){
  // A saved zone is user intent. Responsive composition changes only zone
  // geometry; it never renders a widget under a different dock.
  return {top:widgetZoneItems('top'),left:widgetZoneItems('left'),right:widgetZoneItems('right'),bottom:widgetZoneItems('bottom'),float:widgetZoneItems('float')};
}
function zoneHtml(zone,ids=null){ids=ids||widgetZoneItems(zone);if(!ids.length)return'';return `<div class="widget-zone zone-${zone}" data-widget-zone="${zone}" data-count="${Math.min(6,ids.length)}">${ids.map(renderWidget).join('')}</div>`}
function floatingWidgets(ids=null){return (ids||widgetZoneItems('float')).map(renderWidget).join('')}
function widgetMenuState(){const rail=document.getElementById('utilityRail');if(!rail)return;rail.querySelectorAll('[data-widget-toggle]').forEach(b=>b.classList.toggle('is-open',widgetIsOpen(b.dataset.widgetToggle)))}
function renderTabs(){
  const items=navItems(),activeTab=state.settings.activeTab==='home'?'':state.settings.activeTab,activeProfileId=state.settings.activeProfile||'me',space=state.settings.spaceFilter||'all';
  const el=document.getElementById('sectionSelect');if(el){el.innerHTML=`<option value="">Navigate</option>`+items.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');el.value=activeTab}
  const ps=document.getElementById('profileSelect');if(ps){ps.innerHTML=state.profiles.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');ps.value=activeProfileId}
  const sf=document.getElementById('spaceFilter');if(sf)sf.value=space;
  const pp=document.getElementById('profileMenuPanel'),pv=document.getElementById('profileMenuValue');if(pp){pp.innerHTML=state.profiles.map(p=>`<button type="button" class="system-item" data-profile-id="${p.id}" aria-current="${p.id===activeProfileId}">${esc(p.name)}</button>`).join('')}if(pv)pv.textContent=profileById(activeProfileId).name;
  const vp=document.getElementById('viewMenuPanel'),vv=document.getElementById('viewMenuValue');if(vp){vp.innerHTML=`<button type="button" class="system-item" data-view-id="" aria-current="${!activeTab}">Home</button>`+items.map(t=>`<button type="button" class="system-item" data-view-id="${t.id}" aria-current="${t.id===activeTab}">${esc(t.name)}</button>`).join('')}if(vv){const t=items.find(x=>x.id===activeTab);vv.textContent=t?t.name:'Navigate'}
  const sp=document.getElementById('spaceMenuPanel'),sv=document.getElementById('spaceMenuValue');const spaces=[['all','All spaces'],['work','Work only'],['personal','Personal only']];if(sp){sp.innerHTML=spaces.map(([id,name])=>`<button type="button" class="system-item" data-space-id="${id}" aria-current="${id===space}">${name}</button>`).join('')}if(sv)sv.textContent=(spaces.find(x=>x[0]===space)||spaces[0])[1];ensureWidgetSettings();widgetMenuState();
}
function branchTreeHtml(scope=null){
  const max=state.settings.mapDepth,areas=profileAreas().filter(a=>spaceAllows(a.space)&&a.level<=max),byParent={};
  areas.forEach(a=>(byParent[a.parentId||'atlas']??=[]).push(a));
  Object.values(byParent).forEach(arr=>arr.sort((a,b)=>a.name.localeCompare(b.name)));
  const noteKids={};
  if(max>=5)state.notes.filter(n=>profileAllows(n.profile)&&spaceAllows(n.space)&&n.showOnMap&&(n.topicId||n.areaId)).forEach(n=>(noteKids[n.topicId||n.areaId]??=[]).push(n));
  const relevant=scope?new Set([scope,...areas.filter(a=>isDescendant(a.id,scope)).map(a=>a.id)]):null;
  function childList(a){
    if(relevant&&!relevant.has(a.id))return'';
    return (byParent[a.id]||[]).map(child=>{
      const descendants=childList(child);
      const notes=(noteKids[child.id]||[]).slice(0,20).map(n=>`<li><span class="branch-node branch-note"><b class="branch-code">${esc(makeNodeCode(n.title||'NOTE'))}</b><span class="branch-name">${esc(n.title||'Untitled')}</span></span></li>`).join('');
      return `<li><span class="branch-node" data-open-area="${child.id}"><b class="branch-code">${esc(child.code)}</b><span class="branch-name">${esc(child.name)}</span></span>${descendants||notes?`<ul>${descendants}${notes}</ul>`:''}</li>`;
    }).join('');
  }
  const roots=scope?[areaById(scope)].filter(Boolean):(byParent['atlas']||[]);
  return `<div class="branch-root-list">${roots.map(root=>`<section class="branch-root"><button class="branch-root-title" data-open-area="${root.id}">${esc(root.name)}</button><ul class="branch-tree root-children">${childList(root)||'<li class="widget-empty">No child records.</li>'}</ul></section>`).join('')||'<div class="widget-empty">No visible branches.</div>'}</div>`;
}

const RECOMMENDATION_DOMAINS=[
  {re:/\b(tv|film|movie|cinema|series|watch|entertainment)\b/i,title:'Find the next thing to watch',summary:'Use the stored titles, notes and themes in this branch to recommend specific films or series that are adjacent to what already works, not just more of the same.',kind:'AI recommendation'},
  {re:/\b(fragrance|frag|scent|perfume|cologne)\b/i,title:'Find the next fragrance to sample',summary:'Use the stored fragrance notes, favourites, dislikes and style cues in this branch to recommend specific samples worth trying next.',kind:'AI recommendation'},
  {re:/\b(book|reading|read|author|literature)\b/i,title:'Find the next book to read',summary:'Use the stored reading notes, authors, themes and unfinished interests in this branch to recommend specific books to read next.',kind:'AI recommendation'},
  {re:/\b(car|cars|auto|vehicle|suv|bmw|x5|patrol|defender)\b/i,title:'Surface the next vehicle to compare',summary:'Use the stored vehicle notes, shortlist, ownership constraints and preferred feel to identify the next specific vehicle or listing class worth comparing.',kind:'AI recommendation'}
];
function predictionPathText(anchor){
  const parts=[];let a=anchor,guard=0;while(a&&guard++<8){parts.unshift(a.name||'');a=areaById(a.parentId)}return parts.join(' ')
}
function anchorProjects(anchor){return state.projects.filter(p=>profileAllows(p.profile)&&spaceAllows(p.space)&&(p.topicId===anchor.id||p.areaId===anchor.id||isDescendant(p.topicId||p.areaId,anchor.id)))}
function anchorNotes(anchor){return state.notes.filter(n=>profileAllows(n.profile)&&spaceAllows(n.space)&&(n.topicId===anchor.id||n.areaId===anchor.id||isDescendant(n.topicId||n.areaId,anchor.id))).sort((a,b)=>b.createdAt-a.createdAt)}
function cleanPredictionText(v,max=76){v=String(v||'').replace(/\s+/g,' ').trim();return v.length>max?v.slice(0,max-1).trim()+'…':v}
function predictionIdeasFor(anchor){
  const ideas=[],projects=anchorProjects(anchor),notes=anchorNotes(anchor),path=predictionPathText(anchor),seen=new Set();
  const add=(title,summary,kind='Projected next',why='',requiresAI=false,source='')=>{title=cleanPredictionText(title,92);if(!title||seen.has(title.toLowerCase()))return;seen.add(title.toLowerCase());ideas.push({title,summary:cleanPredictionText(summary,260),kind,why:cleanPredictionText(why,220),requiresAI,source})};
  projects.forEach(p=>{
    const openMs=(p.milestones||[]).filter(m=>!m.done),openTasks=(p.tasks||[]).filter(t=>!t.done),current=openMs.find(m=>m.current);
    if(p.next)add(p.next,`Immediate next move already stored against ${p.code} · ${p.title}.`,'Next move','This comes directly from the project’s current next-move field.',false,p.id);
    if(current)add(`Complete ${current.title}`,`Current project milestone for ${p.code}.`,'Current milestone','This is the milestone Atlas already marks as current.',false,p.id);
    openTasks.slice(0,3).forEach(t=>add(t.title,`Open task inside ${p.code} · ${p.title}.`,'Open task','This is unfinished work already present in the project.',false,p.id));
    openMs.filter(m=>!m.current).slice(0,4).forEach((m,i)=>add(`${i?'Then ':'Next milestone: '}${m.title}`,`Likely project progression after the current work in ${p.code}.`,'Project pathway','This follows the remaining milestone order already stored in Atlas.',false,p.id));
    if(openMs.length||openTasks.length)add(`Review outcome and set the next decision for ${p.title}`,`A likely decision point once the currently stored work is closed.`,'Decision point','Generated from the end of the project’s known task/milestone sequence.',false,p.id);
  });
  notes.slice(0,4).forEach(n=>{
    add(`Develop: ${n.title}`,n.body||`Continue the line of thought captured in ${n.title}.`,'Note evolution','Generated from a recent note in this branch.',false,n.id);
  });
  const tags=[...new Set(notes.flatMap(n=>n.tags||[]).map(x=>String(x).trim()).filter(Boolean))];
  if(tags.length>=2)add(`Connect ${tags[0]} with ${tags[1]}`,`Test whether the two recurring concepts in this branch form a useful relationship.`,'Connection','Generated from recurring tags in stored notes.',false,anchor.id);
  const domain=RECOMMENDATION_DOMAINS.find(d=>d.re.test(path));
  if(domain)add(domain.title,domain.summary,domain.kind,`Specific external recommendations require outside knowledge; Atlas has prepared the context from ${anchor.name} but does not fabricate the answer offline.`,true,anchor.id);
  if(/\b(story|novella|writing|creative|quantum)\b/i.test(path)&&projects.length===0)add(`What changes next because of ${anchor.name}?`,`Push the stored creative premise forward by identifying the next consequential event, constraint or reveal rather than merely adding more lore.`,'Story evolution','Generated from the creative branch context.',false,anchor.id);
  if(/\b(work|ground|surveillance|guidance|career|project)\b/i.test(path)&&projects.length===0)add(`Define the next observable outcome for ${anchor.name}`,`Turn this branch into a concrete next state: decision, deliverable, engagement, evidence or review point.`,'Work pathway','Generated because this is a work branch without a structured project pathway yet.',false,anchor.id);
  if(!ideas.length)add(`Clarify the next question for ${anchor.name}`,anchor.description||`Identify the next useful question or action at the edge of this branch.`,'Next question','Fallback generated from the area itself.',false,anchor.id);
  return ideas.slice(0,9)
}
function predictedGraph(scope=null){
  const base=graphData(scope),actual=base.nodes.filter(n=>!n.note),treeChildren={};
  base.links.filter(l=>l.type==='tree').forEach(l=>(treeChildren[l.source]??=[]).push(l.target));
  const contextualIds=new Set();
  state.projects.filter(p=>profileAllows(p.profile)&&spaceAllows(p.space)).forEach(p=>{if(p.topicId)contextualIds.add(p.topicId);else if(p.areaId)contextualIds.add(p.areaId)});
  state.notes.filter(n=>profileAllows(n.profile)&&spaceAllows(n.space)).forEach(n=>{if(n.topicId)contextualIds.add(n.topicId);else if(n.areaId)contextualIds.add(n.areaId)});
  const anchors=actual.filter(n=>contextualIds.has(n.id)||(n.level>=3&&!(treeChildren[n.id]||[]).length)).slice(0,22);
  const nodes=actual.map(n=>({...n,predicted:false})),links=base.links.map(l=>({...l,predicted:false}));
  const seedBase=`${activeProfile().id}|${scope||'home'}|${state.settings.predictionSeed||1}`;
  anchors.forEach((anchor,ai)=>{
    const ideas=predictionIdeasFor(anchor);if(!ideas.length)return;
    const rand=seeded(seedBase+'|'+anchor.id),baseAngle=Math.atan2(anchor.y-340,anchor.x-600),fan=Math.min(ideas.length,7);
    ideas.slice(0,fan).forEach((idea,i)=>{
      const spread=(i-(fan-1)/2)*.23,theta=baseAngle+spread+(rand()-.5)*.08,step=54+rand()*18;
      const id=`pred-${anchor.id}-${i}`,px=anchor.x+Math.cos(theta)*step,py=anchor.y+Math.sin(theta)*step;
      nodes.push({id,name:idea.title,code:idea.requiresAI?'AI':makeNodeCode(idea.kind),profile:anchor.profile,space:anchor.space,level:5,parentId:anchor.id,x:px,y:py,z:0,predicted:true,predictDepth:1,predictAnchor:anchor.id,predictSource:anchor.id,predictKind:idea.kind,predictTitle:idea.title,predictSummary:idea.summary,predictWhy:idea.why,predictAI:!!idea.requiresAI,predictRecord:idea.source});
      links.push({source:anchor.id,target:id,type:'prediction',predicted:true});
      // Structured projects can continue down the actual known pathway. For other
      // contexts keep the projection shallow rather than filling the graph with
      // meaningless taxonomy nodes.
      if(!idea.requiresAI&&/^(Next move|Current milestone|Open task|Project pathway)$/.test(idea.kind)&&i<3){
        const id2=`${id}-next`,theta2=theta+(rand()-.5)*.10,dist=42+rand()*12;
        const continuation=idea.kind==='Open task'?'Close this work, then reassess the project state':idea.kind==='Current milestone'?'Advance to the next unfinished milestone':'Record the outcome and choose the following move';
        nodes.push({id:id2,name:continuation,code:'NEXT',profile:anchor.profile,space:anchor.space,level:5,parentId:id,x:px+Math.cos(theta2)*dist,y:py+Math.sin(theta2)*dist,z:0,predicted:true,predictDepth:2,predictAnchor:anchor.id,predictSource:id,predictKind:'Follow-on',predictTitle:continuation,predictSummary:`A plausible follow-on after “${idea.title}”.`,predictWhy:'This is a workflow continuation, not stored Atlas data.',predictAI:false,minor:true});
        links.push({source:id,target:id2,type:'prediction',predicted:true});
      }
    });
  });
  return{nodes,links,actualCount:actual.length,predictedCount:nodes.length-actual.length};
}
function predictionRadius(n){if(!n.predicted)return Math.max(4.2,visualRadius(n)*.82);return n.minor?1.25:(n.predictDepth===1?2.6:1.75)}
function predictionPath(a,b,seed){const dx=b.x-a.x,dy=b.y-a.y,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,d=Math.hypot(dx,dy)||1,side=stableOffset(seed,1)>=0?1:-1,bend=Math.min(32,d*.18)*side;return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${(mx-dy/d*bend).toFixed(1)} ${(my+dx/d*bend).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
function predictionContextFor(n,byId){
  const anchor=byId[n.predictAnchor]||areaById(n.predictAnchor),source=byId[n.predictSource]||anchor;
  return {anchor,source,kind:n.predictKind||'Projected next',title:n.predictTitle||n.name,summary:n.predictSummary||'',why:n.predictWhy||'',requiresAI:!!n.predictAI};
}
function showPredictionInspector(n,byId,e){
  const panel=document.getElementById('predictInspector'),wrap=document.querySelector('.map-wrap');if(!panel||!wrap||!n?.predicted)return;
  const ctx=predictionContextFor(n,byId),anchorCode=ctx.anchor?.code||makeNodeCode(ctx.anchor?.name||'SOURCE');
  panel.innerHTML=`<div class="predict-inspect-head"><strong>${esc(ctx.kind)}${ctx.requiresAI?' · AI ASSIST':''}</strong><button type="button" data-predict-close aria-label="Close prediction">×</button></div><div class="predict-inspect-body"><h4>${esc(ctx.title)}</h4><p>${esc(ctx.summary)}</p>${ctx.why?`<p class="predict-reason">${esc(ctx.why)}</p>`:''}<div class="predict-inspect-grid"><b>Context</b><span>${esc(anchorCode)} · ${esc(ctx.anchor?.name||'Unknown')}</span><b>Depth</b><span>${Number(n.predictDepth||1)}</span><b>Status</b><span>${ctx.requiresAI?'Needs AI / external knowledge':'Local projection'}</span></div></div>`;
  const r=wrap.getBoundingClientRect(),pw=Math.min(330,r.width-28),ph=260;let x=e.clientX-r.left+14,y=e.clientY-r.top+14;if(x+pw>r.width-8)x=Math.max(8,e.clientX-r.left-pw-14);if(y+ph>r.height-8)y=Math.max(44,e.clientY-r.top-ph-14);panel.style.left=Math.max(8,x)+'px';panel.style.top=Math.max(44,y)+'px';panel.classList.add('open');
}
function closePredictionInspector(){const p=document.getElementById('predictInspector');if(p)p.classList.remove('open')}
function drawPredictionNetwork(scope){
  const svg=document.getElementById('network');if(!svg)return;
  const key=`predict:${scope||'home'}`;svg.dataset.scope=key;svg.innerHTML='';const gd=predictedGraph(scope),nodes=gd.nodes,links=gd.links,byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const cam=mapCamera(key);if(cam.needsFit)setFitCamera(key,nodes.map(n=>({...n,level:n.predicted?5:n.level})));applyMapView(svg,key);
  links.forEach(l=>{const a=byId[l.source],b=byId[l.target];if(!a||!b)return;const pred=l.predicted||l.type==='prediction';svg.appendChild(svgEl('path',{d:pred?predictionPath(a,b,l.source+'|'+l.target):straightPath(a,b),class:`edge ${pred?'prediction':l.type==='cross'?'cross':'tree'}`}))});
  nodes.forEach(n=>{const r=predictionRadius(n),g=svgEl('g',{class:`node prediction-node ${n.predicted?'is-predicted':'is-actual'} ${n.minor?'minor':''} ${n.predictAI?'predict-ai':''}`});g.dataset.node=n.id;g.appendChild(svgEl('circle',{cx:n.x,cy:n.y,r:r,class:'node-disc'}));const title=svgEl('title');title.textContent=n.predicted?`Projected: ${n.predictTitle||n.name}`:n.name;g.appendChild(title);if(!n.predicted||(!n.minor&&n.predictDepth===1)){const tx=svgEl('text',{x:n.x,y:n.y+r+8,class:'label','dominant-baseline':'hanging'});tx.textContent=n.predicted?(n.predictAI?'AI':(n.code||'NEXT')):(n.code||makeNodeCode(n.name));g.appendChild(tx)}svg.appendChild(g)});
  const inspect=document.getElementById('mapInspect');svg.querySelectorAll('.node').forEach(el=>{el.addEventListener('pointerenter',()=>{const n=byId[el.dataset.node];if(inspect&&n)inspect.textContent=n.predicted?`PROJECTED / ${n.name.toUpperCase()}`:`ACTUAL / ${n.code} / ${n.name.toUpperCase()}`});el.addEventListener('click',e=>{const n=byId[el.dataset.node];if(n?.predicted){e.stopPropagation();showPredictionInspector(n,byId,e)}})});svg.addEventListener('pointerleave',()=>{if(inspect)inspect.textContent=''});
  bindPredictionNetwork(scope);
  document.querySelectorAll('[data-map-zoom]').forEach(b=>{b.onclick=()=>{const a=b.dataset.mapZoom;if(a==='in')zoomPrediction(scope,1.2);else if(a==='out')zoomPrediction(scope,1/1.2);else fitPrediction(scope)}});
  const rg=document.querySelector('[data-predict-regenerate]');if(rg)rg.onclick=()=>{state.settings.predictionSeed=(Number(state.settings.predictionSeed)||1)+1;mapCamera(key).needsFit=true;save();drawPredictionNetwork(scope)};
}
function fitPrediction(scope){const gd=predictedGraph(scope),key=`predict:${scope||'home'}`;setFitCamera(key,gd.nodes.map(n=>({...n,level:n.predicted?5:n.level})));const svg=document.getElementById('network');if(svg)applyMapView(svg,key)}
function zoomPrediction(scope,factor,clientX=null,clientY=null){zoomMap(`predict:${scope||'home'}`,factor,clientX,clientY)}
function bindPredictionNetwork(scope){const svg=document.getElementById('network');if(!svg||svg.dataset.predBound==='yes')return;svg.dataset.predBound='yes';const key=`predict:${scope||'home'}`;let pd=null;svg.addEventListener('pointerdown',e=>{if(e.target.closest?.('.prediction-node.is-predicted'))return;closePredictionInspector();const cam=mapCamera(key);pd={x:e.clientX,y:e.clientY,cx:cam.cx,cy:cam.cy,p:e.pointerId};svg.setPointerCapture(e.pointerId)});svg.addEventListener('pointermove',e=>{if(!pd)return;const cam=mapCamera(key),v=mapView(key),r=svg.getBoundingClientRect();cam.cx=pd.cx-(e.clientX-pd.x)*v.w/r.width;cam.cy=pd.cy-(e.clientY-pd.y)*v.h/r.height;cam.needsFit=false;applyMapView(svg,key)});svg.addEventListener('pointerup',e=>{if(!pd)return;try{svg.releasePointerCapture(pd.p)}catch(_){ }pd=null});svg.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();zoomPrediction(scope,e.deltaY<0?1.12:1/1.12,e.clientX,e.clientY)},{passive:false})}

function networkPanel(scope=null){
  const hero=!scope,count=graphData(scope).nodes.length,mode=state.settings.mapViewMode||'nodes',predict=mode==='predict',metaCount=predict?predictedGraph(scope).predictedCount:count;
  return `<section class="network-stage ${hero?'home-network':'area-network'}">${scope?`<div class="network-head"><h2>${esc(areaById(scope)?.name||'Area')} Network</h2></div>`:''}<div class="map-wrap ${predict?'prediction-mode':''}"><div class="map-topline"><div class="map-meta"><span>${mode==='nodes'?'MAP':mode==='list'?'LIST':'PREDICT'}</span><span>${esc(activeProfile().name.toUpperCase())}</span><span>${predict?`${metaCount} PROJECTED`:`${count} NODES`}</span><span id="mapInspect"></span></div><div class="map-view-toggle"><button type="button" data-map-view="nodes" class="${mode==='nodes'?'active':''}">Nodes</button><button type="button" data-map-view="list" class="${mode==='list'?'active':''}">List</button><button type="button" data-map-view="predict" class="${mode==='predict'?'active':''}">Predict</button></div></div>${mode==='list'?`<div class="branch-view">${branchTreeHtml(scope)}</div>`:`<svg id="network" viewBox="0 0 1200 680" role="img" aria-label="${predict?'Atlas procedural prediction map':'Atlas relationship map'}"></svg>${predict?'<aside id="predictInspector" class="prediction-inspector" aria-live="polite"></aside>':''}<div class="map-controls ${predict?'predict-controls':''}" aria-label="Map controls"><div class="map-hud"><div class="zoom-controls" aria-label="Map zoom"><button type="button" data-map-zoom="out" aria-label="Zoom out">−</button><button type="button" class="zoom-reset" data-map-zoom="reset" aria-label="Fit network"><span id="zoomValue">FIT</span></button><button type="button" data-map-zoom="in" aria-label="Zoom in">+</button></div>${predict?`<div class="map-command"><button type="button" data-predict-regenerate>Regenerate</button></div><span class="predict-note">CONTEXTUAL PROJECTION · AI SLOTS MARKED · NOT STORED</span>`:`<div class="map-command"><button type="button" data-map-layout="organise">Reform</button><button type="button" data-map-anchor>Anchor</button></div><label class="depth">Depth <input id="depthRange" type="range" min="2" max="5" step="1" value="${state.settings.mapDepth}"/><strong id="depthValue">${state.settings.mapDepth}</strong></label><label class="depth map-opacity">Type <input id="labelOpacityRange" type="range" min="0" max="100" step="1" value="${Math.round((state.settings.mapLabelOpacity??.72)*100)}"/><strong id="labelOpacityValue">${Math.round((state.settings.mapLabelOpacity??.72)*100)}</strong></label><label class="depth map-opacity">Links <input id="edgeOpacityRange" type="range" min="0" max="100" step="1" value="${Math.round((state.settings.mapEdgeOpacity??.32)*100)}"/><strong id="edgeOpacityValue">${Math.round((state.settings.mapEdgeOpacity??.32)*100)}</strong></label>`}</div></div>`}</div></section>`;
}
function renderHome(){ensureWidgetSettings();const z=adaptiveWidgetZones(),app=document.getElementById('app'),occupancy=`${z.left.length?' has-left':''}${z.right.length?' has-right':''}`;app.innerHTML=`<section class="atlas-board" id="atlasBoard">${zoneHtml('top',z.top)}<div class="board-middle${occupancy}">${zoneHtml('left',z.left)}<div class="board-center"><div class="board-map">${networkPanel(null)}</div></div>${zoneHtml('right',z.right)}</div>${zoneHtml('bottom',z.bottom)}${floatingWidgets(z.float)}</section>`;if(state.settings.mapViewMode==='nodes')drawNetwork(null);else if(state.settings.mapViewMode==='predict')drawPredictionNetwork(null);widgetMenuState()}
function updateAtlasClock(){
  const nowD=new Date(),formatters={
    melClock:new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}),
    melDate:new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',weekday:'short',day:'2-digit',month:'short',year:'numeric'}),
    utcClock:new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}),
    utcDate:new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',weekday:'short',day:'2-digit',month:'short',year:'numeric'})
  };
  const vals=Object.fromEntries(Object.entries(formatters).map(([id,formatter])=>[id,formatter.format(nowD)]));
  Object.entries(vals).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v});
}
setInterval(updateAtlasClock,1000);setTimeout(updateAtlasClock,0);
let atlasResizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(atlasResizeTimer);atlasResizeTimer=setTimeout(()=>{if(state?.settings?.activeTab==='home')renderHome()},180)});

let atlasWidgetDrag=null;
function beginWidgetDrag(id,e){if(!ATLAS_WIDGETS[id])return;const el=document.querySelector(`.atlas-widget[data-widget="${CSS.escape(id)}"]`);if(!el)return;const rect=el.getBoundingClientRect(),c=widgetCfg(id);if(c.zone!=='float'){c.zone='float';state.settings.widgetFloat[id]={x:rect.left,y:rect.top};renderHome();requestAnimationFrame(()=>{const fresh=document.querySelector(`.atlas-widget[data-widget="${CSS.escape(id)}"]`);if(fresh){const r=fresh.getBoundingClientRect();atlasWidgetDrag={id,pointerId:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};document.body.classList.add('widget-dragging')}})}else{atlasWidgetDrag={id,pointerId:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top};document.body.classList.add('widget-dragging')}e.preventDefault()}
function widgetSnapTarget(x,y){if(y<105)return'top';if(y>window.innerHeight-80)return'bottom';if(x<90)return'left';if(x>window.innerWidth-90)return'right';return''}
document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-widget-drag]');if(h&&!e.target.closest('button,summary,details,input,textarea'))beginWidgetDrag(h.dataset.widgetDrag,e)});
document.addEventListener('pointermove',e=>{if(!atlasWidgetDrag)return;const id=atlasWidgetDrag.id,pos=state.settings.widgetFloat[id]||(state.settings.widgetFloat[id]={x:20,y:100}),el=document.querySelector(`.atlas-widget[data-widget="${CSS.escape(id)}"]`),w=el?.offsetWidth||380,h=el?.offsetHeight||240;pos.x=Math.max(8,Math.min(window.innerWidth-w-8,e.clientX-atlasWidgetDrag.dx));pos.y=Math.max(64,Math.min(window.innerHeight-Math.min(80,h),e.clientY-atlasWidgetDrag.dy));if(el){el.style.left=pos.x+'px';el.style.top=pos.y+'px'}document.body.dataset.widgetSnap=widgetSnapTarget(e.clientX,e.clientY)});
document.addEventListener('pointerup',e=>{if(!atlasWidgetDrag)return;const id=atlasWidgetDrag.id,snap=document.body.dataset.widgetSnap||'';atlasWidgetDrag=null;document.body.classList.remove('widget-dragging');document.body.dataset.widgetSnap='';if(snap){widgetCfg(id).zone=snap;widgetCfg(id).order=widgetZoneItems(snap).length;setZoneOrder(snap)}save();renderHome()});

document.addEventListener('input',e=>{if(e.target.id==='widgetScratch'){state.scratch[state.settings.activeProfile||'me']=e.target.value;save()}});
document.addEventListener('keydown',e=>{if(e.target.id==='widgetTodoInput'&&e.key==='Enter'){e.preventDefault();const val=e.target.value.trim();if(val){state.quickTodos.unshift({id:uid('qt'),profile:state.settings.activeProfile||'me',text:val,done:false,createdAt:now()});save();renderHome()}}});
document.addEventListener('change',e=>{if(e.target.dataset.widgetTodo){const t=state.quickTodos.find(x=>x.id===e.target.dataset.widgetTodo);if(t){t.done=e.target.checked;save();renderHome()}}});
document.addEventListener('click',e=>{
  const pc=e.target.closest('[data-predict-close]');if(pc){closePredictionInspector();return}
  const wt=e.target.closest('[data-widget-toggle]');if(wt){toggleWidget(wt.dataset.widgetToggle);const d=wt.closest('details');if(d)d.removeAttribute('open');return}
  const wc=e.target.closest('[data-widget-close]');if(wc){closeWidget(wc.dataset.widgetClose);return}
  const wm=e.target.closest('[data-widget-move]');if(wm){moveWidget(wm.dataset.widgetMove,wm.dataset.zone);return}
  const md=e.target.closest('[data-map-view]');if(md){state.settings.mapViewMode=md.dataset.mapView;save();if(state.settings.activeTab==='home')renderHome();else renderAll();return}
  const del=e.target.closest('[data-widget-delete-todo]');if(del){state.quickTodos=state.quickTodos.filter(t=>t.id!==del.dataset.widgetDeleteTodo);save();renderHome();return}
  const wa=e.target.closest('[data-widget-action]');if(wa){const a=wa.dataset.widgetAction;if(a==='commit-scratch'){commitScratch();renderHome()}else if(a==='clear-scratch'){state.scratch[state.settings.activeProfile||'me']='';save();renderHome()}else if(a==='add-todo'){const inp=document.getElementById('widgetTodoInput'),v=(inp?.value||'').trim();if(v){state.quickTodos.unshift({id:uid('qt'),profile:state.settings.activeProfile||'me',text:v,done:false,createdAt:now()});save();renderHome()}}else if(a==='open-calendar'){state.settings.activeTab='calendar';state.settings.selectedArea='';renderAll()}return}
  const cnav=e.target.closest('[data-widget-cal-nav]');if(cnav){let d=monthCursorDate();d.setMonth(d.getMonth()+(cnav.dataset.widgetCalNav==='next'?1:-1));setCalendarCursor(new Date(d.getFullYear(),d.getMonth(),1));save();renderHome();return}
  const cday=e.target.closest('[data-widget-cal-date]');if(cday){openCalendarEvent('',cday.dataset.widgetCalDate);return}
});
