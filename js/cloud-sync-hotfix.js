// Canonical recovery helpers retained for migration and manual snapshot recovery.
// Durable cross-device reconciliation now lives in cloud-sync.js.
(function(root){
  'use strict';
  const RECORD_TYPE='canonical_state_v1',RECORD_ID='primary';
  const COLLECTIONS=['profiles','areas','links','projects','notes','daily','calendar','quickTodos','activity'];
  const JOIN_PREFIX='atlas_canonical_joined_v1:';
  const RECOVERY_PREFIX='atlas_canonical_incident_recovery_v2:';
  const PRE_SYNC_REASON='before Atlas v0.13.0 canonical sync';
  const OVERWRITE_REASON='before first shared Atlas refresh';
  const cloneValue=value=>JSON.parse(JSON.stringify(value));
  const plain=value=>!!value&&Object.prototype.toString.call(value)==='[object Object]';
  let client=null,target=null,busy=false;

  function buildPayload(source){
    const out={schema:'atlas_canonical_state',version:1,dataVersion:Number(source?.version||8)};
    for(const key of COLLECTIONS)out[key]=cloneValue(Array.isArray(source?.[key])?source[key]:[]);
    out.scratch=cloneValue(plain(source?.scratch)?source.scratch:{});
    return out;
  }
  function unionList(remoteList,localList){
    const result=cloneValue(Array.isArray(remoteList)?remoteList:[]),seen=new Set(result.filter(x=>x&&x.id).map(x=>x.id));
    for(const item of (Array.isArray(localList)?localList:[])){
      if(!item||!item.id){result.push(cloneValue(item));continue}
      if(!seen.has(item.id)){seen.add(item.id);result.push(cloneValue(item))}
    }
    return result;
  }
  function unionScratch(remoteScratch,localScratch){
    const result=cloneValue(plain(remoteScratch)?remoteScratch:{}),local=plain(localScratch)?localScratch:{};
    for(const [key,value] of Object.entries(local)){
      const localText=String(value??''),remoteText=String(result[key]??'');
      if(!remoteText){result[key]=localText;continue}
      if(localText&&localText!==remoteText&&!remoteText.includes(localText))result[key]=`${remoteText}\n\n--- Recovered from another Atlas device ---\n\n${localText}`;
    }
    return result;
  }
  function unionPayload(remote,local){
    const merged={schema:'atlas_canonical_state',version:1,dataVersion:Math.max(Number(remote?.dataVersion||0),Number(local?.dataVersion||0),8)};
    for(const key of COLLECTIONS)merged[key]=unionList(remote?.[key],local?.[key]);
    merged.scratch=unionScratch(remote?.scratch,local?.scratch);
    return merged;
  }
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

  async function ensureClient(){
    if(client)return client;
    const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;
    if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas cloud client unavailable.');
    client=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  async function resolveTarget(){
    await ensureClient();
    const shared=await root.AtlasCloud?.getSession?.();
    let {data,error}=await client.auth.getSession();if(error)throw error;let session=data?.session||null;
    if(!session&&shared?.access_token&&shared?.refresh_token){const set=await client.auth.setSession({access_token:shared.access_token,refresh_token:shared.refresh_token});if(set.error)throw set.error;session=set.data?.session||null}
    if(!session?.user)throw new Error('Sign in to Atlas cloud first.');
    const user=session.user;
    const vaultResult=await client.from('atlas_vaults').select('id').eq('created_by',user.id).eq('name','Atlas').single();if(vaultResult.error)throw vaultResult.error;
    const profileResult=await client.from('atlas_profiles').select('id').eq('vault_id',vaultResult.data.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profileResult.error)throw profileResult.error;
    if(!profileResult.data?.id)throw new Error('Me cloud profile is unavailable.');
    target={userId:user.id,profileId:profileResult.data.id};return target;
  }
  async function readCanonical(){
    if(!target)await resolveTarget();
    const {data,error}=await client.from('atlas_records').select('profile_id,record_type,record_id,payload,revision').eq('profile_id',target.profileId).eq('record_type',RECORD_TYPE).eq('record_id',RECORD_ID).maybeSingle();
    if(error)throw error;return data||null;
  }
  async function writeCanonical(payload,revision){
    const {data,error}=await client.from('atlas_records').update({payload,client_updated_at:Date.now(),revision:Number(revision)+1,updated_by:target.userId}).eq('profile_id',target.profileId).eq('record_type',RECORD_TYPE).eq('record_id',RECORD_ID).eq('revision',revision).select('revision');
    if(error)throw error;return Array.isArray(data)&&data.length===1;
  }
  async function additiveWrite(localPayload){
    for(let attempt=0;attempt<5;attempt++){
      const remote=await readCanonical();if(!remote)throw new Error('Shared Atlas is unavailable.');
      const merged=unionPayload(remote.payload,localPayload);if(same(merged,remote.payload))return{changed:false,revision:remote.revision,payload:remote.payload};
      if(await writeCanonical(merged,remote.revision))return{changed:true,revision:Number(remote.revision)+1,payload:merged};
    }
    throw new Error('Atlas changed repeatedly while merging. Try again.');
  }
  function joinKey(){return target?.profileId?JOIN_PREFIX+target.profileId:''}
  function recoveryKey(){return target?.profileId?RECOVERY_PREFIX+target.profileId:''}
  function mark(key){try{if(key)localStorage.setItem(key,String(Date.now()))}catch(_){}}
  function has(key){try{return !!(key&&localStorage.getItem(key))}catch(_){return false}}

  async function safeMergeCurrentDevice(){
    if(busy)return;busy=true;
    try{
      await resolveTarget();
      if(typeof idbBackup==='function')await idbBackup(clone(state),'before safe additive device merge');
      await additiveWrite(buildPayload(state));
      mark(joinKey());
      root.toast?.('Device merged safely');
      await root.AtlasCloudSync?.refreshNow?.();
    }catch(error){root.toast?.('Device merge failed');console.error('Atlas additive merge failed',error)}finally{busy=false}
  }

  function containsIncidentMarker(snapshot){
    const areas=Array.isArray(snapshot?.areas)?snapshot.areas:[];
    const projects=Array.isArray(snapshot?.projects)?snapshot.projects:[];
    return areas.some(item=>/go\s*safe/i.test(String(item?.name||'')))||projects.some(item=>/go\s*safe/i.test(String(item?.title||'')));
  }
  async function recoverIncidentBackupOnce(){
    if(busy||typeof idbBackups!=='function')return;
    try{
      await resolveTarget();
      if(has(recoveryKey()))return;
      const backups=await idbBackups();
      const incident=(backups||[]).find(item=>item?.reason===OVERWRITE_REASON&&item?.data&&containsIncidentMarker(item.data));
      if(!incident)return;
      busy=true;
      const result=await additiveWrite(buildPayload(incident.data));
      mark(recoveryKey());mark(joinKey());
      if(result.changed){root.toast?.('Morning Atlas state recovered');await root.AtlasCloudSync?.refreshNow?.()}
    }catch(error){console.error('Atlas incident recovery failed',error)}finally{busy=false}
  }

  async function recoverPreSyncBackupOnce(){
    if(busy||typeof idbBackups!=='function')return;
    try{
      await resolveTarget();
      const legacyKey=target?.profileId?`atlas_v0130_additive_recovery_v1:${target.profileId}`:'';
      if(has(legacyKey))return;
      const backups=await idbBackups();
      const backup=(backups||[]).find(item=>item?.reason===PRE_SYNC_REASON&&item?.data);
      if(!backup)return;
      busy=true;
      const result=await additiveWrite(buildPayload(backup.data));
      mark(legacyKey);mark(joinKey());
      if(result.changed){root.toast?.('Pre-sync Atlas data recovered');await root.AtlasCloudSync?.refreshNow?.()}
    }catch(error){console.error('Atlas pre-sync recovery failed',error)}finally{busy=false}
  }

  root.addEventListener('load',()=>setTimeout(recoverIncidentBackupOnce,900));
  root.addEventListener('load',()=>setTimeout(recoverPreSyncBackupOnce,1500));
  setTimeout(recoverIncidentBackupOnce,1400);
  setTimeout(recoverPreSyncBackupOnce,2200);
  root.AtlasCanonicalMigrationHotfix=Object.freeze({safeMergeCurrentDevice,recoverIncidentBackupOnce,recoverPreSyncBackupOnce});
})(window);
