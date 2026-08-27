// Atlas v0.16.9-r23: one-time canonical recovery controls in the existing Sync widget.
(function(root){
  'use strict';
  if(typeof syncWidget!=='function'||!root.AtlasSyncRecovery)return;
  const baseSyncWidget=syncWidget;
  const escText=value=>typeof esc==='function'?esc(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function recoveryBlock(){
    const sync=root.AtlasCloudSync?.getStatus?.()||{},recovery=root.AtlasSyncRecovery?.status?.()||{},last=recovery.lastResult||null;
    if(!sync.recoveryRequired&&!recovery.prepared&&!last?.canonicalEpoch)return'';
    let detail='Cross-device sync is waiting for one trusted canonical baseline.';
    if(recovery.prepared&&last?.ok)detail=`Preview: ${Number(last.localCount||0)} local records will become canonical; ${Number(last.remoteCount||0)} current cloud records will be preserved before promotion.`;
    if(last?.canonicalEpoch)detail=`Canonical cloud established · ${Number(last.records||0)} records · ${escText(last.canonicalEpoch)}`;
    if(last?.error)detail=escText(last.error);
    return `<div class="cloud-backup atlas-canonical-recovery"><div class="cloud-result ${last?.error?'error':''}"><strong>${last?.canonicalEpoch?'CANONICAL CLOUD READY':'CANONICAL RECOVERY REQUIRED'}</strong><span>${detail}</span></div>${last?.canonicalEpoch?'':`<div class="cloud-backup-summary"><span>Use this only on the desktop copy you trust.</span><span>Before promotion Atlas preserves the old cloud, the trusted local record set, and a local IndexedDB recovery backup.</span><span>After promotion, stale devices pull the new canonical epoch before they can write.</span></div><div class="utility-actions-row"><button type="button" data-sync-recovery="preview">Preview canonical promotion</button>${recovery.prepared?'<button type="button" data-sync-recovery="confirm">Make this Atlas canonical</button>':''}</div>`}</div>`;
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
        const ok=root.confirm?.('Make the Atlas currently open on this device the canonical cloud Atlas? Existing cloud records will be preserved in recovery snapshots first.');if(!ok)return;
        const result=await root.AtlasSyncRecovery.confirm();if(result?.ok)await root.AtlasCloudSync?.retryAfterRecovery?.();
      }
    }finally{if(typeof renderHome==='function'&&state?.settings?.activeTab==='home')renderHome()}
  },true);
})(window);
