// Calendar and Entangle linked-event behaviour.
const CALENDAR_TIME_ZONES=[
  ['Australia/Melbourne','Melbourne / Victoria'],
  ['Australia/Sydney','Sydney / NSW / ACT'],
  ['Australia/Hobart','Hobart / Tasmania'],
  ['Australia/Brisbane','Brisbane / Queensland'],
  ['Australia/Adelaide','Adelaide / South Australia'],
  ['Australia/Darwin','Darwin / Northern Territory'],
  ['Australia/Perth','Perth / Western Australia'],
  ['Pacific/Auckland','Auckland / New Zealand'],
  ['Asia/Singapore','Singapore'],
  ['Asia/Tokyo','Tokyo'],
  ['Europe/London','London'],
  ['America/New_York','New York'],
  ['America/Los_Angeles','Los Angeles'],
  ['UTC','UTC']
];
const CALENDAR_COLOURS=Object.freeze({
  slate:'#7f898d',
  blue:'#6689a5',
  teal:'#5f918b',
  green:'#76916b',
  amber:'#ae8954',
  red:'#a66767',
  purple:'#88749b',
  pink:'#a67689'
});
function calendarDeviceTimeZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(_){return''}}
function validCalendarTimeZone(value){if(!value)return'';try{new Intl.DateTimeFormat('en-AU',{timeZone:value}).format(new Date());return value}catch(_){return''}}
function calendarColourValue(value){return CALENDAR_COLOURS[value]||''}
function calendarTimeZoneOptions(value=''){
  const device=calendarDeviceTimeZone(),seen=new Set(),items=[['','Device local / legacy']];
  if(device)items.push([device,`This device · ${device.replaceAll('_',' ')}`]);
  for(const item of CALENDAR_TIME_ZONES)items.push(item);
  return items.filter(([zone])=>!seen.has(zone)&&seen.add(zone)).map(([zone,label])=>`<option value="${esc(zone)}" ${zone===value?'selected':''}>${esc(label)}</option>`).join('');
}
function calendarZoneParts(date,time,timeZone){
  if(!date||!time||!validCalendarTimeZone(timeZone))return null;
  const dm=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date),tm=/^(\d{2}):(\d{2})/.exec(time);if(!dm||!tm)return null;
  const wanted=Date.UTC(Number(dm[1]),Number(dm[2])-1,Number(dm[3]),Number(tm[1]),Number(tm[2]),0);
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  let guess=wanted;
  for(let i=0;i<3;i++){
    const parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    const seen=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second||0));
    const delta=wanted-seen;guess+=delta;if(Math.abs(delta)<1000)break;
  }
  return new Date(guess);
}
function calendarZoneShort(timeZone,instant){
  if(!timeZone||!instant)return'';
  try{return new Intl.DateTimeFormat('en-AU',{timeZone,timeZoneName:'short'}).formatToParts(instant).find(p=>p.type==='timeZoneName')?.value||timeZone}catch(_){return timeZone}
}
function calendarEventTimeMeta(e){
  if(!e?.startTime)return'All day';
  const zone=validCalendarTimeZone(e.timeZone||'');if(!zone)return e.startTime;
  const instant=calendarZoneParts(e.date,e.startTime,zone),zoneShort=calendarZoneShort(zone,instant);
  let text=`${e.startTime}${zoneShort?` ${zoneShort}`:''}`;
  const device=calendarDeviceTimeZone();
  if(instant&&device&&device!==zone){
    const local=new Intl.DateTimeFormat('en-AU',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:device}).format(instant);
    const localShort=calendarZoneShort(device,instant);
    text+=` · ${local}${localShort?` ${localShort}`:''} local`;
  }
  return text;
}
function refreshCalendarTimeZoneHint(){
  const hint=document.getElementById('calTimeZoneHint'),date=document.getElementById('calDate')?.value,time=document.getElementById('calStart')?.value,zone=document.getElementById('calTimeZone')?.value||'';
  if(!hint)return;
  if(!zone){hint.textContent='Uses the time zone of the device viewing Atlas.';return}
  if(!time){hint.textContent=`Stored in ${zone.replaceAll('_',' ')}.`;return}
  const instant=calendarZoneParts(date,time,zone),device=calendarDeviceTimeZone();
  if(!instant){hint.textContent=`Stored in ${zone.replaceAll('_',' ')}.`;return}
  const zoneShort=calendarZoneShort(zone,instant);
  if(device&&device!==zone){
    const local=new Intl.DateTimeFormat('en-AU',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:device}).format(instant);
    hint.textContent=`${time} ${zoneShort} · ${local} ${calendarZoneShort(device,instant)} on this device`;
  }else hint.textContent=`${time} ${zoneShort} · local time zone`;
}
function ensureCalendarEventExtras(){
  if(document.getElementById('calTimeZone'))return;
  const timeRow=document.getElementById('calEnd')?.closest('.row3');if(!timeRow)return;
  const extra=document.createElement('div');extra.className='calendar-event-extras';extra.innerHTML=`<div class="field"><label>Time zone</label><select id="calTimeZone"></select><small class="calendar-zone-hint" id="calTimeZoneHint"></small></div><div class="field"><label>Colour</label><input id="calColor" type="hidden" value=""><div class="calendar-colour-palette" role="group" aria-label="Calendar event colour"><button type="button" class="calendar-colour-clear" data-cal-colour="" aria-label="Automatic colour">Auto</button>${Object.entries(CALENDAR_COLOURS).map(([id,value])=>`<button type="button" class="calendar-colour-swatch" data-cal-colour="${id}" aria-label="${id}" title="${id}" style="--swatch:${value}"></button>`).join('')}</div></div>`;
  timeRow.insertAdjacentElement('afterend',extra);
}
function setCalendarColour(value=''){
  const valid=calendarColourValue(value)?value:'',input=document.getElementById('calColor');if(input)input.value=valid;
  document.querySelectorAll('[data-cal-colour]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.calColour===valid?'true':'false'));
}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-cal-colour]');if(!button)return;setCalendarColour(button.dataset.calColour||'')});
document.addEventListener('change',event=>{if(['calDate','calStart','calTimeZone'].includes(event.target?.id))refreshCalendarTimeZoneHint()});
document.addEventListener('input',event=>{if(['calDate','calStart'].includes(event.target?.id))refreshCalendarTimeZoneHint()});

