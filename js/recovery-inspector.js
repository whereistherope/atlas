// Atlas recovery inspector: preview local IndexedDB safety snapshots and merge one additively into canonical cloud state.
(function(root){
  'use strict';
  const RECORD_TYPE='canonical_state_v1',RECORD_ID='primary';
  const COLLECTIONS=['profiles','areas','links','projects','notes','daily','calendar','quickTodos','activity'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const plain=value=>!!value&&Object.prototype.toString.call(value)==='[object Object]';
  let client=null,target=null,busy=false;

  function buildPayload(source){
    const out={schema:'atlas_canonical_state',version:1,dataVersion:Number(source?.version||8)};
    for(const key of COLLECTIONS)out[key]=clone(Array.isArray(source?.[key])?source[key]:[]);
    out.scratch=clone(plain(source?.scratch)?source.scratch:{});
    return out;
  }
  function unionList(remoteList,recoveryList){
    const result=clone(Array.isArray(remoteList)?remoteList:[]),seen=new Set(result.filter(x=>x&&x.id).map(x=>x.id));
    for(const item of (Array.isArray(recoveryList)?recoveryList:[])){
      if(!item||!item.id){result.push(clone(item));continue}
      if(!seen.has(item.id)){seen.add(item.id);result.push(clone(item))}
    }
    return result;
  }
  function unionScratch(remoteScratch,recoveryScratch){
    const result=clone(plain(remoteScratch)?remoteScratch:{}),local=plain(recoveryScratch)?recoveryScratch:{};
    for(const [key,value] of Object.entries(local)){
      const recoveryText=String(value??''),remoteText=String(result[key]??'');
      if(!remoteText){result[key]=recoveryText;continue}
      if(recoveryText&&recoveryText!==remoteText&&!remoteText.includes(recoveryText))result[key]=`${remoteText}\n\n--- Recovered Atlas snapshot ---\n\n${recoveryText}`;
    }
    return result;
  }
  function unionPayload(remote,recovery){
    const merged={schema:'atlas_canonical_state',version:1,dataVersion:Math.max(Number(remote?.dataVersion||0),Number(recovery?.dataVersion||0),8)};
    for(const key of COLLECTIONS)merged[key]=unionList(remote?.[key],recovery?.[key]);
    merged.scratch=unionScratch(remote?.scratch,recovery?.scratch);
    return merged;
  }
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

  async function ensureTarget(){
    if(target)return target;
    const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;
    if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas cloud client unavailable.');
    if(!client)client=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const shared=await root.AtlasCloud?.getSession?.();
    let {data,error}=await client.auth.getSession();if(error)throw error;let session=data?.session||null;
    if(!session&&shared?.access_token&&shared?.refresh_token){const set=await client.auth.setSession({access_token:shared.access_token,refresh_token:shared.refresh_token});if(set.error)throw set.error;session=set.data?.session||null}
    if(!session?.user)throw new Error('Sign in to Atlas cloud first.');
    const user=session.user;
    const vault=await client.from('atlas_vaults').select('id').eq('created_by',user.id).eq('name','Atlas').single();if(vault.error)throw vault.error;
    const profile=await client.from('atlas_profiles').select('id').eq('vault_id',vault.data.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profile.error)throw profile.error;
    if(!profile.data?.id)throw new Error('Me cloud profile is unavailable.');
    target={userId:user.id,profileId:profile.data.id};return target;
  }
  async function readCanonical(){
    await ensureTarget();
    const {data,error}=await client.from('atlas_records').select('payload,revision').eq('profile_id',target.profileId).eq('record_type',RECORD_TYPE).eq('record_id',RECORD_ID).maybeSingle();
    if(error)throw error;if(!data)throw new Error('Shared Atlas is unavailable.');return data;
  }
  async function writeCanonical(payload,revision){
    const {data,error}=await client.from('atlas_records').update({payload,client_updated_at:Date.now(),revision:Number(revision)+1,updated_by:target.userId}).eq('profile_id',target.profileId).eq('record_type',RECORD_TYPE).eq('record_id',RECORD_ID).eq('revision',revision).select('revision');
    if(error)throw error;return Array.isArray(data)&&data.length===1;
  }
  async function mergeSnapshot(snapshot){
    if(busy)return;busy=true;
    try{
      if(typeof idbBackup==='function')await idbBackup(clone(state),'before recovery inspector merge');
      const recovery=buildPayload(snapshot);
      let result=null;
      for(let attempt=0;attempt<5;attempt++){
        const remote=await readCanonical();const merged=unionPayload(remote.payload,recovery);
        if(same(merged,remote.payload)){result={changed:false};break}
        if(await writeCanonical(merged,remote.revision)){result={changed:true};break}
      }
      if(!result)throw new Error('Atlas changed repeatedly while recovering.');
      root.toast?.(result.changed?'Snapshot merged into shared Atlas':'Snapshot already present in shared Atlas');
      document.getElementById('atlasRecoveryInspector')?.remove();
      setTimeout(()=>location.reload(),700);
    }catch(error){console.error('Atlas recovery merge failed',error);root.toast?.('Snapshot recovery failed')}finally{busy=false}
  }

  function counts(data){
    return `Nodes ${data?.areas?.length||0} · Links ${data?.links?.length||0} · Projects ${data?.projects?.length||0} · Notes ${data?.notes?.length||0} · Todos ${data?.quickTodos?.length||0}`;
  }
  function markerText(data){
    const names=[];
    for(const item of (data?.areas||[]))if(item?.name)names.push(item.name);
    for(const item of (data?.projects||[]))if(item?.title)names.push(item.title);
    const goSafe=names.find(value=>/go\s*safe/i.test(String(value)));
    return goSafe?`Contains: ${goSafe}`:'';
  }
  function recentBackups(backups){
    const cutoff=Date.now()-3*24*60*60*1000;
    const list=(backups||[]).filter(item=>item?.data&&new Date(item.createdAt||0).getTime()>=cutoff);
    return list.length?list:(backups||[]).filter(item=>item?.data).slice(0,12);
  }
  async function open(){
    if(typeof idbBackups!=='function'){root.toast?.('No local recovery store available');return}
    const existing=document.getElementById('atlasRecoveryInspector');if(existing){existing.remove();return}
    const backups=recentBackups(await idbBackups());
    const overlay=document.createElement('div');overlay.id='atlasRecoveryInspector';overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(5,8,10,.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';
    const panel=document.createElement('div');panel.style.cssText='width:min(820px,100%);max-height:min(760px,92vh);overflow:auto;background:#111719;color:#edf2ef;border:1px solid rgba(255,255,255,.16);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.55);font:13px/1.45 system-ui,sans-serif';
    panel.innerHTML='<div style="position:sticky;top:0;background:#111719;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.1);z-index:1"><div style="display:flex;gap:16px;align-items:flex-start"><div style="flex:1"><div style="font-size:18px;font-weight:700;letter-spacing:.02em">Atlas Recovery</div><div style="margin-top:6px;color:#aebbb8">These are safety snapshots stored on this computer. Merging a snapshot only adds missing records to the shared Atlas; it does not delete the iPad/cloud version.</div></div><button data-close style="background:transparent;color:#dce6e3;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 10px;cursor:pointer">Close</button></div></div>';
    const body=document.createElement('div');body.style.cssText='padding:14px 20px 20px';
    if(!backups.length){body.innerHTML='<div style="padding:22px 4px;color:#c7d1ce">No IndexedDB safety snapshots were found in this browser.</div>'}
    backups.forEach((item,index)=>{
      const card=document.createElement('div');card.style.cssText='padding:14px 0;border-bottom:1px solid rgba(255,255,255,.09);display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center';
      const when=item.createdAt?new Date(item.createdAt).toLocaleString():`Snapshot ${index+1}`;
      const marker=markerText(item.data);
      card.innerHTML=`<div><div style="font-weight:650">${when}</div><div style="margin-top:3px;color:#91a29e">${String(item.reason||'local safety snapshot')}</div><div style="margin-top:5px;color:#cbd5d2">${counts(item.data)}</div>${marker?`<div style="margin-top:5px;color:#fff;font-weight:700">${marker}</div>`:''}</div>`;
      const button=document.createElement('button');button.type='button';button.textContent='MERGE THIS SNAPSHOT';button.style.cssText='white-space:nowrap;background:#e7eee9;color:#111;border:0;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer';button.addEventListener('click',()=>{button.disabled=true;button.textContent='MERGING…';mergeSnapshot(item.data)});card.appendChild(button);body.appendChild(card);
    });
    panel.appendChild(body);overlay.appendChild(panel);document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest?.('[data-close]'))overlay.remove()});
  }
  async function openIfNeeded(){
    try{
      if(typeof idbBackups!=='function')return;
      const backups=recentBackups(await idbBackups());if(!backups.length)return;
      let prompt=document.getElementById('atlasRecoveryPrompt');if(prompt)return;
      prompt=document.createElement('button');prompt.id='atlasRecoveryPrompt';prompt.type='button';prompt.textContent='RECOVERY SNAPSHOTS AVAILABLE';prompt.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99998;border:1px solid rgba(255,255,255,.2);background:#151c1e;color:#eef4f1;border-radius:10px;padding:10px 12px;font:700 11px/1 system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 12px 36px rgba(0,0,0,.34);cursor:pointer';prompt.addEventListener('click',open);document.body.appendChild(prompt);
    }catch(error){console.error('Atlas recovery inspector failed to initialise',error)}
  }
  root.AtlasRecoveryInspector=Object.freeze({open,openIfNeeded});
})(window);
