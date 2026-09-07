// Structured person labels for ordinary calendar events.
(function(root){
  'use strict';
  const LABELS=Object.freeze({fraser:'Fraser',alyssa:'Alyssa',together:'Together'});
  let currentEventId='';
  let pendingPerson='';

  function personForProfile(profile){return profile==='alyssa'?'alyssa':profile==='us'?'together':'fraser'}
  function personValue(event){
    if(event?.person&&LABELS[event.person])return event.person;
    if(event?.sourceEventId){
      const source=(root.state?.calendar||[]).find(item=>item.id===event.sourceEventId);
      if(source?.person&&LABELS[source.person])return source.person;
      if(source?.profile)return personForProfile(source.profile);
    }
    return personForProfile(event?.profile||root.state?.settings?.activeProfile||'me');
  }
  function personLabel(event){return LABELS[personValue(event)]||'Together'}

  function ensurePersonField(){
    if(document.getElementById('calPerson'))return;
    const title=document.getElementById('calTitle')?.closest('.field');if(!title)return;
    const field=document.createElement('div');field.className='field calendar-person-field';
    field.innerHTML='<label>Who</label><select id="calPerson"><option value="fraser">Fraser</option><option value="alyssa">Alyssa</option><option value="together">Together</option></select>';
    title.insertAdjacentElement('beforebegin',field);
  }
  function updatePersonField(){
    ensurePersonField();
    const field=document.getElementById('calPerson')?.closest('.calendar-person-field');
    const travel=document.getElementById('calEntryType')?.value==='travel';
    if(field)field.hidden=travel;
  }

  const baseEnsure=root.ensureCalendarEventExtras;
  if(typeof baseEnsure==='function')root.ensureCalendarEventExtras=function(){const result=baseEnsure.apply(this,arguments);updatePersonField();return result};

  const baseTravelUI=root.updateCalendarTravelUI;
  if(typeof baseTravelUI==='function')root.updateCalendarTravelUI=function(){const result=baseTravelUI.apply(this,arguments);updatePersonField();return result};

  const baseOpen=root.openCalendarEvent;
  if(typeof baseOpen==='function')root.openCalendarEvent=function(id='',date='',requestedType='event'){
    currentEventId=id||'';
    const result=baseOpen.apply(this,arguments);
    updatePersonField();
    const event=id?(root.state?.calendar||[]).find(item=>item.id===id):null;
    const profile=event?.profile||root.state?.settings?.activeProfile||'me';
    const select=document.getElementById('calPerson');if(select)select.value=event?.person||personForProfile(profile);
    return result;
  };

  const baseSync=root.syncEntangledEvent;
  if(typeof baseSync==='function')root.syncEntangledEvent=function(source,enabled){
    if(source&&source.entryType!=='travel'&&pendingPerson&&LABELS[pendingPerson])source.person=pendingPerson;
    const result=baseSync.apply(this,arguments);
    const shared=source?.entangledId?(root.state?.calendar||[]).find(item=>item.id===source.entangledId):(root.state?.calendar||[]).find(item=>item.sourceEventId===source?.id&&item.profile==='us');
    if(shared&&source?.entryType!=='travel')shared.person=source.person||personForProfile(source.profile);
    return result;
  };

  const baseSave=root.saveCalendarEvent;
  if(typeof baseSave==='function')root.saveCalendarEvent=function(){
    const select=document.getElementById('calPerson');
    const chosen=select&&LABELS[select.value]?select.value:'';
    const profileBefore=root.state?.settings?.activeProfile||'me';
    const before=new Set((root.state?.calendar||[]).map(item=>item.id));
    pendingPerson=chosen;
    const result=baseSave.apply(this,arguments);
    pendingPerson='';
    let event=currentEventId?(root.state?.calendar||[]).find(item=>item.id===currentEventId):null;
    if(!event)event=(root.state?.calendar||[]).find(item=>!before.has(item.id)&&(item.profile||'me')===profileBefore&&!item.sourceEventId);
    if(event&&event.entryType!=='travel'&&chosen){
      event.person=chosen;
      if(event.entangledId){const shared=(root.state?.calendar||[]).find(item=>item.id===event.entangledId);if(shared)shared.person=chosen}
      root.save?.();
      if(root.state?.settings?.activeTab==='calendar'||root.AtlasHouse?.isActive?.())root.renderAll?.(false);
    }
    currentEventId=event?.id||currentEventId;
    return result;
  };

  const baseMarkup=root.calendarEventMarkup;
  if(typeof baseMarkup==='function')root.calendarEventMarkup=function(event){
    if(event?.entryType==='travel')return baseMarkup(event);
    const shared=event?.entangledId||event?.sourceEventId?'cal-entangled':'';
    const hue=typeof root.eventHue==='function'?root.eventHue(event):'';
    const time=typeof root.calendarEventTimeMeta==='function'?root.calendarEventTimeMeta(event):(event?.startTime||'All day');
    return `<button class="cal-event cal-person-event ${shared}" style="--event-hue:${hue}" data-calendar-event="${event.id}"><span class="cal-person-copy"><strong>${root.esc(personLabel(event))}</strong><span>${root.esc(event.title||'Untitled event')}</span><small>${root.esc(time)}</small></span></button>`;
  };

  function decorateUpcoming(rootNode=document){
    rootNode.querySelectorAll?.('[data-calendar-id]').forEach(row=>{
      const id=row.dataset.calendarId,event=(root.state?.calendar||[]).find(item=>item.id===id);if(!event||event.entryType==='travel')return;
      const body=row.querySelector('div');if(!body)return;
      const signature=[personValue(event),event.title,event.date,event.startTime,event.timeZone].join('|');if(body.dataset.personSignature===signature)return;
      body.dataset.personSignature=signature;
      const time=typeof root.calendarEventTimeMeta==='function'?root.calendarEventTimeMeta(event):(event.startTime||'All day');
      body.innerHTML=`<strong class="calendar-upcoming-person">${root.esc(personLabel(event))}</strong><span class="calendar-upcoming-title">${root.esc(event.title||'Untitled event')}</span><small>${root.esc(event.date)}${time?` · ${root.esc(time)}`:''}</small>`;
    });
  }
  const observer=new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{if(node.nodeType===1)decorateUpcoming(node.matches?.('[data-calendar-id]')?node.parentNode:node)})));
  observer.observe(document.body,{childList:true,subtree:true});
  decorateUpcoming();

  root.calendarPersonLabel=personLabel;
  root.calendarPersonValue=personValue;
  root.AtlasCalendarPerson=Object.freeze({version:'1',label:personLabel,value:personValue,decorateUpcoming});
})(window);
