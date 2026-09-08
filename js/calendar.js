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
const CALENDAR_TRAVEL_PLACES=Object.freeze({
  MEL:{name:'Melbourne',timeZone:'Australia/Melbourne',aliases:['MEL','MELBOURNE','TULLAMARINE']},
  SYD:{name:'Sydney',timeZone:'Australia/Sydney',aliases:['SYD','SYDNEY']},
  CBR:{name:'Canberra',timeZone:'Australia/Sydney',aliases:['CBR','CANBERRA']},
  HBA:{name:'Hobart',timeZone:'Australia/Hobart',aliases:['HBA','HOBART']},
  BNE:{name:'Brisbane',timeZone:'Australia/Brisbane',aliases:['BNE','BRISBANE']},
  OOL:{name:'Gold Coast',timeZone:'Australia/Brisbane',aliases:['OOL','GOLD COAST','COOLANGATTA']},
  CNS:{name:'Cairns',timeZone:'Australia/Brisbane',aliases:['CNS','CAIRNS']},
  ADL:{name:'Adelaide',timeZone:'Australia/Adelaide',aliases:['ADL','ADELAIDE']},
  DRW:{name:'Darwin',timeZone:'Australia/Darwin',aliases:['DRW','DARWIN']},
  PER:{name:'Perth',timeZone:'Australia/Perth',aliases:['PER','PERTH']},
  AKL:{name:'Auckland',timeZone:'Pacific/Auckland',aliases:['AKL','AUCKLAND']}
});
function calendarDeviceTimeZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(_){return''}}
function validCalendarTimeZone(value){if(!value)return'';try{new Intl.DateTimeFormat('en-AU',{timeZone:value}).format(new Date());return value}catch(_){return''}}
function calendarColourValue(value){return CALENDAR_COLOURS[value]||''}
function normaliseTravelPlace(value){return String(value||'').trim().toUpperCase().replace(/\s+/g,' ')}
function calendarTravelPlaceInfo(value){const key=normaliseTravelPlace(value);return Object.entries(CALENDAR_TRAVEL_PLACES).map(([code,info])=>({code,...info})).find(info=>info.aliases.includes(key))||null}
function calendarTravelDisplay(value){const info=calendarTravelPlaceInfo(value);return info?.name||String(value||'').trim()}
function calendarTravelTimeZone(value){return calendarTravelPlaceInfo(value)?.timeZone||''}
function calendarTravelIsMelbourne(value){return calendarTravelPlaceInfo(value)?.code==='MEL'||['MEL','MELBOURNE','TULLAMARINE'].includes(normaliseTravelPlace(value))}
function calendarTravelIcon(e){if(calendarTravelIsMelbourne(e?.origin))return'🛫';if(calendarTravelIsMelbourne(e?.destination))return'🛬';return'✈'}
function calendarTravelPlace(e){return calendarTravelIsMelbourne(e?.destination)?calendarTravelDisplay(e?.origin):calendarTravelDisplay(e?.destination)}
function calendarTravelAutoTitle(e){return [e?.traveler||'',calendarTravelPlace(e),String(e?.flightNumber||'').toUpperCase()].filter(Boolean).join(' · ')||'Travel'}
function calendarTravelTimeLine(e){const flight=String(e?.flightNumber||'').trim().toUpperCase(),times=[e?.startTime||'',e?.endTime||''].filter(Boolean).join('–');return [flight,times].filter(Boolean).join(' · ')||'Travel'}
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
  const hint=document.getElementById('calTimeZoneHint'),date=document.getElementById('calDate')?.value,time=document.getElementById('calStart')?.value,zone=document.getElementById('calTimeZone')?.value||'',entryType=document.getElementById('calEntryType')?.value||'event';
  if(!hint)return;
  if(entryType==='travel'){
    const end=document.getElementById('calEnd')?.value||'',arrivalZone=document.getElementById('calArrivalTimeZone')?.value||'';
    const depInstant=calendarZoneParts(date,time,zone),arrInstant=calendarZoneParts(date,end,arrivalZone);
    const dep=time?`${time}${zone?` ${calendarZoneShort(zone,depInstant)}`:''}`:'departure time not set';
    const arr=end?`${end}${arrivalZone?` ${calendarZoneShort(arrivalZone,arrInstant)}`:''}`:'arrival time not set';
    hint.textContent=`Departure ${dep} · Arrival ${arr}`;return;
  }
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
  const extra=document.createElement('div');extra.className='calendar-event-additions';extra.innerHTML=`<div class="field calendar-entry-type"><label>Entry type</label><select id="calEntryType"><option value="event">Event</option><option value="travel">Travel</option></select></div><div class="calendar-travel-fields" id="calTravelFields" hidden><div class="field"><label>Traveller</label><input id="calTraveler" type="text" placeholder="Fraser"></div><div class="field"><label>Origin</label><input id="calOrigin" type="text" placeholder="MEL or Melbourne"></div><div class="field"><label>Destination</label><input id="calDestination" type="text" placeholder="SYD or Sydney"></div><div class="field"><label>Flight</label><input id="calFlight" type="text" placeholder="VA823" autocapitalize="characters"></div><div class="field"><label>Arrival time zone</label><select id="calArrivalTimeZone"></select></div></div><div class="calendar-event-extras"><div class="field"><label id="calTimeZoneLabel">Time zone</label><select id="calTimeZone"></select><small class="calendar-zone-hint" id="calTimeZoneHint"></small></div><div class="field"><label>Colour</label><input id="calColor" type="hidden" value=""><div class="calendar-colour-palette" role="group" aria-label="Calendar event colour"><button type="button" class="calendar-colour-clear" data-cal-colour="" aria-label="Automatic colour">Auto</button>${Object.entries(CALENDAR_COLOURS).map(([id,value])=>`<button type="button" class="calendar-colour-swatch" data-cal-colour="${id}" aria-label="${id}" title="${id}" style="--swatch:${value}"></button>`).join('')}</div></div></div>`;
  timeRow.insertAdjacentElement('afterend',extra);
}
function setCalendarColour(value=''){
  const valid=calendarColourValue(value)?value:'',input=document.getElementById('calColor');if(input)input.value=valid;
  document.querySelectorAll('[data-cal-colour]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.calColour===valid?'true':'false'));
}
function updateCalendarTravelUI(){
  const travel=document.getElementById('calEntryType')?.value==='travel',panel=document.getElementById('calTravelFields');if(panel)panel.hidden=!travel;
  const form=document.getElementById('calTitle')?.closest('.field'),titleLabel=form?.querySelector('label');if(titleLabel)titleLabel.textContent=travel?'Label (optional)':'Event';
  const startLabel=document.getElementById('calStart')?.closest('.field')?.querySelector('label'),endLabel=document.getElementById('calEnd')?.closest('.field')?.querySelector('label'),zoneLabel=document.getElementById('calTimeZoneLabel');
  if(startLabel)startLabel.textContent=travel?'Departure':'Start';if(endLabel)endLabel.textContent=travel?'Arrival':'End';if(zoneLabel)zoneLabel.textContent=travel?'Departure time zone':'Time zone';
  if(travel&&!document.getElementById('calTraveler')?.value)document.getElementById('calTraveler').value=activeProfile().name||'';
  refreshCalendarTimeZoneHint();
}
function updateTravelZonesFromPlaces(targetId=''){
  if(document.getElementById('calEntryType')?.value!=='travel')return;
  if(!targetId||targetId==='calOrigin'){const zone=calendarTravelTimeZone(document.getElementById('calOrigin')?.value);if(zone)document.getElementById('calTimeZone').value=zone}
  if(!targetId||targetId==='calDestination'){const zone=calendarTravelTimeZone(document.getElementById('calDestination')?.value);if(zone)document.getElementById('calArrivalTimeZone').value=zone}
  refreshCalendarTimeZoneHint();
}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-cal-colour]');if(button){setCalendarColour(button.dataset.calColour||'');return}const travel=event.target.closest?.('[data-cal-travel-add]');if(travel)openCalendarEvent('',travel.dataset.calTravelAdd||todayKey(),'travel')});
document.addEventListener('change',event=>{if(event.target?.id==='calEntryType')updateCalendarTravelUI();if(['calOrigin','calDestination'].includes(event.target?.id))updateTravelZonesFromPlaces(event.target.id);if(['calDate','calStart','calEnd','calTimeZone','calArrivalTimeZone'].includes(event.target?.id))refreshCalendarTimeZoneHint()});
document.addEventListener('input',event=>{if(['calOrigin','calDestination'].includes(event.target?.id))updateTravelZonesFromPlaces(event.target.id);if(['calDate','calStart','calEnd'].includes(event.target?.id))refreshCalendarTimeZoneHint()});

