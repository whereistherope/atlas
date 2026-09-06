// Atlas House: a household dashboard surface with replaceable mock-data adapters.
(function(){
  const HOUSE_MOCK={
    today:[
      {id:'today-1',time:'10:00',title:'Test event',meta:'Household calendar'},
      {id:'today-2',time:'14:30',title:'Groceries',meta:'Local shops'},
      {id:'today-3',time:'18:30',title:'Dinner',meta:'At home'}
    ],
    upcoming:[
      {id:'up-1',day:'MON',date:'07 SEP',title:'Put bins out',meta:'Evening'},
      {id:'up-2',day:'TUE',date:'08 SEP',title:'Household admin',meta:'19:00'},
      {id:'up-3',day:'THU',date:'10 SEP',title:'Shopping top-up',meta:'After work'}
    ],
    shopping:[
      {id:'shop-1',title:'Milk',done:false},
      {id:'shop-2',title:'Coffee',done:false},
      {id:'shop-3',title:'Bread',done:false},
      {id:'shop-4',title:'Dishwashing tablets',done:true}
    ],
    tasks:[
      {id:'task-1',title:'Put bins out',meta:'Tonight',done:false},
      {id:'task-2',title:'Check pantry staples',meta:'This week',done:false},
      {id:'task-3',title:'Water indoor plants',meta:'Done',done:true}
    ],
    server:{
      services:[
        {id:'proxmox',name:'Proxmox',status:'online',detail:'ONLINE'},
        {id:'tailscale',name:'Tailscale',status:'online',detail:'CONNECTED'},
        {id:'uptime',name:'Uptime Kuma',status:'online',detail:'HEALTHY'},
        {id:'pihole',name:'Pi-hole',status:'online',detail:'BLOCKING'}
      ],
      metrics:[
        {id:'cpu',label:'CPU',value:14},
        {id:'memory',label:'MEMORY',value:38},
        {id:'storage',label:'STORAGE',value:42}
      ]
    }
  };

  let houseSnapshot=JSON.parse(JSON.stringify(HOUSE_MOCK));
  let houseClockTimer=0;
  let routeHouse=(new URLSearchParams(location.search).get('view')||'').toLowerCase()==='house'||/\/house\/?$/.test(location.pathname);

  const originalNavItems=navItems;
  const originalRenderAll=renderAll;

  function houseIsActive(){return routeHouse||state?.settings?.activeTab==='house'}
  function safeText(value){return typeof esc==='function'?esc(value):String(value??'')}

  function formatHouseDate(date=new Date()){
    return new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',weekday:'short',day:'numeric',month:'long'}).format(date).toUpperCase();
  }
  function formatHouseTime(date=new Date()){
    return new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  }

  function serviceRows(services){
    return services.map(service=>`<div class="house-service" data-status="${safeText(service.status||'unknown')}"><span class="house-status-dot" aria-hidden="true"></span><div><strong>${safeText(service.name)}</strong><small>${safeText(service.detail||'')}</small></div></div>`).join('');
  }

  function metricRows(metrics){
    return metrics.map(metric=>{
      const value=Math.max(0,Math.min(100,Number(metric.value)||0));
      return `<div class="house-resource"><div class="house-resource-head"><span>${safeText(metric.label)}</span><strong>${value}%</strong></div><div class="house-meter" aria-label="${safeText(metric.label)} ${value} percent"><i style="width:${value}%"></i></div></div>`;
    }).join('');
  }

  function eventRows(events){
    return events.map(event=>`<div class="house-event"><time>${safeText(event.time)}</time><div><strong>${safeText(event.title)}</strong><small>${safeText(event.meta||'')}</small></div></div>`).join('');
  }

  function upcomingRows(events){
    return events.map(event=>`<div class="house-upcoming-row"><div class="house-date-block"><strong>${safeText(event.day)}</strong><span>${safeText(event.date)}</span></div><div><strong>${safeText(event.title)}</strong><small>${safeText(event.meta||'')}</small></div></div>`).join('');
  }

  function checklistRows(items,section){
    return items.map(item=>`<button type="button" class="house-check-row ${item.done?'is-done':''}" data-house-check="${safeText(section)}" data-house-id="${safeText(item.id)}" aria-pressed="${item.done?'true':'false'}"><span class="house-check-box" aria-hidden="true">${item.done?'✓':''}</span><span class="house-check-copy"><strong>${safeText(item.title)}</strong>${item.meta?`<small>${safeText(item.meta)}</small>`:''}</span></button>`).join('');
  }

  function panel(title,code,body,className=''){
    return `<section class="house-panel ${className}"><header class="house-panel-head"><h2>${safeText(title)}</h2><span>${safeText(code)}</span></header><div class="house-panel-body">${body}</div></section>`;
  }

  function updateHouseClock(){
    const now=new Date(),clock=document.getElementById('houseClock'),date=document.getElementById('houseDate');
    if(clock)clock.textContent=formatHouseTime(now);
    if(date)date.textContent=formatHouseDate(now);
  }

  function startHouseClock(){
    stopHouseClock();updateHouseClock();houseClockTimer=window.setInterval(updateHouseClock,30000);
  }
  function stopHouseClock(){if(houseClockTimer){clearInterval(houseClockTimer);houseClockTimer=0}}

  function renderHouse(){
    const app=document.getElementById('app');if(!app)return;
    document.body.classList.add('atlas-house-mode');
    document.body.dataset.atlasSurface='house';
    document.title='Atlas House';
    const data=houseSnapshot;
    const serverBody=`<div class="house-server-layout"><div class="house-services"><div class="house-subhead"><span>SERVICES</span><small>READ-ONLY STATUS</small></div><div class="house-service-grid">${serviceRows(data.server?.services||[])}</div></div><div class="house-resources"><div class="house-subhead"><span>RESOURCES</span><small>MOCK TELEMETRY</small></div>${metricRows(data.server?.metrics||[])}</div></div>`;
    app.innerHTML=`<main class="house-surface" aria-label="Atlas House dashboard">
      <header class="house-header">
        <div class="house-identity"><button type="button" data-house-action="atlas" aria-label="Return to Atlas">ATLAS</button><span>/</span><strong>HOUSE</strong><em>MOCK DATA</em></div>
        <div class="house-clock"><time id="houseDate">${formatHouseDate()}</time><strong id="houseClock">${formatHouseTime()}</strong></div>
      </header>
      <div class="house-board">
        ${panel('Today','HOUSEHOLD / TODAY',eventRows(data.today||[]),'house-today')}
        ${panel('Upcoming','NEXT 7 DAYS',upcomingRows(data.upcoming||[]),'house-upcoming')}
        ${panel('Shopping','SHARED LIST',checklistRows(data.shopping||[],'shopping'),'house-shopping')}
        ${panel('House / To-do','SHARED TASKS',checklistRows(data.tasks||[],'tasks'),'house-tasks')}
        ${panel('Home Server','HOMELAB / MOCK',serverBody,'house-server')}
      </div>
    </main>`;
    startHouseClock();
  }

  function leaveHouse(){
    stopHouseClock();
    document.body.classList.remove('atlas-house-mode');
    delete document.body.dataset.atlasSurface;
    document.title='Atlas';
  }

  function exitToAtlas(){
    routeHouse=false;
    const url=new URL(location.href);url.searchParams.delete('view');
    history.replaceState(null,'',url.pathname+(url.search||'')+(url.hash||''));
    state.settings.activeTab='home';state.settings.selectedArea='';state.settings.subtab='overview';
    renderAll();
  }

  function toggleMockItem(section,id){
    const list=houseSnapshot?.[section];if(!Array.isArray(list))return;
    const item=list.find(entry=>entry.id===id);if(!item)return;
    item.done=!item.done;renderHouse();
  }

  navItems=function(){
    const items=originalNavItems();
    return items.some(item=>item.id==='house')?items:[{id:'house',name:'House'},...items];
  };

  renderAll=function(persist=true){
    if(houseIsActive()){
      applyTheme();renderTabs();renderUtilityPane();renderHouse();
      if(persist&&!routeHouse)save();
      return;
    }
    leaveHouse();
    return originalRenderAll(persist);
  };

  document.getElementById('app')?.addEventListener('click',event=>{
    const action=event.target.closest('[data-house-action]');
    if(action?.dataset.houseAction==='atlas'){exitToAtlas();return}
    const check=event.target.closest('[data-house-check]');
    if(check)toggleMockItem(check.dataset.houseCheck,check.dataset.houseId);
  });

  window.addEventListener('popstate',()=>{
    routeHouse=(new URLSearchParams(location.search).get('view')||'').toLowerCase()==='house'||/\/house\/?$/.test(location.pathname);
    renderAll(false);
  });

  window.AtlasHouse={
    getSnapshot:()=>JSON.parse(JSON.stringify(houseSnapshot)),
    setSnapshot(snapshot){houseSnapshot=JSON.parse(JSON.stringify(snapshot||HOUSE_MOCK));if(houseIsActive())renderHouse()},
    resetMock(){houseSnapshot=JSON.parse(JSON.stringify(HOUSE_MOCK));if(houseIsActive())renderHouse()},
    render:renderHouse,
    isActive:houseIsActive
  };
})();