function monthCursorDate(){const raw=state.settings.calendarCursor;if(raw&&/^\d{4}-\d{2}$/.test(raw)){const[y,m]=raw.split('-').map(Number);return new Date(y,m-1,1)}const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)}
function setCalendarCursor(d){state.settings.calendarCursor=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function calendarEvents(profile=state.settings.activeProfile){return state.calendar.filter(e=>(e.profile||'me')===profile).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime))}
function eventHue(e){const chosen=calendarColourValue(e?.color);if(chosen)return chosen;const a=areaById(e.areaId);return a?domainHueFor({id:a.id}):(e.profile==='us'?'#8e887e':'#7f898d')}
function renderCalendar(){const d=monthCursorDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());const events=calendarEvents();let cells='';for(let i=0;i<42;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=day.toLocaleDateString('en-CA'),out=day.getMonth()!==month,today=key===todayKey();const ev=events.filter(e=>e.date===key);cells+=`<div class="cal-cell ${out?'out':''} ${today?'today':''}" data-calendar-date="${key}"><div class="cal-day">${day.getDate()}</div>${ev.map(e=>`<button class="cal-event ${e.entangledId||e.sourceEventId?'cal-entangled':''}" style="--event-hue:${eventHue(e)}" data-calendar-event="${e.id}">${esc(e.title)}<small>${esc(calendarEventTimeMeta(e))}${e.areaId?` · ${esc(areaById(e.areaId)?.code||'')}`:e.sourceAreaLabel?` · ${esc(makeNodeCode(e.sourceAreaLabel))}`:''}</small></button>`).join('')}</div>`}const monthTitle=new Intl.DateTimeFormat('en-AU',{month:'long',year:'numeric'}).format(first);document.getElementById('app').innerHTML=`<div class="calendar-head"><div><div class="crumb">ATLAS / ${esc(activeProfile().name.toUpperCase())} / CALENDAR</div><h2>${esc(monthTitle)}</h2></div><div class="calendar-toolbar"><button class="btn small" data-cal-nav="prev">←</button><button class="btn small" data-cal-nav="today">Today</button><button class="btn small" data-cal-nav="next">→</button><button class="btn primary" data-cal-add="${todayKey()}">+ Event</button></div></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-weekday">${x}</div>`).join('')}${cells}</div>`}
let activeCalendarEventId='';
function populateCalendarArea(value=''){const sel=document.getElementById('calArea');sel.innerHTML=`<option value="">Unlinked</option>`+profileAreas().filter(a=>a.level>=2&&spaceAllows(a.space)).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<option value="${a.id}" ${a.id===value?'selected':''}>${esc(a.name)} · ${esc(a.code)}</option>`).join('')}
function openCalendarEvent(id='',date=''){
  activeCalendarEventId=id;const e=id?state.calendar.find(x=>x.id===id):null;const profile=e?.profile||state.settings.activeProfile||'me';
  ensureCalendarEventExtras();
  document.getElementById('calendarEventHeading').textContent=e?'Edit event':'New event';document.getElementById('calendarEventCode').textContent=`CALENDAR / ${profileById(profile).name.toUpperCase()}`;
  document.getElementById('calTitle').value=e?.title||'';document.getElementById('calDate').value=e?.date||date||todayKey();document.getElementById('calStart').value=e?.startTime||'';document.getElementById('calEnd').value=e?.endTime||'';
  const tz=e?validCalendarTimeZone(e.timeZone||''):calendarDeviceTimeZone();const tzSelect=document.getElementById('calTimeZone');tzSelect.innerHTML=calendarTimeZoneOptions(tz);tzSelect.value=tz;
  setCalendarColour(e?.color||'');populateCalendarArea(e?.areaId||'');document.getElementById('calNotes').value=e?.notes||'';
  const own=profile!=='us';document.getElementById('entangleRow').style.display=own?'flex':'none';document.getElementById('calEntangle').checked=!!e?.entangledId;document.getElementById('deleteCalendarEvent').style.display=e?'inline-block':'none';
  document.getElementById('calendarProfileHint').textContent=e?.sourceEventId?'ENTANGLED FROM '+profileById(state.calendar.find(x=>x.id===e.sourceEventId)?.profile||'me').name.toUpperCase():`PROFILE / ${profileById(profile).name.toUpperCase()}`;
  refreshCalendarTimeZoneHint();openOverlay('calendarOverlay');setTimeout(()=>document.getElementById('calTitle').focus(),60)
}
function linkedUsEvent(source){return source.entangledId?state.calendar.find(e=>e.id===source.entangledId):state.calendar.find(e=>e.sourceEventId===source.id&&e.profile==='us')}
function syncEntangledEvent(source,enabled){let shared=linkedUsEvent(source);if(!enabled){if(shared)state.calendar=state.calendar.filter(e=>e.id!==shared.id);source.entangledId='';return}if(!shared){shared={id:uid('cal'),profile:'us',sourceEventId:source.id,createdAt:now()};state.calendar.push(shared);source.entangledId=shared.id}Object.assign(shared,{title:source.title,date:source.date,startTime:source.startTime,endTime:source.endTime,timeZone:source.timeZone||'',color:source.color||'',areaId:'',sourceAreaLabel:areaById(source.areaId)?.name||'',notes:source.notes,updatedAt:now(),sourceEventId:source.id,profile:'us'})}
function saveCalendarEvent(){
  const title=document.getElementById('calTitle').value.trim();if(!title)return toast('Add an event title');
  let e=activeCalendarEventId?state.calendar.find(x=>x.id===activeCalendarEventId):null;if(!e){e={id:uid('cal'),profile:state.settings.activeProfile||'me',createdAt:now()};state.calendar.push(e)}
  Object.assign(e,{title,date:document.getElementById('calDate').value||todayKey(),startTime:document.getElementById('calStart').value,endTime:document.getElementById('calEnd').value,timeZone:validCalendarTimeZone(document.getElementById('calTimeZone')?.value||''),color:calendarColourValue(document.getElementById('calColor')?.value)?document.getElementById('calColor').value:'',areaId:document.getElementById('calArea').value,notes:document.getElementById('calNotes').value.trim(),updatedAt:now()});
  if(e.profile!=='us'&&!e.sourceEventId)syncEntangledEvent(e,document.getElementById('calEntangle').checked);log(`Calendar event saved: ${e.title}.`);save();closeOverlay('calendarOverlay');renderAll();toast(e.entangledId?'Event entangled with Us':'Calendar saved')
}
function deleteCalendarEvent(){const e=state.calendar.find(x=>x.id===activeCalendarEventId);if(!e)return;if(!confirm(`Delete ${e.title}?`))return;if(e.entangledId)state.calendar=state.calendar.filter(x=>x.id!==e.entangledId);if(e.sourceEventId){const src=state.calendar.find(x=>x.id===e.sourceEventId);if(src)src.entangledId=''}state.calendar=state.calendar.filter(x=>x.id!==e.id);save();closeOverlay('calendarOverlay');renderAll();toast('Event deleted')}
