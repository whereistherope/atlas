// Optional authenticated cloud connection. IndexedDB remains Atlas's source of truth.
(function(){
  'use strict';
  let client=null;
  let status={state:'LOCAL',message:'Cloud not initialised',email:'',authenticated:false,verified:false};
  const snapshot=()=>Object.freeze({...status});
  function emit(next){status={...status,...next};try{window.dispatchEvent(new CustomEvent('atlascloudstatus',{detail:snapshot()}))}catch(_){}return snapshot()}
  function offline(){return typeof navigator!=='undefined'&&navigator.onLine===false}
  function errorMessage(error,fallback){return String(error?.message||fallback||'Cloud request failed.').slice(0,160)}
  async function refreshSession(){
    if(!client)return null;
    try{const {data,error}=await client.auth.getSession();if(error)throw error;const session=data?.session||null;emit(session?{state:'CONNECTED',message:'Signed in',email:session.user?.email||'',authenticated:true,verified:false}:{state:'SIGNED OUT',message:'Sign in to connect',email:'',authenticated:false,verified:false});return session}catch(error){emit({state:offline()?'OFFLINE':'ERROR',message:errorMessage(error),email:'',authenticated:false,verified:false});return null}
  }
  async function init(){
    if(client)return snapshot();
    if(offline())return emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false});
    const config=window.ATLAS_CLOUD_CONFIG,library=window.supabase;
    if(!config?.url||!config?.publishableKey||typeof library?.createClient!=='function')return emit({state:'LOCAL',message:'Cloud client unavailable',authenticated:false,verified:false});
    try{
      client=library.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      client.auth.onAuthStateChange((_event,session)=>emit(session?{state:'CONNECTED',message:'Signed in',email:session.user?.email||'',authenticated:true,verified:false}:{state:'SIGNED OUT',message:'Sign in to connect',email:'',authenticated:false,verified:false}));
      return await refreshSession();
    }catch(error){client=null;return emit({state:'ERROR',message:errorMessage(error,'Cloud client unavailable'),authenticated:false,verified:false})}
  }
  async function signIn(email,password){
    if(offline()){emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false});return{ok:false,error:'Offline'}}
    if(!client)await init();if(!client)return{ok:false,error:status.message};
    emit({state:'CONNECTING',message:'Signing in',verified:false});
    try{const {data,error}=await client.auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});if(error)throw error;const session=data?.session||null;emit({state:'CONNECTED',message:'Signed in',email:session?.user?.email||'',authenticated:true,verified:false});return{ok:true,session}}catch(error){const message=errorMessage(error,'Sign in failed.');emit({state:'ERROR',message,email:'',authenticated:false,verified:false});return{ok:false,error:message}}
  }
  async function signOut(){
    if(!client)return{ok:true};try{const {error}=await client.auth.signOut();if(error)throw error;emit({state:'SIGNED OUT',message:'Signed out',email:'',authenticated:false,verified:false});return{ok:true}}catch(error){const message=errorMessage(error,'Sign out failed.');emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  function invalidateVerification(){if(status.verified)emit({verified:false,message:status.authenticated?'Test access required':'Sign in to connect'});return snapshot()}
  async function testAccess(){
    if(offline()){emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false});return{ok:false,error:'Offline'}}if(!client)await init();if(!client)return{ok:false,error:status.message};
    try{
      const {data:userData,error:userError}=await client.auth.getUser();if(userError)throw userError;const user=userData?.user;if(!user)throw new Error('Sign in required.');
      const {data:vault,error:vaultError}=await client.from('atlas_vaults').select('id,name,created_by').eq('created_by',user.id).eq('name','Atlas').single();if(vaultError)throw vaultError;if(!vault)throw new Error('No accessible Atlas vault.');
      const {data:profile,error:profileError}=await client.from('atlas_profiles').select('id,vault_id,profile_key,name,kind,owner_user_id').eq('vault_id',vault.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profileError)throw profileError;if(!profile||profile.vault_id!==vault.id||profile.owner_user_id!==user.id||profile.profile_key!=='me'||profile.kind!=='person')throw new Error('Me cloud profile is unavailable.');
      emit({state:'CONNECTED',message:'Cloud access verified',email:user.email||status.email,authenticated:true,verified:true});
      return{ok:true,userId:user.id,vaultId:vault.id,vaultName:vault.name,profile:{profileKey:profile.profile_key,name:profile.name,kind:profile.kind}};
    }catch(error){const message=errorMessage(error,'Access test failed.');emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  async function resolveBackupTarget(){
    if(offline())throw new Error('Offline');
    if(!client||!status.authenticated||!status.verified)throw new Error('Test Access is required before backup.');
    const {data:userData,error:userError}=await client.auth.getUser();if(userError)throw userError;const user=userData?.user;if(!user)throw new Error('Sign in required.');
    const {data:vault,error:vaultError}=await client.from('atlas_vaults').select('id,name,created_by').eq('created_by',user.id).eq('name','Atlas').single();if(vaultError)throw vaultError;if(!vault||vault.created_by!==user.id)throw new Error('No accessible Atlas vault.');
    const {data:profile,error:profileError}=await client.from('atlas_profiles').select('id,vault_id,profile_key,kind,owner_user_id').eq('vault_id',vault.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profileError)throw profileError;
    if(!profile?.id||profile.vault_id!==vault.id||profile.profile_key!=='me'||profile.kind!=='person'||profile.owner_user_id!==user.id)throw new Error('Me cloud profile is unavailable.');
    return{userId:user.id,vaultId:vault.id,profileId:profile.id};
  }
  const BACKUP_ID=/^sha256-[a-f0-9]{64}$/;
  const BACKUP_FIELDS=['schema','version','profileKey','dataVersion','areas','links','projects','notes','daily','calendar','quickTodos','scratch'];
  const FORBIDDEN_BACKUP_KEYS=new Set(['password','pin','pinhash','hash','lock','atlaslock','lockconfig','salt','verifier','throttle','attempts','lockeduntil','recovery','recoverycode','recoverycredentials','secret','servicerole','token','accesstoken','refreshtoken','session','supabase','auth','entangledid','sourceeventid','sourcearealabel','relaysource','relaysources','relayid','relaymetadata','relayreceipts','relayledger']);
  function canonicalBackup(value){if(Array.isArray(value))return`[${value.map(canonicalBackup).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalBackup(value[key])}`).join(',')}}`;return JSON.stringify(value)}
  async function backupRecordId(payload){const bytes=new TextEncoder().encode(canonicalBackup(payload)),digest=await crypto.subtle.digest('SHA-256',bytes);return'sha256-'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}
  function validBackupValue(value){
    if(value===null||typeof value==='string'||typeof value==='boolean')return true;
    if(typeof value==='number')return Number.isFinite(value);
    if(Array.isArray(value))return value.every(validBackupValue);
    if(!value||Object.prototype.toString.call(value)!=='[object Object]')return false;
    return Object.entries(value).every(([key,item])=>{
      const normalized=key.toLowerCase().replace(/[^a-z0-9]/g,'');
      if(FORBIDDEN_BACKUP_KEYS.has(normalized))return false;
      if(key==='profile'&&item!=='me')return false;
      return validBackupValue(item);
    });
  }
  function validBackupPayload(payload){
    if(!payload||Object.prototype.toString.call(payload)!=='[object Object]')return false;
    const keys=Object.keys(payload);if(keys.length!==BACKUP_FIELDS.length||keys.some(key=>!BACKUP_FIELDS.includes(key)))return false;
    if(payload.schema!=='atlas_me_backup_snapshot'||payload.version!==1||payload.profileKey!=='me'||!Number.isInteger(payload.dataVersion)||payload.dataVersion<1||payload.dataVersion>(typeof DATA_VERSION==='number'?DATA_VERSION:8))return false;
    if(!['areas','links','projects','notes','daily','calendar','quickTodos'].every(key=>Array.isArray(payload[key]))||typeof payload.scratch!=='string')return false;
    return validBackupValue(payload)&&validBackupGraph(payload);
  }
  function validBackupGraph(payload){
    const validId=value=>typeof value==='string'&&value.trim()===value&&value.length>0;
    if(!payload.areas.every(area=>validId(area?.id)))return false;
    const areaIds=new Set(payload.areas.map(area=>area.id));if(areaIds.size!==payload.areas.length)return false;
    const validOptionalArea=value=>value===undefined||value===null||value===''||(validId(value)&&areaIds.has(value));
    if(payload.areas.some(area=>{const parent=area.parentId;return !(parent===undefined||parent===null||parent===''||parent==='atlas'||(validId(parent)&&areaIds.has(parent)))}))return false;
    if(payload.links.some(link=>!validId(link?.source)||!validId(link?.target)||!areaIds.has(link.source)||!areaIds.has(link.target)))return false;
    if(payload.projects.some(project=>!validOptionalArea(project?.areaId)||!validOptionalArea(project?.topicId)))return false;
    if(payload.notes.some(note=>!validOptionalArea(note?.areaId)||!validOptionalArea(note?.topicId)))return false;
    if(payload.daily.some(entry=>!validOptionalArea(entry?.areaId)))return false;
    if(payload.calendar.some(entry=>!validOptionalArea(entry?.areaId)))return false;
    return true;
  }
  async function meBackupExists(recordId){
    try{if(!BACKUP_ID.test(recordId||''))throw new Error('Invalid Me backup record ID.');const target=await resolveBackupTarget();const {data,error}=await client.from('atlas_records').select('record_id').eq('profile_id',target.profileId).eq('record_type','backup_snapshot_v1').eq('record_id',recordId).maybeSingle();if(error)throw error;return{ok:true,exists:!!data,target}}catch(error){const message=errorMessage(error);emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  async function appendMeBackupSnapshot(record){
    try{
      const target=await resolveBackupTarget();
      if(record?.recordType!=='backup_snapshot_v1'||!validBackupPayload(record?.payload)||!Number.isSafeInteger(record?.clientUpdatedAt)||record.clientUpdatedAt<=0)throw new Error('Invalid Me backup snapshot.');
      const recordId=await backupRecordId(record.payload);if(record.recordId!==undefined&&record.recordId!==recordId)throw new Error('Me backup fingerprint mismatch.');
      const existing=await client.from('atlas_records').select('record_id').eq('profile_id',target.profileId).eq('record_type','backup_snapshot_v1').eq('record_id',recordId).maybeSingle();if(existing.error)throw existing.error;if(existing.data)return{ok:true,alreadyBackedUp:true,recordId};
      const row={profile_id:target.profileId,record_type:'backup_snapshot_v1',record_id:recordId,payload:record.payload,client_updated_at:record.clientUpdatedAt};
      const {error}=await client.from('atlas_records').insert(row);if(error){if(error.code==='23505')return{ok:true,alreadyBackedUp:true};throw error}
      return{ok:true,alreadyBackedUp:false,recordId,completedAt:Date.now()};
    }catch(error){const message=errorMessage(error,'Backup failed.');emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  async function validateBackupRow(row,profileId){
    if(!row||row.profile_id!==profileId||row.record_type!=='backup_snapshot_v1'||!BACKUP_ID.test(row.record_id||'')||!validBackupPayload(row.payload))throw new Error('Invalid Me cloud backup snapshot.');
    const recomputed=await backupRecordId(row.payload);if(recomputed!==row.record_id)throw new Error('Me cloud backup fingerprint mismatch.');
    return Object.freeze({...row,payload:row.payload});
  }
  async function readMeBackup(exactId){
    try{
      if(exactId!==undefined&&!BACKUP_ID.test(exactId||''))throw new Error('Invalid Me backup record ID.');
      const target=await resolveBackupTarget();
      let query=client.from('atlas_records').select('profile_id,record_type,record_id,payload,client_updated_at,created_at,revision').eq('profile_id',target.profileId).eq('record_type','backup_snapshot_v1');
      if(exactId!==undefined)query=query.eq('record_id',exactId);else query=query.order('created_at',{ascending:false}).limit(1);
      const {data,error}=await query.maybeSingle();if(error)throw error;if(!data)return{ok:true,record:null};
      return{ok:true,record:await validateBackupRow(data,target.profileId)};
    }catch(error){const message=errorMessage(error,'Restore read failed.');emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  const latestMeBackupSnapshot=()=>readMeBackup();
  const getMeBackupSnapshot=recordId=>readMeBackup(recordId);
  window.addEventListener?.('offline',()=>emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false}));
  window.addEventListener?.('online',()=>{if(client)refreshSession();else init()});
  window.AtlasCloud=Object.freeze({init,getStatus:snapshot,getSession:refreshSession,signIn,signOut,testAccess,invalidateVerification,meBackupExists,appendMeBackupSnapshot,latestMeBackupSnapshot,getMeBackupSnapshot});
})();
