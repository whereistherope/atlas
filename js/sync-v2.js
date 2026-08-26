// Atlas Sync v2: per-record cloud state. No device can replace the whole Atlas by opening a stale snapshot.
(function(root){
  'use strict';
  const Core=root.AtlasSyncV2Core;if(!Core)return;
  const ENTITY_TYPE='entity_state_v2',META_TYPE='entity_sync_v2_meta',META_ID='baseline';
  const LEGACY_TYPE='canonical_state_v1',LEGACY_ID='primary';
  const BASE_PREFIX='atlas_entity_sync_v2_base:';
  const DEVICE_KEY='atlas_entity_sync_v2_device';
  const PAGE_SIZE=400;
  let client=null,target=null,ready=false,loaded=false,busy=false,pollTimer=null,pushTimer=null,localSeq=0,lastMessage='',bootRecords={};

  const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
  const localFingerprint=()=>Core.canonical(Core.flattenState(state));
  const localStillSame=(seq,fp)=>localSeq===seq&&localFingerprint()===fp;
  function deviceId(){
    try{let id=localStorage.getItem(DEVICE_KEY);if(id)return id;id=(crypto?.randomUUID?.()||`device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`);localStorage.setItem(DEVICE_KEY,id);return id}catch(_){return`volatile-${Math.random().toString(36).slice(2,9)}`}
  }
  function emit(stateName,message,extra={}){
    lastMessage=message;
    const detail={state:stateName,message,joined:ready,dirty:stateName==='PENDING'||stateName==='SYNCING',revision:0,recordLevel:true,...extra};
    try{root.dispatchEvent(new CustomEvent('atlascanonicalstatus',{detail}))}catch(_){}return detail;
  }

  async function ensureClient(){
    if(client)return client;const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;
    if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas cloud client unavailable.');
    client=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;
  }
  async function resolveTarget(){
    await ensureClient();let {data,error}=await client.auth.getSession();if(error)throw error;let session=data?.session||null;
    if(!session){const shared=await root.AtlasCloud?.getSession?.();if(shared?.access_token&&shared?.refresh_token){const set=await client.auth.setSession({access_token:shared.access_token,refresh_token:shared.refresh_token});if(set.error)throw set.error;session=set.data?.session||null}}
    if(!session?.user)throw new Error('Sign in to Atlas cloud first.');const user=session.user;
    const vaultResult=await client.from('atlas_vaults').select('id').eq('created_by',user.id).eq('name','Atlas').single();if(vaultResult.error)throw vaultResult.error;
    const profileResult=await client.from('atlas_profiles').select('id').eq('vault_id',vaultResult.data.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profileResult.error)throw profileResult.error;
    if(!profileResult.data?.id)throw new Error('Me cloud profile is unavailable.');target={userId:user.id,profileId:profileResult.data.id};return target;
  }
  async function readMeta(){
    if(!target)await resolveTarget();const {data,error}=await client.from('atlas_records').select('record_id,payload,revision,created_at,updated_at').eq('profile_id',target.profileId).eq('record_type',META_TYPE).eq('record_id',META_ID).maybeSingle();if(error)throw error;return data||null;
  }
  function validMeta(row){return !!(row?.payload&&row.payload.schema==='atlas_entity_sync_meta'&&row.payload.version===2&&row.payload.status==='ready')}
  function validLegacyPayload(payload){
    return !!(Core.plain(payload)&&payload.schema==='atlas_canonical_state'&&payload.version===1&&Number.isInteger(payload.dataVersion)&&Core.COLLECTIONS.every(key=>Array.isArray(payload[key]))&&Core.plain(payload.scratch));
  }
  async function readLegacyCanonical(){
    if(!target)await resolveTarget();const {data,error}=await client.from('atlas_records').select('record_id,payload,revision,client_updated_at,updated_at').eq('profile_id',target.profileId).eq('record_type',LEGACY_TYPE).eq('record_id',LEGACY_ID).maybeSingle();if(error)throw error;
    if(!data)return null;if(!validLegacyPayload(data.payload))throw new Error('Existing shared Atlas data is invalid and was not migrated.');return data;
  }
  async function readEntityRows(){
    if(!target)await resolveTarget();const rows=[];let from=0;
    while(true){const {data,error}=await client.from('atlas_records').select('record_id,payload,revision,client_updated_at,updated_at').eq('profile_id',target.profileId).eq('record_type',ENTITY_TYPE).order('record_id',{ascending:true}).range(from,from+PAGE_SIZE-1);if(error)throw error;const batch=Array.isArray(data)?data:[];rows.push(...batch);if(batch.length<PAGE_SIZE)break;from+=PAGE_SIZE}
    return rows;
  }
  function entriesFromRows(rows){
    const out={};for(const row of rows||[]){const record=Core.recordFromPayload(row?.payload);if(!record)continue;const key=Core.keyFor(record.kind,record.id);if(row.record_id!==key)continue;out[key]={record,revision:Number(row.revision||0)}}return out;
  }
  function baseKey(){return target?.profileId?BASE_PREFIX+target.profileId:''}
  async function readBase(){
    const key=baseKey();if(!key)return null;
    if(db&&typeof DB_STORE==='string')try{const value=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),req=tx.objectStore(DB_STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)});if(value?.schema==='atlas_entity_sync_base'&&value.version===2&&Core.plain(value.records))return value}catch(_){}
    try{const raw=localStorage.getItem(key),value=raw?JSON.parse(raw):null;return value?.schema==='atlas_entity_sync_base'&&value.version===2&&Core.plain(value.records)?value:null}catch(_){return null}
  }
  async function writeBase(entries){
    const key=baseKey(),value={schema:'atlas_entity_sync_base',version:2,savedAt:Date.now(),records:Core.clone(entries||{})};if(!key)return;
    if(db&&typeof DB_STORE==='string')try{await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return}catch(_){}
    try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}
  }

  async function writeMutation(key,record,remoteEntry){
    const payload=Core.payloadFor(record,deviceId(),Date.now()),now=Date.now();
    if(remoteEntry){
      const {data,error}=await client.from('atlas_records').update({payload,client_updated_at:now,revision:Number(remoteEntry.revision||0)+1,updated_by:target.userId}).eq('profile_id',target.profileId).eq('record_type',ENTITY_TYPE).eq('record_id',key).eq('revision',Number(remoteEntry.revision||0)).select('record_id,revision');if(error)throw error;return Array.isArray(data)&&data.length===1;
    }
    const {error}=await client.from('atlas_records').insert({profile_id:target.profileId,record_type:ENTITY_TYPE,record_id:key,payload,client_updated_at:now,updated_by:target.userId});if(error){if(error.code==='23505')return false;throw error}return true;
  }
  async function seedMissingRecords(records){
    const desired=records||{};
    for(let attempt=0;attempt<5;attempt++){
      const remote=entriesFromRows(await readEntityRows());let conflicted=false;
      for(const [key,record] of Object.entries(desired)){
        if(remote[key])continue;
        const ok=await writeMutation(key,record,null);if(!ok){conflicted=true;break}
      }
      if(!conflicted)return;
    }
    throw new Error('Could not complete the shared Atlas migration.');
  }
  async function insertMeta(source,dataVersion){
    const payload={schema:'atlas_entity_sync_meta',version:2,status:'ready',migratedAt:Date.now(),migrationSource:source,dataVersion:Number(dataVersion||8)};
    const {error}=await client.from('atlas_records').insert({profile_id:target.profileId,record_type:META_TYPE,record_id:META_ID,payload,client_updated_at:Date.now(),updated_by:target.userId});if(error&&error.code!=='23505')throw error;
  }
  async function migrateSharedCloud(){
    if(busy)return false;busy=true;
    try{
      emit('MIGRATING','Upgrading shared Atlas data to record-level sync…');await resolveTarget();const existing=await readMeta();if(validMeta(existing)){ready=true;return true}
      const legacy=await readLegacyCanonical();
      const sourceState=legacy?.payload||null;
      if(sourceState){
        await seedMissingRecords(Core.flattenState(sourceState));
        await insertMeta('canonical_state_v1',sourceState.dataVersion);
      }else{
        // Only a genuinely empty cloud is bootstrapped from local data. This is not used when shared Atlas data already exists.
        await seedMissingRecords(Core.flattenState(state));
        await insertMeta('empty_cloud_bootstrap',Number(state?.version||8));
      }
      const confirmed=await readMeta();if(!validMeta(confirmed))throw new Error('Record-level Atlas migration was not confirmed.');ready=true;emit('SYNCED','Shared Atlas upgraded to record-level sync.');return true;
    }catch(error){ready=false;emit('ERROR',String(error?.message||'Could not upgrade shared Atlas sync.'));return false}finally{busy=false}
  }

  function timeValue(item){
    for(const key of ['updatedAt','modifiedAt','createdAt','time','start']){const raw=item?.[key];if(raw===undefined||raw===null)continue;const n=Number(raw);if(Number.isFinite(n)&&n>0)return n;const d=Date.parse(raw);if(Number.isFinite(d))return d}return 0;
  }
  function materialiseEntries(entries,current){
    const candidate=Core.clone(current),records=Object.values(entries||{}).map(entry=>entry.record).filter(Boolean);
    for(const kind of Core.COLLECTIONS){
      const active=records.filter(record=>record.kind===kind&&!record.deleted).map(record=>Core.clone(record.data));
      const oldOrder=new Map((Array.isArray(current?.[kind])?current[kind]:[]).map((item,index)=>[String(item?.id),index]));
      if(['projects','notes','daily','calendar','quickTodos','activity'].includes(kind))active.sort((a,b)=>timeValue(b)-timeValue(a)||(oldOrder.get(String(a?.id))??1e9)-(oldOrder.get(String(b?.id))??1e9));
      else active.sort((a,b)=>(oldOrder.get(String(a?.id))??1e9)-(oldOrder.get(String(b?.id))??1e9)||String(a?.id||'').localeCompare(String(b?.id||'')));
      candidate[kind]=active;
    }
    const scratch={};for(const record of records)if(record.kind==='scratch'&&!record.deleted)scratch[record.id]=String(record.data??'');candidate.scratch=scratch;return candidate;
  }
  async function applyRemote(entries,startSeq,startFingerprint){
    if(!localStillSame(startSeq,startFingerprint))return false;const candidate=materialiseEntries(entries,state);
    const before=localFingerprint(),after=Core.canonical(Core.flattenState(candidate));
    if(before!==after&&typeof idbBackup==='function')await idbBackup(Core.clone(state),'before Atlas Sync v2 remote apply');
    if(!localStillSame(startSeq,startFingerprint))return false;state=ensureState(candidate);if(db)await idbSet(state);else try{localStorage.setItem(FALLBACK_KEY,JSON.stringify(state))}catch(_){};renderAll(false);return true;
  }

  async function syncNow(){
    if(!ready||busy||!online())return;busy=true;const startSeq=localSeq,startFingerprint=localFingerprint();
    try{
      emit('SYNCING','Reconciling Atlas records…');const base=await readBase(),baseRecords=base?.records||{},hasBase=!!base;
      for(let attempt=0;attempt<4;attempt++){
        const remote=entriesFromRows(await readEntityRows()),local=Core.flattenState(state),plan=hasBase?Core.reconcile(baseRecords,remote,local,true):Core.reconcileFirstContact(remote,bootRecords,local);let conflicted=false;
        for(const [key,record] of Object.entries(plan.mutations)){
          if(!localStillSame(startSeq,startFingerprint)){schedulePush(100);return}
          const ok=await writeMutation(key,record,remote[key]);if(!ok){conflicted=true;break}
        }
        if(conflicted)continue;
        const finalRemote=entriesFromRows(await readEntityRows());if(!localStillSame(startSeq,startFingerprint)){schedulePush(100);return}
        const applied=await applyRemote(finalRemote,startSeq,startFingerprint);if(!applied){schedulePush(100);return}await writeBase(finalRemote);bootRecords=Core.flattenState(state);emit('SYNCED','Atlas synced safely by record.',{records:Object.keys(finalRemote).length});return;
      }
      throw new Error('Atlas records changed repeatedly while syncing. Retrying shortly.');
    }catch(error){emit(online()?'ERROR':'OFFLINE',String(error?.message||'Record-level sync failed.'));setTimeout(()=>schedulePush(1000),1600)}finally{busy=false}
  }
  function schedulePush(delay=450){if(!ready)return;clearTimeout(pushTimer);pushTimer=setTimeout(syncNow,delay)}
  function startPolling(){clearInterval(pollTimer);pollTimer=setInterval(()=>{if(document.visibilityState!=='hidden')syncNow()},5000)}
  async function initAfterLocalLoad(){
    if(loaded)return;loaded=true;if(!online())return emit('OFFLINE','Atlas is local on this device. Sync will resume automatically when online.');
    try{
      await resolveTarget();let meta=await readMeta();if(!validMeta(meta)){const migrated=await migrateSharedCloud();if(!migrated)return;meta=await readMeta()}
      if(!validMeta(meta))throw new Error('Shared Atlas sync is unavailable.');ready=true;await syncNow();startPolling();
    }catch(error){ready=false;emit('LOCAL',String(error?.message||'Sign in to Atlas cloud to sync.'))}
  }

  const originalSave=save,originalLoad=load;
  save=async function(){const result=await originalSave.apply(this,arguments);localSeq++;if(ready){emit('PENDING','Local Atlas changes are waiting to sync.');schedulePush()}return result};
  load=async function(){const result=await originalLoad.apply(this,arguments);bootRecords=Core.flattenState(state);await initAfterLocalLoad();return result};
  root.addEventListener?.('focus',()=>{if(ready)syncNow()});
  root.addEventListener?.('online',()=>{if(!loaded){initAfterLocalLoad();return}if(!ready){loaded=false;initAfterLocalLoad()}else syncNow()});
  document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible'&&ready)syncNow()});
  root.addEventListener?.('atlascloudstatus',event=>{if(event.detail?.authenticated&&!ready){loaded=false;initAfterLocalLoad()}});
  root.AtlasCloudSync=Object.freeze({initAfterLocalLoad,refreshNow:syncNow,pushNow:syncNow,migrateSharedCloud,getStatus:()=>({ready,joined:ready,dirty:lastMessage.includes('waiting'),recordLevel:true,target:target?{profileId:target.profileId}:null})});
})(window);
