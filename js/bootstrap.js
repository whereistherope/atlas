// Start only after every classic module has established its shared bindings.
(async function(){
  const BUILD='0133r1';
  const versioned=src=>`${src}${src.includes('?')?'&':'?'}v=${BUILD}`;

  function loadStyle(src){
    if(document.querySelector(`link[data-atlas-style="${src}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=versioned(src);link.dataset.atlasStyle=src;document.head.appendChild(link);
  }

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

  loadStyle('./styles/v0133-polish.css');

  // Safety wrapper must load before cloud-sync so the pre-canonical local snapshot
  // is taken after local state loads but before any shared Atlas adoption/merge.
  try { await loadScript('./js/v0130-safety.js','Atlas v0.13.0 safety module'); } catch (_) {}
  try { await loadScript('./js/cloud-sync.js','Atlas cloud sync module'); } catch (_) {}
  try { await loadScript('./js/cloud-sync-hotfix.js','Atlas canonical migration hotfix'); } catch (_) {}

  // Shared Markdown renderer + visual note editing.
  try { await loadScript('./js/note-editor.js','Atlas note renderer'); } catch (_) {}
  if(!window.AtlasMarkdown?.openNote){
    try { await loadScript('./js/note-editor.js','Atlas note renderer retry',{fresh:true}); } catch (_) {}
  }
  try { await loadScript('./js/visual-note-editor.js','Atlas visual note editor'); } catch (_) {}
  try { await loadScript('./js/visual-table-controls.js','Atlas visual table controls'); } catch (_) {}
  try { await loadScript('./js/rich-note-capture.js','Atlas unified note creation'); } catch (_) {}

  // Project Workspace keeps project structure lightweight while rich-editing substantive fields.
  try { await loadScript('./js/project-workspace.js','Atlas Project Workspace'); } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(() => {});
    });
  }
})();
