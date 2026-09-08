// Start only after every classic module has established its shared bindings.
// One Atlas in cloud + epoch-gated stale-client protection.
(async function(){
  const BUILD='0169r67';
  window.ATLAS_BUILD=BUILD;
  const versioned=src=>`${src}${src.includes('?')?'&':'?'}v=${BUILD}`;
  const bootStarted=Date.now();
  let bootTimer=null;

  function ensureBootStatus(){
    let host=document.getElementById('atlasBootStatus');
    if(host)return host;
    const style=document.createElement('style');style.id='atlasBootStatusStyle';style.textContent=`
      #atlasBootStatus{position:fixed;z-index:2147483646;inset:0;display:flex;align-items:center;justify-content:center;background:#05080c;color:#d5e3ec;font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;letter-spacing:.055em}
      #atlasBootStatus .atlas-boot-card{width:min(360px,calc(100vw - 48px));padding:22px 24px;border:1px solid #243542;background:#080d12;box-shadow:0 18px 60px rgba(0,0,0,.32)}
      #atlasBootStatus .atlas-boot-brand{font:800 28px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.045em;text-transform:uppercase;color:#e5e4e2}
      #atlasBootStatus .atlas-boot-meta{display:flex;justify-content:space-between;gap:12px;margin-top:10px;color:#7795a8;font:800 8px/1.3 "SFMono-Regular",Consolas,monospace;text-transform:uppercase}
      #atlasBootStatus .atlas-boot-track{height:3px;margin-top:13px;border:1px solid #284050;background:#0b151c;overflow:hidden}
      #atlasBootStatus .atlas-boot-bar{height:100%;width:6%;background:#1793d1;transition:width .18s ease,background .18s ease;animation:atlasBootPulse .9s ease-in-out infinite alternate}
      #atlasBootStatus .atlas-boot-detail{margin-top:9px;color:#5f7481;font:700 7px/1.4 "SFMono-Regular",Consolas,monospace;text-transform:uppercase}
      #atlasBootStatus.atlas-boot-failed .atlas-boot-bar{background:#d46d67;animation:none}
      #atlasBootStatus.atlas-boot-failed .atlas-boot-stage{color:#d46d67}
      @keyframes atlasBootPulse{from{opacity:.55}to{opacity:1}}
    `;document.head.appendChild(style);
    host=document.createElement('div');host.id='atlasBootStatus';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.innerHTML='<div class="atlas-boot-card"><div class="atlas-boot-brand">Atlas</div><div class="atlas-boot-meta"><span class="atlas-boot-stage">Starting</span><span class="atlas-boot-elapsed">0.0s</span></div><div class="atlas-boot-track"><div class="atlas-boot-bar"></div></div><div class="atlas-boot-detail">Boot monitor active · animated bar means the browser is responsive</div></div>';document.body.appendChild(host);
    bootTimer=setInterval(()=>{const elapsed=host.querySelector('.atlas-boot-elapsed');if(elapsed)elapsed.textContent=((Date.now()-bootStarted)/1000).toFixed(1)+'s'},250);
    return host;
  }

  function bootStage(label,progress){
    const host=ensureBootStatus(),stage=host.querySelector('.atlas-boot-stage'),bar=host.querySelector('.atlas-boot-bar');
    if(stage)stage.textContent=String(label||'Loading');if(bar)bar.style.width=Math.max(4,Math.min(100,Number(progress)||0))+'%';
    window.ATLAS_BOOT_STATUS={stage:String(label||''),progress:Number(progress)||0,startedAt:bootStarted};
  }

  function bootFailure(error){
    const host=ensureBootStatus(),stage=host.querySelector('.atlas-boot-stage'),detail=host.querySelector('.atlas-boot-detail');
    host.classList.add('atlas-boot-failed');if(stage)stage.textContent='Startup issue';if(detail)detail.textContent=String(error?.message||error||'Atlas could not finish starting.').slice(0,180);
    window.ATLAS_BOOT_STATUS={stage:'Startup issue',progress:window.ATLAS_BOOT_STATUS?.progress||0,startedAt:bootStarted,error:String(error?.message||error||'Unknown error')};
    console.error('[Atlas boot]',error);
  }

  function finishBootStatus(){
    bootStage('Ready',100);if(bootTimer){clearInterval(bootTimer);bootTimer=null}
    setTimeout(()=>{document.getElementById('atlasBootStatus')?.remove();document.getElementById('atlasBootStatusStyle')?.remove()},220);
  }

  function loadStyle(src){
    if(document.querySelector(`link[data-atlas-style="${src}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=versioned(src);link.dataset.atlasStyle=src;document.head.appendChild(link);
  }

  async function loadScript(src,label,{fresh=false}={}){
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.async=false;script.src=fresh?`${versioned(src)}&t=${Date.now()}`:versioned(src);script.onload=resolve;script.onerror=()=>reject(new Error(`${label} failed to load.`));document.head.appendChild(script);
    });
  }

  try{
    bootStage('Loading interface',10);
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
    loadStyle('./styles/calendar-extras.css');
    loadStyle('./styles/calendar-clarity.css');
    loadStyle('./styles/weather-widget.css');
    loadStyle('./styles/house.css');

    bootStage('Loading calendar',28);
    // Required calendar presentation helpers.
    await loadScript('./js/travel-direction.js','Atlas travel direction marks');
    await loadScript('./js/calendar-clarity.js','Atlas calendar clarity');
    await loadScript('./js/header-weather.js','Atlas Melbourne header weather');

    bootStage('Loading Atlas modules',46);
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
    try { await loadScript('./js/editor-ux.js','Atlas editor UX'); } catch (_) {}
    try { await loadScript('./js/atlas-document-r3.js','Atlas Document v1 r3'); } catch (_) {}
    try { await loadScript('./js/atlas-document-r4-ui.js','Atlas Document UI r4'); } catch (_) {}
    try { await loadScript('./js/table-width-resize.js','Atlas table width resize r6'); } catch (_) {}
    try { await loadScript('./js/capture-framework-r7.js','Atlas Capture framework r7'); } catch (_) {}
    try { await loadScript('./js/capture-polish-r8.js','Atlas Capture polish r8'); } catch (_) {}
    // Load destructive editor controls only after all editor/document wrappers are final.
    try { await loadScript('./js/item-delete-tools.js','Atlas item deletion tools'); } catch (_) {}
    // Profile names/status are canonical profile metadata; stable IDs remain untouched.
    try { await loadScript('./js/profile-management.js','Atlas profile management'); } catch (_) {}
    try { await loadScript('./js/command-palette.js','Atlas Command palette v0.15'); } catch (_) {}
    try { await loadScript('./js/interaction-alignment.js','Atlas interaction alignment v0.15.1'); } catch (_) {}
    try { await loadScript('./js/workspace-actions.js','Atlas workspace actions v0.15.2'); } catch (_) {}
    try { await loadScript('./js/graph-hierarchy-interactions.js','Atlas hierarchy drag v0.15.3'); } catch (_) {}
    try { await loadScript('./js/network-layout.js','Atlas tunable constrained-force network grammar v0.15.11'); } catch (_) {}
    try { await loadScript('./js/network-organic.js','Atlas responsive organic network settle v0.15.14'); } catch (_) {}
    try { await loadScript('./js/network-controls.js','Atlas unified graph controls v0.15.12'); } catch (_) {}
    try { await loadScript('./js/network-split.js','Atlas switchable split network/list view v0.15.16'); } catch (_) {}
    try { await loadScript('./js/client-state-stability.js','Atlas cross-device client state stability'); } catch (_) {}
    try { await loadScript('./js/lock-terrain.js','Atlas lock identity v0.16.9-r17'); } catch (_) {}
    try { await loadScript('./js/widget-visibility-hotfix.js','Atlas widget visibility hotfix v0.16.9-r20'); } catch (_) {}
    try { await loadScript('./js/pomodoro-widget.js','Atlas Pomodoro widget'); } catch (_) {}
    try { await loadScript('./js/window-drag-local.js','Atlas free movable windows'); } catch (_) {}
    try { await loadScript('./js/runtime-telemetry.js','Atlas live runtime telemetry'); } catch (_) {}

    bootStage('Preparing House',68);
    // Shared widget capabilities load before House composes them.
    try { await loadScript('./js/widget-context.js','Atlas widget profile context'); } catch (_) {}
    try { await loadScript('./js/house-calendar-visuals.js','Atlas House calendar visuals'); } catch (_) {}
    try { await loadScript('./js/list-widget.js','Atlas List widget'); } catch (_) {}
    try { await loadScript('./js/home-server-widget.js','Atlas Home Server widget'); } catch (_) {}
    try { await loadScript('./js/weather-widget.js','Atlas Weather widget'); } catch (_) {}
    try { await loadScript('./js/house.js','Atlas House dashboard'); } catch (_) {}

    bootStage('Connecting cloud',82);
    try { await window.AtlasCloud?.init?.(); } catch (_) {}
    bootStage('Loading Atlas data',92);
    await load();
    document.documentElement.classList.add('atlas-ready');
    finishBootStatus();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load',()=>{navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{})});
    }
  }catch(error){
    bootFailure(error);
  }
})();
