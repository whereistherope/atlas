// Atlas v0.15.15-r1: resizable Nodes + List split view for the network pane.
(function(root){
  'use strict';

  const baseEnsureWidgetSettings=typeof ensureWidgetSettings==='function'?ensureWidgetSettings:null;
  const baseNetworkPanel=typeof networkPanel==='function'?networkPanel:null;
  const baseRenderHome=typeof renderHome==='function'?renderHome:null;
  const baseRenderAll=typeof renderAll==='function'?renderAll:null;
  if(!baseEnsureWidgetSettings||!baseNetworkPanel||!baseRenderHome)return;

  const MIN_RATIO=25,MAX_RATIO=75,DEFAULT_RATIO=60;
  let resizeBound=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function splitRatio(){
    const raw=Number(state?.settings?.mapSplitRatio);
    return clamp(Number.isFinite(raw)?raw:DEFAULT_RATIO,MIN_RATIO,MAX_RATIO);
  }

  function mapControlsHtml(){
    return `<div class="map-controls" aria-label="Map controls"><div class="map-hud"><div class="zoom-controls" aria-label="Map zoom"><button type="button" data-map-zoom="out" aria-label="Zoom out">−</button><button type="button" class="zoom-reset" data-map-zoom="reset" aria-label="Fit network"><span id="zoomValue">FIT</span></button><button type="button" data-map-zoom="in" aria-label="Zoom in">+</button></div><div class="map-command"><button type="button" data-map-layout="organise">Reform</button><button type="button" data-map-anchor>Anchor</button></div><label class="depth">Depth <input id="depthRange" type="range" min="2" max="5" step="1" value="${state.settings.mapDepth}"/><strong id="depthValue">${state.settings.mapDepth}</strong></label><label class="depth map-opacity">Type <input id="labelOpacityRange" type="range" min="0" max="100" step="1" value="${Math.round((state.settings.mapLabelOpacity??.72)*100)}"/><strong id="labelOpacityValue">${Math.round((state.settings.mapLabelOpacity??.72)*100)}</strong></label><label class="depth map-opacity">Links <input id="edgeOpacityRange" type="range" min="0" max="100" step="1" value="${Math.round((state.settings.mapEdgeOpacity??.32)*100)}"/><strong id="edgeOpacityValue">${Math.round((state.settings.mapEdgeOpacity??.32)*100)}</strong></label></div></div>`;
  }

  function viewToggleHtml(mode){
    return `<div class="map-view-toggle"><button type="button" data-map-view="nodes" class="${mode==='nodes'?'active':''}">Nodes</button><button type="button" data-map-view="list" class="${mode==='list'?'active':''}">List</button><button type="button" data-map-view="split" class="${mode==='split'?'active':''}">Split</button><button type="button" data-map-view="predict" class="${mode==='predict'?'active':''}">Predict</button></div>`;
  }

  function addSplitToggle(html,mode){
    if(html.includes('data-map-view="split"'))return html;
    const marker=/<button type="button" data-map-view="predict"[^>]*>Predict<\/button>/;
    return html.replace(marker,match=>`<button type="button" data-map-view="split" class="${mode==='split'?'active':''}">Split</button>${match}`);
  }

  ensureWidgetSettings=function(){
    const requested=state?.settings?.mapViewMode;
    baseEnsureWidgetSettings();
    if(requested==='split')state.settings.mapViewMode='split';
    state.settings.mapSplitRatio=splitRatio();
  };

  networkPanel=function(scope=null){
    const mode=state.settings.mapViewMode||'nodes';
    if(mode!=='split')return addSplitToggle(baseNetworkPanel(scope),mode);

    const hero=!scope,count=graphData(scope).nodes.length,ratio=splitRatio();
    const scopeAttr=scope?` data-scope="${esc(scope)}"`:'';
    return `<section class="network-stage ${hero?'home-network':'area-network'}">${scope?`<div class="network-head"><h2>${esc(areaById(scope)?.name||'Area')} Network</h2></div>`:''}<div class="map-wrap split-mode"><div class="map-topline"><div class="map-meta"><span>SPLIT</span><span>${esc(activeProfile().name.toUpperCase())}</span><span>${count} NODES</span><span id="mapInspect"></span></div>${viewToggleHtml('split')}</div><div class="network-split" data-network-split style="--atlas-split:${ratio}%"><div class="network-split-map"><svg id="network" viewBox="0 0 1200 680" role="img" aria-label="Atlas relationship map"${scopeAttr}></svg>${mapControlsHtml()}</div><div class="network-split-divider" data-network-split-handle role="separator" aria-label="Resize map and list panes" aria-orientation="vertical" aria-valuemin="${MIN_RATIO}" aria-valuemax="${MAX_RATIO}" aria-valuenow="${Math.round(ratio)}" tabindex="0"><span></span></div><div class="network-split-list"><div class="branch-view split-branch-view">${branchTreeHtml(scope)}</div></div></div></div></section>`;
  };

  function isVertical(){return window.matchMedia?.('(max-width:700px)').matches}

  function applyRatio(value,{saveNow=false,refit=false}={}){
    const ratio=clamp(Number(value)||DEFAULT_RATIO,MIN_RATIO,MAX_RATIO);
    state.settings.mapSplitRatio=Math.round(ratio*10)/10;
    const split=document.querySelector('[data-network-split]'),handle=document.querySelector('[data-network-split-handle]');
    if(split)split.style.setProperty('--atlas-split',`${ratio}%`);
    if(handle){handle.setAttribute('aria-valuenow',String(Math.round(ratio)));handle.setAttribute('aria-orientation',isVertical()?'horizontal':'vertical')}
    const svg=document.getElementById('network');
    if(svg)requestAnimationFrame(()=>{applyMapView(svg,svg.dataset.scope||null);if(refit){const cam=mapCamera(svg.dataset.scope||null);cam.needsFit=true;fitMap(svg.dataset.scope||null)}});
    if(saveNow)save();
  }

  function installSplit(scope=null){
    if(state.settings.mapViewMode!=='split')return;
    const split=document.querySelector('[data-network-split]'),handle=document.querySelector('[data-network-split-handle]'),svg=document.getElementById('network');
    if(!split||!handle||!svg)return;
    if(scope&&!svg.dataset.scope)svg.dataset.scope=scope;
    applyRatio(splitRatio());
    if(handle.dataset.bound==='yes')return;
    handle.dataset.bound='yes';

    let active=null;
    const ratioFromPointer=e=>{
      const rect=split.getBoundingClientRect();
      return isVertical()?((e.clientY-rect.top)/Math.max(1,rect.height))*100:((e.clientX-rect.left)/Math.max(1,rect.width))*100;
    };
    handle.addEventListener('pointerdown',e=>{
      e.preventDefault();active=e.pointerId;handle.setPointerCapture(e.pointerId);document.body.classList.add('network-split-resizing');applyRatio(ratioFromPointer(e));
    });
    handle.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;applyRatio(ratioFromPointer(e))});
    const finish=e=>{
      if(active===null)return;
      try{handle.releasePointerCapture(active)}catch(_){ }
      active=null;document.body.classList.remove('network-split-resizing');applyRatio(state.settings.mapSplitRatio,{saveNow:true});
    };
    handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    handle.addEventListener('keydown',e=>{
      let next=splitRatio();
      if(e.key==='ArrowLeft'||e.key==='ArrowUp')next-=2;
      else if(e.key==='ArrowRight'||e.key==='ArrowDown')next+=2;
      else if(e.key==='Home')next=MIN_RATIO;
      else if(e.key==='End')next=MAX_RATIO;
      else return;
      e.preventDefault();applyRatio(next,{saveNow:true});
    });
    if(!resizeBound){resizeBound=true;window.addEventListener('resize',()=>{if(state?.settings?.mapViewMode==='split')applyRatio(splitRatio())})}
  }

  function renderSplitNetwork(scope=null){
    if(state.settings.mapViewMode!=='split')return;
    requestAnimationFrame(()=>{
      const svg=document.getElementById('network');if(!svg)return;
      if(scope&&!svg.dataset.scope)svg.dataset.scope=scope;
      drawNetwork(scope);
      installSplit(scope);
    });
  }

  renderHome=function(){
    const result=baseRenderHome();
    renderSplitNetwork(null);
    return result;
  };

  if(baseRenderAll){
    renderAll=function(...args){
      const result=baseRenderAll(...args);
      if(state.settings.mapViewMode==='split'&&state.settings.activeTab!=='home')renderSplitNetwork(state.settings.selectedArea||null);
      return result;
    };
  }

  root.AtlasNetworkSplit=Object.freeze({version:'0.15.15-r1',install:installSplit,applyRatio,splitRatio});
})(window);
