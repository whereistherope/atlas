// Atlas v0.16.8-r2 · capture launcher handoff fix.
// Presentation/interaction patch only: dismiss the universal launcher before
// the existing aligned capture handler opens the selected destination.
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

  root.AtlasCaptureFlowFix=Object.freeze({version:'0.16.8-r2',dismissLauncher});
})(window);
