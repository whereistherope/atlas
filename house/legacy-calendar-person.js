(function(){
'use strict';

var SUPA='https://tqezgmpgjoibhckhnrfw.supabase.co';
var KEY='sb_publishable_B9miQZryNJq2nWspEvJAOg_ogAAdO7H';
var ENTITY_TYPE='entity_state_v2';
var SESSION_KEY='atlas_house_legacy_session_v1';
var PAD_SESSION_KEY='atlas_pad_session_v1';
var TARGET_KEY='atlas_house_legacy_target_v1';
var CACHE_KEY='atlas_house_legacy_snapshot_v1';
var currentHouseId='';
var LABELS={fraser:'Fraser',alyssa:'Alyssa',together:'Together'};

function byId(id){return document.getElementById(id)}
function safeJSON(raw){try{return JSON.parse(raw)}catch(error){return null}}
function readLocal(key){try{return localStorage.getItem(key)}catch(error){return null}}
function writeLocal(key,value){try{localStorage.setItem(key,value)}catch(error){}}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
function trim(value){return String(value||'').replace(/^\s+|\s+$/g,'')}
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function keyFor(kind,id){return String(kind)+':'+encodeURIComponent(String(id))}
function showMessage(message){var toast=byId('toast');if(!toast)return;toast.textContent=String(message||'');toast.className='toast show';setTimeout(function(){if(toast.className==='toast show')toast.className='toast'},2600)}
function cachedCalendar(){var snapshot=safeJSON(readLocal(CACHE_KEY)||'null');return snapshot&&snapshot.calendar instanceof Array?snapshot.calendar:[]}
function cachedEvent(id){var events=cachedCalendar(),i;for(i=0;i<events.length;i++)if(events[i]&&events[i].id===id)return clone(events[i]);return null}
function personForProfile(profile){return profile==='alyssa'?'alyssa':profile==='us'?'together':'fraser'}
function personValue(event){if(event&&event.person&&LABELS[event.person])return event.person;return personForProfile(event&&event.profile||'us')}
function personLabel(event){return LABELS[personValue(event)]||'Together'}

function ensureEntryTypeField(){
  if(byId('houseCalendarTypeSelect'))return;
  var hidden=byId('houseCalendarType'),title=byId('houseCalendarTitle');if(!hidden||!title||!title.parentNode)return;
  var field=document.createElement('label');field.className='calendar-field house-calendar-entry-type';field.innerHTML='<span>Entry type</span><select id="houseCalendarTypeSelect"><option value="event">Event</option><option value="travel">Travel</option></select>';
  title.parentNode.parentNode.insertBefore(field,title.parentNode);
}
function ensureWhoField(){
  if(byId('houseCalendarPerson'))return;
  var title=byId('houseCalendarTitle');if(!title||!title.parentNode)return;
  var field=document.createElement('label');field.className='calendar-field house-calendar-person';field.innerHTML='<span>Who</span><select id="houseCalendarPerson"><option value="fraser">Fraser</option><option value="alyssa">Alyssa</option><option value="together">Together</option></select>';
  title.parentNode.parentNode.insertBefore(field,title.parentNode);
}
function applyType(type){
  var travel=type==='travel',hidden=byId('houseCalendarType'),heading=byId('houseCalendarHeading'),titleLabel=byId('houseCalendarTitleLabel'),startLabel=byId('houseCalendarStartLabel'),endLabel=byId('houseCalendarEndLabel'),zoneLabel=byId('houseCalendarZoneLabel'),travelFields=byId('houseTravelFields'),arrival=byId('houseCalendarArrivalZone'),save=byId('houseCalendarSave'),text=heading?String(heading.textContent||'').toLowerCase():'';
  if(hidden)hidden.value=travel?'travel':'event';
  if(heading)heading.textContent=(text.indexOf('edit')===0?'Edit ':'New ')+(travel?'travel':'event');
  if(titleLabel)titleLabel.textContent=travel?'Label (optional)':'Event / appointment';
  if(startLabel)startLabel.textContent=travel?'Departure':'Start';if(endLabel)endLabel.textContent=travel?'Arrival':'End';if(zoneLabel)zoneLabel.textContent=travel?'Departure time zone':'Time zone';
  if(travelFields)travelFields.className=travel?'calendar-travel-fields':'calendar-travel-fields hidden';if(arrival&&arrival.parentNode)arrival.parentNode.style.display=travel?'block':'none';
  if(save)save.textContent=text.indexOf('edit')===0?'Save Changes':travel?'Save Travel':'Save Event';
  syncWhoVisibility();
}
function layoutForm(){
  var form=document.querySelector('#houseCalendarOverlay .calendar-form'),hidden=byId('houseCalendarType'),typeField=byId('houseCalendarTypeSelect')&&byId('houseCalendarTypeSelect').parentNode,whoField=byId('houseCalendarPerson')&&byId('houseCalendarPerson').parentNode,title=byId('houseCalendarTitle')&&byId('houseCalendarTitle').parentNode,travel=byId('houseTravelFields'),date=byId('houseCalendarDate')&&byId('houseCalendarDate').parentNode&&byId('houseCalendarDate').parentNode.parentNode,zoneField=byId('houseCalendarZone')&&byId('houseCalendarZone').parentNode,arrivalField=byId('houseCalendarArrivalZone')&&byId('houseCalendarArrivalZone').parentNode,colorField=byId('houseCalendarColor')&&byId('houseCalendarColor').parentNode,notes=byId('houseCalendarNotes')&&byId('houseCalendarNotes').parentNode,link=byId('houseCalendarLinkProfile')&&byId('houseCalendarLinkProfile').parentNode,actions=byId('houseCalendarSave')&&byId('houseCalendarSave').parentNode,meta=byId('houseCalendarMetaRow'),area=byId('houseCalendarAreaField');
  if(!form||!title||!date)return;
  if(!meta){meta=document.createElement('div');meta.id='houseCalendarMetaRow';meta.className='calendar-form-row two'}
  if(zoneField)meta.appendChild(zoneField);if(colorField)meta.appendChild(colorField);
  if(arrivalField&&travel)travel.appendChild(arrivalField);
  if(!area){var oldProfile=form.querySelector('input[disabled][value="Us / House"]');if(oldProfile&&oldProfile.parentNode){area=oldProfile.parentNode;area.id='houseCalendarAreaField';var label=area.querySelector('span');if(label)label.textContent='Area';oldProfile.value='Unlinked';oldProfile.setAttribute('aria-label','Area is unlinked in Atlas House')}}
  if(hidden&&typeField)hidden.insertAdjacentElement('afterend',typeField);if(typeField&&whoField)typeField.insertAdjacentElement('afterend',whoField);if(whoField)whoField.insertAdjacentElement('afterend',title);
  if(travel)title.insertAdjacentElement('afterend',travel);if(date)travel?travel.insertAdjacentElement('afterend',date):title.insertAdjacentElement('afterend',date);
  date.insertAdjacentElement('afterend',meta);if(area)meta.insertAdjacentElement('afterend',area);if(notes&&area)area.insertAdjacentElement('afterend',notes);else if(notes)meta.insertAdjacentElement('afterend',notes);
  if(link&&notes)notes.insertAdjacentElement('afterend',link);if(actions&&link)link.insertAdjacentElement('afterend',actions);else if(actions&&notes)notes.insertAdjacentElement('afterend',actions);
}
function syncWhoVisibility(){ensureEntryTypeField();ensureWhoField();var field=byId('houseCalendarPerson')&&byId('houseCalendarPerson').parentNode,type=byId('houseCalendarType')&&byId('houseCalendarType').value,select=byId('houseCalendarTypeSelect');if(select)select.value=type==='travel'?'travel':'event';if(field)field.style.display=type==='travel'?'none':'block';var label=byId('houseCalendarTitleLabel');if(label&&type!=='travel')label.textContent='Event / appointment';layoutForm()}
function resetForCreate(){currentHouseId='';ensureWhoField();byId('houseCalendarPerson').value='together';syncWhoVisibility()}

function authHeaders(token){var headers={'apikey':KEY,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;return headers}
function parseResponse(response){return response.text().then(function(text){var data=text?safeJSON(text):null;if(!response.ok){var message=data&&(data.error_description||data.msg||data.message||data.error)?(data.error_description||data.msg||data.message||data.error):text||('HTTP '+response.status);var error=new Error(message);error.status=response.status;throw error}return data})}
function request(path,session,method,body,prefer){var headers=authHeaders(session.access_token),options={method:method||'GET',headers:headers};if(prefer)headers.Prefer=prefer;if(body!=null)options.body=JSON.stringify(body);return fetch(SUPA+path,options).then(parseResponse)}
function normaliseSession(value){if(!value||!value.access_token||!value.refresh_token)return null;if(!value.expires_at&&value.expires_in)value.expires_at=Math.floor(Date.now()/1000)+Number(value.expires_in);return value}
function readSession(){return normaliseSession(safeJSON(readLocal(SESSION_KEY)||'null'))||normaliseSession(safeJSON(readLocal(PAD_SESSION_KEY)||'null'))}
function sessionFresh(value){if(!value||!value.access_token)return false;if(!value.expires_at)return true;return Number(value.expires_at)*1000-Date.now()>120000}
function refreshSession(value){return fetch(SUPA+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:value.refresh_token})}).then(parseResponse).then(function(next){next=normaliseSession(next);if(next)writeLocal(SESSION_KEY,JSON.stringify(next));return next})}
function ensureSession(){var value=readSession();if(!value)return Promise.reject(new Error('Atlas sign in required.'));return sessionFresh(value)?Promise.resolve(value):refreshSession(value)}
function ensureTarget(session){var target=safeJSON(readLocal(TARGET_KEY)||'null'),userId=session&&session.user&&session.user.id?session.user.id:'';if(target&&target.profileId&&target.userId&&(!userId||target.userId===userId))return Promise.resolve(target);if(!userId)return Promise.reject(new Error('Refresh Atlas House before saving an event.'));return request('/rest/v1/atlas_vaults?select=id&created_by=eq.'+encodeURIComponent(userId)+'&name=eq.Atlas&limit=1',session).then(function(vaults){if(!vaults||!vaults.length)throw new Error('Atlas cloud vault not found.');return request('/rest/v1/atlas_profiles?select=id&vault_id=eq.'+encodeURIComponent(vaults[0].id)+'&profile_key=eq.me&kind=eq.person&owner_user_id=eq.'+encodeURIComponent(userId)+'&limit=1',session)}).then(function(profiles){if(!profiles||!profiles.length)throw new Error('Atlas cloud profile not found.');target={userId:userId,profileId:profiles[0].id};writeLocal(TARGET_KEY,JSON.stringify(target));return target})}
function recordPath(target,id){return '/rest/v1/atlas_records?select=record_id,payload,revision&profile_id=eq.'+encodeURIComponent(target.profileId)+'&record_type=eq.'+ENTITY_TYPE+'&record_id=eq.'+encodeURIComponent(keyFor('calendar',id))+'&limit=1'}
function fetchRecord(session,target,id){return request(recordPath(target,id),session).then(function(rows){if(!(rows instanceof Array)||!rows.length||!rows[0].payload||!rows[0].payload.data)throw new Error('Calendar event is unavailable.');return rows[0]})}
function payload(data){return{schema:'atlas_entity_record',version:2,kind:'calendar',id:data.id,deleted:false,data:data,deviceId:'house-ios12',clientMutationAt:Date.now()}}
function insertRows(session,target,rows){var body=[],i;for(i=0;i<rows.length;i++)body.push({profile_id:target.profileId,record_type:ENTITY_TYPE,record_id:keyFor('calendar',rows[i].id),payload:payload(rows[i]),client_updated_at:Date.now(),updated_by:target.userId});return request('/rest/v1/atlas_records',session,'POST',body,'return=minimal')}
function updateRow(session,target,id,data){return fetchRecord(session,target,id).then(function(row){var revision=Number(row.revision||0),body={payload:payload(data),client_updated_at:Date.now(),revision:revision+1,updated_by:target.userId},path='/rest/v1/atlas_records?profile_id=eq.'+encodeURIComponent(target.profileId)+'&record_type=eq.'+ENTITY_TYPE+'&record_id=eq.'+encodeURIComponent(keyFor('calendar',id))+'&revision=eq.'+revision+'&select=record_id,revision';return request(path,session,'PATCH',body,'return=representation').then(function(result){if(!(result instanceof Array)||!result.length)throw new Error('Atlas changed on another device. Refresh House and try again.');return result})})}

