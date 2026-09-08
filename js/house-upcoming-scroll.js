// Atlas House Upcoming: show the full shared 30-day set on House only.
(function(root){
  'use strict';
  if(typeof upcomingWidget!=='function'||typeof widgetShell!=='function')return;

  const baseUpcomingWidget=upcomingWidget;

  function isHouse(){return !!root.AtlasHouse?.isActive?.()}
  function eventCopy(event){
    if(event.entryType==='travel')return `<strong>${esc(event.title)}${event.entangledId||event.sourceEventId?' ↔':''}</strong><small>${esc(event.date)}${event.startTime?` · ${esc(event.startTime)}`:''}</small>`;
    return `<strong>${esc(calendarEventPersonLabel(event))}</strong><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:700">${esc(event.title)}${event.entangledId||event.sourceEventId?' ↔':''}</span><small>${esc(event.date)} · ${esc(calendarEventTimeMeta(event))}</small>`;
  }

  upcomingWidget=function(options={}){
    const profileId=options?.profileId;
    if(!profileId||!isHouse())return baseUpcomingWidget(options);
    const start=todayKey(),until=new Date();until.setDate(until.getDate()+30);const end=until.toLocaleDateString('en-CA');
    const events=calendarEvents(profileId).filter(event=>event.date>=start&&event.date<=end);
    return widgetShell('upcoming',`<div class="widget-list house-upcoming-list">${events.length?events.map(event=>`<button type="button" class="widget-row" data-calendar-id="${event.id}" style="border:0;background:transparent;color:inherit;text-align:left;width:100%"><i></i><div>${eventCopy(event)}</div><em>${esc(profileById(event.profile).name)}</em></button>`).join(''):'<div class="widget-empty">Nothing scheduled.</div>'}</div>`,`${events.length} / 30D`,options);
  };

  root.AtlasHouseUpcomingScroll=Object.freeze({version:'1'});
})(window);