function monthCursorDate(){const raw=state.settings.calendarCursor;if(raw&&/^\d{4}-\d{2}$/.test(raw)){const[y,m]=raw.split('-').map(Number);return new Date(y,m-1,1)}const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)}
function setCalendarCursor(d){state.settings.calendarCursor=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function calendarEvents(profile=state.settings.activeProfile){return state.calendar.filter(e=>(e.profile||'me')===profile).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime))}
function eventHue(e){const chosen=calendarColourValue(e?.color);if(chosen)return chosen;const a=areaById(e.areaId);return a?domainHueFor({id:a.id}):(e.profile==='us'?'#8e887e':'#7f898d')}
function calendarEventMarkup(e){
  const shared=e.entangledId||e.sourceEventId?'cal-entangled':'';
  if(e.entryType==='travel')return `<button class="cal-event cal-travel-event ${shared}" style="--event-hue:${eventHue(e)}" data-calendar-event="${e.id}"><span class="cal-travel-copy"><strong>${esc(e.traveler||profileById(e.profile||'me').name||'Traveller')}</strong><span>${esc(calendarTravelPlace(e)||'Travel')}</span><small>${esc(calendarTravelTimeLine(e))}</small></span><span class="cal-travel-icon" aria-hidden="true">${calendarTravelIcon(e)}</span></button>`;
  return `<button class="cal-event ${shared}" style="--event-hue:${eventHue(e)}" data-calendar-event="${e.id}">${esc(e.title)}<small>${esc(calendarEventTimeMeta(e))}${e.areaId?` · ${esc(areaById(e.areaId)?.code||'')}`:e.sourceAreaLabel?` · ${esc(makeNodeCode(e.sourceAreaLabel))}`:''}</small></button>`;
}
function renderCalendar(){const d=monthCursorDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());const events=calendarEvents();let cells='';for(let i=0;i<42;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=day.toLocaleDateString('en-CA'),out=day.getMonth()!==month,today=key===todayKey();const ev=events.filter(e=>e.date===key);cells+=`<div class="cal-cell ${out?'out':''} ${today?'today':''}" data-calendar-date="${key}"><div class="cal-day">${day.getDate()}</div>${ev.map(calendarEventMarkup).join('')}</div>`}const monthTitle=new Intl.DateTimeFormat('en-AU',{month:'long',year:'numeric'}).format(first);document.getElementById('app').innerHTML=`<div class="calendar-head"><div><div class="crumb">ATLAS / ${esc(activeProfile().name.toUpperCase())} / CALENDAR</div><h2>${esc(monthTitle)}</h2></div><div class="calendar-toolbar"><button class="btn small" data-cal-nav="prev">←</button><button class="btn small" data-cal-nav="today">Today</button><button class="btn small" data-cal-nav="next">→</button><button class="btn" data-cal-travel-add="${todayKey()}">+ Travel</button><button class="btn primary" data-cal-add="${todayKey()}">+ Event</button></div></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-weekday">${x}</div>`).join('')}${cells}</div>`}
let activeCalendarEventId='';
function populateCalendarArea(value=''){const sel=document.getElementById('calArea');sel.innerHTML=`<option value="">Unlinked</option>`+profileAreas().filter(a=>a.level>=2&&spaceAllows(a.space)).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<option value="${a.id}" ${a.id===value?'selected':''}>${esc(a.name)} · ${esc(a.code)}</option>`).join('')}
function openCalendarEvent(id='',date='',requestedType='event'){
  activeCalendarEventId=id;const e=id?state.calendar.find(x=>x.id===id):null;const profile=e?.profile||state.settings.activeProfile||'me';
  ensureCalendarEventExtras();
  document.getElementById('calendarEventHeading').textContent=e?'Edit event':requestedType==='travel'?'New travel':'New event';document.getElementById('calendarEventCode').textContent=`CALENDAR / ${profileById(profile).name.toUpperCase()}`;
  document.getElementById('calTitle').value=e?.title||'';document.getElementById('calDate').value=e?.date||date||todayKey();document.getElementById('calStart').value=e?.startTime||'';document.getElementById('calEnd').value=e?.endTime||'';
  const entryType=e?.entryType==='travel'?'travel':requestedType==='travel'?'travel':'event';document.getElementById('calEntryType').value=entryType;
  document.getElementById('calTraveler').value=e?.traveler||profileById(profile).name||'';document.getElementById('calOrigin').value=e?.origin||'';document.getElementById('calDestination').value=e?.destination||'';document.getElementById('calFlight').value=e?.flightNumber||'';
  const tz=e?validCalendarTimeZone(e.timeZone||''):calendarDeviceTimeZone();const tzSelect=document.getElementById('calTimeZone');tzSelect.innerHTML=calendarTimeZoneOptions(tz);tzSelect.value=tz;
  const arrivalTz=e?validCalendarTimeZone(e.arrivalTimeZone||''):'';const arrivalSelect=document.getElementById('calArrivalTimeZone');arrivalSelect.innerHTML=calendarTimeZoneOptions(arrivalTz);arrivalSelect.value=arrivalTz;
  if(entryType==='travel'){if(!e?.timeZone)updateTravelZonesFromPlaces('calOrigin');if(!e?.arrivalTimeZone)updateTravelZonesFromPlaces('calDestination')}
  setCalendarColour(e?.color||'');populateCalendarArea(e?.areaId||'');document.getElementById('calNotes').value=e?.notes||'';
  const own=profile!=='us';document.getElementById('entangleRow').style.display=own?'flex':'none';document.getElementById('calEntangle').checked=!!e?.entangledId;document.getElementById('deleteCalendarEvent').style.display=e?'inline-block':'none';
  document.getElementById('calendarProfileHint').textContent=e?.sourceEventId?'ENTANGLED FROM '+profileById(state.calendar.find(x=>x.id===e.sourceEventId)?.profile||'me').name.toUpperCase():`PROFILE / ${profileById(profile).name.toUpperCase()}`;
  updateCalendarTravelUI();refreshCalendarTimeZoneHint();openOverlay('calendarOverlay');setTimeout(()=>document.getElementById(entryType==='travel'?'calDestination':'calTitle').focus(),60)
}
function linkedUsEvent(source){return source.entangledId?state.calendar.find(e=>e.id===source.entangledId):state.calendar.find(e=>e.sourceEventId===source.id&&e.profile==='us')}
function syncEntangledEvent(source,enabled){let shared=linkedUsEvent(source);if(!enabled){if(shared)state.calendar=state.calendar.filter(e=>e.id!==shared.id);source.entangledId='';return}if(!shared){shared={id:uid('cal'),profile:'us',sourceEventId:source.id,createdAt:now()};state.calendar.push(shared);source.entangledId=shared.id}Object.assign(shared,{title:source.title,date:source.date,startTime:source.startTime,endTime:source.endTime,timeZone:source.timeZone||'',arrivalTimeZone:source.arrivalTimeZone||'',color:source.color||'',entryType:source.entryType||'event',traveler:source.traveler||'',origin:source.origin||'',destination:source.destination||'',flightNumber:source.flightNumber||'',areaId:'',sourceAreaLabel:areaById(source.areaId)?.name||'',notes:source.notes,updatedAt:now(),sourceEventId:source.id,profile:'us'})}
function saveCalendarEvent(){
  const entryType=document.getElementById('calEntryType')?.value==='travel'?'travel':'event';let title=document.getElementById('calTitle').value.trim();
  const traveler=document.getElementById('calTraveler')?.value.trim()||'',origin=document.getElementById('calOrigin')?.value.trim()||'',destination=document.getElementById('calDestination')?.value.trim()||'',flightNumber=document.getElementById('calFlight')?.value.trim().toUpperCase()||'';
  if(entryType==='event'&&!title)return toast('Add an event title');if(entryType==='travel'&&!destination)return toast('Add a travel destination');
  let e=activeCalendarEventId?state.calendar.find(x=>x.id===activeCalendarEventId):null;if(!e){e={id:uid('cal'),profile:state.settings.activeProfile||'me',createdAt:now()};state.calendar.push(e)}
  const travelDraft={traveler,origin,destination,flightNumber};if(entryType==='travel'&&!title)title=calendarTravelAutoTitle(travelDraft);
  Object.assign(e,{title,date:document.getElementById('calDate').value||todayKey(),startTime:document.getElementById('calStart').value,endTime:document.getElementById('calEnd').value,timeZone:validCalendarTimeZone(document.getElementById('calTimeZone')?.value||''),arrivalTimeZone:entryType==='travel'?validCalendarTimeZone(document.getElementById('calArrivalTimeZone')?.value||''):'',color:calendarColourValue(document.getElementById('calColor')?.value)?document.getElementById('calColor').value:'',entryType,traveler:entryType==='travel'?traveler:'',origin:entryType==='travel'?origin:'',destination:entryType==='travel'?destination:'',flightNumber:entryType==='travel'?flightNumber:'',areaId:document.getElementById('calArea').value,notes:document.getElementById('calNotes').value.trim(),updatedAt:now()});
  if(entryType==='travel'&&!e.timeZone)e.timeZone=calendarTravelTimeZone(origin);if(entryType==='travel'&&!e.arrivalTimeZone)e.arrivalTimeZone=calendarTravelTimeZone(destination);
  if(e.profile!=='us'&&!e.sourceEventId)syncEntangledEvent(e,document.getElementById('calEntangle').checked);log(`${entryType==='travel'?'Travel':'Calendar event'} saved: ${e.title}.`);save();closeOverlay('calendarOverlay');renderAll();toast(e.entangledId?'Event entangled with Us':entryType==='travel'?'Travel saved':'Calendar saved')
}
function deleteCalendarEvent(){const e=state.calendar.find(x=>x.id===activeCalendarEventId);if(!e)return;if(!confirm(`Delete ${e.title}?`))return;if(e.entangledId)state.calendar=state.calendar.filter(x=>x.id!==e.entangledId);if(e.sourceEventId){const src=state.calendar.find(x=>x.id===e.sourceEventId);if(src)src.entangledId=''}state.calendar=state.calendar.filter(x=>x.id!==e.id);save();closeOverlay('calendarOverlay');renderAll();toast('Event deleted')}
