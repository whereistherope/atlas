// Atlas profile management: stable internal IDs, editable display names, reversible close/reopen state.
(function(root){
  'use strict';

  const legacyName=value=>String(value||'').trim().toLowerCase()==='me';
  const profileInitials=profile=>{
    const words=String(profile?.name||profile?.id||'').trim().split(/\s+/).filter(Boolean);
    return (words.length>1?words.slice(0,2).map(word=>word[0]).join(''):String(words[0]||'AT').slice(0,3)).toUpperCase();
  };
  const openProfiles=()=>Array.isArray(state?.profiles)?state.profiles.filter(profile=>profile&&!profile.closed):[];

  function normaliseProfiles(target){
    if(!target||!Array.isArray(target.profiles))return target;
    target.profiles.forEach(profile=>{
      if(!profile)return;
      if(profile.id==='me'&&legacyName(profile.name))profile.name='Fraser';
      if(typeof profile.closed!=='boolean')profile.closed=profile.id==='alyssa'||profile.id==='us';
    });
    let open=target.profiles.filter(profile=>profile&&!profile.closed);
    if(!open.length){const fallback=target.profiles.find(profile=>profile?.id==='me')||target.profiles[0];if(fallback)fallback.closed=false;open=fallback?[fallback]:[]}
    target.settings=target.settings||{};
    if(!open.some(profile=>profile.id===target.settings.activeProfile))target.settings.activeProfile=open[0]?.id||'me';
    return target;
  }

  if(typeof root.ensureState==='function'){
    const baseEnsureState=root.ensureState;
    root.ensureState=function(input){return normaliseProfiles(baseEnsureState.apply(this,arguments))};
  }
  normaliseProfiles(root.state);

  const baseRenderTabs=typeof root.renderTabs==='function'?root.renderTabs:null;
  if(baseRenderTabs){
    root.renderTabs=function(){
      normaliseProfiles(state);
      const result=baseRenderTabs.apply(this,arguments),profiles=openProfiles(),active=state.settings.activeProfile||profiles[0]?.id||'me';
      const select=document.getElementById('profileSelect');
      if(select){select.innerHTML=profiles.map(profile=>`<option value="${esc(profile.id)}">${esc(profile.name)}</option>`).join('');select.value=active}
      const panel=document.getElementById('profileMenuPanel');
      if(panel)panel.innerHTML=profiles.map(profile=>`<button type="button" class="system-item" data-profile-id="${esc(profile.id)}" aria-current="${profile.id===active}">${esc(profile.name)}</button>`).join('');
      const value=document.getElementById('profileMenuValue');if(value)value.textContent=profileById(active).name;
      return result;
    };
  }

  const baseEditorProfiles=typeof root.editorProfiles==='function'?root.editorProfiles:null;
  if(baseEditorProfiles){
    root.editorProfiles=function(){
      const profiles=Array.isArray(state.profiles)?state.profiles:[],active=state.settings.activeProfile||'me',openCount=openProfiles().length;
      return `<section class="editor-section"><div class="editor-section-head"><h4>Profiles</h4><span class="code">OPEN / CLOSED CONTEXTS</span></div><div class="editor-section-body"><div class="profile-grid">${profiles.map((profile,index)=>{
        const isActive=profile.id===active,closed=!!profile.closed,canClose=!closed&&!isActive&&openCount>1;
        return `<div class="profile-card" data-profile-card="${esc(profile.id)}" style="${closed?'opacity:.64':''}"><div class="profile-glyph">${esc(profileInitials(profile))}</div>${field('Name',`<input data-profile-edit="${index}" value="${esc(profile.name)}">`)}<div class="inline-actions" style="margin:8px 0"><span class="code">${closed?'CLOSED':isActive?'ACTIVE':'OPEN'}</span>${closed?`<button type="button" class="btn small" data-profile-toggle="${esc(profile.id)}" data-profile-open="true">Reopen</button>`:`<button type="button" class="btn small" data-profile-toggle="${esc(profile.id)}" data-profile-open="false" ${canClose?'':'disabled'}>${isActive?'Current profile':'Close'}</button>`}</div><p>${profile.kind==='shared'?'Shared context. Closing it hides it without deleting its calendar, notes, projects or other records.':'Personal context. Closing it hides it from normal Atlas switching without deleting anything.'}</p></div>`;
      }).join('')}</div><p class="code" style="margin-top:12px">Profile IDs remain stable behind the scenes. Renaming only changes what Atlas displays. Closed profiles and their data remain in Atlas Cloud and can be reopened here at any time.</p></div></section>`;
    };
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-profile-toggle]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const profile=state.profiles.find(item=>item?.id===button.dataset.profileToggle);if(!profile)return;
    const reopen=button.dataset.profileOpen==='true';
    if(reopen){profile.closed=false;log(`Profile reopened: ${profile.name}.`);save();renderTabs();renderEditor();toast(`${profile.name} reopened`);return}
    if(profile.id===state.settings.activeProfile)return toast('Switch profiles before closing the current profile');
    if(openProfiles().length<=1)return toast('Atlas needs at least one open profile');
    profile.closed=true;log(`Profile closed: ${profile.name}.`);save();renderTabs();renderEditor();toast(`${profile.name} closed`);
  });

  // A closed shared profile remains intact but should not invite new Entangle actions.
  const baseOpenCalendarEvent=typeof root.openCalendarEvent==='function'?root.openCalendarEvent:null;
  if(baseOpenCalendarEvent){
    root.openCalendarEvent=function(){
      const result=baseOpenCalendarEvent.apply(this,arguments),shared=state.profiles.find(profile=>profile?.id==='us'),row=document.getElementById('entangleRow');
      if(row&&shared?.closed)row.style.display='none';
      return result;
    };
  }

  root.AtlasProfileManagement=Object.freeze({version:'0.16.9-r1',normaliseProfiles,openProfiles});
})(window);
