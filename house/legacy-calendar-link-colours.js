(function(){
'use strict';

var SUPA='https://tqezgmpgjoibhckhnrfw.supabase.co';
var KEY='sb_publishable_B9miQZryNJq2nWspEvJAOg_ogAAdO7H';
var ENTITY_TYPE='entity_state_v2';
var SESSION_KEY='atlas_house_legacy_session_v1';
var PAD_SESSION_KEY='atlas_pad_session_v1';
var TARGET_KEY='atlas_house_legacy_target_v1';
var CACHE_KEY='atlas_house_legacy_snapshot_v1';
var COLOURS={slate:'#7f898d',blue:'#6689a5',teal:'#5f918b',green:'#76916b',amber:'#ae8954',red:'#a66767',purple:'#88749b',pink:'#a67689'};
var decorateTimer=null;

function byId(id){return document.getElementById(id)}
function safeJSON(raw){try{return JSON.parse(raw)}catch(error){return null}}
function readLocal(key){try{return localStorage.getItem(key)}catch(error){return null}}
function writeLocal(key,value){try{localStorage.setItem(key,value)}catch(error){}}
function trim(value){return String(value||'').replace(/^\s+|\s+$/g,'')}
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function keyFor(kind,id){return String(kind)+':'+encodeURIComponent(String(id))}
function colour(value){return COLOURS[String(value||'')]||'#70899a'}
function showMessage(message){var toast=byId('toast');if(!toast)return;toast.innerHTML=String(message||'');toast.className='toast show';setTimeout(function(){if(toast.className==='toast show')toast.className='toast'},2600)}
function snapshotCalendar(){var snapshot=safeJSON(readLocal(CACHE_KEY)||'null');return snapshot&&snapshot.calendar instanceof Array?snapshot.calendar:[]}
function eventById(id){var events=snapshotCalendar(),i;for(i=0;i<events.length;i++)if(events[i]&&events[i].id===id)return events[i];return null}

function decorateCalendarColours(){
  var calendar=byId('miniCalendar'),events=snapshotCalendar(),cells,i,j,key,event,colours,host,signature;
  if(calendar){
    cells=calendar.querySelectorAll('.mini-day');
    for(i=0;i<cells.length;i++){
      key=cells[i].getAttribute('data-house-date')||'';colours=[];
      if(key){for(j=0;j<events.length;j++){event=events[j];if(event&&event.date===key)colours.push(colour(event.color));if(colours.length===3)break}}
      signature=colours.join('|');host=cells[i].querySelector('.mini-event-dots');
      if(!colours.length){if(host)host.parentNode.removeChild(host);continue}
      if(host&&host.getAttribute('data-colours')===signature)continue;
      if(!host){host=document.createElement('span');host.className='mini-event-dots';cells[i].appendChild(host)}
      host.setAttribute('data-colours',signature);host.innerHTML='';
      for(j=0;j<colours.length;j++){var dot=document.createElement('i');dot.style.backgroundColor=colours[j];host.appendChild(dot)}
    }
  }
  var upcoming=byId('upcomingList'),rows,marker,id;
  if(upcoming){rows=upcoming.querySelectorAll('[data-house-calendar-id],.widget-row');for(i=0;i<rows.length;i++){id=rows[i].getAttribute('data-house-calendar-id');event=id?eventById(id):events[i];marker=rows[i].querySelector('i');if(marker&&event)marker.style.backgroundColor=colour(event.color)}}
}
function scheduleDecorate(){if(decorateTimer)clearTimeout(decorateTimer);decorateTimer=setTimeout(decorateCalendarColours,25)}

function authHeaders(token){var headers={'apikey':KEY,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;return headers}
function parseResponse(response){return response.text().then(function(text){var data=text?safeJSON(text):null;if(!response.ok){var message=data&&(data.error_description||data.msg||data.message||data.error)?(data.error_description||data.msg||data.message||data.error):text||('HTTP '+response.status);var error=new Error(message);error.status=response.status;throw error}return data})}
function request(path,session,method,body,prefer){var headers=authHeaders(session.access_token),options={method:method||'GET',headers:headers};if(prefer)headers.Prefer=prefer;if(body!=null)options.body=JSON.stringify(body);return fetch(SUPA+path,options).then(parseResponse)}
function normaliseSession(value){if(!value||!value.access_token||!value.refresh_token)return null;if(!value.expires_at&&value.expires_in)value.expires_at=Math.floor(Date.now()/1000)+Number(value.expires_in);return value}
function readSession(){return normaliseSession(safeJSON(readLocal(SESSION_KEY)||'null'))||normaliseSession(safeJSON(readLocal(PAD_SESSION_KEY)||'null'))}
function sessionFresh(value){if(!value||!value.access_token)return false;if(!value.expires_at)return true;return Number(value.expires_at)*1000-Date.now()>120000}
function refreshSession(value){return fetch(SUPA+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:value.refresh_token})}).then(parseResponse).then(function(next){next=normaliseSession(next);if(next)writeLocal(SESSION_KEY,JSON.stringify(next));return next})}
function ensureSession(){var value=readSession();if(!value)return Promise.reject(new Error('Atlas sign in required.'));return sessionFresh(value)?Promise.resolve(value):refreshSession(value)}
function ensureTarget(session){var target=safeJSON(readLocal(TARGET_KEY)||'null'),userId=session&&session.user&&session.user.id?session.user.id:'';if(target&&target.profileId&&target.userId&&(!userId||target.userId===userId))return Promise.resolve(target);if(!userId)return Promise.reject(new Error('Refresh Atlas House before linking an event.'));return request('/rest/v1/atlas_vaults?select=id&created_by=eq.'+encodeURIComponent(userId)+'&name=eq.Atlas&limit=1',session).then(function(vaults){if(!vaults||!vaults.length)throw new Error('Atlas cloud vault not found.');return request('/rest/v1/atlas_profiles?select=id&vault_id=eq.'+encodeURIComponent(vaults[0].id)+'&profile_key=eq.me&kind=eq.person&owner_user_id=eq.'+encodeURIComponent(userId)+'&limit=1',session)}).then(function(profiles){if(!profiles||!profiles.length)throw new Error('Atlas cloud profile not found.');target={userId:userId,profileId:profiles[0].id};writeLocal(TARGET_KEY,JSON.stringify(target));return target})}
function payloadFor(data){return{schema:'atlas_entity_record',version:2,kind:'calendar',id:data.id,deleted:false,data:data,deviceId:'house-ios12',clientMutationAt:Date.now()}}
function recordRow(target,data){return{profile_id:target.profileId,record_type:ENTITY_TYPE,record_id:keyFor('calendar',data.id),payload:payloadFor(data),client_updated_at:Date.now(),updated_by:target.userId}}

