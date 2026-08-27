// Start only after every classic module has established its shared bindings.
// Emergency recovery build: automatic record-level sync is paused until data reconciliation is repaired.
(async function(){
  const BUILD='0169r20';
  const SYNC_V2_ENABLED=false;
  const versioned=src=>`${src}${src.includes('?')?'&':'?'}v=${BUILD}`;

  function loadStyle(src){
    if(document.querySelector(`link[data-atlas-style="${src}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=versioned(src);link.dataset.atlasStyle=src;document.head.appendChild(link);
  }

  async function loadScript(src,label,{fresh=false}={}){
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.async=false;script.src=fresh?`${versioned(src)}&t=${Date.now()}`:versioned(src);script.onload=resolve;script.onerror=()=>reject(new Error(`${label} failed to load.`));document.head.appendChild(script);
    });
  }

  loadStyle('./styles/v0133-polish.css');
  loadStyle('./styles/editor-ux.css');
  loadStyle('./styles/atlas-document.css');
  loadStyle('./styles/capture-framework.css');
  loadStyle('./styles/command-palette.css');
  loadStyle('./styles/interaction-alignment.css');
  loadStyle('./styles/workspace-actions.css');
  loadStyle('./styles/network-layout.css');
  loadStyle('./styles/network-split.css');
  loadStyle('./styles/lock-terrain.css');
  loadStyle('./styles/network-overview.css');
  // Final visual arbitration layer: intentionally loaded last.
  loadStyle('./styles/theme-system.css');
  // Small production hotfix: shadow removal only.
  loadStyle('./styles/r18-stability-hotfix.css');

  try { await loadScript('./js/v0130-safety.js','Atlas v0.13.0 safety module'); } catch (_) {}
  // Snapshot-based canonical sync is permanently retired from the boot path.
  try { await loadScript('./js/sync-v2-core.js','Atlas record-level sync core'); } catch (_) {}
  if(SYNC_V2_ENABLED){
    try { await loadScript('./js/sync-v2.js','Atlas record-level sync'); } catch (_) {}
  }else{
    window.AtlasCloudSync=Object.freeze({
      initAfterLocalLoad:async()=>false,
      refreshNow:async()=>false,
      pushNow:async()=>false,
      migrateSharedCloud:async()=>false,
      getStatus:()=>({ready:false,joined:false,dirty:false,recordLevel:true,paused:true})
    });
  }
  try { await loadScript('./js/note-editor.js','Atlas note renderer'); } catch (_) {}
  if(!window.AtlasMarkdown?.openNote){try { await loadScript('./js/note-editor.js','Atlas note renderer retry',{fresh:true}); } catch (_) {}}
  try { await loadScript('./js/visual-note-editor.js','Atlas visual note editor'); } catch (_) {}
  try { await loadScript('./js/visual-table-controls.js','Atlas visual table controls'); } catch (_) {}
  try { await loadScript('./js/rich-note-capture.js','Atlas unified note creation'); } catch (_) {}
  try { await loadScript('./js/project-workspace.js','Atlas Project Workspace'); } catch (_) {}
  try { await loadScript('./js/editor-ux.js','Atlas editor UX'); } catch (_) {}
  try { await loadScript('./js/atlas-document-r3.js','Atlas Document v1 r3'); } catch (_) {}
  try { await loadScript('./js/atlas-document-r4-ui.js','Atlas Document UI r4'); } catch (_) {}
  try { await loadScript('./js/table-width-resize.js','Atlas table width resize r6'); } catch (_) {}
  try { await loadScript('./js/capture-framework-r7.js','Atlas Capture framework r7'); } catch (_) {}
  try { await loadScript('./js/capture-polish-r8.js','Atlas Capture polish r8'); } catch (_) {}
  try { await loadScript('./js/command-palette.js','Atlas Command palette v0.15'); } catch (_) {}
  try { await loadScript('./js/interaction-alignment.js','Atlas interaction alignment v0.15.1'); } catch (_) {}
  try { await loadScript('./js/capture-flow-fix.js','Atlas capture launcher handoff v0.16.9'); } catch (_) {}
  try { await loadScript('./js/workspace-actions.js','Atlas workspace actions v0.15.2'); } catch (_) {}
  try { await loadScript('./js/graph-hierarchy-interactions.js','Atlas hierarchy drag v0.15.3'); } catch (_) {}
  try { await loadScript('./js/network-layout.js','Atlas tunable constrained-force network grammar v0.15.11'); } catch (_) {}
  try { await loadScript('./js/network-organic.js','Atlas responsive organic network settle v0.15.14'); } catch (_) {}
  try { await loadScript('./js/network-controls.js','Atlas unified graph controls v0.15.12'); } catch (_) {}
  try { await loadScript('./js/network-split.js','Atlas switchable split network/list view v0.15.16'); } catch (_) {}
  try { await loadScript('./js/lock-terrain.js','Atlas lock identity v0.16.9-r17'); } catch (_) {}
  try { await loadScript('./js/network-overview.js','Atlas network overview v0.16.9'); } catch (_) {}
  try { await loadScript('./js/widget-visibility-hotfix.js','Atlas widget visibility hotfix v0.16.9-r20'); } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();
  if(!SYNC_V2_ENABLED){
    try{window.dispatchEvent(new CustomEvent('atlascanonicalstatus',{detail:{state:'PAUSED',message:'Automatic sync paused for data recovery.',joined:false,dirty:false,recordLevel:true,paused:true}}))}catch(_){}
  }
  document.documentElement.classList.add('atlas-ready');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load',()=>{navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{})});
  }
})();
