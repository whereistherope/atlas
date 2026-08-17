// Manual, read-only bridge from authenticated Me cloud carriage to the local Relay receptor.
(function(root){
  'use strict';
  let result=null,checking=false;
  const profileId=()=>typeof state==='object'&&state?.settings?.activeProfile?state.settings.activeProfile:'me';
  const cloudStatus=()=>root.AtlasCloud?.getStatus?.()||{authenticated:false,verified:false};
  function readiness(){
    if(profileId()!=='me')return{ok:false,state:'LOCAL ONLY',message:'Cloud Relay is available only for Me.'};
    if(typeof navigator!=='undefined'&&navigator.onLine===false)return{ok:false,state:'OFFLINE',message:'Connect to check cloud Relay.'};
    const cloud=cloudStatus();if(!cloud.authenticated)return{ok:false,state:'SIGN IN REQUIRED',message:'Sign in through Sync first.'};
    if(!cloud.verified)return{ok:false,state:'TEST ACCESS REQUIRED',message:'Verify Test Access through Sync first.'};
    return{ok:true,state:'READY',message:'Manual cloud check available.'};
  }
  function invalidate(){result=null;checking=false;return getState()}
  function getState(){const ready=readiness();return Object.freeze({...ready,checking,result:ready.ok?result:null})}
  async function check(){
    const ready=readiness();if(!ready.ok){invalidate();return{ok:false,error:ready.message,state:ready.state}}
    checking=true;result=null;
    try{
      const response=await root.AtlasCloud.listMeRelayEnvelopes({limit:50});if(!response.ok)throw new Error(response.error||'Cloud Relay check failed.');
      if(!readiness().ok)throw new Error('Cloud Relay access changed during check.');
      const ledger=typeof state==='object'&&state?.relayLedger&&typeof state.relayLedger==='object'?state.relayLedger:{};
      const items=(response.rejected||[]).map(rejection=>Object.freeze({relayId:rejection.recordId||'Unknown remote record',status:'rejected',errors:[rejection.error]}));
      items.push(...response.records.map(record=>{
        const envelope=record.envelope,accepted=!!ledger[envelope.relayId],validation=root.AtlasRelay.validate(envelope);
        if(!validation.ok)return Object.freeze({relayId:envelope.relayId,status:'rejected',errors:[...(validation.errors||[])]});
        const preview=root.AtlasRelay.preview(envelope);
        if(!preview.ok)return Object.freeze({relayId:envelope.relayId,status:'rejected',errors:[...(preview.errors||[])]});
        return Object.freeze({relayId:envelope.relayId,status:accepted?'already-accepted':'pending',operation:envelope.operation,preview});
      }));
      result=Object.freeze({checkedAt:Date.now(),items:Object.freeze(items),pending:items.filter(item=>item.status==='pending').length,rejected:items.filter(item=>item.status==='rejected').length,accepted:items.filter(item=>item.status==='already-accepted').length});
      return{ok:true,...result};
    }catch(error){result=Object.freeze({error:String(error?.message||'Cloud Relay check failed.').slice(0,160),items:Object.freeze([]),pending:0,rejected:0,accepted:0});return{ok:false,...result}}
    finally{checking=false}
  }
  root.addEventListener?.('atlascloudstatus',event=>{if(!event?.detail?.authenticated||!event?.detail?.verified)invalidate()});
  root.addEventListener?.('offline',invalidate);
  root.AtlasRelayTransport=Object.freeze({check,invalidate,getState});
})(window);