function travelZone(place){var key=trim(place).toUpperCase(),zones={MEL:'Australia/Melbourne',MELBOURNE:'Australia/Melbourne',TULLAMARINE:'Australia/Melbourne',SYD:'Australia/Sydney',SYDNEY:'Australia/Sydney',CBR:'Australia/Sydney',CANBERRA:'Australia/Sydney',HBA:'Australia/Hobart',HOBART:'Australia/Hobart',BNE:'Australia/Brisbane',BRISBANE:'Australia/Brisbane',OOL:'Australia/Brisbane','GOLD COAST':'Australia/Brisbane',CNS:'Australia/Brisbane',CAIRNS:'Australia/Brisbane',ADL:'Australia/Adelaide',ADELAIDE:'Australia/Adelaide',DRW:'Australia/Darwin',DARWIN:'Australia/Darwin',PER:'Australia/Perth',PERTH:'Australia/Perth',AKL:'Pacific/Auckland',AUCKLAND:'Pacific/Auckland'};return zones[key]||''}
function travelPlace(origin,destination){var dest=trim(destination),orig=trim(origin),upper=dest.toUpperCase();return upper==='MEL'||upper==='MELBOURNE'||upper==='TULLAMARINE'?orig:dest}
function autoTravelTitle(traveler,origin,destination,flight){var values=[trim(traveler),travelPlace(origin,destination),trim(flight).toUpperCase()],out=[],i;for(i=0;i<values.length;i++)if(values[i])out.push(values[i]);return out.length?out.join(' · '):'Travel'}
function formData(id,profile){var type=byId('houseCalendarType').value==='travel'?'travel':'event',title=trim(byId('houseCalendarTitle').value),traveler=trim(byId('houseCalendarTraveler').value),origin=trim(byId('houseCalendarOrigin').value),destination=trim(byId('houseCalendarDestination').value),flight=trim(byId('houseCalendarFlight').value).toUpperCase(),stamp=Date.now();if(type==='event'&&!title)throw new Error('Add an event title.');if(type==='travel'&&!destination)throw new Error('Add a travel destination.');if(type==='travel'&&!title)title=autoTravelTitle(traveler,origin,destination,flight);var data={id:id,profile:profile,title:title,date:byId('houseCalendarDate').value||'',startTime:byId('houseCalendarStart').value||'',endTime:byId('houseCalendarEnd').value||'',timeZone:byId('houseCalendarZone').value||'Australia/Melbourne',arrivalTimeZone:type==='travel'?(byId('houseCalendarArrivalZone').value||travelZone(destination)||''):'',color:byId('houseCalendarColor').value||'',entryType:type,traveler:type==='travel'?traveler:'',origin:type==='travel'?origin:'',destination:type==='travel'?destination:'',flightNumber:type==='travel'?flight:'',areaId:'',sourceAreaLabel:'',notes:trim(byId('houseCalendarNotes').value),createdAt:stamp,updatedAt:stamp};if(type==='travel'&&origin&&travelZone(origin))data.timeZone=travelZone(origin);return data}
function profileLabel(id){return id==='alyssa'?'Alyssa':'Fraser'}

