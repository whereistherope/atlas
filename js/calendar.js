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
const CALENDAR_PEOPLE=Object.freeze({fraser:'Fraser',alyssa:'Alyssa',together:'Together'});
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
function calendarDateFromKey(value){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));return match?new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12):null}
function calendarShiftDate(value,days=1){const date=calendarDateFromKey(value);if(!date)return'';date.setDate(date.getDate()+days);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function calendarEventEndDate(event){const start=String(event?.date||''),end=String(event?.endDate||'');return start&&end>start?end:start}
function calendarEventSpansDates(event){return !!event?.date&&calendarEventEndDate(event)!==event.date}
function calendarEventIncludesDate(event,date){const start=String(event?.date||''),end=calendarEventEndDate(event);return !!start&&start<=date&&end>=date}
function calendarEventRangeOverlaps(event,start,end){const first=String(event?.date||''),last=calendarEventEndDate(event);return !!first&&first<=end&&last>=start}
function calendarEventDateRangeLabel(event){
  const start=calendarDateFromKey(event?.date),endKey=calendarEventEndDate(event),end=calendarDateFromKey(endKey);if(!start)return String(event?.date||'');if(!end||endKey===event?.date)return new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(start);
  const sameYear=start.getFullYear()===end.getFullYear(),sameMonth=sameYear&&start.getMonth()===end.getMonth(),month=d=>new Intl.DateTimeFormat('en-AU',{month:'short'}).format(d);
  if(sameMonth)return `${start.getDate()}–${end.getDate()} ${month(start)} ${start.getFullYear()}`;
  if(sameYear)return `${start.getDate()} ${month(start)}–${end.getDate()} ${month(end)} ${start.getFullYear()}`;
  return `${start.getDate()} ${month(start)} ${start.getFullYear()}–${end.getDate()} ${month(end)} ${end.getFullYear()}`;
}
function calendarEventSpanMarker(event,date){
  if(!calendarEventSpansDates(event)||!calendarEventIncludesDate(event,date))return'';
  if(date===calendarEventEndDate(event))return '<span class="cal-span-marker cal-span-end-dot" aria-hidden="true"></span>';
  return '<span class="cal-span-marker cal-span-next" aria-hidden="true"><svg class="atlas-span-arrow" viewBox="0 0 12 12"><path d="M2 6h7M6.5 2.5 10 6 6.5 9.5"/></svg></span>';
}
function calendarPersonForProfile(profile){return profile==='alyssa'?'alyssa':profile==='us'?'together':'fraser'}
function calendarEventPersonValue(e){if(e?.person&&CALENDAR_PEOPLE[e.person])return e.person;if(e?.sourceEventId){const source=state?.calendar?.find?.(item=>item.id===e.sourceEventId);if(source?.person&&CALENDAR_PEOPLE[source.person])return source.person;if(source?.profile)return calendarPersonForProfile(source.profile)}return calendarPersonForProfile(e?.profile||state?.settings?.activeProfile||'me')}
function calendarEventPersonLabel(e){return CALENDAR_PEOPLE[calendarEventPersonValue(e)]||'Together'}
function normaliseTravelPlace(value){return String(value||'').trim().toUpperCase().replace(/\s+/g,' ')}
function calendarTravelPlaceInfo(value){const key=normaliseTravelPlace(value);return Object.entries(CALENDAR_TRAVEL_PLACES).map(([code,info])=>({code,...info})).find(info=>info.aliases.includes(key))||null}
function calendarTravelDisplay(value){const info=calendarTravelPlaceInfo(value);return info?.name||String(value||'').trim()}
function calendarTravelTimeZone(value){return calendarTravelPlaceInfo(value)?.timeZone||''}
function calendarTravelIsMelbourne(value){return calendarTravelPlaceInfo(value)?.code==='MEL'||['MEL','MELBOURNE','TULLAMARINE'].includes(normaliseTravelPlace(value))}
function calendarTravelIcon(e){if(calendarTravelIsMelbourne(e?.origin))return'🛫';if(calendarTravelIsMelbourne(e?.destination))return'🛬';return'✈'}
function calendarTravelPlace(e){return calendarTravelIsMelbourne(e?.destination)?calendarTravelDisplay(e?.origin):calendarTravelDisplay(e?.destination)}
function calendarTravelAutoTitle(e){return [e?.traveler||'',calendarTravelPlace(e),String(e?.flightNumber||'').toUpperCase()].filter(Boolean).join(' · ')||'Travel'}
function calendarTravelReturnDate(e){return e?.returnTrip?(String(e.returnDate||'')||calendarEventEndDate(e)):''}
function calendarTravelLegForDate(e,date=e?.date){
  if(!e)return{};
  const returnDate=calendarTravelReturnDate(e);
  if(e.returnTrip&&returnDate&&date>=returnDate)return {...e,origin:e.destination||'',destination:e.origin||'',flightNumber:e.returnFlightNumber||'',startTime:e.returnStartTime||'',endTime:e.returnEndTime||'',timeZone:e.returnTimeZone||calendarTravelTimeZone(e.destination),arrivalTimeZone:e.returnArrivalTimeZone||calendarTravelTimeZone(e.origin)};
  if(e.returnTrip&&date&&date!==e.date)return {...e,origin:'',destination:'',flightNumber:'',startTime:'',endTime:''};
  return e;
}
function calendarTravelTimeLine(e,date=e?.date){const leg=calendarTravelLegForDate(e,date),flight=String(leg?.flightNumber||'').trim().toUpperCase(),times=[leg?.startTime||'',leg?.endTime||''].filter(Boolean).join('–');return [flight,times].filter(Boolean).join(' · ')}
function calendarTravelShowsLegIcon(e,date=e?.date){const returnDate=calendarTravelReturnDate(e);return !calendarEventSpansDates(e)||date===e?.date||!!(e?.returnTrip&&returnDate&&date>=returnDate)}

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
    const end=document.getElementById('calEnd')?.value||'',arrivalZone=document.getElementById('calArrivalTimeZone')?.value||'',arrivalDate=document.getElementById('calArrivalDate')?.value||date;
    const depInstant=calendarZoneParts(date,time,zone),arrInstant=calendarZoneParts(arrivalDate,end,arrivalZone);
    const dep=time?`${time}${zone?` ${calendarZoneShort(zone,depInstant)}`:''}`:'departure time not set';
    const arr=end?`${end}${arrivalZone?` ${calendarZoneShort(arrivalZone,arrInstant)}`:''}`:'arrival time not set';
    hint.textContent=`Outbound ${dep} · ${arr}`;return;
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
function refreshCalendarReturnHint(){
  const hint=document.getElementById('calReturnTimeZoneHint'),enabled=document.getElementById('calEntryType')?.value==='travel'&&document.getElementById('calSpansDates')?.checked;
  if(!hint)return;if(!enabled){hint.textContent='';return}
  const date=document.getElementById('calEndDate')?.value||'',arrivalDate=document.getElementById('calReturnArrivalDate')?.value||date,start=document.getElementById('calReturnStart')?.value||'',end=document.getElementById('calReturnEnd')?.value||'',zone=document.getElementById('calReturnTimeZone')?.value||'',arrivalZone=document.getElementById('calReturnArrivalTimeZone')?.value||'';
  const depInstant=calendarZoneParts(date,start,zone),arrInstant=calendarZoneParts(arrivalDate,end,arrivalZone);
  const dep=start?`${start}${zone?` ${calendarZoneShort(zone,depInstant)}`:''}`:'departure time not set';
  const arr=end?`${end}${arrivalZone?` ${calendarZoneShort(arrivalZone,arrInstant)}`:''}`:'arrival time not set';
  hint.textContent=`Return ${dep} · ${arr}`;
}

function ensureCalendarEventExtras(){
  if(document.getElementById('calTimeZone'))return;
  const timeRow=document.getElementById('calEnd')?.closest('.row3');if(!timeRow)return;
  const extra=document.createElement('div');extra.className='calendar-event-additions';extra.innerHTML=`<div class="field calendar-entry-type"><label>Entry type</label><select id="calEntryType"><option value="event">Event</option><option value="travel">Travel</option></select></div><div class="field calendar-person-field" id="calPersonField"><label>Who</label><select id="calPerson"><option value="fraser">Fraser</option><option value="alyssa">Alyssa</option><option value="together">Together</option></select></div><div class="calendar-travel-fields" id="calTravelFields" hidden><div class="calendar-travel-leg-title calendar-travel-wide">Outbound flight</div><div class="field"><label>Traveller</label><input id="calTraveler" type="text" placeholder="Fraser"></div><div class="field"><label>Origin</label><input id="calOrigin" type="text" placeholder="MEL or Melbourne"></div><div class="field"><label>Destination</label><input id="calDestination" type="text" placeholder="PER or Perth"></div><div class="field"><label>Flight</label><input id="calFlight" type="text" placeholder="VA679" autocapitalize="characters"></div><div class="field"><label>Outbound arrival date</label><input id="calArrivalDate" type="date"><small class="calendar-zone-hint">Leave blank if the outbound flight arrives the same day.</small></div><div class="field"><label>Arrival time zone</label><select id="calArrivalTimeZone"></select></div><div class="calendar-return-fields calendar-travel-wide" id="calReturnTravelFields" hidden><div class="calendar-return-heading calendar-travel-wide"><strong>Return flight</strong><small id="calReturnRoute">Destination → Origin</small></div><div class="field"><label>Flight</label><input id="calReturnFlight" type="text" placeholder="VA680" autocapitalize="characters"></div><div class="field"><label>Departure</label><input id="calReturnStart" type="time"></div><div class="field"><label>Arrival</label><input id="calReturnEnd" type="time"></div><div class="field"><label>Departure time zone</label><select id="calReturnTimeZone"></select></div><div class="field"><label>Arrival time zone</label><select id="calReturnArrivalTimeZone"></select></div><div class="field"><label>Arrival date</label><input id="calReturnArrivalDate" type="date"><small class="calendar-zone-hint">Leave blank if the return flight arrives on the return date.</small></div><small class="calendar-zone-hint calendar-travel-wide" id="calReturnTimeZoneHint"></small></div></div><div class="calendar-event-extras"><div class="field"><label id="calTimeZoneLabel">Time zone</label><select id="calTimeZone"></select><small class="calendar-zone-hint" id="calTimeZoneHint"></small></div><div class="field"><label>Colour</label><input id="calColor" type="hidden" value=""><div class="calendar-colour-palette" role="group" aria-label="Calendar event colour"><button type="button" class="calendar-colour-clear" data-cal-colour="" aria-label="Automatic colour">Auto</button>${Object.entries(CALENDAR_COLOURS).map(([id,value])=>`<button type="button" class="calendar-colour-swatch" data-cal-colour="${id}" aria-label="${id}" title="${id}" style="--swatch:${value}"></button>`).join('')}</div></div></div>`;
  timeRow.insertAdjacentElement('afterend',extra);
}

function setCalendarColour(value=''){
  const valid=calendarColourValue(value)?value:'',input=document.getElementById('calColor');if(input)input.value=valid;
  document.querySelectorAll('[data-cal-colour]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.calColour===valid?'true':'false'));
}
function updateCalendarSpanUI(seedEnd=false){
  const toggle=document.getElementById('calSpansDates'),field=document.getElementById('calEndDateField'),input=document.getElementById('calEndDate'),start=document.getElementById('calDate')?.value||todayKey(),travel=document.getElementById('calEntryType')?.value==='travel';
  if(!toggle||!field||!input)return;
  const label=document.getElementById('calSpanLabel'),hint=document.getElementById('calSpanHint'),endLabel=document.getElementById('calEndDateLabel'),minimum=calendarShiftDate(start,1)||start,returnPanel=document.getElementById('calReturnTravelFields'),arrival=document.getElementById('calArrivalDate'),returnArrival=document.getElementById('calReturnArrivalDate');
  if(label)label.textContent=travel?'Return trip':'Spans multiple days';if(hint)hint.textContent=travel?'Keep this travel entry on the calendar through the return date and add the return flight.':'Show one event across a date range.';if(endLabel)endLabel.textContent=travel?'Return date':'End date';
  field.hidden=!toggle.checked;input.min=minimum;if(returnPanel)returnPanel.hidden=!(travel&&toggle.checked);
  if(toggle.checked&&(seedEnd||!input.value||input.value<=start))input.value=minimum;
  if(arrival){arrival.min=start;if(travel&&toggle.checked&&input.value)arrival.max=input.value;else arrival.removeAttribute('max')}
  if(returnArrival){returnArrival.min=input.value||minimum}
  refreshCalendarReturnHint();
}

function updateCalendarTravelUI(){
  const travel=document.getElementById('calEntryType')?.value==='travel',panel=document.getElementById('calTravelFields'),personField=document.getElementById('calPersonField');if(panel)panel.hidden=!travel;if(personField)personField.hidden=travel;
  const form=document.getElementById('calTitle')?.closest('.field'),titleLabel=form?.querySelector('label'),dateLabel=document.getElementById('calDate')?.closest('.field')?.querySelector('label');if(titleLabel)titleLabel.textContent=travel?'Label (optional)':'Event / appointment';if(dateLabel)dateLabel.textContent=travel?'Depart date':'Date';
  const startLabel=document.getElementById('calStart')?.closest('.field')?.querySelector('label'),endLabel=document.getElementById('calEnd')?.closest('.field')?.querySelector('label'),zoneLabel=document.getElementById('calTimeZoneLabel');
  if(startLabel)startLabel.textContent=travel?'Departure':'Start';if(endLabel)endLabel.textContent=travel?'Arrival':'End';if(zoneLabel)zoneLabel.textContent=travel?'Departure time zone':'Time zone';
  if(travel&&!document.getElementById('calTraveler')?.value)document.getElementById('calTraveler').value=activeProfile().name||'';
  updateCalendarSpanUI(false);updateTravelZonesFromPlaces();refreshCalendarTimeZoneHint();refreshCalendarReturnHint();
}

function updateTravelZonesFromPlaces(targetId=''){
  if(document.getElementById('calEntryType')?.value!=='travel')return;
  const origin=document.getElementById('calOrigin')?.value||'',destination=document.getElementById('calDestination')?.value||'',originZone=calendarTravelTimeZone(origin),destinationZone=calendarTravelTimeZone(destination);
  if((!targetId||targetId==='calOrigin')&&originZone){document.getElementById('calTimeZone').value=originZone;const returnArrival=document.getElementById('calReturnArrivalTimeZone');if(returnArrival)returnArrival.value=originZone}
  if((!targetId||targetId==='calDestination')&&destinationZone){document.getElementById('calArrivalTimeZone').value=destinationZone;const returnZone=document.getElementById('calReturnTimeZone');if(returnZone)returnZone.value=destinationZone}
  const route=document.getElementById('calReturnRoute');if(route)route.textContent=`${calendarTravelDisplay(destination)||'Destination'} → ${calendarTravelDisplay(origin)||'Origin'}`;
  refreshCalendarTimeZoneHint();refreshCalendarReturnHint();
}

document.addEventListener('click',event=>{const button=event.target.closest?.('[data-cal-colour]');if(button){setCalendarColour(button.dataset.calColour||'');return}const travel=event.target.closest?.('[data-cal-travel-add]');if(travel)openCalendarEvent('',travel.dataset.calTravelAdd||todayKey(),'travel')});
document.addEventListener('change',event=>{if(event.target?.id==='calEntryType')updateCalendarTravelUI();if(event.target?.id==='calSpansDates')updateCalendarSpanUI(true);if(['calDate','calEndDate'].includes(event.target?.id))updateCalendarSpanUI(false);if(['calOrigin','calDestination'].includes(event.target?.id))updateTravelZonesFromPlaces(event.target.id);if(['calDate','calArrivalDate','calStart','calEnd','calTimeZone','calArrivalTimeZone'].includes(event.target?.id))refreshCalendarTimeZoneHint();if(['calEndDate','calReturnArrivalDate','calReturnStart','calReturnEnd','calReturnTimeZone','calReturnArrivalTimeZone'].includes(event.target?.id))refreshCalendarReturnHint()});
document.addEventListener('input',event=>{if(['calOrigin','calDestination'].includes(event.target?.id))updateTravelZonesFromPlaces(event.target.id);if(['calDate','calEndDate'].includes(event.target?.id))updateCalendarSpanUI(false);if(['calDate','calArrivalDate','calStart','calEnd'].includes(event.target?.id))refreshCalendarTimeZoneHint();if(['calEndDate','calReturnArrivalDate','calReturnStart','calReturnEnd'].includes(event.target?.id))refreshCalendarReturnHint()});

function monthCursorDate(){const raw=state.settings.calendarCursor;if(raw&&/^\d{4}-\d{2}$/.test(raw)){const[y,m]=raw.split('-').map(Number);return new Date(y,m-1,1)}const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)}
function setCalendarCursor(d){state.settings.calendarCursor=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function calendarEvents(profile=state.settings.activeProfile){return state.calendar.filter(e=>(e.profile||'me')===profile).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime))}
function eventHue(e){const chosen=calendarColourValue(e?.color);if(chosen)return chosen;const a=areaById(e.areaId);return a?domainHueFor({id:a.id}):(e.profile==='us'?'#8e887e':'#7f898d')}
function calendarEventMarkup(e,displayDate=e.date){
  const shared=e.entangledId||e.sourceEventId?'cal-entangled':'',marker=calendarEventSpanMarker(e,displayDate);
  if(e.entryType==='travel'){
    const line=calendarTravelTimeLine(e,displayDate),leg=calendarTravelLegForDate(e,displayDate),icon=calendarTravelShowsLegIcon(e,displayDate)?calendarTravelIcon(leg):'';
    return `<button class="cal-event cal-travel-event ${shared}" style="--event-hue:${eventHue(e)}" data-calendar-event="${e.id}"><span class="cal-travel-copy"><strong>${esc(e.traveler||profileById(e.profile||'me').name||'Traveller')}</strong><span>${esc(calendarTravelPlace(e)||'Travel')}</span>${line?`<small>${esc(line)}</small>`:''}</span><span class="cal-travel-icon" aria-hidden="true">${icon}</span>${marker}</button>`;
  }
  return `<button class="cal-event cal-person-event ${shared}" style="--event-hue:${eventHue(e)}" data-calendar-event="${e.id}"><span class="cal-person-copy"><strong>${esc(calendarEventPersonLabel(e))}</strong><span>${esc(e.title)}</span><small>${esc(calendarEventTimeMeta(e))}${e.areaId?` · ${esc(areaById(e.areaId)?.code||'')}`:e.sourceAreaLabel?` · ${esc(makeNodeCode(e.sourceAreaLabel))}`:''}</small></span>${marker}</button>`;
}

