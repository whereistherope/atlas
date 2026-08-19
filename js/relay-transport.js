// Automatic Me-only ingress from the isolated Atlas Relay project. RPC is the only remote surface.
(function(root){
  'use strict';
  const URL='https://zmjyxfhwesfugepyukeh.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_hwyVvfkmHLdFHflWBClT5A_8axCzHHA';
  const ACCESS_KEY='atlas-relay-access-v1';
  const POLL_MS=5000;
  let token='',initialised=false,running=false,timer=null,lastResult=null,lastEmitted='';
  const profileId=()=>typeof state==='object'&&state?.settings?.activeProfile?state.settings.activeProfile:'me';
  const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
  const visible=()=>typeof document==='undefined'||!document.hidden;
  function readiness(){if(profileId()!=='me')return{ok:false,state:'LOCAL ONLY'};if(!token)return{ok:false,state:'RELAY NOT CONNECTED'};if(!online())return{ok:false,state:'OFFLINE'};return{ok:true,state:'LISTENING'}}
  function getState(){const ready=readiness(),shown=running?'PROCESSING':ready.state;return Object.freeze({ok:ready.ok,state:shown,checking:running,result:lastResult,configured:!!token,message:shown==='PROCESSING'?'Receiving Relay instructions…':shown==='LISTENING'?'Connected / listening.':shown==='OFFLINE'?'Relay will resume when online.':shown==='LOCAL ONLY'?'Alyssa and Us remain local only.':'Paste a Relay Access Key to connect.',masked:token?'••••'+token.slice(-4):''})}
  function emit(force=false){const detail=getState(),signature=JSON.stringify([detail.state,detail.configured,detail.result?.error||'',detail.result?.received||0,detail.result?.rejected||0]);if(force||signature!==lastEmitted){lastEmitted=signature;root.dispatchEvent?.(new CustomEvent('atlasrelaystatus',{detail}))}}
  function emitContent(detail){root.dispatchEvent?.(new CustomEvent('atlasrelaycontent',{detail}))}
  function schedule(){clearTimeout(timer);timer=null;if(initialised&&readiness().ok&&visible())timer=setTimeout(check,POLL_MS)}
  async function rpc(name,body){
    if(!['fetch_atlas_relay','ack_atlas_relay'].includes(name))throw new Error('Unsupported Relay RPC.');
    const response=await fetch(`${URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok)throw new Error(`Relay ${name==='fetch_atlas_relay'?'fetch':'acknowledgement'} failed (${response.status}).`);
    if(name==='ack_atlas_relay')return null;const data=await response.json();if(!Array.isArray(data))throw new Error('Relay fetch returned an invalid response.');return data;
  }
  const cleanError=errors=>String((Array.isArray(errors)?errors.join(' · '):errors)||'Invalid Relay instruction.').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,160);
  async function acknowledge(relayId,accepted,result){if(!readiness().ok||!visible())throw new Error('Relay acknowledgement paused until Me is eligible.');return rpc('ack_atlas_relay',{p_token:token,p_relay_id:String(relayId||'').slice(0,300),p_status:accepted?'accepted':'rejected',p_result:result})}
  async function reject(row,errors){
    const relayId=String(row?.relay_id||'').slice(0,300),error=cleanError(errors),receipts=state?.relayReceipts||[];
    if(typeof state==='object'&&!receipts.some(item=>item?.status==='rejected'&&item.relayId===relayId&&item.error===error)){state.relayReceipts=[{relayId,time:Date.now(),profileId:'me',operation:row?.operation||row?.payload?.operation||'',status:'rejected',error},...receipts].slice(0,200);await save();emitContent({mutated:false,rejected:true,relayId})}
    await acknowledge(relayId,false,{error});return{status:'rejected',error,mutated:false};
  }
  async function processRow(row){
    const payload=row?.payload,relayId=String(row?.relay_id||payload?.relayId||'').slice(0,300);
    if(!relayId)return reject(row,'Missing relay identifier.');
    if(relayId!==payload?.relayId)return reject({...row,relay_id:relayId},'Relay row and envelope identifiers do not match.');
    if(payload?.profileId!=='me')return reject({...row,relay_id:relayId},'Cloud Relay accepts Me profile only.');
    const validation=root.AtlasRelay.validate(payload);if(!validation.ok)return reject({...row,relay_id:relayId},validation.errors);
    const result=await root.AtlasRelay.ingest(payload);
    if(!result.ok)return reject({...row,relay_id:relayId},result.errors);
    if(!result.duplicate)emitContent({mutated:true,rejected:false,relayId,operation:payload.operation,recordId:result.recordId||''});
    await acknowledge(relayId,true,{recordId:result.recordId||'',duplicate:!!result.duplicate});
    return{status:'accepted',duplicate:!!result.duplicate,mutated:!result.duplicate};
  }
  async function check(){
    const ready=readiness();if(!ready.ok||!visible()){emit();schedule();return{ok:false,state:ready.state}}
    if(running)return{ok:false,overlap:true,state:'PROCESSING'};
    running=true;emit();let received=0,rejected=0,mutated=0;
    try{const rows=await rpc('fetch_atlas_relay',{p_token:token,p_after:null,p_limit:50});if(!readiness().ok||!visible())return{ok:false,state:readiness().state};for(const row of rows){if(!readiness().ok||!visible())return{ok:false,state:readiness().state};const outcome=await processRow(row);if(outcome.status==='rejected')rejected++;else received++;if(outcome.mutated)mutated++}lastResult={checkedAt:Date.now(),received,rejected,count:rows.length,mutated};return{ok:true,...lastResult}}
    catch(error){lastResult={error:cleanError(error?.message),received,rejected,mutated};return{ok:false,...lastResult}}
    finally{running=false;emit();schedule()}
  }
  async function setAccessKey(value){const next=String(value||'').trim();if(!next)return removeAccessKey();token=next;await authStoreSet(ACCESS_KEY,next);lastResult=null;emit(true);check();return{ok:true}}
  async function removeAccessKey(){token='';await authStoreRemove(ACCESS_KEY);lastResult=null;clearTimeout(timer);timer=null;emit(true);return{ok:true}}
  async function init(){if(initialised)return getState();initialised=true;token=String(await authStoreGet(ACCESS_KEY)||'');emit(true);if(readiness().ok&&visible())await check();else schedule();return getState()}
  function wake(){clearTimeout(timer);timer=null;emit(true);if(readiness().ok&&visible())check()}
  function profileChanged(){wake()}
  root.addEventListener?.('online',wake);root.addEventListener?.('offline',wake);root.addEventListener?.('focus',wake);if(typeof document!=='undefined')document.addEventListener('visibilitychange',wake);
  root.AtlasRelayTransport=Object.freeze({init,check,getState,setAccessKey,removeAccessKey,profileChanged});
})(window);
