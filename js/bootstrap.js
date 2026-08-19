// Start only after every classic module has established its shared bindings.
(async function(){
  try {
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='./js/cloud-sync.js';
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Atlas cloud sync module failed to load.'));
      document.head.appendChild(script);
    });
  } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