function renderCalendar(){const d=monthCursorDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());const events=calendarEvents();let cells='';for(let i=0;i<42;i++){const day=new Date(start);day.setDate(start.getDate()+i);const key=day.toLocaleDateString('en-CA'),out=day.getMonth()!==month,today=key===todayKey();const ev=events.filter(e=>calendarEventIncludesDate(e,key));cells+=`<div class="cal-cell ${out?'out':''} ${today?'today':''}" data-calendar-date="${key}"><div class="cal-day">${day.getDate()}</div>${ev.map(e=>calendarEventMarkup(e,key)).join('')}</div>`}const monthTitle=new Intl.DateTimeFormat('en-AU',{month:'long',year:'numeric'}).format(first);document.getElementById('app').innerHTML=`<div class="calendar-head"><div><div class="crumb">ATLAS / ${esc(activeProfile().name.toUpperCase())} / CALENDAR</div><h2>${esc(monthTitle)}</h2></div><div class="calendar-toolbar"><button class="btn small" data-cal-nav="prev">←</button><button class="btn small" data-cal-nav="today">Today</button><button class="btn small" data-cal-nav="next">→</button><button class="btn" data-cal-travel-add="${todayKey()}">+ Travel</button><button class="btn primary" data-cal-add="${todayKey()}">+ Event</button></div></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-weekday">${x}</div>`).join('')}${cells}</div>`}
let activeCalendarEventId='';
function populateCalendarArea(value=''){const sel=document.getElementById('calArea');sel.innerHTML=`<option value="">Unlinked</option>`+profileAreas().filter(a=>a.level>=2&&spaceAllows(a.space)).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<option value="${a.id}" ${a.id===value?'selected':''}>${esc(a.name)} · ${esc(a.code)}</option>`).join('')}
function openCalendarEvent(id='',date='',requestedType='event'){
  activeCalendarEventId=id;const e=id?state.calendar.find(x=>x.id===id):null;const profile=e?.profile||state.settings.activeProfile||'me';
  ensureCalendarEventExtras();
  const entryType=e?.entryType==='travel'?'travel':requestedType==='travel'?'travel':'event';document.getElementById('calEntryType').value=entryType;
  document.getElementById('calendarEventHeading').textContent=e?'Edit event':requestedType==='travel'?'New travel':'New event';document.getElementById('calendarEventCode').textContent=`CALENDAR / ${profileById(profile).name.toUpperCase()}`;
  document.getElementById('calTitle').value=e?.title||'';document.getElementById('calDate').value=e?.date||date||todayKey();document.getElementById('calStart').value=e?.startTime||'';document.getElementById('calEnd').value=e?.endTime||'';
  const span=!!e&&calendarEventSpansDates(e),returnTrip=entryType==='travel'&&!!e?.returnTrip,spanToggle=document.getElementById('calSpansDates'),endDateInput=document.getElementById('calEndDate');if(spanToggle)spanToggle.checked=entryType==='travel'?returnTrip:span;if(endDateInput)endDateInput.value=entryType==='travel'?(returnTrip?(e?.returnDate||calendarEventEndDate(e)):''):(span?calendarEventEndDate(e):'');
  const personSelect=document.getElementById('calPerson');if(personSelect)personSelect.value=e?.person&&CALENDAR_PEOPLE[e.person]?e.person:calendarEventPersonValue(e||{profile});
  document.getElementById('calTraveler').value=e?.traveler||profileById(profile).name||'';document.getElementById('calOrigin').value=e?.origin||'';document.getElementById('calDestination').value=e?.destination||'';document.getElementById('calFlight').value=e?.flightNumber||'';
  const legacyArrival=entryType==='travel'&&e&&!e.returnTrip&&span?calendarEventEndDate(e):'';document.getElementById('calArrivalDate').value=e?.arrivalDate||legacyArrival;
  document.getElementById('calReturnFlight').value=e?.returnFlightNumber||'';document.getElementById('calReturnStart').value=e?.returnStartTime||'';document.getElementById('calReturnEnd').value=e?.returnEndTime||'';document.getElementById('calReturnArrivalDate').value=e?.returnArrivalDate||'';
  const tz=e?validCalendarTimeZone(e.timeZone||''):calendarDeviceTimeZone();const tzSelect=document.getElementById('calTimeZone');tzSelect.innerHTML=calendarTimeZoneOptions(tz);tzSelect.value=tz;
  const arrivalTz=e?validCalendarTimeZone(e.arrivalTimeZone||''):'';const arrivalSelect=document.getElementById('calArrivalTimeZone');arrivalSelect.innerHTML=calendarTimeZoneOptions(arrivalTz);arrivalSelect.value=arrivalTz;
  const returnTz=e?validCalendarTimeZone(e.returnTimeZone||''):'';const returnTzSelect=document.getElementById('calReturnTimeZone');returnTzSelect.innerHTML=calendarTimeZoneOptions(returnTz);returnTzSelect.value=returnTz;
  const returnArrivalTz=e?validCalendarTimeZone(e.returnArrivalTimeZone||''):'';const returnArrivalSelect=document.getElementById('calReturnArrivalTimeZone');returnArrivalSelect.innerHTML=calendarTimeZoneOptions(returnArrivalTz);returnArrivalSelect.value=returnArrivalTz;
  if(entryType==='travel'){if(!e?.timeZone||!e?.arrivalTimeZone||!e?.returnTimeZone||!e?.returnArrivalTimeZone)updateTravelZonesFromPlaces()}
  setCalendarColour(e?.color||'');populateCalendarArea(e?.areaId||'');document.getElementById('calNotes').value=e?.notes||'';
  const own=profile!=='us';document.getElementById('entangleRow').style.display=own?'flex':'none';document.getElementById('calEntangle').checked=!!e?.entangledId;document.getElementById('deleteCalendarEvent').style.display=e?'inline-block':'none';
  document.getElementById('calendarProfileHint').textContent=e?.sourceEventId?'ENTANGLED FROM '+profileById(state.calendar.find(x=>x.id===e.sourceEventId)?.profile||'me').name.toUpperCase():`PROFILE / ${profileById(profile).name.toUpperCase()}`;
  updateCalendarTravelUI();refreshCalendarTimeZoneHint();refreshCalendarReturnHint();openOverlay('calendarOverlay');setTimeout(()=>document.getElementById(entryType==='travel'?'calDestination':'calTitle').focus(),60)
}

