// Atlas lock-screen identity shell. Presentation only; authentication remains elsewhere.
(function(root){
  'use strict';

  const phrases=['SHOULD YOU BE HERE?','WHERE ARE YOU GOING?','IDENTIFY.','ATLAS AWAITS.'];
  let clockTimer=null;

  function noise(a,b=0){
    const x=Math.sin(a*12.9898+b*78.233+19.19)*43758.5453;
    return x-Math.floor(x);
  }

  function buildMeta(){
    const meta=document.createElement('div');
    meta.className='atlas-lock-meta';
    meta.innerHTML='<div><span>MEL</span><strong data-lock-mel>--:--:--</strong></div><div><span>UTC</span><strong data-lock-utc>--:--:--</strong></div>';
    return meta;
  }

  function updateClocks(){
    const now=new Date();
    const mel=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    const utc=new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    document.querySelector('[data-lock-mel]')?.replaceChildren(document.createTextNode(mel));
    document.querySelector('[data-lock-utc]')?.replaceChildren(document.createTextNode(utc));
  }

  function decorateAuth(){
    const content=document.getElementById('lockContent');
    if(!content)return;
    const pin=content.querySelector('.pin-input');
    const card=document.querySelector('#lockScreen .lock-card');
    if(card)card.classList.toggle('is-pin-mode',!!pin);
    if(pin&&!content.querySelector('.atlas-lock-prompt')){
      const prompt=document.createElement('div');
      prompt.className='atlas-lock-prompt';
      prompt.textContent=phrases[Math.floor(noise(Date.now()%997,13)*phrases.length)%phrases.length];
      content.insertBefore(prompt,content.firstChild);
    }
  }

  function mount(){
    const screen=document.getElementById('lockScreen');
    const card=screen?.querySelector('.lock-card');
    if(!screen||!card||screen.dataset.identityMounted==='1')return;
    screen.dataset.identityMounted='1';
    screen.insertBefore(buildMeta(),card);
    updateClocks();
    clockTimer=setInterval(updateClocks,1000);
    const content=document.getElementById('lockContent');
    if(content){
      const observer=new MutationObserver(decorateAuth);
      observer.observe(content,{childList:true,subtree:true});
    }
    decorateAuth();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  root.AtlasLockTerrain=Object.freeze({mount,updateClocks});
})(window);
