// Shared widget-profile rendering for Atlas surfaces such as House.
(function(root){
  'use strict';
  if(typeof widgetShell!=='function'||typeof renderWidget!=='function')return;

  const baseWidgetShell=widgetShell;
  const baseTodoWidget=todoWidget;
  const baseUpcomingWidget=upcomingWidget;
  const baseCalendarWidget=calendarWidget;
  const baseRenderWidget=renderWidget;

  function explicitWidgetProfile(target){return target?.closest?.('.atlas-widget[data-widget-profile]')?.dataset.widgetProfile||''}
  function widgetProfile(options){return String(options?.profileId||state?.settings?.activeProfile||'me')}
  function renderCurrentSurface(){if(root.AtlasHouse?.isActive?.())root.AtlasHouse.render();else renderHome()}
  function upcomingCopy(e){
    if(e.entryType==='travel')return `<strong>${esc(e.title)}${e.entangledId||e.sourceEventId?' ↔':''}</strong><small>${esc(e.date)}${e.startTime?` · ${esc(e.startTime)}`:''}</small>`;
    return `<strong>${esc(calendarEventPersonLabel(e))}</strong><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:700">${esc(e.title)}${e.entangledId||e.sourceEventId?' ↔':''}</span><small>${esc(e.date)} · ${esc(calendarEventTimeMeta(e))}</small>`;
  }

  widgetShell=function(id,body,meta='',options={}){
    const profileId=options?.profileId;if(!profileId)return baseWidgetShell(id,body,meta);
    const c=widgetCfg(id),w=ATLAS_WIDGETS[id],float=c.zone==='float',pos=state.settings.widgetFloat[id]||{x:40,y:100};
    return `<section class="atlas-widget ${float?'widget-floating':''}" data-widget="${id}" data-zone="${c.zone}" data-widget-profile="${esc(profileId)}" ${float?`style="left:${Math.round(pos.x)}px;top:${Math.round(pos.y)}px"`:''}><header class="widget-head" data-widget-drag="${id}"><div class="widget-ident"><strong>${w.title}</strong><span>${meta||w.code} · ${esc(profileById(profileId).name)}</span></div><div class="widget-actions">${widgetPositionMenu(id)}<button type="button" data-widget-close="${id}" aria-label="Close ${w.title}">×</button></div></header><div class="widget-body ${id==='calendar'?'flush':''}">${body}</div></section>`;
  };

  todoWidget=function(options={}){
    const profileId=options?.profileId;if(!profileId)return baseTodoWidget();
    const todos=(state.quickTodos||[]).filter(todo=>(todo.profile||'me')===profileId).sort((a,b)=>Number(a.done)-Number(b.done)||Number(b.createdAt||0)-Number(a.createdAt||0));
    return widgetShell('todo',`<div class="quick-add"><input id="widgetTodoInput" type="text" placeholder="Add a quick task…"><button type="button" data-widget-action="add-todo">Add</button></div><div class="quick-list">${todos.length?todos.map(t=>`<label class="quick-todo ${t.done?'done':''}"><input type="checkbox" data-widget-todo="${t.id}" ${t.done?'checked':''}><span>${esc(t.text)}</span><button type="button" data-widget-delete-todo="${t.id}">×</button></label>`).join(''):'<div class="widget-empty">No quick tasks.</div>'}</div>`,'',options);
  };

  upcomingWidget=function(options={}){
    const profileId=options?.profileId;if(!profileId)return baseUpcomingWidget();
    const start=todayKey(),until=new Date();until.setDate(until.getDate()+30);const end=until.toLocaleDateString('en-CA');
    const events=calendarEvents(profileId).filter(event=>event.date>=start&&event.date<=end).slice(0,8);
    return widgetShell('upcoming',`<div class="widget-list">${events.length?events.map(e=>`<button type="button" class="widget-row" data-calendar-id="${e.id}" style="border:0;background:transparent;color:inherit;text-align:left;width:100%"><i></i><div>${upcomingCopy(e)}</div><em>${esc(profileById(e.profile).name)}</em></button>`).join(''):'<div class="widget-empty">Nothing scheduled.</div>'}</div>`,`${events.length} / 30D`,options);
  };

  calendarWidget=function(options={}){
    const profileId=options?.profileId;if(!profileId)return baseCalendarWidget();
    const d=monthCursorDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay()),events=calendarEvents(profileId);let cells='';
    for(let i=0;i<42;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=day.toLocaleDateString('en-CA'),out=day.getMonth()!==month,today=key===todayKey(),ev=events.some(e=>e.date===key);cells+=`<button type="button" class="mini-day ${out?'out':''} ${today?'today':''} ${ev?'has-event':''}" data-widget-cal-date="${key}">${day.getDate()}</button>`}
    const title=new Intl.DateTimeFormat('en-AU',{month:'short',year:'numeric'}).format(first);
    return widgetShell('calendar',`<div style="padding:10px"><div class="mini-calendar-head"><button type="button" data-widget-cal-nav="prev">←</button><strong>${esc(title)}</strong><button type="button" data-widget-cal-nav="next">→</button></div><div class="mini-cal">${['S','M','T','W','T','F','S'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells}</div><div class="utility-actions-row" style="margin-top:10px"><button type="button" data-widget-action="open-calendar">Open Calendar</button></div></div>`,`${events.filter(e=>e.date.slice(0,7)===`${year}-${String(month+1).padStart(2,'0')}`).length} EVENTS`,options);
  };

  renderWidget=function(id,options={}){
    if(options?.profileId){if(id==='todo')return todoWidget(options);if(id==='upcoming')return upcomingWidget(options);if(id==='calendar')return calendarWidget(options)}
    return baseRenderWidget(id);
  };

  document.addEventListener('keydown',event=>{
    const profileId=explicitWidgetProfile(event.target);if(!profileId||event.target.id!=='widgetTodoInput'||event.key!=='Enter')return;
    event.preventDefault();event.stopImmediatePropagation();const text=event.target.value.trim();if(!text)return;
    state.quickTodos.unshift({id:uid('qt'),profile:profileId,text,done:false,createdAt:now()});save();renderCurrentSurface();
  },true);

  document.addEventListener('change',event=>{
    const profileId=explicitWidgetProfile(event.target);if(!profileId||!event.target.dataset.widgetTodo)return;
    event.stopImmediatePropagation();const todo=(state.quickTodos||[]).find(item=>item.id===event.target.dataset.widgetTodo);if(todo){todo.done=event.target.checked;save();renderCurrentSurface()}
  },true);

  document.addEventListener('click',event=>{
    const profileId=explicitWidgetProfile(event.target);if(!profileId)return;
    const del=event.target.closest('[data-widget-delete-todo]');
    if(del){event.preventDefault();event.stopImmediatePropagation();state.quickTodos=state.quickTodos.filter(todo=>todo.id!==del.dataset.widgetDeleteTodo);save();renderCurrentSurface();return}
    const action=event.target.closest('[data-widget-action]');
    if(action?.dataset.widgetAction==='add-todo'){
      event.preventDefault();event.stopImmediatePropagation();const widget=action.closest('.atlas-widget'),input=widget?.querySelector('#widgetTodoInput'),text=(input?.value||'').trim();if(!text)return;
      state.quickTodos.unshift({id:uid('qt'),profile:profileId,text,done:false,createdAt:now()});save();renderCurrentSurface();return;
    }
    const nav=event.target.closest('[data-widget-cal-nav]');
    if(nav){event.preventDefault();event.stopImmediatePropagation();const d=monthCursorDate();d.setMonth(d.getMonth()+(nav.dataset.widgetCalNav==='next'?1:-1));setCalendarCursor(new Date(d.getFullYear(),d.getMonth(),1));save();renderCurrentSurface()}
  },true);

  root.AtlasWidgetContext=Object.freeze({version:'1',render:(id,profileId)=>renderWidget(id,{profileId}),profileForTarget:explicitWidgetProfile,activeProfile:widgetProfile});
})(window);
