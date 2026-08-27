// Atlas v0.16.9-r24: one-time Shared Atlas recovery controls in the existing Sync widget.
(function(root){
  'use strict';
  if(typeof syncWidget!=='function'||!root.AtlasSyncRecovery)return;
  const baseSyncWidget=syncWidget;
  const escText=value=>typeof esc==='function'?esc(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function recoveryBlock(){
    const sync=root.AtlasCloudSync?.getStatus?.()||{},recovery=root.AtlasSyncRecovery?.status?.()||{},last=recovery.lastResult||null;
    if(!sync.recoveryRequired&&!recovery.prepared&&!last?.canonicalEpoch)return'';
    let detail='Shared Atlas is paused until the current good copy is restored to the cloud once.';
    if(recovery.prepared&&last?.ok)detail=`Recovery preview: ${Number(last.localCount||0)} records in this browser copy; ${Number(last.remoteCount||0)} records currently in Shared Atlas. Both copies will be preserved before restore.`;
    if(last?.canonicalEpoch)detail=`Shared Atlas restored · ${Number(last.records||0)} records. This browser now has the same status as every other device.`;
    if(last?.error)detail=escText(last.error);
    return `<div class="cloud-backup atlas-canonical-recovery"><div class="cloud-result ${last?.error?'error':''}"><strong>${last?.canonicalEpoch?'SHARED ATLAS READY':'SHARED ATLAS RECOVERY REQUIRED'}</strong><span>${detail}</span></div>${last?.canonicalEpoch?'':`<div class="cloud-backup-summary"><span>This is a one-time recovery operation, not a master-device setup.</span><span>Run it only in a browser whose local Atlas contains the current data you want Shared Atlas to contain.</span><span>Atlas backs up the existing cloud copy and this local recovery copy before changing Shared Atlas.</span><span>After recovery, desktop, iPad, phone and other browsers are equal clients of the same Shared Atlas.</span></div><div class="utility-actions-row"><button type="button" data-sync-recovery="preview">Preview Shared Atlas recovery</button>${recovery.prepared?'<button type="button" data-sync-recovery="confirm">Restore Shared Atlas from this copy</button>':''}</div>`}</div>`;
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
        const ok=root.confirm?.('Restore Shared Atlas from the copy currently open in this browser? Atlas will preserve both the existing cloud copy and this local recovery copy first. This browser will not become a master device afterward.');if(!ok)return;
        const result=await root.AtlasSyncRecovery.confirm();if(result?.ok)await root.AtlasCloudSync?.retryAfterRecovery?.();
      }
    }finally{if(typeof renderHome==='function'&&state?.settings?.activeTab==='home')renderHome()}
  },true);
})(window);
