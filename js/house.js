// Atlas House: a fixed household composition of real Atlas widgets.
(function(root){
  'use strict';
  const HOUSE_PROFILE='us';
  let routeHouse=(new URLSearchParams(location.search).get('view')||'').toLowerCase()==='house'||/\/house\/?$/.test(location.pathname);
  const originalNavItems=navItems;
  const originalRenderAll=renderAll;

  function houseIsActive(){return routeHouse||state?.settings?.activeTab==='house'}
  function clearHouseRoute(){
    if(!routeHouse)return;routeHouse=false;
    const url=new URL(location.href);url.searchParams.delete('view');
    history.replaceState(null,'',url.pathname+(url.search||'')+(url.hash||''));
  }
  function slot(name,id){return `<div class="house-widget-slot house-${name}">${renderWidget(id,{profileId:HOUSE_PROFILE})}</div>`}

  function renderHouse(){
    const app=document.getElementById('app');if(!app)return;
    document.body.classList.add('atlas-house-view');document.body.dataset.atlasSurface='house';document.title='Atlas · House';
    app.innerHTML=`<section class="house-atlas-board" id="atlasHouseBoard" data-house-profile="${HOUSE_PROFILE}" aria-label="Atlas House household dashboard">
      ${slot('calendar','calendar')}
      ${slot('upcoming','upcoming')}
      ${slot('weather','weather')}
      ${slot('list','list')}
      ${slot('todo','todo')}
      ${slot('server','server')}
    </section>`;
    app.querySelectorAll('#atlasHouseBoard [data-widget-drag]').forEach(head=>head.removeAttribute('data-widget-drag'));
    app.querySelectorAll('#atlasHouseBoard [data-widget-cal-date]').forEach(day=>{day.disabled=true;day.title='Add shared events from Atlas Calendar';day.setAttribute('aria-disabled','true')});
    widgetMenuState?.();
  }

  function leaveHouse(){document.body.classList.remove('atlas-house-view');delete document.body.dataset.atlasSurface;document.title='Atlas'}

  navItems=function(){const items=originalNavItems();return items.some(item=>item.id==='house')?items:[{id:'house',name:'House'},...items]};

  renderAll=function(persist=true){
    if(houseIsActive()){
      applyTheme();renderTabs();renderUtilityPane();renderHouse();
      if(persist&&!routeHouse)save();
      return;
    }
    leaveHouse();return originalRenderAll(persist);
  };

  document.getElementById('homeBtn')?.addEventListener('click',()=>{if(routeHouse)clearHouseRoute()},{capture:true});
  document.getElementById('sectionSelect')?.addEventListener('change',event=>{if(routeHouse&&event.target.value!=='house')clearHouseRoute()},{capture:true});
  window.addEventListener('popstate',()=>{routeHouse=(new URLSearchParams(location.search).get('view')||'').toLowerCase()==='house'||/\/house\/?$/.test(location.pathname);renderAll(false)});

  root.AtlasHouse=Object.freeze({version:'3',render:renderHouse,isActive:houseIsActive,profileId:HOUSE_PROFILE});
})(window);
