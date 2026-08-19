// Start only after every classic module has established its shared bindings.
(async function(){
  async function loadScript(src,label){
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`${label} failed to load.`));
      document.head.appendChild(script);
    });
  }

  // Safety wrapper must load before cloud-sync so the pre-canonical local snapshot
  // is taken after local state loads but before any shared Atlas adoption/merge.
  try { await loadScript('./js/v0130-safety.js','Atlas v0.13.0 safety module'); } catch (_) {}
  try { await loadScript('./js/cloud-sync.js','Atlas cloud sync module'); } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
