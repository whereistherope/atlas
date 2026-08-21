// Atlas v0.16.7-r2 · layered topographic lock-screen presentation only.
(function(root){
  'use strict';

  const MEL_TZ='Australia/Melbourne';
  let clockTimer=null;

  function profileLabel(){
    const id=root.state?.settings?.activeProfile||'me';
    const profile=(root.state?.profiles||[]).find(p=>p.id===id);
    return String(profile?.name||id||'me').toUpperCase();
  }

  function timeParts(timeZone){
    const parts=new Intl.DateTimeFormat('en-AU',{timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,day:'2-digit',month:'short'}).formatToParts(new Date());
    const get=type=>parts.find(p=>p.type===type)?.value||'';
    return {time:`${get('hour')}:${get('minute')}:${get('second')}`,date:`${get('day')} ${get('month').toUpperCase()}`};
  }

  function reliefText(){
    return [
      '                                  .................                                  ',
      '                           .......                 .......                           ',
      '                      .....      _________________      .....                      ',
      '                  ....      _____                 _____      ....                  ',
      '               ...      ____                         ____      ...               ',
      '             ...     ___       .................       ___     ...             ',
      '           ..     ___      .....               .....      ___     ..           ',
      '         ..     __      ...      ___________      ...      __     ..         ',
      '        ..    __     ...     _____         _____     ...     __    ..        ',
      '       ..   __     ..     ___                 ___     ..     __   ..       ',
      '      ..   _      ..    __       .......       __    ..      _   ..      ',
      '     ..   _      ..   __      ...       ...      __   ..      _   ..     ',
      '     ..  _      ..   _      ..   _____   ..      _   ..      _  ..     ',
      '    ..   _      .   _     ..   __     __   ..     _   .      _   ..    ',
      '    ..   _     ..  _     .    _         _    .     _  ..     _   ..    ',
      '     ..  _      .   _     ..   __     __   ..     _   .      _  ..     ',
      '     ..   _      ..   _      ..   _____   ..      _   ..      _   ..     ',
      '      ..   _      ..    __      ...       ...      __    ..      _   ..      ',
      '       ..   __     ..     ___       .......       ___     ..     __   ..       ',
      '        ..    __     ...     _____         _____     ...     __    ..        ',
      '         ..     __      ...      ___________      ...      __     ..         ',
      '           ..     ___      .....               .....      ___     ..           ',
      '             ...     ___       .................       ___     ...             ',
      '               ...      ____                         ____      ...               ',
      '                  ....      _____                 _____      ....                  ',
      '                      .....      _________________      .....                      ',
      '                           .......                 .......                           ',
      '                                  .................                                  '
    ].join('\n');
  }

  function terrainMarkup(){
    const terrain=reliefText();
    return `<div class="atlas-lock-relief" aria-hidden="true">
      <pre class="atlas-lock-layer layer-1">${terrain}</pre>
      <pre class="atlas-lock-layer layer-2">${terrain}</pre>
      <pre class="atlas-lock-layer layer-3">${terrain}</pre>
      <pre class="atlas-lock-layer layer-4">${terrain}</pre>
      <pre class="atlas-lock-layer layer-5">${terrain}</pre>
      <pre class="atlas-lock-layer layer-6">${terrain}</pre>
    </div>`;
  }

  function updateStatus(){
    const mel=timeParts(MEL_TZ),utc=timeParts('UTC');
    const melEl=document.querySelector('[data-lock-mel]'),utcEl=document.querySelector('[data-lock-utc]'),profile=document.querySelector('[data-lock-profile]');
    if(melEl)melEl.innerHTML=`<strong>${mel.time}</strong>${mel.date} · Melbourne`;
    if(utcEl)utcEl.innerHTML=`<strong>${utc.time}</strong>${utc.date} · UTC`;
    if(profile)profile.textContent=profileLabel();
  }

  function install(){
    const lock=document.getElementById('lockScreen');if(!lock)return;
    if(!lock.querySelector('.atlas-lock-surface')){
      const surface=document.createElement('div');surface.className='atlas-lock-surface';surface.setAttribute('aria-hidden','true');surface.innerHTML=terrainMarkup();lock.prepend(surface);
    }

    if(!lock.querySelector('.atlas-lock-status')){
      const status=document.createElement('div');status.className='atlas-lock-status';status.innerHTML='<div data-lock-mel></div><div class="lock-utc" data-lock-utc></div>';lock.appendChild(status);
    }

    const brand=lock.querySelector('.lock-brand');
    if(brand&&!lock.querySelector('.atlas-lock-profile')){
      const profile=document.createElement('div');profile.className='atlas-lock-profile';profile.setAttribute('data-lock-profile','');brand.insertAdjacentElement('afterend',profile);
    }

    updateStatus();
    clearInterval(clockTimer);clockTimer=setInterval(updateStatus,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  root.AtlasLockTopography=Object.freeze({version:'0.16.7-r2',install,updateStatus,terrainMarkup});
})(window);
