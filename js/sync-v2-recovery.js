// Atlas v0.16.9-r23: explicit canonical recovery promotion.
// Used once to promote a trusted local Atlas after a stale cloud-baseline incident.
(function(root){
  'use strict';
  const Core=root.AtlasSyncV2Core;if(!Core)return;
  const ENTITY_TYPE='entity_state_v2',META_TYPE='entity_sync_v2_meta',META_ID='baseline',RECOVERY_TYPE='entity_recovery_snapshot_v1';
  const PAGE_SIZE=400;
  let client=null,target=null,prepared=null,lastResult=null,busy=false;

  const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
  const plain=v=>!!v&&Object.prototype.toString.call(v)==='[object Object]';
  const localRecords=()=>Core.flattenState(state);
  const fingerprint=records=>Core.canonical(records||{});
  const recordCount=records=>Object.keys(records||{}).length;
  const epoch=()=>`epoch-${Date.now().toString(36)}-${(crypto?.randomUUID?.()||Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,14)}`;
  const recoveryId=label=>`${label}-${Date.now().toString(36)}-${(crypto?.randomUUID?.()||Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,12)}`;

  function emit(stateName,message,extra={}){
    try{root.dispatchEvent(new CustomEvent('atlascanonicalstatus',{detail:{state:stateName,message,recordLevel:true,recovery:true,...extra}}))}catch(_){}
  }
  function eligible(){
    const cloud=root.AtlasCloud?.getStatus?.();
    return state?.settings?.activeProfile==='me'&&online()&&cloud?.authenticated&&cloud?.verified;
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
  async function readEntityRows(){
    if(!target)await resolveTarget();const rows=[];let from=0;
    while(true){const {data,error}=await client.from('atlas_records').select('record_id,payload,revision,client_updated_at,updated_at').eq('profile_id',target.profileId).eq('record_type',ENTITY_TYPE).order('record_id',{ascending:true}).range(from,from+PAGE_SIZE-1);if(error)throw error;const batch=Array.isArray(data)?data:[];rows.push(...batch);if(batch.length<PAGE_SIZE)break;from+=PAGE_SIZE}
    return rows;
  }
  function entriesFromRows(rows){
    const out={};for(const row of rows||[]){const record=Core.recordFromPayload(row?.payload);if(!record)continue;const key=Core.keyFor(record.kind,record.id);if(row.record_id!==key)continue;out[key]={record,revision:Number(row.revision||0)}}return out;
  }
  async function appendRecoverySnapshot(label,entries,meta){
    const id=recoveryId(label),payload={schema:'atlas_entity_recovery_snapshot',version:1,label,createdAt:Date.now(),previousMeta:meta?.payload||null,records:Object.fromEntries(Object.entries(entries||{}).map(([key,entry])=>[key,{record:Core.clone(entry.record||entry),revision:Number(entry.revision||0)}]))};
    const {error}=await client.from('atlas_records').insert({profile_id:target.profileId,record_type:RECOVERY_TYPE,record_id:id,payload,client_updated_at:Date.now(),updated_by:target.userId});if(error)throw error;return id;
  }
  async function appendTrustedMeBackup(){
    const backup=root.AtlasCloudBackup,cloud=root.AtlasCloud;if(!backup?.buildMeSnapshot||!cloud?.appendMeBackupSnapshot)return null;
    const payload=backup.buildMeSnapshot(state),recordId=await backup.fingerprint(payload),result=await cloud.appendMeBackupSnapshot({recordType:backup.RECORD_TYPE,recordId,payload,clientUpdatedAt:Number(state.meta?.lastSavedAt||Date.now())});
    if(!result?.ok)throw new Error(result?.error||'Could not preserve trusted Me backup.');return recordId;
  }
  async function writeRecord(key,record,remoteEntry){
    const payload=Core.payloadFor(record,'canonical-recovery',Date.now()),now=Date.now();
    if(remoteEntry){
      const {data,error}=await client.from('atlas_records').update({payload,client_updated_at:now,revision:Number(remoteEntry.revision||0)+1,updated_by:target.userId}).eq('profile_id',target.profileId).eq('record_type',ENTITY_TYPE).eq('record_id',key).eq('revision',Number(remoteEntry.revision||0)).select('record_id,revision');if(error)throw error;return Array.isArray(data)&&data.length===1;
    }
    const {error}=await client.from('atlas_records').insert({profile_id:target.profileId,record_type:ENTITY_TYPE,record_id:key,payload,client_updated_at:now,updated_by:target.userId});if(error){if(error.code==='23505')return false;throw error}return true;
  }
  async function writeMeta(meta,newEpoch,canonicalFingerprint){
    const payload={schema:'atlas_entity_sync_meta',version:2,status:'ready',canonicalEpoch:newEpoch,canonicalFingerprint,recoveredAt:Date.now(),recoverySource:'trusted_local_promotion',dataVersion:Number(state?.version||8)};
    if(meta){
      const {data,error}=await client.from('atlas_records').update({payload,client_updated_at:Date.now(),revision:Number(meta.revision||0)+1,updated_by:target.userId}).eq('profile_id',target.profileId).eq('record_type',META_TYPE).eq('record_id',META_ID).eq('revision',Number(meta.revision||0)).select('record_id,revision');if(error)throw error;if(!Array.isArray(data)||data.length!==1)throw new Error('Canonical metadata changed during recovery. Preview again.');
    }else{
      const {error}=await client.from('atlas_records').insert({profile_id:target.profileId,record_type:META_TYPE,record_id:META_ID,payload,client_updated_at:Date.now(),updated_by:target.userId});if(error)throw error;
    }
    return payload;
  }

  async function preview(){
    prepared=null;lastResult=null;if(!eligible())return{ok:false,error:'Sign in, select Me, and Test Access on the trusted desktop before previewing canonical recovery.'};
    try{
      await resolveTarget();const meta=await readMeta(),remote=entriesFromRows(await readEntityRows()),local=localRecords(),fp=fingerprint(local);
      prepared={fingerprint:fp,localCount:recordCount(local),remoteCount:recordCount(remote),metaRevision:Number(meta?.revision||0),previousEpoch:meta?.payload?.canonicalEpoch||''};
      const result={ok:true,...prepared,hasCanonicalEpoch:!!prepared.previousEpoch};lastResult=result;emit('RECOVERY PREVIEW','Trusted desktop is ready to become the canonical Atlas.',result);return result;
    }catch(error){const result={ok:false,error:String(error?.message||'Canonical recovery preview failed.')};lastResult=result;return result}
  }

  async function confirm(){
    if(busy)return{ok:false,error:'Canonical recovery is already running.'};if(!prepared||!eligible())return{ok:false,error:'Preview canonical recovery first on the trusted desktop.'};
    const current=localRecords(),currentFingerprint=fingerprint(current);if(currentFingerprint!==prepared.fingerprint){prepared=null;return{ok:false,previewRequired:true,error:'Atlas changed since the recovery preview. Preview again.'}}
    busy=true;emit('RECOVERING','Preserving both copies before canonical promotion…');
    try{
      await resolveTarget();const meta=await readMeta();if(Number(meta?.revision||0)!==prepared.metaRevision){prepared=null;throw new Error('Cloud Atlas changed since preview. Preview again.')}
      const remote=entriesFromRows(await readEntityRows());
      if(typeof idbBackup==='function')await idbBackup(Core.clone(state),'before canonical cloud promotion');
      const trustedBackupId=await appendTrustedMeBackup();
      const oldCloudSnapshotId=await appendRecoverySnapshot('old-cloud-before-promotion',remote,meta);
      const trustedLocalSnapshotId=await appendRecoverySnapshot('trusted-local-before-promotion',Object.fromEntries(Object.entries(current).map(([key,record])=>[key,{record,revision:0}])),meta);
      emit('RECOVERING','Recovery snapshots saved. Promoting trusted desktop…',{trustedBackupId,oldCloudSnapshotId,trustedLocalSnapshotId});
      const keys=new Set([...Object.keys(remote),...Object.keys(current)]);
      for(const key of keys){const desired=current[key]||Core.tombstoneFor(remote[key]?.record);if(!desired)continue;const ok=await writeRecord(key,desired,remote[key]);if(!ok)throw new Error('Cloud Atlas changed during promotion. Recovery snapshots are safe; preview and retry.')}
      const newEpoch=epoch(),finalFingerprint=fingerprint(current);await writeMeta(meta,newEpoch,finalFingerprint);
      prepared=null;const result={ok:true,canonicalEpoch:newEpoch,records:recordCount(current),trustedBackupId,oldCloudSnapshotId,trustedLocalSnapshotId,completedAt:Date.now()};lastResult=result;
      emit('CANONICAL READY','This desktop is now the canonical cloud Atlas. Other devices will pull this epoch before they can write.',result);
      try{root.dispatchEvent(new CustomEvent('atlascanonicalrecovered',{detail:result}))}catch(_){}
      return result;
    }catch(error){const result={ok:false,error:String(error?.message||'Canonical recovery failed. Recovery snapshots already written are preserved.')};lastResult=result;emit('RECOVERY ERROR',result.error);return result}finally{busy=false}
  }

  function status(){return{prepared:!!prepared,busy,lastResult:plain(lastResult)?{...lastResult}:lastResult}}
  root.AtlasSyncRecovery=Object.freeze({preview,confirm,status});
})(window);