function dataFromForm(id,profile,base){var data=clone(base||{}),title=trim(byId('houseCalendarTitle').value),person=byId('houseCalendarPerson').value||'together',stamp=Date.now();if(!title)throw new Error('Add an event or appointment.');data.id=id;data.profile=profile;data.title=title;data.person=LABELS[person]?person:'together';data.date=byId('houseCalendarDate').value||'';data.startTime=byId('houseCalendarStart').value||'';data.endTime=byId('houseCalendarEnd').value||'';data.timeZone=byId('houseCalendarZone').value||'Australia/Melbourne';data.arrivalTimeZone='';data.color=byId('houseCalendarColor').value||'';data.entryType='event';data.traveler='';data.origin='';data.destination='';data.flightNumber='';data.areaId=data.areaId||'';data.sourceAreaLabel=data.sourceAreaLabel||'';data.notes=trim(byId('houseCalendarNotes').value);data.createdAt=data.createdAt||stamp;data.updatedAt=stamp;return data}
function sharedFromSource(source,shared){var data=clone(shared||{});data.id=shared&&shared.id?shared.id:uid('cal');data.profile='us';data.sourceEventId=source.id;data.title=source.title;data.person=source.person;data.date=source.date;data.startTime=source.startTime;data.endTime=source.endTime;data.timeZone=source.timeZone||'';data.arrivalTimeZone='';data.color=source.color||'';data.entryType='event';data.traveler='';data.origin='';data.destination='';data.flightNumber='';data.areaId='';data.sourceAreaLabel='';data.notes=source.notes||'';data.createdAt=data.createdAt||Date.now();data.updatedAt=Date.now();return data}
function profileLabel(profile){return profile==='alyssa'?'Alyssa':'Fraser'}

