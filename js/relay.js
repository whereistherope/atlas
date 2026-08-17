// Relay v1 local receptor. This classic script deliberately has no transport code.
(function(root){
  'use strict';
  const PROFILES=new Set(['me','alyssa','us']);
  const OPERATIONS=new Set(['create_note','append_note']);
  const MAX_RECEIPTS=200;
  const text=(value,max=100000)=>typeof value==='string'?value.slice(0,max):'';
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);
  const relayState=()=>typeof state==='object'&&state?state:null;
  const profileName=id=>({me:'Me',alyssa:'Alyssa',us:'Us'}[id]||id);

  function profileAreas(profileId){
    const s=relayState();
    return (s?.areas||[]).filter(area=>(area.profile||'me')===profileId);
  }
  function exactArea(value,profileId,label,errors){
    if(value===null||value===undefined||value==='')return null;
    const wanted=String(value).trim();
    const areas=profileAreas(profileId);
    let matches=areas.filter(area=>area.id===wanted||String(area.code||'')===wanted);
    if(!matches.length){
      const lower=wanted.toLocaleLowerCase();
      matches=areas.filter(area=>String(area.name||'').toLocaleLowerCase()===lower);
    }
    if(matches.length!==1){errors.push(`${label} target is ${matches.length?'ambiguous':'unknown'} for profile ${profileId}.`);return null}
    return matches[0];
  }
  function descendantOf(child,parent,areas){
    if(!child||!parent)return false;
    const byId=Object.fromEntries(areas.map(area=>[area.id,area]));
    let cursor=child,guard=0;
    while(cursor&&guard++<20){if(cursor.id===parent.id)return true;cursor=byId[cursor.parentId]}
    return false;
  }
  function routeLabel(route){
    if(route.inbox)return 'Inbox / unlinked';
    const areas=profileAreas(route.profileId),byId=Object.fromEntries(areas.map(area=>[area.id,area]));
    const leaf=route.topic||route.area;if(!leaf)return 'Inbox / unlinked';
    const names=[];let cursor=leaf,guard=0;
    while(cursor&&guard++<20){names.unshift(cursor.name);cursor=byId[cursor.parentId]}
    return names.join(' → ');
  }
  function resolveRoute(envelope,errors){
    const target=envelope.target||{},profileId=envelope.profileId;
    const inbox=target.inbox===true||['inbox','unlinked'].includes(String(target.areaId||'').toLowerCase());
    if(inbox){
      if(target.topicId)errors.push('Inbox / unlinked cannot include a topic target.');
      return {profileId,inbox:true,area:null,topic:null,explicit:true};
    }
    const hasArea=own(target,'areaId')&&target.areaId!==null&&target.areaId!=='';
    const hasTopic=own(target,'topicId')&&target.topicId!==null&&target.topicId!=='';
    const area=hasArea?exactArea(target.areaId,profileId,'Area',errors):null;
    const topic=hasTopic?exactArea(target.topicId,profileId,'Topic',errors):null;
    if(area&&topic&&!descendantOf(topic,area,profileAreas(profileId)))errors.push('Topic does not belong to the supplied area.');
    return {profileId,inbox:false,area,topic,explicit:hasArea||hasTopic};
  }
  function findAppendNote(envelope,route,errors){
    const s=relayState(),target=envelope.target||{};
    if(!s)return null;
    if(target.noteId){
      const note=(s.notes||[]).find(item=>item.id===target.noteId&&(item.profile||'me')===envelope.profileId);
      if(!note)errors.push('Note ID is unknown in the supplied profile.');
      return note||null;
    }
    const title=text(target.noteTitle,500).trim();
    if(!title){errors.push('append_note requires target.noteId or target.noteTitle.');return null}
    let matches=(s.notes||[]).filter(note=>(note.profile||'me')===envelope.profileId&&note.title===title);
    if(route.explicit){
      if(route.inbox)matches=matches.filter(note=>!note.areaId&&!note.topicId);
      else matches=matches.filter(note=>(!route.area||note.areaId===route.area.id||note.topicId===route.area.id)&&(!route.topic||note.topicId===route.topic.id||note.areaId===route.topic.id));
    }
    if(matches.length!==1)errors.push(`Note title resolved to ${matches.length} matches; exactly one is required.`);
    return matches.length===1?matches[0]:null;
  }
  function inspect(envelope){
    const errors=[];
    if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))return {ok:false,errors:['Envelope must be a JSON object.']};
    if(envelope.version!==1)errors.push('version must be 1.');
    if(!text(envelope.relayId,300).trim())errors.push('relayId is required.');
    if(!OPERATIONS.has(envelope.operation))errors.push('operation must be create_note or append_note.');
    if(!PROFILES.has(envelope.profileId))errors.push('profileId must be me, alyssa, or us.');
    if(!envelope.target||typeof envelope.target!=='object'||Array.isArray(envelope.target))errors.push('target must be an object.');
    if(!envelope.content||typeof envelope.content!=='object'||Array.isArray(envelope.content))errors.push('content must be an object.');
    if(envelope.source!==undefined&&(!envelope.source||typeof envelope.source!=='object'||Array.isArray(envelope.source)))errors.push('source must be an object when supplied.');
    if(errors.length)return {ok:false,errors};
    const content=envelope.content,route=resolveRoute(envelope,errors);
    if(envelope.operation==='create_note'){
      if(!text(content.title,500).trim()&&!text(content.body).trim())errors.push('create_note requires a title or body.');
      if(!route.explicit)errors.push('create_note requires an exact Atlas target or explicit Inbox / unlinked target.');
    }
    if(content.tags!==undefined&&(!Array.isArray(content.tags)||content.tags.some(tag=>typeof tag!=='string')))errors.push('content.tags must be an array of strings.');
    if(content.showOnMap!==undefined&&typeof content.showOnMap!=='boolean')errors.push('content.showOnMap must be boolean.');
    const note=envelope.operation==='append_note'?findAppendNote(envelope,route,errors):null;
    return {ok:errors.length===0,errors,route,note};
  }
  function validate(envelope){const result=inspect(envelope);return {ok:result.ok,errors:result.errors.slice()}}
  function preview(envelope){
    const result=inspect(envelope);
    if(!result.ok)return {ok:false,errors:result.errors.slice(),text:`REJECTED\n${result.errors.join('\n')}`};
    const content=envelope.content||{},note=result.note,route=result.route;
    const effectiveRoute=note&&!route.explicit?{...route,area:profileAreas(envelope.profileId).find(a=>a.id===note.areaId)||null,topic:profileAreas(envelope.profileId).find(a=>a.id===note.topicId)||null,inbox:!note.areaId&&!note.topicId}:route;
    const lines=[envelope.operation==='create_note'?'CREATE NOTE':'APPEND NOTE',`Profile: ${profileName(envelope.profileId)}`];
    if(note)lines.push(`Existing note: ${note.title}`);
    lines.push(`Route: ${routeLabel(effectiveRoute)}`);
    if(envelope.operation==='create_note')lines.push(`Title: ${text(content.title,500).trim()||text(content.body,70).trim()||'Untitled'}`);
    const tags=Array.isArray(content.tags)?content.tags.map(tag=>tag.trim()).filter(Boolean):[];
    if(tags.length)lines.push(`Tags: ${tags.join(', ')}`);
    return {ok:true,errors:[],operation:envelope.operation,profileId:envelope.profileId,recordId:note?.id||null,route:{areaId:effectiveRoute.area?.id||'',topicId:effectiveRoute.topic?.id||'',inbox:effectiveRoute.inbox},text:lines.join('\n')};
  }
  function provenance(envelope,receivedAt){
    const source=envelope.source||{};
    return {relayId:envelope.relayId,provider:text(source.provider,100),threadKey:text(source.threadKey,300),sentAt:text(source.sentAt,100),receivedAt};
  }
  function stableValue(value){
    if(Array.isArray(value))return value.map(stableValue);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableValue(value[key])]));
    return value;
  }
  function compactHash(value){
    const input=JSON.stringify(stableValue(value));let hash=14695981039346656037n;
    for(let i=0;i<input.length;i++){hash^=BigInt(input.charCodeAt(i));hash=BigInt.asUintN(64,hash*1099511628211n)}
    return hash.toString(16).padStart(16,'0');
  }
  function requestFingerprint(envelope,checked){
    const content=envelope.content||{},source=envelope.source||{},route=checked.route,note=checked.note;
    const request={version:1,profileId:envelope.profileId,operation:envelope.operation,target:{inbox:route.inbox,areaId:route.area?.id||'',topicId:route.topic?.id||'',noteId:note?.id||''},content:{body:text(content.body),tags:uniqueTags(content.tags)}};
    if(envelope.operation==='create_note')Object.assign(request.content,{title:text(content.title,500).trim(),type:text(content.type,60).trim()||'note',showOnMap:content.showOnMap===true});
    if(source.provider||source.threadKey)request.source={provider:text(source.provider,100),threadKey:text(source.threadKey,300)};
    return `v1-${compactHash(request)}`;
  }
  async function ingest(envelope){
    const s=relayState();if(!s)return {ok:false,errors:['Atlas state is not ready.']};
    const checked=inspect(envelope),ledger=s.relayLedger&&typeof s.relayLedger==='object'&&!Array.isArray(s.relayLedger)?s.relayLedger:(s.relayLedger={});
    if(!checked.ok){const errors=checked.errors.slice();if(text(envelope?.relayId,300).trim()&&ledger[envelope.relayId])errors.push('Relay ID conflict: this relayId was already accepted and the retry is not a valid matching instruction.');return {ok:false,errors}}
    const fingerprint=requestFingerprint(envelope,checked);
    const accepted=ledger[envelope.relayId];
    if(accepted){
      if(accepted.fingerprint===fingerprint&&accepted.profileId===envelope.profileId&&accepted.operation===envelope.operation)return {ok:true,duplicate:true,recordId:accepted.recordId,receipt:{...accepted,status:'accepted'}};
      return {ok:false,errors:['Relay ID conflict: this relayId was already accepted for a different instruction.']};
    }
    const content=envelope.content||{},stamp=Date.now(),source=provenance(envelope,stamp);let note=checked.note;
    if(envelope.operation==='create_note'){
      const route=checked.route,leaf=route.topic||route.area;
      note={id:uid('n'),profile:envelope.profileId,space:leaf?.space||'personal',areaId:route.area?.id||(route.topic?.parentId==='atlas'?'':route.topic?.parentId)||'',topicId:route.topic?.id||'',type:text(content.type,60).trim()||'note',title:text(content.title,500).trim()||text(content.body,70).trim()||'Untitled',body:text(content.body),tags:uniqueTags(content.tags),createdAt:stamp,updatedAt:stamp,showOnMap:content.showOnMap===true,relaySource:source};
      s.notes.unshift(note);
    }else{
      const incoming=text(content.body).trim();
      if(incoming)note.body=[String(note.body||'').trim(),incoming].filter(Boolean).join('\n\n');
      note.tags=uniqueTags([...(Array.isArray(note.tags)?note.tags:[]),...(Array.isArray(content.tags)?content.tags:[])]);
      note.updatedAt=stamp;
      note.relaySources=[...(Array.isArray(note.relaySources)?note.relaySources:[]),source].slice(-20);
      if(checked.route.explicit){const route=checked.route,leaf=route.topic||route.area;note.areaId=route.inbox?'':route.area?.id||(route.topic?.parentId==='atlas'?'':route.topic?.parentId)||'';note.topicId=route.inbox?'':route.topic?.id||'';note.space=leaf?.space||note.space}
    }
    const leaf=checked.route.topic||checked.route.area||profileAreas(envelope.profileId).find(a=>a.id===(note.topicId||note.areaId));
    const receipt={relayId:envelope.relayId,time:stamp,profileId:envelope.profileId,operation:envelope.operation,recordId:note.id,threadKey:source.threadKey,provider:source.provider,fingerprint,status:'accepted'};
    ledger[envelope.relayId]={relayId:envelope.relayId,fingerprint,profileId:envelope.profileId,operation:envelope.operation,recordId:note.id,time:stamp};
    s.relayReceipts=[receipt,...(s.relayReceipts||[])].slice(0,MAX_RECEIPTS);
    log(`Relay received · ${leaf?.name||'Inbox'}`,envelope.profileId);
    await save();
    return {ok:true,duplicate:false,recordId:note.id,receipt:{...receipt}};
  }
  function uniqueTags(tags){
    const result=[],seen=new Set();
    (Array.isArray(tags)?tags:[]).forEach(value=>{const tag=text(value,100).trim(),key=tag.toLocaleLowerCase();if(tag&&!seen.has(key)){seen.add(key);result.push(tag)}});
    return result;
  }
  root.AtlasRelay=Object.freeze({validate,preview,ingest});
})(typeof window!=='undefined'?window:globalThis);