function linkedUsEvent(source){return source.entangledId?state.calendar.find(e=>e.id===source.entangledId):state.calendar.find(e=>e.sourceEventId===source.id&&e.profile==='us')}
function syncEntangledEvent(source,enabled){let shared=linkedUsEvent(source);if(!enabled){if(shared)state.calendar=state.calendar.filter(e=>e.id!==shared.id);source.entangledId='';return}if(!shared){shared={id:uid('cal'),profile:'us',sourceEventId:source.id,createdAt:now()};state.calendar.push(shared);source.entangledId=shared.id}Object.assign(shared,{title:source.title,person:source.entryType==='travel'?'':source.person||calendarPersonForProfile(source.profile),date:source.date,endDate:source.endDate||'',startTime:source.startTime,endTime:source.endTime,timeZone:source.timeZone||'',arrivalTimeZone:source.arrivalTimeZone||'',arrivalDate:source.arrivalDate||'',returnTrip:!!source.returnTrip,returnDate:source.returnDate||'',returnFlightNumber:source.returnFlightNumber||'',returnStartTime:source.returnStartTime||'',returnEndTime:source.returnEndTime||'',returnTimeZone:source.returnTimeZone||'',returnArrivalTimeZone:source.returnArrivalTimeZone||'',returnArrivalDate:source.returnArrivalDate||'',color:source.color||'',entryType:source.entryType||'event',traveler:source.traveler||'',origin:source.origin||'',destination:source.destination||'',flightNumber:source.flightNumber||'',areaId:'',sourceAreaLabel:areaById(source.areaId)?.name||'',notes:source.notes,updatedAt:now(),sourceEventId:source.id,profile:'us'})}

