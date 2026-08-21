// Atlas v0.16.7-r1 · atmospheric lock-screen presentation only.
(function(root){
  'use strict';

  const QUERIES=['SHOULD YOU BE HERE?','WHERE ARE YOU GOING?','WHAT ARE YOU LOOKING FOR?','WHAT IS CONNECTED?'];
  const MEL_TZ='Australia/Melbourne';
  let queryIndex=0,clockTimer=null,queryTimer=null;

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

  function ghostMarkup(){
    return `<svg class="atlas-lock-ghost" viewBox="0 0 760 420" aria-hidden="true">
      <g>
        <line x1="380" y1="210" x2="233" y2="115"/><line x1="380" y1="210" x2="514" y2="102"/><line x1="380" y1="210" x2="563" y2="254"/><line x1="380" y1="210" x2="267" y2="314"/>
        <line x1="233" y1="115" x2="150" y2="72"/><line x1="233" y1="115" x2="142" y2="151"/><line x1="233" y1="115" x2="260" y2="51"/>
        <line x1="514" y1="102" x2="594" y2="54"/><line x1="514" y1="102" x2="622" y2="132"/><line x1="563" y1="254" x2="649" y2="230"/><line x1="563" y1="254" x2="626" y2="326"/>
        <line x1="267" y1="314" x2="166" y2="344"/><line x1="267" y1="314" x2="318" y2="374"/>
        <circle class="atlas-lock-core" cx="380" cy="210" r="7"/><circle cx="233" cy="115" r="4.4"/><circle cx="514" cy="102" r="4.4"/><circle cx="563" cy="254" r="4.4"/><circle cx="267" cy="314" r="4.4"/>
        <circle cx="150" cy="72" r="2.5"/><circle cx="142" cy="151" r="2.5"/><circle cx="260" cy="51" r="2.5"/><circle cx="594" cy="54" r="2.5"/><circle cx="622" cy="132" r="2.5"/><circle cx="649" cy="230" r="2.5"/><circle cx="626" cy="326" r="2.5"/><circle cx="166" cy="344" r="2.5"/><circle cx="318" cy="374" r="2.5"/>
      </g>
    </svg>`;
  }

  function topoText(){
    return [
      '                       ..::---==+++**##%%@@%%##**+++==---::..',
      '                 ..:--==++**##%%@@@%%##**++++==--::..',
      '             .:--=++**##%%@@%%##**++==--::..',
      '          .:-=+**##%%@@%%#**+==-:..             ..::--==++**##',
      '        .:=+*#%%@@%%#*+=-:.            ..:--==++**##%%@@%%##**',
      '       :-+*#%@@%#*+=:.           ..:-==++**##%%@@%%##**++==--:',
      '       :=*#%@%#+=:.         ..:-=++**##%%@@%%##**++==--::..',
      '       :-+#%%#+-.       .:-=+**##%%@@%%##**++==-::..',
      '        :=*##*=:     .:-=+*##%%@@%%##*++==-:..',
      '         :-+**+=:..:-=+*#%%@@%%#**+=-:.',
      '           .:-==++++*#%%@@%%#*+=-:.',
      '              ..::-=+*#%%%%#*=-:..',
      '                   .:-=+**+=-:.',
      '                        ....'
    ].join('\n');
  }

  function updateStatus(){
    const local=timeParts(MEL_TZ),utc=timeParts('UTC');
    const mel=document.querySelector('[data-lock-mel]'),utcEl=document.querySelector('[data-lock-utc]'),profile=document.querySelector('[data-lock-profile]');
    if(mel)mel.innerHTML=`<strong>${local.time}</strong>${local.date} / MEL`;
    if(utcEl)utcEl.innerHTML=`<strong>${utc.time}</strong>${utc.date} / UTC`;
    if(profile)profile.textContent=`PROFILE / ${profileLabel()}`;
  }

  function rotateQuery(){
    const el=document.querySelector('.atlas-lock-query');if(!el)return;
    el.classList.add('is-changing');
    setTimeout(()=>{queryIndex=(queryIndex+1)%QUERIES.length;el.textContent=QUERIES[queryIndex];el.classList.remove('is-changing')},230);
  }

  function install(){
    const lock=document.getElementById('lockScreen');if(!lock||lock.querySelector('.atlas-lock-surface'))return;
    const surface=document.createElement('div');surface.className='atlas-lock-surface';surface.setAttribute('aria-hidden','true');
    const topo=topoText();
    surface.innerHTML=`<pre class="atlas-lock-topography">${topo}</pre><pre class="atlas-lock-topography layer-two">${topo}</pre><pre class="atlas-lock-topography layer-three">${topo}</pre>${ghostMarkup()}`;
    lock.prepend(surface);

    const status=document.createElement('div');status.className='atlas-lock-status';status.innerHTML='<div data-lock-mel></div><div class="lock-utc" data-lock-utc></div><div data-lock-profile>PROFILE / ME</div><div class="lock-utc">CANONICAL / ONLINE</div>';
    lock.appendChild(status);

    const query=document.createElement('div');query.className='atlas-lock-query';query.textContent=QUERIES[0];lock.appendChild(query);
    updateStatus();
    clearInterval(clockTimer);clockTimer=setInterval(updateStatus,1000);
    clearInterval(queryTimer);queryTimer=setInterval(rotateQuery,9000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  root.AtlasLockTopography=Object.freeze({version:'0.16.7-r1',install,updateStatus});
})(window);
