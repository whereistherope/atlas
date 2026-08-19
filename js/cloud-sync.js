// Atlas v0.13.0 canonical cloud state. Supabase is authoritative once a device joins the shared Atlas.
(function(root){
  'use strict';
  const RECORD_TYPE='canonical_state_v1',RECORD_ID='primary',SCHEMA='atlas_canonical_state',VERSION=1;
  const COLLECTIONS=['profiles','areas','links','projects','notes','daily','calendar','quickTodos','activity'];
  const JOIN_PREFIX='atlas_canonical_joined_v1:';
  const cloneValue=value=>JSON.parse(JSON.stringify(value));
  const plain=value=>!!value&&Object.prototype.toString.call(value)==='[object Object]';
  const canonical=value=>{if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;if(plain(value))return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;return JSON.stringify(value)};
  const equal=(a,b)=>canonical(a)===canonical(b);
  const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
  let client=null,target=null,row=null,basePayload=null,lastFingerprint='',joined=false,ready=false,pushTimer=null,pollTimer=null,pushing=false,pulling=false,loaded=false;

  function buildPayload(source){
    const out={schema:SCHEMA,version:VERSION,dataVersion:Number(source?.version||8)};
    for(const key of COLLECTIONS)out[key]=cloneValue(Array.isArray(source?.[key])?source[key]:[]);
    out.scratch=cloneValue(plain(source?.scratch)?source.scratch:{});
    return out;
  }
  function validPayload(payload){
    return plain(payload)&&payload.schema===SCHEMA&&payload.version===VERSION&&Number.isInteger(payload.dataVersion)&&payload.dataVersion>0&&COLLECTIONS.every(key=>Array.isArray(payload[key]))&&plain(payload.scratch);
  }
  async function fingerprint(payload){
    const bytes=new TextEncoder().encode(canonical(payload)),digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  function joinKey(){return target?.profileId?JOIN_PREFIX+target.profileId:''}
  function isJoined(){try{return !!(joinKey()&&localStorage.getItem(joinKey()))}catch(_){return false}}
  function markJoined(){joined=true;try{if(joinKey())localStorage.setItem(joinKey(),String(Date.now()))}catch(_){}}
  function emit(state,message,extra={}){try{root.dispatchEvent(new CustomEvent('atlascanonicalstatus',{detail:{state,message,joined,revision:Number(row?.revision||0),...extra}}))}catch(_){}return{state,message,joined,revision:Number(row?.revision||0),...extra}}

  async function ensureClient(){
    if(client)return client;
    const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas cloud client unavailable.');
    client=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  async function resolveTarget(){
    await ensureClient();
    const {data:sessionData,error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
    let session=sessionData?.session||null;
    if(!session){
      const shared=await root.AtlasCloud?.getSession?.();
      if(shared?.access_token&&shared?.refresh_token){const set=await client.auth.setSession({access_token:shared.access_token,refresh_token:shared.refresh_token});if(set.error)throw set.error;session=set.data?.session||null}
    }
    if(!session?.user)throw new Error('Sign in to Atlas cloud first.');
    const user=session.user;
    const {data:vault,error:vaultError}=await client.from('atlas_vaults').select('id,created_by').eq('created_by',user.id).eq('name','Atlas').single();if(vaultError)throw vaultError;
    const {data:profile,error:profileError}=await client.from('atlas_profiles').select('id,vault_id,profile_key,kind,owner_user_id').eq('vault_id',vault.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profileError)throw profileError;
    if(!profile?.id)throw new Error('Me cloud profile is unavailable.');
    target={userId:user.id,vaultId:vault.id,profileId:profile.id};return target;
  }
  async function readCanonical(){
    if(!target)await resolveTarget();
    const {data,error}=await client.from('atlas_records').select('id,profile_id,record_type,record_id,payload,client_updated_at,revision,updated_at').eq('profile_id',target.profileId).eq('record_type',RECORD_TYPE).eq('record_id',RECORD_ID).maybeSingle();
    if(error)throw error;if(data&&!validPayload(data.payload))throw new Error('The shared Atlas state is invalid.');return data||null;
  }
  async function writeNew(payload){
    const now=Date.now();
    const {data,error}=await client.from('atlas_records').insert({profile_id:target.profileId,record_type:RECORD_TYPE,record_id:RECORD_ID,payload,client_updated_at:now,revision:1,updated_by:target.userId}).select('id,profile_id,record_type,record_id,payload,client_updated_at,revision,updated_at').single();
    if(error)throw error;return data;
  }
  async function writeExisting(payload,expectedRevision){
    const next=Number(expectedRevision||0)+1,now=Date.now();
    const {data,error}=await client.from('atlas_records').update({payload,client_updated_at:now,revision:next,updated_by:target.userId}).eq('profile_id',target.profileId).eq('record_type',RECORD_TYPE).eq('record_id',RECORD_ID).eq('revision',expectedRevision).select('id,profile_id,record_type,record_id,payload,client_updated_at,revision,updated_at');
    if(error)throw error;return Array.isArray(data)&&data.length===1?data[0]:null;
  }
  function mergeCollection(baseList,remoteList,localList){
    const base=new Map((baseList||[]).filter(x=>x&&x.id).map(x=>[x.id,x])),remote=new Map((remoteList||[]).filter(x=>x&&x.id).map(x=>[x.id,x])),local=new Map((localList||[]).filter(x=>x&&x.id).map(x=>[x.id,x]));
    const ids=new Set([...base.keys(),...remote.keys(),...local.keys()]),result=[];
    for(const id of ids){
      const b=base.get(id),r=remote.get(id),l=local.get(id),localChanged=!equal(l,b),remoteChanged=!equal(r,b);
      let chosen;if(localChanged&&!remoteChanged)chosen=l;else if(remoteChanged&&!localChanged)chosen=r;else if(localChanged&&remoteChanged)chosen=equal(l,r)?l:l;else chosen=r;
      if(chosen!==undefined)result.push(cloneValue(chosen));
    }
    return result;
  }
  function mergePayload(base,remote,local){
    const merged={schema:SCHEMA,version:VERSION,dataVersion:Math.max(Number(remote?.dataVersion||0),Number(local?.dataVersion||0),8)};
    for(const key of COLLECTIONS)merged[key]=mergeCollection(base?.[key],remote?.[key],local?.[key]);
    const keys=new Set([...Object.keys(base?.scratch||{}),...Object.keys(remote?.scratch||{}),...Object.keys(local?.scratch||{})]);merged.scratch={};
    for(const key of keys){const b=base?.scratch?.[key],r=remote?.scratch?.[key],l=local?.scratch?.[key],lc=!equal(l,b),rc=!equal(r,b);const chosen=lc&&!rc?l:rc&&!lc?r:lc&&rc?(equal(l,r)?l:l):r;if(chosen!==undefined)merged.scratch[key]=chosen}
    return merged;
  }
  async function applyPayload(payload,{backupReason=''}={}){
    if(!validPayload(payload))throw new Error('Cannot apply invalid shared Atlas state.');
    const current=cloneValue(state);if(backupReason&&typeof idbBackup==='function')await idbBackup(current,backupReason);
    const candidate=cloneValue(current);for(const key of COLLECTIONS)candidate[key]=cloneValue(payload[key]);candidate.scratch=cloneValue(payload.scratch);candidate.version=Math.max(Number(candidate.version||1),Number(payload.dataVersion||1));
    state=ensureState(candidate);if(db)await idbSet(state);else try{localStorage.setItem(FALLBACK_KEY,JSON.stringify(state))}catch(_){}
    renderAll(false);
  }
  function removeBanner(){document.getElementById('atlasCanonicalBanner')?.remove()}
  function banner(message,buttons){
    removeBanner();const el=document.createElement('div');el.id='atlasCanonicalBanner';el.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;max-width:min(720px,calc(100vw - 24px));background:#202120;color:#f4f1e8;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px 14px;box-shadow:0 14px 42px rgba(0,0,0,.34);font:13px/1.4 system-ui,sans-serif;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    const text=document.createElement('div');text.style.cssText='flex:1 1 300px';text.textContent=message;el.appendChild(text);
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';for(const item of buttons){const b=document.createElement('button');b.type='button';b.textContent=item.label;b.style.cssText='border:1px solid rgba(255,255,255,.22);background:#343633;color:#fff;padding:8px 11px;border-radius:8px;cursor:pointer';b.addEventListener('click',item.action);actions.appendChild(b)}el.appendChild(actions);document.body.appendChild(el);
  }
  async function initialiseFromThisDevice(){
    try{emit('CONNECTING','Creating the shared Atlas…');const existing=await readCanonical();if(existing){row=existing;return await handleExisting()}const payload=buildPayload(state);row=await writeNew(payload);basePayload=cloneValue(payload);lastFingerprint=await fingerprint(payload);markJoined();ready=true;removeBanner();emit('SYNCED','This device created the shared Atlas.');startPolling();toast?.('Shared Atlas created')}
    catch(error){emit('ERROR',String(error?.message||'Could not create shared Atlas.'));toast?.('Shared Atlas setup failed')}
  }
  async function useSharedAtlas(){
    try{if(!row)row=await readCanonical();if(!row)throw new Error('Shared Atlas is unavailable.');await applyPayload(row.payload,{backupReason:'before joining shared Atlas'});basePayload=cloneValue(row.payload);lastFingerprint=await fingerprint(row.payload);markJoined();ready=true;removeBanner();emit('SYNCED','Using the shared Atlas.');startPolling();toast?.('Shared Atlas loaded')}
    catch(error){emit('ERROR',String(error?.message||'Could not load shared Atlas.'))}
  }
  async function mergeThisDevice(){
    try{if(!row)row=await readCanonical();if(!row)return initialiseFromThisDevice();const local=buildPayload(state),remote=row.payload,merged=mergePayload(remote,remote,local);const written=await writeExisting(merged,row.revision);if(!written){row=await readCanonical();return mergeThisDevice()}row=written;await applyPayload(merged,{backupReason:'before merging this device into shared Atlas'});basePayload=cloneValue(merged);lastFingerprint=await fingerprint(merged);markJoined();ready=true;removeBanner();emit('SYNCED','This device was merged into the shared Atlas.');startPolling();toast?.('Device merged into shared Atlas')}
    catch(error){emit('ERROR',String(error?.message||'Could not merge this device.'))}
  }
  async function handleExisting(){
    const local=buildPayload(state),localFp=await fingerprint(local),remoteFp=await fingerprint(row.payload);joined=isJoined();
    if(joined||localFp===remoteFp){if(!joined)markJoined();if(localFp!==remoteFp)await applyPayload(row.payload,{backupReason:'before first shared Atlas refresh'});basePayload=cloneValue(row.payload);lastFingerprint=remoteFp;ready=true;removeBanner();emit('SYNCED','Shared Atlas loaded.');startPolling();return}
    ready=false;emit('MIGRATION','This device has local Atlas data that is not yet part of the shared Atlas.');
    banner('This device has its own existing Atlas data. Choose once: merge this device into the shared Atlas, or replace it with the shared Atlas. A local safety backup is made first.',[
      {label:'MERGE THIS DEVICE',action:mergeThisDevice},{label:'USE SHARED ATLAS',action:useSharedAtlas}
    ]);
  }
  async function initAfterLocalLoad(){
    if(loaded)return;loaded=true;if(!online())return emit('OFFLINE','Using the local cached Atlas.');
    try{await resolveTarget();row=await readCanonical();if(!row){joined=false;ready=false;emit('SETUP','No shared Atlas exists yet.');banner('Atlas is ready for its one-time single-source setup. Use the device with the most complete Atlas data, then every other device will load the same Atlas.',[{label:'USE THIS ATLAS AS THE SHARED ATLAS',action:initialiseFromThisDevice}]);return}await handleExisting()}
    catch(error){emit('LOCAL',String(error?.message||'Sign in to Atlas cloud to use the shared Atlas.'))}
  }
  async function pushNow(){
    if(!ready||!joined||pushing||!online()||!row)return;pushing=true;
    try{
      let local=buildPayload(state),localFp=await fingerprint(local);if(localFp===lastFingerprint)return;
      let written=await writeExisting(local,row.revision);
      if(!written){const latest=await readCanonical();if(!latest)throw new Error('Shared Atlas disappeared.');const merged=mergePayload(basePayload||latest.payload,latest.payload,local);written=await writeExisting(merged,latest.revision);if(!written)throw new Error('Atlas changed on another device while saving. Retrying shortly.');local=merged;await applyPayload(merged)}
      row=written;basePayload=cloneValue(local);lastFingerprint=await fingerprint(local);emit('SYNCED','Atlas saved to the shared source.');
    }catch(error){emit('ERROR',String(error?.message||'Shared Atlas save failed.'));setTimeout(()=>schedulePush(1200),1500)}finally{pushing=false}
  }
  function schedulePush(delay=550){if(!ready||!joined)return;clearTimeout(pushTimer);pushTimer=setTimeout(pushNow,delay)}
  async function refreshNow(){
    if(!ready||!joined||pulling||pushing||!online())return;pulling=true;
    try{const latest=await readCanonical();if(!latest)return;const remoteFp=await fingerprint(latest.payload);if(Number(latest.revision)===Number(row?.revision)&&remoteFp===lastFingerprint)return;
      const local=buildPayload(state),localFp=await fingerprint(local);
      if(localFp!==lastFingerprint){row=latest;pulling=false;return pushNow()}
      row=latest;await applyPayload(latest.payload);basePayload=cloneValue(latest.payload);lastFingerprint=remoteFp;emit('SYNCED','Atlas refreshed from the shared source.');
    }catch(error){emit('ERROR',String(error?.message||'Shared Atlas refresh failed.'))}finally{pulling=false}
  }
  function startPolling(){clearInterval(pollTimer);pollTimer=setInterval(()=>{if(document.visibilityState!=='hidden')refreshNow()},5000)}
  function noteLocalSave(){schedulePush()}

  const originalSave=save,originalLoad=load;
  save=async function(){const result=await originalSave.apply(this,arguments);noteLocalSave();return result};
  load=async function(){const result=await originalLoad.apply(this,arguments);await initAfterLocalLoad();return result};
  root.addEventListener?.('focus',refreshNow);root.addEventListener?.('online',()=>{if(loaded&&!ready){loaded=false;initAfterLocalLoad()}else refreshNow()});
  document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')refreshNow()});
  root.addEventListener?.('atlascloudstatus',event=>{if(event.detail?.authenticated&&!ready){loaded=false;initAfterLocalLoad()}});
  root.AtlasCloudSync=Object.freeze({initAfterLocalLoad,refreshNow,pushNow,initialiseFromThisDevice,useSharedAtlas,mergeThisDevice,getStatus:()=>({ready,joined,revision:Number(row?.revision||0),target:target?{profileId:target.profileId}:null})});
})(window);
