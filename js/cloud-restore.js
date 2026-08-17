// Explicit Me-only snapshot recovery. Nothing in this module runs a restore automatically.
(function(){
  'use strict';
  let prepared=null,applying=false;
  const COLLECTIONS=['areas','links','projects','notes','daily','calendar','quickTodos'];
  const KEYS={
    areas:['id','profile','name','code','space','level','parentId','description','x','y','mapZ','status'],
    links:['id','profile','source','target','type'],
    projects:['id','profile','space','areaId','topicId','code','title','status','objective','next','tags','createdAt'],
    notes:['id','profile','space','areaId','topicId','type','title','body','tags','createdAt','updatedAt','showOnMap'],
    daily:['id','profile','date','createdAt','updatedAt','text','areaId'],
    calendar:['id','profile','title','date','startTime','endTime','areaId','notes','createdAt','updatedAt'],
    quickTodos:['id','profile','text','done','createdAt','updatedAt']
  };
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>own(value,key)).map(key=>[key,clone(value[key])]));
  const me=item=>(item?.profile||'me')==='me';
  const eligible=()=>state?.settings?.activeProfile==='me'&&navigator.onLine!==false&&window.AtlasCloud?.getStatus?.().authenticated&&window.AtlasCloud?.getStatus?.().verified;
  function invalidate(){prepared=null}
  function blockInteraction(event){if(!applying)return;event.preventDefault();event.stopImmediatePropagation()}
  if(typeof document!=='undefined')['beforeinput','input','change','click','keydown','submit','pointerdown'].forEach(type=>document.addEventListener(type,blockInteraction,true));
  async function localFingerprint(source=state){return window.AtlasCloudBackup.fingerprint(window.AtlasCloudBackup.buildMeSnapshot(source))}
  function mergeNested(remote,local){
    const merge=(items,locals,keys)=>(items||[]).map(item=>{const old=(locals||[]).find(value=>value?.id===item?.id)||{};return{...clone(old),...pick(item,keys)}});
    const result={...clone(local||{}),...pick(remote,KEYS.projects),profile:'me'};
    result.milestones=merge(remote.milestones,local?.milestones,['id','title','done','current']);
    result.tasks=merge(remote.tasks,local?.tasks,['id','title','done']);return result;
  }
  function candidateFrom(current,payload){
    const candidate=clone(current);
    for(const key of COLLECTIONS){
      const locals=(current[key]||[]).filter(me),others=(current[key]||[]).filter(item=>!me(item));
      const restored=(payload[key]||[]).map(remote=>{
        const local=locals.find(item=>item?.id===remote?.id);
        if(key==='projects')return mergeNested(remote,local);
        return{...clone(local||{}),...pick(remote,KEYS[key]),profile:'me'};
      });
      candidate[key]=others.concat(restored);
    }
    candidate.scratch={...clone(current.scratch||{}),me:payload.scratch};
    return candidate;
  }
  function diff(payload,current){
    const result={added:0,changed:0,removed:0,unchanged:0,scratchChanged:String(current.scratch?.me||'')!==payload.scratch,collections:{}};
    for(const key of COLLECTIONS){
      const local=new Map((current[key]||[]).filter(me).map(item=>[item.id,item]));let added=0,changed=0,unchanged=0;
      for(const remote of payload[key]){const old=local.get(remote.id);if(!old)added++;else{const backed=key==='projects'?mergeNested(remote,{}):{...pick(remote,KEYS[key]),profile:'me'};const oldBacked=key==='projects'?mergeNested(window.AtlasCloudBackup.buildMeSnapshot({...current,settings:{...current.settings,activeProfile:'me'}}).projects.find(p=>p.id===remote.id)||{},{}):{...pick(old,KEYS[key]),profile:'me'};if(window.AtlasCloudBackup.canonical(backed)===window.AtlasCloudBackup.canonical(oldBacked))unchanged++;else changed++}local.delete(remote.id)}
      const removed=local.size;result.collections[key]={added,changed,removed,unchanged};result.added+=added;result.changed+=changed;result.removed+=removed;result.unchanged+=unchanged;
    }return result;
  }
  function summary(row){const payload=row.payload,serialized=window.AtlasCloudBackup.canonical(payload);return{areas:payload.areas.length,projects:payload.projects.length,notes:payload.notes.length,daily:payload.daily.length,calendar:payload.calendar.length,todos:payload.quickTodos.length,bytes:new TextEncoder().encode(serialized).length,createdAt:row.created_at||row.client_updated_at||null}}
  async function preview(){
    if(applying)return{ok:false,error:'Restore is already in progress.'};invalidate();if(!eligible())return{ok:false,error:'Sign in, select Me, and Test Access before previewing restore.'};
    try{const result=await window.AtlasCloud.latestMeBackupSnapshot();if(!result.ok)return result;if(!result.record)return{ok:false,noBackup:true,label:'NO CLOUD BACKUP',message:'No Me backup snapshot is available.'};if(!eligible())throw new Error('Cloud access changed. Preview again.');
      candidateFrom(state,result.record.payload); // Prove a complete candidate can be built; Preview deliberately discards it.
      const localMeFingerprint=await localFingerprint();const view={ok:true,recordId:result.record.record_id,summary:summary(result.record),diff:diff(result.record.payload,state)};
      prepared=Object.freeze({recordId:view.recordId,localMeFingerprint});return view;
    }catch(error){invalidate();return{ok:false,error:String(error?.message||'Restore preview failed.')}}
  }
  async function confirm(){
    if(applying)return{ok:false,error:'Restore is already in progress.'};
    if(!prepared)return{ok:false,previewRequired:true,error:'Preview required before restore.'};
    if(!eligible()){invalidate();return{ok:false,previewRequired:true,error:'Preview required — cloud access or profile changed.'}}
    const binding=prepared;
    try{
      const currentFingerprint=await localFingerprint();if(currentFingerprint!==binding.localMeFingerprint){invalidate();return{ok:false,previewRequired:true,error:'Preview required — Atlas changed since the last restore preview.'}}
      const result=await window.AtlasCloud.getMeBackupSnapshot(binding.recordId);if(!result.ok||!result.record)throw new Error(result.error||'Prepared cloud backup is unavailable.');
      if(result.record.record_id!==binding.recordId)throw new Error('Prepared cloud backup identity changed.');
      if(!eligible())throw new Error('Cloud access or profile changed. Preview again.');
      const afterRemoteFingerprint=await localFingerprint();if(afterRemoteFingerprint!==binding.localMeFingerprint){invalidate();return{ok:false,previewRequired:true,error:'Preview required — Atlas changed since the last restore preview.'}}
      applying=true;
      const current=clone(state);if(await localFingerprint(current)!==binding.localMeFingerprint){invalidate();return{ok:false,previewRequired:true,error:'Preview required — Atlas changed since the last restore preview.'}}
      const candidate=candidateFrom(current,result.record.payload);
      await idbBackup(current,`before Me cloud restore ${binding.recordId.slice(0,19)}`);
      if(!eligible()){invalidate();return{ok:false,previewRequired:true,error:'Preview required — cloud access or profile changed.'}}
      if(await localFingerprint()!==binding.localMeFingerprint){invalidate();return{ok:false,previewRequired:true,error:'Preview required — Atlas changed while the restore safety backup was being created.'}}
      await idbSet(candidate);
      state=candidate;renderAll(false);invalidate();
      return{ok:true,recordId:binding.recordId,restoredAt:result.record.created_at||result.record.client_updated_at||Date.now()};
    }catch(error){invalidate();return{ok:false,error:String(error?.message||'Restore failed.')}}finally{applying=false}
  }
  window.addEventListener?.('atlascloudstatus',event=>{if(!event.detail?.authenticated||!event.detail?.verified)invalidate()});
  window.addEventListener?.('offline',invalidate);
  window.AtlasCloudRestore=Object.freeze({preview,confirm,invalidate,getPrepared:()=>prepared?{...prepared}:null});
})();
