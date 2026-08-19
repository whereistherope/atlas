// v0.13.0 migration hotfix: device onboarding is additive, never deletion-by-absence.
(function(root){
  'use strict';
  const RECORD_TYPE='canonical_state_v1',RECORD_ID='primary';
  const COLLECTIONS=['profiles','areas','links','projects','notes','daily','calendar','quickTodos','activity'];
  const JOIN_PREFIX='atlas_canonical_joined_v1:';
  const RECOVERY_PREFIX='atlas_v0130_additive_recovery_v1:';
  const PRE_SYNC_REASON='before Atlas v0.13.0 canonical sync';
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
      if(localText&&localText!==remoteText&&!remoteText.includes(localText))result[key]=`${remoteText}\n\n--- Imported from another device ---\n\n${localText}`;
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
      const merged=unionPayload(remote.payload,localPayload);if(same(merged,remote.payload))return{changed:false,revision:remote.revision};
      if(await writeCanonical(merged,remote.revision))return{changed:true,revision:Number(remote.revision)+1};
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
      mark(joinKey());mark(recoveryKey());
      root.toast?.('Device merged safely');
      setTimeout(()=>location.reload(),500);
    }catch(error){root.toast?.('Device merge failed');console.error('Atlas additive merge failed',error)}finally{busy=false}
  }
  async function recoverPreSyncBackupOnce(){
    if(busy||typeof idbBackups!=='function')return;
    try{
      await resolveTarget();
      if(!has(joinKey())||has(recoveryKey()))return;
      const backups=await idbBackups();
      const backup=(backups||[]).find(item=>item?.reason===PRE_SYNC_REASON&&item?.data);
      if(!backup)return;
      busy=true;
      const result=await additiveWrite(buildPayload(backup.data));
      mark(recoveryKey());
      if(result.changed){root.toast?.('Pre-sync Atlas data recovered');setTimeout(()=>location.reload(),700)}
    }catch(error){console.error('Atlas pre-sync recovery failed',error)}finally{busy=false}
  }
  function interceptMerge(event){
    const button=event.target?.closest?.('#atlasCanonicalBanner button');if(!button)return;
    if(String(button.textContent||'').trim().toUpperCase()!=='MERGE THIS DEVICE')return;
    event.preventDefault();event.stopImmediatePropagation();button.disabled=true;button.textContent='MERGING…';safeMergeCurrentDevice();
  }
  document.addEventListener('click',interceptMerge,true);
  root.addEventListener('load',()=>setTimeout(recoverPreSyncBackupOnce,1200));
  setTimeout(recoverPreSyncBackupOnce,1800);
  root.AtlasCanonicalMigrationHotfix=Object.freeze({safeMergeCurrentDevice,recoverPreSyncBackupOnce});
})(window);