function saveNewEvent(){
  var link=byId('houseCalendarLinkProfile'),profile=link?link.value:'',button=byId('houseCalendarSave'),source,shared;
  if(profile){source=dataFromForm(uid('cal'),profile,null);shared=sharedFromSource(source,null);source.entangledId=shared.id}else shared=dataFromForm(uid('cal'),'us',null);
  button.disabled=true;button.textContent='Saving…';
  ensureSession().then(function(session){return ensureTarget(session).then(function(target){return insertRows(session,target,profile?[source,shared]:[shared])})}).then(function(){byId('houseCalendarOverlay').className='calendar-overlay hidden';showMessage(profile?'Linked to '+profileLabel(profile)+' and Us':'Event added to Us');var refresh=byId('refreshHouse');if(refresh)refresh.click()}).catch(function(error){showMessage(error&&error.message?error.message:'Calendar event was not saved.')}).then(function(){button.disabled=false;button.textContent='Save Event'})
}
function saveEditedEvent(){
  var shared=cachedEvent(currentHouseId);if(!shared)throw new Error('Refresh House before editing this event.');
  var button=byId('houseCalendarSave');button.disabled=true;button.textContent='Saving…';
  ensureSession().then(function(session){return ensureTarget(session).then(function(target){
    if(shared.sourceEventId)return fetchRecord(session,target,shared.sourceEventId).then(function(row){var source=dataFromForm(shared.sourceEventId,row.payload.data.profile||'me',row.payload.data),nextShared=sharedFromSource(source,shared);source.entangledId=shared.id;return updateRow(session,target,source.id,source).then(function(){return updateRow(session,target,shared.id,nextShared)})});
    var next=dataFromForm(shared.id,'us',shared);return updateRow(session,target,shared.id,next)
  })}).then(function(){byId('houseCalendarOverlay').className='calendar-overlay hidden';showMessage('Event updated');currentHouseId='';var refresh=byId('refreshHouse');if(refresh)refresh.click()}).catch(function(error){showMessage(error&&error.message?error.message:'Calendar event was not saved.')}).then(function(){button.disabled=false;button.textContent='Save Changes'})
}

