// Atlas v0.16.9 · capture launcher handoff fix.
(function(root){
  'use strict';
  function dismissLauncher(){
    try{root.AtlasCaptureFramework?.close?.()}catch(_){ }
    document.getElementById('atlasCaptureLauncher')?.classList.remove('open');
  }
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('[data-atlas-aligned-capture]'))return;
    dismissLauncher();
  },true);
  root.AtlasCaptureFlowFix=Object.freeze({version:'0.16.9-r1',dismissLauncher});
})(window);
