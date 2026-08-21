// Start only after every classic module has established its shared bindings.
(async function(){
  const BUILD='0156r1';
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

  try { await loadScript('./js/v0130-safety.js','Atlas v0.13.0 safety module'); } catch (_) {}
  try { await loadScript('./js/cloud-sync.js','Atlas cloud sync module'); } catch (_) {}
  try { await loadScript('./js/cloud-sync-hotfix.js','Atlas canonical migration hotfix'); } catch (_) {}
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
  try { await loadScript('./js/workspace-actions.js','Atlas workspace actions v0.15.2'); } catch (_) {}
  try { await loadScript('./js/graph-hierarchy-interactions.js','Atlas hierarchy drag v0.15.3'); } catch (_) {}
  try { await loadScript('./js/network-layout.js','Atlas clustered constellation grammar v0.15.6'); } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load',()=>{navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{})});
  }
})();
