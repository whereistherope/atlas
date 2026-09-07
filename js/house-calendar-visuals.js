// Calendar colour fidelity for the modern Atlas House widget surface.
(function(root){
  'use strict';
  if(typeof calendarWidget!=='function'||typeof upcomingWidget!=='function'||typeof widgetShell!=='function')return;
  const baseCalendarWidget=calendarWidget,baseUpcomingWidget=upcomingWidget;
  function dotMarkup(events,date){return events.filter(event=>event.date===date).slice(0,3).map(event=>`<i style="background:${eventHue(event)}"></i>`).join('')}
  calendarWidget=function(options={}){
    const profileId=options?.profileId;if(!profileId)return baseCalendarWidget();
    const d=monthCursorDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay()),events=calendarEvents(profileId);let cells='';
    for(let i=0;i<42;i++){
      const day=new Date(start);day.setDate(start.getDate()+i);const key=day.toLocaleDateString('en-CA'),out=day.getMonth()!==month,today=key===todayKey(),dots=dotMarkup(events,key);
      cells+=`<button type="button" class="mini-day ${out?'out':''} ${today?'today':''} ${dots?'has-event':''}" data-widget-cal-date="${key}">${day.getDate()}${dots?`<span class="house-mini-event-dots">${dots}</span>`:''}</button>`;
    }
    const title=new Intl.DateTimeFormat('en-AU',{month:'short',year:'numeric'}).format(first);
    return widgetShell('calendar',`<div style="padding:10px"><div class="mini-calendar-head"><button type="button" data-widget-cal-nav="prev">←</button><strong>${esc(title)}</strong><button type="button" data-widget-cal-nav="next">→</button></div><div class="mini-cal">${['S','M','T','W','T','F','S'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells}</div><div class="utility-actions-row" style="margin-top:10px"><button type="button" data-widget-action="open-calendar">Open Calendar</button></div></div>`,`${events.filter(e=>e.date.slice(0,7)===`${year}-${String(month+1).padStart(2,'0')}`).length} EVENTS`,options);
  };
  upcomingWidget=function(options={}){
    const profileId=options?.profileId;if(!profileId)return baseUpcomingWidget();
    const start=todayKey(),until=new Date();until.setDate(until.getDate()+30);const end=until.toLocaleDateString('en-CA'),events=calendarEvents(profileId).filter(event=>event.date>=start&&event.date<=end).slice(0,8);
    return widgetShell('upcoming',`<div class="widget-list">${events.length?events.map(e=>`<button type="button" class="widget-row" data-calendar-id="${e.id}" style="border:0;background:transparent;color:inherit;text-align:left;width:100%"><i style="background:${eventHue(e)}"></i><div><strong>${esc(e.title)}${e.entangledId||e.sourceEventId?' ↔':''}</strong><small>${esc(e.date)}${e.startTime?` · ${esc(e.startTime)}`:''}${e.areaId?` · ${esc(areaById(e.areaId)?.code||'')}`:''}</small></div><em>${esc(profileById(e.profile).name)}</em></button>`).join(''):'<div class="widget-empty">Nothing scheduled.</div>'}</div>`,`${events.length} / 30D`,options);
  };
  const style=document.createElement('style');style.textContent='.house-atlas-board .mini-day.has-event:after{display:none!important}.house-mini-event-dots{position:absolute;left:50%;bottom:3px;display:flex;gap:2px;transform:translateX(-50%)}.house-mini-event-dots i{display:block;width:4px;height:4px;border-radius:50%}';document.head.appendChild(style);
  root.AtlasHouseCalendarVisuals=Object.freeze({version:'1'});
})(window);
