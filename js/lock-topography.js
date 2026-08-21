// Atlas v0.16.7-r3 · full-field layered topographic lock-screen presentation only.
(function(root){
  'use strict';

  const MEL_TZ='Australia/Melbourne';
  let clockTimer=null;

  function timeParts(timeZone){
    const parts=new Intl.DateTimeFormat('en-AU',{timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,day:'2-digit',month:'short'}).formatToParts(new Date());
    const get=type=>parts.find(p=>p.type===type)?.value||'';
    return {time:`${get('hour')}:${get('minute')}:${get('second')}`,date:`${get('day')} ${get('month').toUpperCase()}`};
  }

  function topographyText(cols=118,rows=76){
    const lines=[];
    for(let y=0;y<rows;y++){
      let line='';
      const ny=(y/(rows-1)-.5)*2;
      for(let x=0;x<cols;x++){
        const nx=(x/(cols-1)-.5)*2;
        const hillA=1.08*Math.exp(-(((nx+.34)/.52)**2+((ny+.12)/.38)**2));
        const hillB=.90*Math.exp(-(((nx-.32)/.43)**2+((ny-.20)/.48)**2));
        const hillC=.58*Math.exp(-(((nx+.02)/.30)**2+((ny-.48)/.26)**2));
        const saddle=.18*Math.sin(nx*5.7+ny*2.2)+.12*Math.cos(ny*6.4-nx*1.8);
        const height=Math.max(0,hillA+hillB+hillC+saddle+.10);
        const contour=height*8.6;
        const nearest=Math.abs(contour-Math.round(contour));
        if(height<.15||nearest>.095){line+=' ';continue}
        const level=Math.max(0,Math.min(7,Math.round(contour)));
        line+='·.:--=+#'[level]||'·';
      }
      lines.push(line.replace(/\s+$/,''));
    }
    return lines.join('\n');
  }

  function terrainMarkup(){
    const terrain=topographyText();
    return `<div class="atlas-lock-relief" aria-hidden="true">
      <pre class="atlas-lock-layer layer-1">${terrain}</pre>
      <pre class="atlas-lock-layer layer-2">${terrain}</pre>
      <pre class="atlas-lock-layer layer-3">${terrain}</pre>
      <pre class="atlas-lock-layer layer-4">${terrain}</pre>
      <pre class="atlas-lock-layer layer-5">${terrain}</pre>
      <pre class="atlas-lock-layer layer-6">${terrain}</pre>
      <pre class="atlas-lock-layer layer-7">${terrain}</pre>
    </div>`;
  }

  function updateStatus(){
    const mel=timeParts(MEL_TZ),utc=timeParts('UTC');
    const melEl=document.querySelector('[data-lock-mel]'),utcEl=document.querySelector('[data-lock-utc]');
    if(melEl)melEl.innerHTML=`<strong>${mel.time}</strong>${mel.date} · Melbourne`;
    if(utcEl)utcEl.innerHTML=`<strong>${utc.time}</strong>${utc.date} · UTC`;
  }

  function install(){
    const lock=document.getElementById('lockScreen');if(!lock)return;
    lock.querySelector('.atlas-lock-profile')?.remove();
    if(!lock.querySelector('.atlas-lock-surface')){
      const surface=document.createElement('div');surface.className='atlas-lock-surface';surface.setAttribute('aria-hidden','true');surface.innerHTML=terrainMarkup();lock.prepend(surface);
    }
    if(!lock.querySelector('.atlas-lock-status')){
      const status=document.createElement('div');status.className='atlas-lock-status';status.innerHTML='<div data-lock-mel></div><div class="lock-utc" data-lock-utc></div>';lock.appendChild(status);
    }
    updateStatus();
    clearInterval(clockTimer);clockTimer=setInterval(updateStatus,1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  root.AtlasLockTopography=Object.freeze({version:'0.16.7-r3',install,updateStatus,topographyText,terrainMarkup});
})(window);
