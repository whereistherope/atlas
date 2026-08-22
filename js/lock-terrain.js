// Atlas v0.16.7: deterministic exploded topographic lock-screen hero.
(function(root){
  'use strict';

  const NS='http://www.w3.org/2000/svg';
  const GLYPHS=['·','.',':','-','_','/','\\','+'];
  const phrases=['SHOULD YOU BE HERE?','WHERE ARE YOU GOING?','IDENTIFY.','ATLAS AWAITS.'];
  let clockTimer=null;

  function svgEl(name,attrs={}){
    const el=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));
    return el;
  }

  function noise(a,b=0){
    const x=Math.sin(a*12.9898+b*78.233+19.19)*43758.5453;
    return x-Math.floor(x);
  }

  function ringPath(cx,cy,rx,ry,seed,points=72,rough=.09){
    const out=[];
    for(let i=0;i<points;i++){
      const t=(i/points)*Math.PI*2;
      const n=(noise(seed,i)-.5)*2;
      const n2=(noise(seed+31,i*1.7)-.5)*2;
      const lobe=Math.sin(t*3+seed*.17)*.035+Math.cos(t*5-seed*.11)*.018;
      const x=cx+Math.cos(t)*rx*(1+lobe+n*rough)+Math.sin(t*2.1)*rx*.025;
      const y=cy+Math.sin(t)*ry*(1+lobe+n2*rough*.7)+Math.cos(t*3.3)*ry*.02;
      out.push(`${i?'L':'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return `${out.join(' ')} Z`;
  }

  function makeLayer(index,total){
    const g=svgEl('g',{'class':`atlas-terrain-layer layer-${index}`});
    const y=72+index*55;
    const scale=1-index*.035;
    const cx=450,cy=y;
    const rx=285*scale,ry=92*scale;
    const outer=svgEl('path',{d:ringPath(cx,cy,rx,ry,43,86,.055),'class':'terrain-silhouette'});
    g.appendChild(outer);

    const contourCount=Math.max(3,8-index);
    for(let c=1;c<=contourCount;c++){
      const p=c/(contourCount+1);
      const contour=svgEl('path',{
        d:ringPath(cx+(noise(index,c)-.5)*22,cy-(1-p)*10,rx*(1-p*.72),ry*(1-p*.74),81+c*17,70,.065),
        'class':'terrain-contour',
        opacity:(.72-index*.065-c*.025).toFixed(2)
      });
      g.appendChild(contour);
    }

    if(index<total-1){
      [-.72,-.18,.37,.78].forEach((side,s)=>{
        const x=cx+rx*side;
        const nextY=y+55;
        const line=svgEl('line',{x1:x.toFixed(1),y1:(cy+ry*.08).toFixed(1),x2:(x-rx*.012).toFixed(1),y2:(nextY-ry*.05).toFixed(1),'class':'terrain-register',opacity:(.22-s*.025).toFixed(2)});
        g.appendChild(line);
      });
    }

    if(index<=3){
      const glyphCount=index===0?74:index===1?42:24;
      for(let i=0;i<glyphCount;i++){
        const u=noise(200+index,i),v=noise(500+index,i*1.33);
        const angle=u*Math.PI*2;
        const radius=Math.sqrt(v)*.84;
        const x=cx+Math.cos(angle)*rx*radius;
        const yy=cy+Math.sin(angle)*ry*radius;
        const text=svgEl('text',{x:x.toFixed(1),y:yy.toFixed(1),'class':'terrain-glyph','text-anchor':'middle'});
        text.textContent=GLYPHS[Math.floor(noise(index+900,i)*GLYPHS.length)%GLYPHS.length];
        g.appendChild(text);
      }
    }
    return g;
  }

  function buildTerrain(){
    const wrap=document.createElement('div');
    wrap.className='atlas-lock-terrain';
    wrap.setAttribute('aria-hidden','true');
    const svg=svgEl('svg',{viewBox:'0 0 900 520','class':'atlas-lock-terrain-svg',role:'presentation','preserveAspectRatio':'xMidYMid meet'});
    const group=svgEl('g',{'class':'atlas-terrain-stack'});
    const total=6;
    for(let i=0;i<total;i++)group.appendChild(makeLayer(i,total));
    svg.appendChild(group);
    wrap.appendChild(svg);
    return wrap;
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
    if(!screen||!card||screen.dataset.terrainMounted==='1')return;
    screen.dataset.terrainMounted='1';
    screen.insertBefore(buildMeta(),card);
    screen.insertBefore(buildTerrain(),card);
    updateClocks();
    clockTimer=setInterval(updateClocks,1000);
    const observer=new MutationObserver(decorateAuth);
    observer.observe(document.getElementById('lockContent'),{childList:true,subtree:true});
    decorateAuth();

    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      screen.addEventListener('pointermove',event=>{
        const hero=screen.querySelector('.atlas-lock-terrain');if(!hero)return;
        const x=(event.clientX/window.innerWidth-.5)*5;
        const y=(event.clientY/window.innerHeight-.5)*3;
        hero.style.setProperty('--terrain-x',`${x.toFixed(2)}px`);
        hero.style.setProperty('--terrain-y',`${y.toFixed(2)}px`);
      },{passive:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  root.AtlasLockTerrain=Object.freeze({mount,updateClocks});
})(window);
