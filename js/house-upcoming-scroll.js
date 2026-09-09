// Atlas Upcoming: House keeps the full shared 30-day list; normal Atlas uses the same event presentation with local filters.
(function(root){
  'use strict';
  if(typeof upcomingWidget!=='function'||typeof widgetShell!=='function')return;

  const baseUpcomingWidget=upcomingWidget;
  const FILTERS=Object.freeze({all:'All',work:'Work',personal:'Personal',travel:'Travel'});
  let normalFilter='all';

  function isHouse(){return !!root.AtlasHouse?.isActive?.()}
  function eventCopy(event){
    if(event.entryType==='travel')return `<strong>${esc(event.title)}${event.entangledId||event.sourceEventId?' ↔':''}</strong><small>${esc(event.date)}${event.startTime?` · ${esc(event.startTime)}`:''}</small>`;
    return `<strong>${esc(calendarEventPersonLabel(event))}</strong><span class="atlas-upcoming-title">${esc(event.title)}${event.entangledId||event.sourceEventId?' ↔':''}</span><small>${esc(event.date)} · ${esc(calendarEventTimeMeta(event))}</small>`;
  }
  function eventRow(event){
    return `<button type="button" class="widget-row" data-calendar-id="${event.id}" style="border:0;background:transparent;color:inherit;text-align:left;width:100%"><i style="background:${eventHue(event)}"></i><div>${eventCopy(event)}</div><em>${esc(profileById(event.profile).name)}</em></button>`;
  }
  function upcomingEvents(profileId){
    const start=todayKey(),until=new Date();until.setDate(until.getDate()+30);const end=until.toLocaleDateString('en-CA');
    return calendarEvents(profileId).filter(event=>event.date>=start&&event.date<=end);
  }
  function eventSpace(event){
    if(event?.space==='work'||event?.space==='personal')return event.space;
    let area=areaById(event?.areaId),guard=0;
    while(area&&guard++<12){if(area.space==='work'||area.space==='personal')return area.space;area=areaById(area.parentId)}
    return'';
  }
  function matchesFilter(event,filter){
    if(filter==='travel')return event.entryType==='travel';
    if(filter==='work')return eventSpace(event)==='work';
    if(filter==='personal')return event.entryType!=='travel'&&eventSpace(event)!=='work';
    return true;
  }
  function filterToolbar(){
    return `<div class="atlas-upcoming-filterbar"><label for="atlasUpcomingFilter">Show</label><select id="atlasUpcomingFilter" data-upcoming-filter aria-label="Filter upcoming events">${Object.entries(FILTERS).map(([id,label])=>`<option value="${id}" ${normalFilter===id?'selected':''}>${label}</option>`).join('')}</select></div>`;
  }
  function normalUpcoming(){
    const profileId=state?.settings?.activeProfile||'me',all=upcomingEvents(profileId),events=all.filter(event=>matchesFilter(event,normalFilter));
    const list=`<div class="widget-list atlas-upcoming-list normal-upcoming-list">${events.length?events.map(eventRow).join(''):'<div class="widget-empty">Nothing scheduled for this filter.</div>'}</div>`;
    return widgetShell('upcoming',filterToolbar()+list,`${events.length} / ${all.length} · 30D`);
  }
  function houseUpcoming(options){
    const profileId=options.profileId,events=upcomingEvents(profileId);
    return widgetShell('upcoming',`<div class="widget-list house-upcoming-list">${events.length?events.map(eventRow).join(''):'<div class="widget-empty">Nothing scheduled.</div>'}</div>`,`${events.length} / 30D`,options);
  }

  upcomingWidget=function(options={}){
    if(options?.profileId&&isHouse())return houseUpcoming(options);
    if(!options?.profileId)return normalUpcoming();
    return baseUpcomingWidget(options);
  };

  document.addEventListener('change',event=>{
    const select=event.target.closest?.('[data-upcoming-filter]');if(!select)return;
    normalFilter=FILTERS[select.value]?select.value:'all';
    const widget=select.closest('.atlas-widget[data-widget="upcoming"]');if(widget)widget.outerHTML=normalUpcoming();
  });

  root.AtlasHouseUpcomingScroll=Object.freeze({version:'4',filters:FILTERS,currentFilter:()=>normalFilter,eventSpace,matchesFilter});
})(window);
