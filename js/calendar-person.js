// Structured event person/appointment presentation for Atlas Calendar.
(function(root){
  'use strict';
  const PERSON_LABELS=Object.freeze({fraser:'Fraser',alyssa:'Alyssa',together:'Together'});
  function personForProfile(profile){return profile==='alyssa'?'alyssa':profile==='us'?'together':'fraser'}
  function inferredPerson(event){
    if(event?.person&&PERSON_LABELS[event.person])return event.person;
    if(event?.sourceEventId){const source=(root.state?.calendar||[]).find(item=>item.id===event.sourceEventId);if(source?.person&&PERSON_LABELS[source.person])return source.person;if(source?.profile)return personForProfile(source.profile)}
    return personForProfile(event?.profile||root.state?.settings?.activeProfile||'me');
  }
  function personLabel(event){return PERSON_LABELS[inferredPerson(event)]||'Together'}
  function ensurePersonField(){
    if(document.getElementById('calPerson'))return;
    const title=document.getElementById('calTitle')?.closest('.field');if(!title)return;
    const field=document.createElement('div');field.className='field calendar-person-field';field.innerHTML='<label>Who</label><select id="calPerson"><option value="fraser">Fraser</option><option value="alyssa">Alyssa</option><option value="together">Together</option></select>';
    title.insertAdjacentElement('beforebegin',field);
  }
  function updatePersonVisibility(){const field=document.getElementById('calPerson')?.closest('.calendar-person-field'),travel=document.getElementById('calEntryType')?.value==='travel';if(field)field.hidden=travel}

  const baseEnsure=root.ensureCalendarEventExtras;
  if(typeof baseEnsure==='function')root.ensureCalendarEventExtras=function(){const result=baseEnsure.apply(this,arguments);ensurePersonField();updatePersonVisibility();return result};
  const baseTravelUi=root.updateCalendarTravelUI;
  if(typeof baseTravelUi==='function')root.updateCalendarTravelUI=function(){const result=baseTravelUi.apply(this,arguments);updatePersonVisibility();return result};
  const baseOpen=root.openCalendarEvent;
  if(typeof baseOpen==='function')root.openCalendarEvent=function(){const args=arguments,result=baseOpen.apply(this,args);ensurePersonField();const id=args[0]||'',event=id?(root.state?.calendar||[]).find(item=>item.id===id):null,profile=event?.profile||root.state?.settings?.activeProfile||'me',select=document.getElementById('calPerson');if(select)select.value=event?.person||personForProfile(profile);updatePersonVisibility();return result};
  const baseSync=root.syncEntangledEvent;
  if(typeof baseSync==='function')root.syncEntangledEvent=function(source,enabled){const result=baseSync.call(this,source,enabled);const shared=source?.entangledId?(root.state?.calendar||[]).find(item=>item.id===source.entangledId):(root.state?.calendar||[]).find(item=>item.sourceEventId===source?.id&&item.profile==='us');if(shared)shared.person=source.person||personForProfile(source.profile);return result};
  const baseSave=root.saveCalendarEvent;
  if(typeof baseSave==='function')root.saveCalendarEvent=function(){const beforeId=root.activeCalendarEventId||'',result=baseSave.apply(this,arguments),person=document.getElementById('calPerson')?.value||'';if(person&&PERSON_LABELS[person]){let event=beforeId?(root.state?.calendar||[]).find(item=>item.id===beforeId):null;if(!event){const profile=root.state?.settings?.activeProfile||'me';event=(root.state?.calendar||[]).filter(item=>(item.profile||'me')===profile).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0))[0]}if(event&&event.entryType!=='travel'){event.person=person;if(event.entangledId){const shared=(root.state?.calendar||[]).find(item=>item.id===event.entangledId);if(shared)shared.person=person}root.save?.()}}return result};

  root.calendarPersonLabel=personLabel;
  root.calendarPersonValue=inferredPerson;
  root.AtlasCalendarPerson=Object.freeze({version:'1',label:personLabel,value:inferredPerson});
})(window);