function linkedCreate(baseSave,event){
  var select=byId('houseCalendarLinkProfile'),profile=select?select.value:'';
  if(!profile){baseSave.call(byId('houseCalendarSave'),event);return}
  var heading=String(byId('houseCalendarHeading')&&byId('houseCalendarHeading').innerHTML||'').toLowerCase();if(heading.indexOf('new ')!==0){baseSave.call(byId('houseCalendarSave'),event);return}
  if(event&&event.preventDefault)event.preventDefault();
  var sharedId=uid('cal'),sourceId=uid('cal'),source,shared;
  try{source=formData(sourceId,profile)}catch(error){showMessage(error.message);return}
  source.entangledId=sharedId;
  shared=JSON.parse(JSON.stringify(source));shared.id=sharedId;shared.profile='us';shared.sourceEventId=sourceId;delete shared.entangledId;
  var button=byId('houseCalendarSave');button.disabled=true;button.innerHTML='Saving…';
  ensureSession().then(function(session){return ensureTarget(session).then(function(target){return request('/rest/v1/atlas_records',session,'POST',[recordRow(target,source),recordRow(target,shared)],'return=minimal')})}).then(function(){byId('houseCalendarOverlay').className='calendar-overlay hidden';showMessage('Linked to '+profileLabel(profile)+' and Us');var refresh=byId('refreshHouse');if(refresh)refresh.click()}).catch(function(error){showMessage(error&&error.message?error.message:'Linked event was not saved.')}).then(function(){button.disabled=false;button.innerHTML=byId('houseCalendarType').value==='travel'?'Save Travel':'Save Event'})
}
function resetLink(){var select=byId('houseCalendarLinkProfile'),help=byId('houseCalendarLinkHelp');if(select){select.disabled=false;select.value=''}if(help)help.innerHTML='Optional · creates the personal event and its linked Us / House copy together.'}
function markEditLink(target){var row=target,upcoming=byId('upcomingList'),select=byId('houseCalendarLinkProfile'),help=byId('houseCalendarLinkHelp'),id,event;while(row&&row!==upcoming&&!row.getAttribute('data-house-calendar-id'))row=row.parentNode;if(!row||row===upcoming||!select)return;id=row.getAttribute('data-house-calendar-id');event=eventById(id);select.value='';select.disabled=true;if(help)help.innerHTML=event&&event.sourceEventId?'Already linked to a personal profile. Edit stays synchronised through the linked source.':'Existing Us-only event. Profile linking is available when creating a new House event.'}

function bind(){
  var save=byId('houseCalendarSave'),baseSave=save&&save.onclick,calendar=byId('miniCalendar'),upcoming=byId('upcomingList'),addEvent=byId('houseAddEvent'),addTravel=byId('houseAddTravel');
  if(save&&baseSave)save.onclick=function(event){linkedCreate(baseSave,event||window.event)};
  if(addEvent)addEvent.addEventListener('click',resetLink,true);if(addTravel)addTravel.addEventListener('click',resetLink,true);if(calendar)calendar.addEventListener('click',resetLink,true);if(upcoming)upcoming.addEventListener('click',function(event){markEditLink(event.target||event.srcElement)},true);
  if(window.MutationObserver){if(calendar)new MutationObserver(scheduleDecorate).observe(calendar,{childList:true,subtree:true,attributes:true,attributeFilter:['data-house-date']});if(upcoming)new MutationObserver(scheduleDecorate).observe(upcoming,{childList:true,subtree:true,attributes:true,attributeFilter:['data-house-calendar-id']})}
  scheduleDecorate();
}

bind();
}());
