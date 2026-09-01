// Atlas v0.16.9 · interactive network overview/minimap.
// Navigation utility only. Does not alter graph layout, physics or persisted node positions.
(function(root){
  'use strict';
  const SVG_NS='http://www.w3.org/2000/svg';
  const COLLAPSE_KEY='atlas_network_minimap_collapsed';
  function svgEl(tag,attrs={}){const el=document.createElementNS(SVG_NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el}
  function collapsedState(){try{return sessionStorage.getItem(COLLAPSE_KEY)==='1'}catch(_){return false}}
  function saveCollapsed(value){try{sessionStorage.setItem(COLLAPSE_KEY,value?'1':'0')}catch(_){}}
  function boundsFor(nodes){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    (nodes||[]).forEach(n=>{const x=Number(n.x)||0,y=Number(n.y)||0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)});
    if(!Number.isFinite(minX))return{x:0,y:0,w:1200,h:680};
    const rawW=Math.max(160,maxX-minX),rawH=Math.max(100,maxY-minY),padX=Math.max(34,rawW*.07),padY=Math.max(30,rawH*.08);
    return{x:minX-padX,y:minY-padY,w:rawW+padX*2,h:rawH+padY*2};
  }
  function viewportFor(view,box){
    const x=Math.max(box.x,view.x),y=Math.max(box.y,view.y),right=Math.min(box.x+box.w,view.x+view.w),bottom=Math.min(box.y+box.h,view.y+view.h);
    if(right<=x||bottom<=y)return{x:Math.max(box.x,Math.min(box.x+box.w-8,view.x)),y:Math.max(box.y,Math.min(box.y+box.h-8,view.y)),w:8,h:8};
    return{x,y,w:right-x,h:bottom-y};
  }
  function hostFor(svg){return svg?.closest?.('.network-split-map')||svg?.closest?.('.map-wrap')||null}
  function pointInMini(svg,event){
    try{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}catch(_){const r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return{x:vb.x+(event.clientX-r.left)/Math.max(1,r.width)*vb.width,y:vb.y+(event.clientY-r.top)/Math.max(1,r.height)*vb.height}}
  }
  function applyCamera(scope,miniSvg){
    const main=document.getElementById('network');if(!main)return;
    const view=mapView(scope);main.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);main.setAttribute('preserveAspectRatio','xMidYMid meet');
    const zv=document.getElementById('zoomValue');if(zv)zv.textContent=`${Math.round(view.z*100)}%`;
    const rect=miniSvg?.querySelector?.('.mini-viewport'),box=miniSvg?.__atlasMiniBox;if(rect&&box){const vr=viewportFor(view,box);rect.setAttribute('x',vr.x);rect.setAttribute('y',vr.y);rect.setAttribute('width',vr.w);rect.setAttribute('height',vr.h)}
  }
  function setCameraCenter(scope,x,y,miniSvg){const camera=mapCamera(scope);camera.cx=x;camera.cy=y;camera.needsFit=false;applyCamera(scope,miniSvg)}
  function bindMiniNavigation(svg,scope){
    let drag=null;
    svg.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0)return;
      const point=pointInMini(svg,event),viewport=event.target.closest?.('.mini-viewport');
      if(viewport){const camera=mapCamera(scope);drag={id:event.pointerId,startX:point.x,startY:point.y,cx:camera.cx,cy:camera.cy};viewport.classList.add('is-dragging');try{svg.setPointerCapture(event.pointerId)}catch(_){}}
      else setCameraCenter(scope,point.x,point.y,svg);
      event.preventDefault();event.stopPropagation();
    });
    svg.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const point=pointInMini(svg,event);setCameraCenter(scope,drag.cx+(point.x-drag.startX),drag.cy+(point.y-drag.startY),svg);event.preventDefault()});
    const finish=event=>{if(!drag||event.pointerId!==drag.id)return;svg.querySelector('.mini-viewport')?.classList.remove('is-dragging');try{svg.releasePointerCapture(drag.id)}catch(_){}drag=null;requestAnimationFrame(()=>render(scope))};
    svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
  }
  function ensureMini(host){
    let mini=host.querySelector(':scope > .atlas-network-minimap');host.querySelectorAll(':scope > .atlas-network-minimap').forEach((el,i)=>{if(i)el.remove()});
    if(mini)return mini;
    mini=document.createElement('aside');mini.className='atlas-network-minimap';mini.setAttribute('aria-label','Network minimap');
    mini.innerHTML='<div class="atlas-network-minimap-head"><span>OVERVIEW</span><button type="button" data-mini-toggle title="Collapse overview" aria-expanded="true">−</button></div><div class="atlas-network-minimap-canvas"></div>';
    if(collapsedState())mini.classList.add('is-collapsed');
    const toggle=mini.querySelector('[data-mini-toggle]');
    const syncToggle=()=>{const collapsed=mini.classList.contains('is-collapsed');toggle.textContent=collapsed?'MAP':'−';toggle.title=collapsed?'Open network minimap':'Collapse overview';toggle.setAttribute('aria-expanded',String(!collapsed))};syncToggle();
    toggle.addEventListener('click',event=>{event.stopPropagation();mini.classList.toggle('is-collapsed');saveCollapsed(mini.classList.contains('is-collapsed'));syncToggle()});
    host.appendChild(mini);return mini;
  }
  function render(scope=null){
    const main=document.getElementById('network'),host=hostFor(main);if(!main||!host||typeof graphData!=='function'||typeof mapView!=='function')return;
    const data=graphData(scope),nodes=data?.nodes||[],links=data?.links||[],byId=Object.fromEntries(nodes.map(n=>[n.id,n])),view=mapView(scope),box=boundsFor(nodes),mini=ensureMini(host);mini.dataset.scope=scope||'';
    const svg=svgEl('svg',{viewBox:`${box.x} ${box.y} ${box.w} ${box.h}`,'aria-label':'Network overview navigation','role':'img','preserveAspectRatio':'xMidYMid meet'});svg.__atlasMiniBox=box;
    links.forEach(link=>{const a=byId[link.source],b=byId[link.target];if(!a||!b)return;svg.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:`mini-edge ${link.type==='cross'?'cross':'tree'}`}))});
    nodes.forEach(n=>{const level=Number(n.level)||5;svg.appendChild(svgEl('circle',{cx:n.x,cy:n.y,r:level===2?13:level===3?8:level===4?5.2:3.4,class:`mini-node level-${level}`}));if(level===2){const label=svgEl('text',{x:(Number(n.x)||0)+17,y:(Number(n.y)||0)+7,class:'mini-label'});label.textContent=n.code||String(n.name||'').slice(0,8);svg.appendChild(label)}});
    const vr=viewportFor(view,box);svg.appendChild(svgEl('rect',{x:vr.x,y:vr.y,width:vr.w,height:vr.h,rx:4,class:'mini-viewport','vector-effect':'non-scaling-stroke'}));
    bindMiniNavigation(svg,scope);mini.querySelector('.atlas-network-minimap-canvas').replaceChildren(svg);
  }
  const baseDraw=typeof root.drawNetwork==='function'?root.drawNetwork:null;if(baseDraw){root.drawNetwork=function(scope){const result=baseDraw.apply(this,arguments);requestAnimationFrame(()=>render(scope||null));return result}}
  const baseApply=typeof root.applyMapView==='function'?root.applyMapView:null;if(baseApply){root.applyMapView=function(svg,scope){const result=baseApply.apply(this,arguments);requestAnimationFrame(()=>render(scope||null));return result}}
  root.addEventListener('resize',()=>requestAnimationFrame(()=>render(document.getElementById('network')?.dataset?.scope||null)));
  root.AtlasNetworkOverview=Object.freeze({version:'0.16.9-r3',render});
})(window);
