const CACHE_NAME = 'atlas-shell-0.16.9-r6';
const APP_SHELL = [
  './','./index.html','./manifest.webmanifest',
  './styles/tokens.css','./styles/app.css','./styles/widgets.css','./styles/map.css','./styles/note-editor.css','./styles/visual-note-editor.css','./styles/v0133-polish.css','./styles/editor-ux.css','./styles/atlas-document.css','./styles/capture-framework.css','./styles/command-palette.css','./styles/interaction-alignment.css','./styles/workspace-actions.css','./styles/network-layout.css','./styles/network-split.css','./styles/lock-terrain.css','./styles/network-overview.css',
  './js/db.js','./js/auth.js','./js/cloud-config.js','./js/cloud.js','./js/cloud-backup.js','./js/app.js','./js/cloud-restore.js','./js/relay.js','./js/relay-transport.js','./js/calendar.js','./js/map.js','./js/ui.js','./js/widgets.js','./js/v0130-safety.js','./js/sync-v2-core.js','./js/sync-v2.js','./js/note-editor.js','./js/note-editor-loader-hotfix.js','./js/visual-note-editor.js','./js/visual-table-controls.js','./js/rich-note-capture.js','./js/project-workspace.js','./js/editor-ux.js','./js/atlas-document-r3.js','./js/atlas-document-r4-ui.js','./js/table-width-resize.js','./js/capture-framework-r7.js','./js/capture-polish-r8.js','./js/command-palette.js','./js/interaction-alignment.js','./js/capture-flow-fix.js','./js/workspace-actions.js','./js/graph-hierarchy-interactions.js','./js/network-layout.js','./js/network-organic.js','./js/network-controls.js','./js/network-split.js','./js/lock-terrain.js','./js/network-overview.js','./js/bootstrap.js',
  './assets/lock-terrain.gif','./atlas-192.png','./atlas-512.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('atlas-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy))}return response}).catch(async()=>{return(await caches.match(request))||(await caches.match('./index.html'))||(await caches.match('./'))}));return;
  }
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request)));
});
