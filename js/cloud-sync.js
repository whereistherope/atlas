// Canonical cloud sync. Local work is never treated as stale merely because another device changed the cloud.
(function(root){
  'use strict';
  const RECORD_TYPE='canonical_state_v1',RECORD_ID='primary',SCHEMA='atlas_canonical_state',VERSION=1;
  const COLLECTIONS=['profiles','areas','links','projects','notes','daily','calendar','quickTodos','activity'];
  const JOIN_PREFIX='atlas_canonical_joined_v1:';
  const ACK_PREFIX='atlas_canonical_ack_v2:';
  const BASE_PREFIX='atlas_canonical_base_v2:';
  const DIRTY_KEY='atlas_canonical_dirty_v2';
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
  function ackKey(){return target?.profileId?ACK_PREFIX+target.profileId:''}
  function baseKey(){return target?.profileId?BASE_PREFIX+target.profileId:''}
  function isJoined(){try{return !!(joinKey()&&localStorage.getItem(joinKey()))}catch(_){return false}}
  function markJoined(){joined=true;try{if(joinKey())localStorage.setItem(joinKey(),String(Date.now()))}catch(_){}}
  function markDirty(reason='local-save'){
    try{localStorage.setItem(DIRTY_KEY,JSON.stringify({at:Date.now(),reason}))}catch(_){}
    emit('PENDING','Local Atlas changes are waiting to sync.');
  }
  function isDirty(){try{return !!localStorage.getItem(DIRTY_KEY)}catch(_){return true}}
  function clearDirty(){try{localStorage.removeItem(DIRTY_KEY)}catch(_){}}
  function readAck(){
    try{const raw=ackKey()&&localStorage.getItem(ackKey());const value=raw?JSON.parse(raw):null;return plain(value)&&typeof value.fingerprint==='string'?value:null}catch(_){return null}
  }
  async function readStoredBase(){
    const key=baseKey();if(!key)return null;
    if(db&&typeof DB_STORE==='string'){
      try{const value=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),r=tx.objectStore(DB_STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});if(validPayload(value))return value}catch(_){}
    }
    try{const raw=localStorage.getItem(key),value=raw?JSON.parse(raw):null;return validPayload(value)?value:null}catch(_){return null}
  }
  async function storeAck(payload,fp,revision){
    try{if(ackKey())localStorage.setItem(ackKey(),JSON.stringify({fingerprint:fp,revision:Number(revision||0),at:Date.now()}))}catch(_){}
    const key=baseKey();if(!key)return;
    if(db&&typeof DB_STORE==='string'){
      try{await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(cloneValue(payload),key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});return}catch(_){}
    }
    try{localStorage.setItem(key,JSON.stringify(payload))}catch(_){/* Fingerprint still protects startup if the payload exceeds localStorage quota. */}
  }
  async function acknowledge(payload,revision){
    const fp=await fingerprint(payload);basePayload=cloneValue(payload);lastFingerprint=fp;await storeAck(payload,fp,revision);clearDirty();return fp;
  }
  function emit(syncState,message,extra={}){try{root.dispatchEvent(new CustomEvent('atlascanonicalstatus',{detail:{state:syncState,message,joined,dirty:isDirty(),revision:Number(row?.revision||0),...extra}}))}catch(_){}return{state:syncState,message,joined,dirty:isDirty(),revision:Number(row?.revision||0),...extra}}

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

  function recordStamp(value){
    if(!value)return 0;
    for(const key of ['updatedAt','modifiedAt','clientUpdatedAt','createdAt','time']){
      const raw=value?.[key];if(raw===undefined||raw===null)continue;
      const number=Number(raw);if(Number.isFinite(number)&&number>0)return number;
      const parsed=Date.parse(raw);if(Number.isFinite(parsed))return parsed;
    }
    return 0;
  }
  function mergeCollection(baseList,remoteList,localList){
    const base=new Map((baseList||[]).filter(x=>x&&x.id).map(x=>[x.id,x])),remote=new Map((remoteList||[]).filter(x=>x&&x.id).map(x=>[x.id,x])),local=new Map((localList||[]).filter(x=>x&&x.id).map(x=>[x.id,x]));
    const ids=new Set([...base.keys(),...remote.keys(),...local.keys()]),result=[];
    for(const id of ids){
      const b=base.get(id),r=remote.get(id),l=local.get(id),localChanged=!equal(l,b),remoteChanged=!equal(r,b);
      let chosen;
      if(localChanged&&!remoteChanged)chosen=l;
      else if(remoteChanged&&!localChanged)chosen=r;
      else if(localChanged&&remoteChanged){
        if(equal(l,r))chosen=l;
        else{const ls=recordStamp(l),rs=recordStamp(r);chosen=ls&&rs&&rs>ls?r:l}
      }else chosen=r;
      if(chosen!==undefined)result.push(cloneValue(chosen));
    }
    return result;
  }
  function mergeScratch(baseScratch,remoteScratch,localScratch){
    const keys=new Set([...Object.keys(baseScratch||{}),...Object.keys(remoteScratch||{}),...Object.keys(localScratch||{})]),merged={};
    for(const key of keys){
      const b=baseScratch?.[key],r=remoteScratch?.[key],l=localScratch?.[key],lc=!equal(l,b),rc=!equal(r,b);
      if(lc&&rc&&!equal(l,r)){
        const rt=String(r??''),lt=String(l??'');
        if(!rt)merged[key]=l;else if(!lt||rt.includes(lt))merged[key]=r;else if(lt.includes(rt))merged[key]=l;else merged[key]=`${rt}\n\n--- Reconciled local scratch ---\n\n${lt}`;
      }else{const chosen=lc&&!rc?l:rc&&!lc?r:lc&&rc?l:r;if(chosen!==undefined)merged[key]=cloneValue(chosen)}
    }
    return merged;
  }
  function mergePayload(base,remote,local){
    const merged={schema:SCHEMA,version:VERSION,dataVersion:Math.max(Number(remote?.dataVersion||0),Number(local?.dataVersion||0),8)};
    for(const key of COLLECTIONS)merged[key]=mergeCollection(base?.[key],remote?.[key],local?.[key]);
    merged.scratch=mergeScratch(base?.scratch,remote?.scratch,local?.scratch);
    return merged;
  }
  // Used only when there is no trustworthy last-acknowledged base. Missing records are never treated as deletions.
  function unionCollection(remoteList,localList){
    const result=cloneValue(Array.isArray(remoteList)?remoteList:[]),index=new Map(result.filter(x=>x&&x.id).map((x,i)=>[x.id,i]));
    for(const item of (Array.isArray(localList)?localList:[])){
      if(!item||!item.id){result.push(cloneValue(item));continue}
      if(!index.has(item.id)){index.set(item.id,result.length);result.push(cloneValue(item));continue}
      const pos=index.get(item.id),remote=result[pos];if(equal(remote,item))continue;
      const ls=recordStamp(item),rs=recordStamp(remote);if(ls&&rs&&ls>rs)result[pos]=cloneValue(item);
    }
    return result;
  }
  function unionPayload(remote,local){
    const merged={schema:SCHEMA,version:VERSION,dataVersion:Math.max(Number(remote?.dataVersion||0),Number(local?.dataVersion||0),8)};
    for(const key of COLLECTIONS)merged[key]=unionCollection(remote?.[key],local?.[key]);
    merged.scratch={...cloneValue(remote?.scratch||{})};
    for(const [key,value] of Object.entries(local?.scratch||{})){
      const rt=String(merged.scratch[key]??''),lt=String(value??'');
      if(!rt)merged.scratch[key]=value;else if(lt&&rt!==lt&&!rt.includes(lt))merged.scratch[key]=rt.includes(lt)?rt:`${rt}\n\n--- Reconciled local scratch ---\n\n${lt}`;
    }
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

  async function reconcileJoinedDivergence(local){
    emit('RECONCILING','Reconciling local and shared Atlas changes…');
    if(typeof idbBackup==='function')await idbBackup(cloneValue(state),'before canonical divergence reconciliation');
    for(let attempt=0;attempt<5;attempt++){
      const latest=await readCanonical();if(!latest)throw new Error('Shared Atlas is unavailable.');
      const storedBase=await readStoredBase(),base=storedBase||basePayload;
      const merged=base&&validPayload(base)?mergePayload(base,latest.payload,local):unionPayload(latest.payload,local);
      const mergedFp=await fingerprint(merged),remoteFp=await fingerprint(latest.payload);
      if(mergedFp===remoteFp){row=latest;await applyPayload(latest.payload,{backupReason:'before canonical reconciled refresh'});await acknowledge(latest.payload,latest.revision);markJoined();return}
      const written=await writeExisting(merged,latest.revision);if(!written)continue;
      row=written;await applyPayload(merged);await acknowledge(merged,written.revision);markJoined();return;
    }
    throw new Error('Atlas changed repeatedly while reconciling. Try again.');
  }
  async function initialiseFromThisDevice(){
    try{emit('CONNECTING','Creating the shared Atlas…');const existing=await readCanonical();if(existing){row=existing;return await handleExisting()}const payload=buildPayload(state);row=await writeNew(payload);markJoined();ready=true;removeBanner();await acknowledge(payload,row.revision);emit('SYNCED','This device created the shared Atlas.');startPolling();toast?.('Shared Atlas created')}
    catch(error){emit('ERROR',String(error?.message||'Could not create shared Atlas.'));toast?.('Shared Atlas setup failed')}
  }
  async function useSharedAtlas(){
    try{if(!row)row=await readCanonical();if(!row)throw new Error('Shared Atlas is unavailable.');await applyPayload(row.payload,{backupReason:'before explicitly replacing local Atlas with shared Atlas'});markJoined();ready=true;removeBanner();await acknowledge(row.payload,row.revision);emit('SYNCED','Using the shared Atlas.');startPolling();toast?.('Shared Atlas loaded')}
    catch(error){emit('ERROR',String(error?.message||'Could not load shared Atlas.'))}
  }
  async function mergeThisDevice(){
    try{if(!row)row=await readCanonical();if(!row)return initialiseFromThisDevice();emit('RECONCILING','Merging this device into the shared Atlas…');if(typeof idbBackup==='function')await idbBackup(cloneValue(state),'before merging this device into shared Atlas');
      for(let attempt=0;attempt<5;attempt++){
        const latest=attempt?await readCanonical():row;if(!latest)throw new Error('Shared Atlas is unavailable.');const local=buildPayload(state),merged=unionPayload(latest.payload,local),mergedFp=await fingerprint(merged),remoteFp=await fingerprint(latest.payload);
        if(mergedFp===remoteFp){row=latest;await applyPayload(latest.payload);markJoined();ready=true;removeBanner();await acknowledge(latest.payload,latest.revision);emit('SYNCED','This device matches the shared Atlas.');startPolling();return}
        const written=await writeExisting(merged,latest.revision);if(!written)continue;row=written;await applyPayload(merged);markJoined();ready=true;removeBanner();await acknowledge(merged,written.revision);emit('SYNCED','This device was merged into the shared Atlas.');startPolling();toast?.('Device merged into shared Atlas');return;
      }
      throw new Error('Atlas changed repeatedly while merging. Try again.');
    }catch(error){emit('ERROR',String(error?.message||'Could not merge this device.'))}
  }
  async function handleExisting(){
    const local=buildPayload(state),localFp=await fingerprint(local),remoteFp=await fingerprint(row.payload);joined=isJoined();const ack=readAck(),ackFp=ack?.fingerprint||'';
    if(localFp===remoteFp){if(!joined)markJoined();ready=true;removeBanner();await acknowledge(row.payload,row.revision);emit('SYNCED','Shared Atlas loaded.');startPolling();return}
    const localUnacknowledged=isDirty()||!ackFp||localFp!==ackFp;
    if(joined){
      if(!localUnacknowledged&&ackFp&&localFp===ackFp){await applyPayload(row.payload,{backupReason:'before canonical remote refresh'});ready=true;removeBanner();await acknowledge(row.payload,row.revision);emit('SYNCED','Shared Atlas refreshed.');startPolling();return}
      ready=false;await reconcileJoinedDivergence(local);ready=true;removeBanner();emit('SYNCED','Local and shared Atlas changes reconciled.');startPolling();return;
    }
    ready=false;emit('MIGRATION','This device has local Atlas data that is not yet part of the shared Atlas.');
    banner('This device has its own existing Atlas data. Merge it into the shared Atlas, or deliberately replace it with the shared Atlas. A local safety backup is made first.',[
      {label:'MERGE THIS DEVICE',action:mergeThisDevice},{label:'USE SHARED ATLAS',action:useSharedAtlas}
    ]);
  }
  async function initAfterLocalLoad(){
    if(loaded)return;loaded=true;if(!online())return emit('OFFLINE','Using the local cached Atlas. Local changes will sync when the connection returns.');
    try{await resolveTarget();row=await readCanonical();if(!row){joined=false;ready=false;emit('SETUP','No shared Atlas exists yet.');banner('Atlas is ready for its one-time single-source setup. Use the device with the most complete Atlas data, then every other device will load the same Atlas.',[{label:'USE THIS ATLAS AS THE SHARED ATLAS',action:initialiseFromThisDevice}]);return}await handleExisting()}
    catch(error){emit('LOCAL',String(error?.message||'Sign in to Atlas cloud to use the shared Atlas.'))}
  }
  async function pushNow(){
    if(!ready||!joined||pushing||!online()||!row)return;pushing=true;
    try{
      let local=buildPayload(state),localFp=await fingerprint(local);if(localFp===lastFingerprint){clearDirty();return}
      let written=await writeExisting(local,row.revision);
      if(!written){const latest=await readCanonical();if(!latest)throw new Error('Shared Atlas disappeared.');const storedBase=await readStoredBase(),base=storedBase||basePayload,merged=base&&validPayload(base)?mergePayload(base,latest.payload,local):unionPayload(latest.payload,local);written=await writeExisting(merged,latest.revision);if(!written)throw new Error('Atlas changed on another device while saving. Retrying shortly.');local=merged;await applyPayload(merged)}
      row=written;await acknowledge(local,written.revision);emit('SYNCED','Atlas saved to the shared source.');
    }catch(error){emit('ERROR',String(error?.message||'Shared Atlas save failed.'));setTimeout(()=>schedulePush(1200),1500)}finally{pushing=false}
  }
  function schedulePush(delay=550){if(!ready||!joined)return;clearTimeout(pushTimer);pushTimer=setTimeout(pushNow,delay)}
  async function refreshNow(){
    if(!ready||!joined||pulling||pushing||!online())return;pulling=true;
    try{const latest=await readCanonical();if(!latest)return;const remoteFp=await fingerprint(latest.payload);if(Number(latest.revision)===Number(row?.revision)&&remoteFp===lastFingerprint)return;
      const local=buildPayload(state),localFp=await fingerprint(local),dirty=isDirty()||localFp!==lastFingerprint;
      if(dirty){row=latest;pulling=false;return pushNow()}
      row=latest;await applyPayload(latest.payload,{backupReason:'before canonical remote refresh'});await acknowledge(latest.payload,latest.revision);emit('SYNCED','Atlas refreshed from the shared source.');
    }catch(error){emit('ERROR',String(error?.message||'Shared Atlas refresh failed.'))}finally{pulling=false}
  }
  function startPolling(){clearInterval(pollTimer);pollTimer=setInterval(()=>{if(document.visibilityState!=='hidden')refreshNow()},5000)}
  function noteLocalSave(){markDirty();schedulePush()}

  const originalSave=save,originalLoad=load;
  save=async function(){const result=await originalSave.apply(this,arguments);noteLocalSave();return result};
  load=async function(){const result=await originalLoad.apply(this,arguments);await initAfterLocalLoad();return result};
  root.addEventListener?.('focus',refreshNow);root.addEventListener?.('online',()=>{if(loaded&&!ready){loaded=false;initAfterLocalLoad()}else refreshNow()});
  document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')refreshNow()});
  root.addEventListener?.('atlascloudstatus',event=>{if(event.detail?.authenticated&&!ready){loaded=false;initAfterLocalLoad()}});
  root.AtlasCloudSync=Object.freeze({initAfterLocalLoad,refreshNow,pushNow,initialiseFromThisDevice,useSharedAtlas,mergeThisDevice,getStatus:()=>({ready,joined,dirty:isDirty(),revision:Number(row?.revision||0),target:target?{profileId:target.profileId}:null})});
})(window);
