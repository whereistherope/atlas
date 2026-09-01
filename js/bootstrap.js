// Start only after every classic module has established its shared bindings.
// One Atlas in cloud + epoch-gated stale-client protection.
(async function(){
  const BUILD='0169r41';
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
  loadStyle('./styles/runtime-telemetry.css');
  loadStyle('./styles/theme-system.css');
  loadStyle('./styles/material-system.css');
  loadStyle('./styles/pomodoro-widget.css');
  loadStyle('./styles/item-delete-tools.css');

  try { await loadScript('./js/v0130-safety.js','Atlas v0.13.0 safety module'); } catch (_) {}
  try { await loadScript('./js/sync-v2-core.js','Atlas record reconciliation core'); } catch (_) {}
  try { await loadScript('./js/sync-v2-recovery.js','Atlas Cloud setup engine'); } catch (_) {}
  try { await loadScript('./js/sync-v3.js','Atlas Cloud sync engine'); } catch (_) {}
  try { await loadScript('./js/sync-recovery-ui.js','Atlas Cloud setup controls'); } catch (_) {}
  try { await loadScript('./js/note-editor.js','Atlas note renderer'); } catch (_) {}
  if(!window.AtlasMarkdown?.openNote){try { await loadScript('./js/note-editor.js','Atlas note renderer retry',{fresh:true}); } catch (_) {}}
  try { await loadScript('./js/visual-note-editor.js','Atlas visual note editor'); } catch (_) {}
  try { await loadScript('./js/visual-table-controls.js','Atlas visual table controls'); } catch (_) {}
  try { await loadScript('./js/rich-note-capture.js','Atlas unified note creation'); } catch (_) {}
  try { await loadScript('./js/project-workspace.js','Atlas Project Workspace'); } catch (_) {}
  try { await loadScript('./js/item-delete-tools.js','Atlas item deletion tools'); } catch (_) {}
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
  try { await loadScript('./js/network-layout.js','Atlas tunable constrained-force network grammar v0.15.11'); } catch (_) {}
  try { await loadScript('./js/network-organic.js','Atlas responsive organic network settle v0.15.14'); } catch (_) {}
  try { await loadScript('./js/network-controls.js','Atlas unified graph controls v0.15.12'); } catch (_) {}
  try { await loadScript('./js/network-split.js','Atlas switchable split network/list view v0.15.16'); } catch (_) {}
  try { await loadScript('./js/lock-terrain.js','Atlas lock identity v0.16.9-r17'); } catch (_) {}
  try { await loadScript('./js/widget-visibility-hotfix.js','Atlas widget visibility hotfix v0.16.9-r20'); } catch (_) {}
  try { await loadScript('./js/pomodoro-widget.js','Atlas Pomodoro widget'); } catch (_) {}
  try { await loadScript('./js/window-drag-local.js','Atlas free movable windows'); } catch (_) {}
  try { await loadScript('./js/runtime-telemetry.js','Atlas live runtime telemetry'); } catch (_) {}

  try { await window.AtlasCloud?.init?.(); } catch (_) {}
  await load();
  document.documentElement.classList.add('atlas-ready');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load',()=>{navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{})});
  }
})();
