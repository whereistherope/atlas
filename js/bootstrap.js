// Start only after every classic module has established its shared bindings.
(async function(){
  const BUILD='0132r1';
  const versioned=src=>`${src}${src.includes('?')?'&':'?'}v=${BUILD}`;

  async function loadScript(src,label,{fresh=false}={}){
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.async=false;
      script.src=fresh?`${versioned(src)}&t=${Date.now()}`:versioned(src);
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`${label} failed to load.`));
      document.head.appendChild(script);
    });
  }

  // Safety wrapper must load before cloud-sync so the pre-canonical local snapshot
  // is taken after local state loads but before any shared Atlas adoption/merge.
  try { await loadScript('./js/v0130-safety.js','Atlas v0.13.0 safety module'); } catch (_) {}
  try { await loadScript('./js/cloud-sync.js','Atlas cloud sync module'); } catch (_) {}
  // Migration hotfix intercepts future device merges and can recover unique records
  // from the pre-sync safety snapshot after the original device has joined.
  try { await loadScript('./js/cloud-sync-hotfix.js','Atlas canonical migration hotfix'); } catch (_) {}

  // Base Markdown renderer / fallback editor.
  try { await loadScript('./js/note-editor.js','Atlas note renderer'); } catch (_) {}
  if(!window.AtlasMarkdown?.openNote){
    try { await loadScript('./js/note-editor.js','Atlas note renderer retry',{fresh:true}); } catch (_) {}
  }
  // Visual editor overrides normal note opening while keeping Markdown as storage.
  try { await loadScript('./js/visual-note-editor.js','Atlas visual note editor'); } catch (_) {}
  // New note-like captures use whichever AtlasMarkdown.openNote implementation is current.
  try { await loadScript('./js/rich-note-capture.js','Atlas rich note capture'); } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'}).catch(() => {});
    });
  }
})();
