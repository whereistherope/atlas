// Temporary safety quarantine: keep Atlas local-only while canonical snapshot sync is retired.
(function(root){
  'use strict';
  const detail={state:'PAUSED',message:'Cross-device sync is temporarily paused for data safety. Local changes are saved on this device.',joined:false,dirty:false,revision:0,quarantined:true};
  function emit(){try{root.dispatchEvent(new CustomEvent('atlascanonicalstatus',{detail}))}catch(_){}}
  root.AtlasCloudSync=Object.freeze({
    initAfterLocalLoad:async()=>emit(),refreshNow:async()=>emit(),pushNow:async()=>emit(),
    initialiseFromThisDevice:async()=>emit(),useSharedAtlas:async()=>emit(),mergeThisDevice:async()=>emit(),
    getStatus:()=>({...detail,ready:false})
  });
  root.addEventListener?.('load',emit);setTimeout(emit,400);
})(window);