function zoneShort(event){if(!event||!event.timeZone||!event.date)return'';try{var date=new Date(event.date+'T12:00:00Z'),parts=new Intl.DateTimeFormat('en-AU',{timeZone:event.timeZone,timeZoneName:'short'}).formatToParts(date),i;for(i=0;i<parts.length;i++)if(parts[i].type==='timeZoneName')return parts[i].value}catch(error){}return''}
function timeMeta(event){if(!event||!event.startTime)return'All day';var zone=zoneShort(event);return event.startTime+(zone?' '+zone:'')}
function html(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function decorateUpcoming(){var list=byId('upcomingList');if(!list)return;var rows=list.querySelectorAll('[data-house-calendar-id]'),i,row,event,body;for(i=0;i<rows.length;i++){row=rows[i];event=cachedEvent(row.getAttribute('data-house-calendar-id'));if(!event||event.entryType==='travel')continue;body=row.querySelector('div');if(!body)continue;body.innerHTML='<strong class="house-event-person">'+html(personLabel(event))+'</strong><span class="house-event-title">'+html(event.title||'Untitled event')+'</span><small>'+html(event.date||'')+(timeMeta(event)?' · '+html(timeMeta(event)):'')+'</small>'}}
function loadEditPerson(row){var id=row&&row.getAttribute('data-house-calendar-id');if(!id)return;currentHouseId=id;var event=cachedEvent(id);ensureWhoField();byId('houseCalendarPerson').value=event&&event.person&&LABELS[event.person]?event.person:personForProfile(event&&event.profile||'us');syncWhoVisibility();if(event&&event.sourceEventId){ensureSession().then(function(session){return ensureTarget(session).then(function(target){return fetchRecord(session,target,event.sourceEventId)})}).then(function(record){var source=record.payload.data||{};byId('houseCalendarPerson').value=source.person&&LABELS[source.person]?source.person:personForProfile(source.profile||'me')}).catch(function(){})}}
function rowFromTarget(target){var list=byId('upcomingList'),node=target;while(node&&node!==list){if(node.getAttribute&&node.getAttribute('data-house-calendar-id'))return node;node=node.parentNode}return null}

function bind(){
  ensureEntryTypeField();ensureWhoField();syncWhoVisibility();
  var save=byId('houseCalendarSave'),baseSave=save&&save.onclick,addEvent=byId('houseAddEvent'),addTravel=byId('houseAddTravel'),calendar=byId('miniCalendar'),upcoming=byId('upcomingList'),typeSelect=byId('houseCalendarTypeSelect');
  if(typeSelect)typeSelect.onchange=function(){applyType(this.value)};
  if(save&&baseSave)save.onclick=function(event){var type=byId('houseCalendarType').value,heading=String(byId('houseCalendarHeading').textContent||'').toLowerCase();if(type==='event'){if(event&&event.preventDefault)event.preventDefault();try{if(heading.indexOf('new event')===0)saveNewEvent();else if(heading.indexOf('edit event')===0&&currentHouseId)saveEditedEvent();else baseSave.call(save,event)}catch(error){showMessage(error.message)}return}baseSave.call(save,event)};
  if(addEvent)addEvent.addEventListener('click',function(){setTimeout(resetForCreate,0)},true);if(addTravel)addTravel.addEventListener('click',function(){setTimeout(syncWhoVisibility,0)},true);if(calendar)calendar.addEventListener('click',function(){setTimeout(resetForCreate,0)},true);
  if(upcoming){upcoming.addEventListener('click',function(event){var row=rowFromTarget(event.target||event.srcElement);if(row)setTimeout(function(){loadEditPerson(row)},0)},true);if(window.MutationObserver)new MutationObserver(function(){setTimeout(decorateUpcoming,0)}).observe(upcoming,{childList:true,subtree:true})}
  decorateUpcoming();
}

bind();
}());
