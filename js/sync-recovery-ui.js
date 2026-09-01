// Atlas v0.16.9-r41: one-time Atlas Cloud setup controls in the existing Sync widget.
(function(root){
  'use strict';
  if(typeof syncWidget!=='function'||!root.AtlasSyncRecovery)return;
  const baseSyncWidget=syncWidget;
  const escText=value=>typeof esc==='function'?esc(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function recoveryBlock(){
    const sync=root.AtlasCloudSync?.getStatus?.()||{},recovery=root.AtlasSyncRecovery?.status?.()||{},last=recovery.lastResult||null;
    if(!sync.recoveryRequired&&!recovery.prepared&&!last?.canonicalEpoch)return'';
    let detail='Atlas Cloud has not been initialised with a canonical Atlas state yet. Sync is paused until you establish it once from the current good copy.';
    if(recovery.prepared&&last?.ok)detail=`Setup preview: ${Number(last.localCount||0)} records in this browser copy; ${Number(last.remoteCount||0)} historical records currently in Atlas Cloud. Both copies will be preserved before setup.`;
    if(last?.canonicalEpoch)detail=`Atlas Cloud ready · ${Number(last.records||0)} records. This browser is now an ordinary client of the same Atlas as every other signed-in device.`;
    if(last?.error)detail=escText(last.error);
    return `<div class="cloud-backup atlas-canonical-recovery"><div class="cloud-result ${last?.error?'error':''}"><strong>${last?.canonicalEpoch?'ATLAS CLOUD READY':'ATLAS CLOUD SETUP REQUIRED'}</strong><span>${detail}</span></div>${last?.canonicalEpoch?'':`<div class="cloud-backup-summary"><span>This is a one-time Atlas Cloud initialisation, not a master-device setup.</span><span>Run it only in a browser whose local Atlas contains the current data you want Atlas to contain.</span><span>Atlas preserves the existing cloud copy and this local setup copy before changing Atlas Cloud.</span><span>After setup, desktop, iPad, phone and other browsers are equal clients of one Atlas.</span></div><div class="utility-actions-row"><button type="button" data-sync-recovery="preview">Preview Atlas Cloud setup</button>${recovery.prepared?'<button type="button" data-sync-recovery="confirm">Establish Atlas Cloud from this copy</button>':''}</div>`}</div>`;
  }

  syncWidget=function(){
    const html=baseSyncWidget();const block=recoveryBlock();if(!block)return html;
    const marker='</div></section>',at=html.lastIndexOf(marker);return at>=0?html.slice(0,at)+block+html.slice(at):html;
  };

  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-sync-recovery]');if(!button)return;
    event.preventDefault();event.stopPropagation();button.disabled=true;
    try{
      if(button.dataset.syncRecovery==='preview')await root.AtlasSyncRecovery.preview();
      else if(button.dataset.syncRecovery==='confirm'){
        const ok=root.confirm?.('Establish Atlas Cloud from the Atlas copy currently open in this browser? Atlas will preserve both the existing cloud copy and this local copy first. This does not make this device a master; it establishes the one cloud-backed Atlas used by every client.');if(!ok)return;
        const result=await root.AtlasSyncRecovery.confirm();if(result?.ok)await root.AtlasCloudSync?.retryAfterRecovery?.();
      }
    }finally{if(typeof renderHome==='function'&&state?.settings?.activeTab==='home')renderHome()}
  },true);
})(window);