function saveCalendarEvent(){
  const entryType=document.getElementById('calEntryType')?.value==='travel'?'travel':'event';let title=document.getElementById('calTitle').value.trim();
  const traveler=document.getElementById('calTraveler')?.value.trim()||'',origin=document.getElementById('calOrigin')?.value.trim()||'',destination=document.getElementById('calDestination')?.value.trim()||'',flightNumber=document.getElementById('calFlight')?.value.trim().toUpperCase()||'',person=document.getElementById('calPerson')?.value||'';
  if(entryType==='event'&&!title)return toast('Add an event title');if(entryType==='travel'&&!destination)return toast('Add a travel destination');
  const date=document.getElementById('calDate').value||todayKey(),spansDates=!!document.getElementById('calSpansDates')?.checked;let endDate='',arrivalDate='',returnTrip=false,returnDate='',returnArrivalDate='';
  if(entryType==='event'){
    endDate=spansDates?(document.getElementById('calEndDate')?.value||''):'';
    if(spansDates&&!endDate)return toast('Add an end date');if(endDate&&endDate<=date)return toast('End date must be after start date');
  }else{
    arrivalDate=document.getElementById('calArrivalDate')?.value||'';if(arrivalDate&&arrivalDate<date)return toast('Outbound arrival date cannot be before departure');if(arrivalDate===date)arrivalDate='';
    returnTrip=spansDates;returnDate=returnTrip?(document.getElementById('calEndDate')?.value||''):'';
    if(returnTrip&&!returnDate)return toast('Add a return date');if(returnDate&&returnDate<=date)return toast('Return date must be after departure');if(arrivalDate&&returnDate&&arrivalDate>returnDate)return toast('Outbound arrival cannot be after the return date');
    returnArrivalDate=returnTrip?(document.getElementById('calReturnArrivalDate')?.value||''):'';if(returnArrivalDate&&returnArrivalDate<returnDate)return toast('Return arrival date cannot be before the return date');if(returnArrivalDate===returnDate)returnArrivalDate='';
    endDate=returnTrip?(returnArrivalDate||returnDate):(arrivalDate||'');
  }
  let e=activeCalendarEventId?state.calendar.find(x=>x.id===activeCalendarEventId):null;if(!e){e={id:uid('cal'),profile:state.settings.activeProfile||'me',createdAt:now()};state.calendar.push(e)}
  const travelDraft={traveler,origin,destination,flightNumber};if(entryType==='travel'&&!title)title=calendarTravelAutoTitle(travelDraft);
  const returnFlightNumber=returnTrip?(document.getElementById('calReturnFlight')?.value.trim().toUpperCase()||''):'',returnStartTime=returnTrip?(document.getElementById('calReturnStart')?.value||''):'',returnEndTime=returnTrip?(document.getElementById('calReturnEnd')?.value||''):'',returnTimeZone=returnTrip?validCalendarTimeZone(document.getElementById('calReturnTimeZone')?.value||''):'',returnArrivalTimeZone=returnTrip?validCalendarTimeZone(document.getElementById('calReturnArrivalTimeZone')?.value||''):'';
  Object.assign(e,{title,person:entryType==='travel'?'':CALENDAR_PEOPLE[person]?person:calendarPersonForProfile(e.profile),date,endDate,startTime:document.getElementById('calStart').value,endTime:document.getElementById('calEnd').value,timeZone:validCalendarTimeZone(document.getElementById('calTimeZone')?.value||''),arrivalTimeZone:entryType==='travel'?validCalendarTimeZone(document.getElementById('calArrivalTimeZone')?.value||''):'',arrivalDate:entryType==='travel'?arrivalDate:'',returnTrip:entryType==='travel'?returnTrip:false,returnDate:entryType==='travel'?returnDate:'',returnFlightNumber,returnStartTime,returnEndTime,returnTimeZone,returnArrivalTimeZone,returnArrivalDate:entryType==='travel'?returnArrivalDate:'',color:calendarColourValue(document.getElementById('calColor')?.value)?document.getElementById('calColor').value:'',entryType,traveler:entryType==='travel'?traveler:'',origin:entryType==='travel'?origin:'',destination:entryType==='travel'?destination:'',flightNumber:entryType==='travel'?flightNumber:'',areaId:document.getElementById('calArea').value,notes:document.getElementById('calNotes').value.trim(),updatedAt:now()});
  if(entryType==='travel'&&!e.timeZone)e.timeZone=calendarTravelTimeZone(origin);if(entryType==='travel'&&!e.arrivalTimeZone)e.arrivalTimeZone=calendarTravelTimeZone(destination);if(returnTrip&&!e.returnTimeZone)e.returnTimeZone=calendarTravelTimeZone(destination);if(returnTrip&&!e.returnArrivalTimeZone)e.returnArrivalTimeZone=calendarTravelTimeZone(origin);
  if(e.profile!=='us'&&!e.sourceEventId)syncEntangledEvent(e,document.getElementById('calEntangle').checked);log(`${entryType==='travel'?'Travel':'Calendar event'} saved: ${e.title}.`);save();closeOverlay('calendarOverlay');renderAll();toast(e.entangledId?'Event entangled with Us':entryType==='travel'?'Travel saved':'Calendar saved')
}

function deleteCalendarEvent(){const e=state.calendar.find(x=>x.id===activeCalendarEventId);if(!e)return;if(!confirm(`Delete ${e.title}?`))return;if(e.entangledId)state.calendar=state.calendar.filter(x=>x.id!==e.entangledId);if(e.sourceEventId){const src=state.calendar.find(x=>x.id===e.sourceEventId);if(src)src.entangledId=''}state.calendar=state.calendar.filter(x=>x.id!==e.id);save();closeOverlay('calendarOverlay');renderAll();toast('Event deleted')}
