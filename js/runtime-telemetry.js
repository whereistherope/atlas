// Atlas runtime telemetry: a privacy-safe live trace of real application state.
// Presentation only. Never emits note/project contents, credentials, tokens or identifiers.
(function(root){
  'use strict';
  const MAX_LINES=10;
  const DEDUPE_MS=900;
  let host=null,lastKey='',lastAt=0,lastSaveAt=0,lastSnapshot='';

  const pad=n=>String(n).padStart(2,'0');
  const clock=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
  const safe=value=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/[^\x20-\x7E]/g,'').slice(0,120);
  function graphHost(){const svg=document.getElementById('network');return svg?.closest?.('.network-split-map')||svg?.closest?.('.map-wrap')||null}
  function ensureHost(){
    const target=graphHost();if(!target)return null;
    if(host?.isConnected&&host.parentElement===target)return host;
    target.querySelectorAll(':scope > .atlas-runtime-telemetry').forEach(el=>el.remove());
    host=document.createElement('aside');host.className='atlas-runtime-telemetry';host.setAttribute('aria-label','Atlas runtime telemetry');host.setAttribute('aria-live','off');host.innerHTML='<div class="atlas-telemetry-lines"></div>';
    target.appendChild(host);return host;
  }
  function emit(channel,message,{force=false,tone=''}={}){
    const target=ensureHost();if(!target)return;
    const key=`${channel}|${message}`,at=Date.now();if(!force&&key===lastKey&&at-lastAt<DEDUPE_MS)return;lastKey=key;lastAt=at;
    const lines=target.querySelector('.atlas-telemetry-lines');if(!lines)return;
    const row=document.createElement('div');row.className=`atlas-telemetry-line ${tone?`is-${tone}`:''}`;row.innerHTML=`<time>${clock()}</time><b>${safe(channel)}</b><span>${safe(message)}</span>`;lines.appendChild(row);
    while(lines.children.length>MAX_LINES)lines.firstElementChild?.remove();
    requestAnimationFrame(()=>row.classList.add('is-visible'));
  }
  function counts(){
    const s=typeof state==='object'&&state?state:null;if(!s)return'';
    const profile=s.settings?.activeProfile||'me';
    const own=list=>Array.isArray(list)?list.filter(item=>(item?.profile||'me')===profile).length:0;
    const nodes=typeof graphData==='function'?(()=>{try{return graphData(null)?.nodes?.length||0}catch(_){return own(s.areas)}})():own(s.areas);
    return `nodes:${nodes} projects:${own(s.projects)} notes:${own(s.notes)} events:${own(s.calendar)}`;
  }
  function camera(){
    try{const scope=document.getElementById('network')?.dataset?.scope||null,v=typeof mapView==='function'?mapView(scope):null;return v?`view:${scope||'home'} z:${Math.round((v.z||1)*100)}%`:''}catch(_){return''}
  }
  function sample(){
    const s=typeof state==='object'&&state?state:null;
    const cloud=root.AtlasCloud?.getStatus?.()||null,sync=root.AtlasCloudSync?.getStatus?.()||null,relay=root.AtlasRelayTransport?.getState?.()||null;
    const view=s?.settings?.activeTab||'home',windows=document.querySelectorAll('.atlas-window-movable,.atlas-vnote-sheet,.atlas-note-editor-sheet,.modal').length;
    const snap=[navigator.onLine!==false?'online':'offline',view,cloud?.state||'',sync?.ready?'ready':sync?.recoveryRequired?'recovery':'local',relay?.state||'',windows,counts(),camera()].join('|');
    if(snap===lastSnapshot)return;lastSnapshot=snap;
    emit('SYS',`${navigator.onLine!==false?'ONLINE':'OFFLINE'} · view:${view} · windows:${windows}`);
    if(counts())emit('STATE',counts());
    if(camera())emit('GRAPH',camera());
    if(cloud?.state)emit('CLOUD',`${cloud.state}${cloud.verified?' · verified':''}`,{tone:cloud.state==='ERROR'?'warn':''});
    if(sync)emit('SYNC',sync.recoveryRequired?'RECOVERY REQUIRED':sync.ready?'READY':'LOCAL',{tone:sync.recoveryRequired?'warn':''});
    if(relay?.state)emit('RELAY',relay.state,{tone:relay.state==='OFFLINE'?'warn':''});
  }

  // Listen to the real subsystem status events already emitted by Atlas.
  root.addEventListener('atlascanonicalstatus',event=>{const d=event.detail||{};emit('SYNC',`${d.state||'STATE'}${Number.isFinite(d.records)?` · records:${d.records}`:''}`,{tone:d.state==='ERROR'||d.recoveryRequired?'warn':''})});
  root.addEventListener('atlascloudstatus',event=>{const d=event.detail||{};emit('CLOUD',`${d.state||'STATE'}${d.verified?' · verified':''}`,{tone:d.state==='ERROR'?'warn':''})});
  root.addEventListener('atlasrelaystatus',event=>{const d=event.detail||{};emit('RELAY',`${d.state||'STATE'}${d.result?.received?` · received:${d.result.received}`:''}`,{tone:d.state==='OFFLINE'?'warn':''})});
  root.addEventListener('atlasrelaycontent',event=>{const d=event.detail||{};emit('INGRESS',d.rejected?'relay rejected':d.mutated?'relay applied':'relay checked',{tone:d.rejected?'warn':''})});
  root.addEventListener('online',()=>emit('NET','connection restored',{force:true}));
  root.addEventListener('offline',()=>emit('NET','offline cache active',{force:true,tone:'warn'}));
  document.addEventListener('visibilitychange',()=>emit('UI',`visibility:${document.visibilityState}`));

  // Report persistence completion without exposing the changed record or its contents.
  if(typeof root.save==='function'){
    const baseSave=root.save;root.save=async function(){const result=await baseSave.apply(this,arguments),at=Date.now();if(at-lastSaveAt>500){lastSaveAt=at;emit('IDB','state committed')}return result};
  }
  // Keep the trace attached whenever the network is reconstructed.
  if(typeof root.drawNetwork==='function'){
    const baseDraw=root.drawNetwork;root.drawNetwork=function(scope){const result=baseDraw.apply(this,arguments);requestAnimationFrame(()=>{ensureHost();emit('GRAPH',`${camera()} · ${counts()}`)});return result};
  }

  const start=()=>{ensureHost();emit('BOOT','runtime telemetry attached',{force:true});sample();setInterval(()=>{if(document.visibilityState!=='hidden')sample()},1800)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.AtlasRuntimeTelemetry=Object.freeze({version:'0.16.9-r1',emit,sample});
})(window);
