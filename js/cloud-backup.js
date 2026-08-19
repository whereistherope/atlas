// Explicit, append-only Me cloud backup. Local Atlas remains the source of truth.
(function(){
  'use strict';
  const RECORD_TYPE='backup_snapshot_v1';let prepared=null;
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  const meOnly=list=>(Array.isArray(list)?list:[]).filter(item=>(item?.profile||'me')==='me');
  const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>own(value,key)).map(key=>[key,value[key]]));
  const cleanList=(list,keys)=>meOnly(list).map(item=>pick(item,keys));
  function buildMeSnapshot(source){
    if(!source||source.settings?.activeProfile!=='me')throw new Error('Me must be the active profile.');
    const areas=cleanList(source.areas,['id','profile','name','code','space','level','parentId','description','x','y','mapZ','status']),areaIds=new Set(areas.map(area=>area.id));
    const links=cleanList(source.links,['id','profile','source','target','type']).filter(link=>areaIds.has(link.source)&&areaIds.has(link.target));
    const projects=meOnly(source.projects).map(project=>({...pick(project,['id','profile','space','areaId','topicId','code','title','status','objective','next','tags','createdAt']),milestones:(project.milestones||[]).map(item=>pick(item,['id','title','done','current'])),tasks:(project.tasks||[]).map(item=>pick(item,['id','title','done']))}));
    return{schema:'atlas_me_backup_snapshot',version:1,profileKey:'me',dataVersion:Number(source.version)||8,areas,links,projects,notes:cleanList(source.notes,['id','profile','space','areaId','topicId','type','title','body','tags','createdAt','updatedAt','showOnMap']),daily:cleanList(source.daily,['id','profile','date','createdAt','updatedAt','text','areaId']),calendar:cleanList(source.calendar,['id','profile','title','date','startTime','endTime','areaId','notes','createdAt','updatedAt']),quickTodos:cleanList(source.quickTodos,['id','profile','text','done','createdAt','updatedAt']),scratch:String(source.scratch?.me||'')};
  }
  function canonical(value){if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;return JSON.stringify(value)}
  async function fingerprint(payload){const bytes=new TextEncoder().encode(canonical(payload)),digest=await crypto.subtle.digest('SHA-256',bytes);return'sha256-'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}
  function invalidate(){prepared=null}
  function localState(){return window.AtlasState?.()}
  function eligible(){const status=window.AtlasCloud?.getStatus?.();return localState()?.settings?.activeProfile==='me'&&navigator.onLine!==false&&status?.authenticated&&status?.verified}
  function summary(payload,serialized){return{projects:payload.projects.length,notes:payload.notes.length,daily:payload.daily.length,calendar:payload.calendar.length,todos:payload.quickTodos.length,areas:payload.areas.length,bytes:new TextEncoder().encode(serialized).length}}
  async function preview(){invalidate();if(!eligible())return{ok:false,error:'Sign in, select Me, and Test Access before previewing.'};try{const payload=buildMeSnapshot(localState()),serialized=canonical(payload),recordId=await fingerprint(payload);if(!eligible())throw new Error('Cloud access changed. Preview again.');const check=await window.AtlasCloud.meBackupExists(recordId);if(!check.ok)return check;prepared={recordId};return{ok:true,recordId,payload,summary:summary(payload,serialized),alreadyBackedUp:check.exists}}catch(error){invalidate();return{ok:false,error:String(error?.message||'Preview failed.')}}}
  async function confirm(){if(!prepared||!eligible())return{ok:false,error:'Preview required before backup.'};try{const source=localState(),payload=buildMeSnapshot(source),recordId=await fingerprint(payload);if(recordId!==prepared.recordId){invalidate();return{ok:false,previewRequired:true,error:'Preview required — Atlas changed since the last preview.'}}const result=await window.AtlasCloud.appendMeBackupSnapshot({recordType:RECORD_TYPE,recordId,payload,clientUpdatedAt:Number(source.meta?.lastSavedAt)});invalidate();return result}catch(error){invalidate();return{ok:false,error:String(error?.message||'Backup failed.')}}}
  window.addEventListener?.('atlascloudstatus',event=>{if(!event.detail?.authenticated||!event.detail?.verified)invalidate()});window.addEventListener?.('offline',invalidate);
  window.AtlasCloudBackup=Object.freeze({buildMeSnapshot,canonical,fingerprint,preview,confirm,invalidate,getPrepared:()=>prepared?{...prepared}:null,RECORD_TYPE});
})();
