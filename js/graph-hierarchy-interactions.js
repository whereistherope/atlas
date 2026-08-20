// Atlas v0.15.3-r1: uniform node selection + hierarchical branch dragging.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  const baseAnchorMapLayout=typeof anchorMapLayout==='function'?anchorMapLayout:null;
  if(!baseGraphData||!baseDrawNetwork||!baseAnchorMapLayout)return;

  function finite(value){return Number.isFinite(Number(value))}
  function noteById(id){return (state.notes||[]).find(n=>n.id===id)||null}
  function noteStoredPosition(note){
    if(!note||!finite(note.mapX)||!finite(note.mapY))return null;
    return {x:Number(note.mapX),y:Number(note.mapY),mapZ:finite(note.mapZ)?Number(note.mapZ):0};
  }

  // Level-5 note nodes previously derived their position only from the persisted
  // parent Area and could not participate in the map draft. Prefer an explicit
  // note draft / anchored note position, otherwise translate the generated orbit
  // by the parent's current draft delta so the note follows its branch naturally.
  graphData=function(scope){
    const gd=baseGraphData(scope);
    const byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    const draft=typeof mapDraft==='function'?mapDraft():null;
    gd.nodes.forEach(n=>{
      if(!n.note)return;
      const note=noteById(n.id),draftPos=draft?.[n.id],stored=noteStoredPosition(note);
      if(draftPos){n.x=Number(draftPos.x)||0;n.y=Number(draftPos.y)||0;n.mapZ=Number(draftPos.mapZ)||0;n.z=n.mapZ;return}
      if(stored){n.x=stored.x;n.y=stored.y;n.mapZ=stored.mapZ;n.z=stored.mapZ;return}
      const parent=byId[n.parentId],persistedParent=areaById(n.parentId);
      if(parent&&persistedParent){
        n.x+=Number(parent.x||0)-Number(persistedParent.x||0);
        n.y+=Number(parent.y||0)-Number(persistedParent.y||0);
        n.mapZ=Number(n.mapZ||n.z||0)+(Number(parent.mapZ||parent.z||0)-Number(persistedParent.mapZ||0));
        n.z=n.mapZ;
      }
    });
    return gd;
  };

  function isAreaBranchMember(area,rootId){return area.id===rootId||isDescendant(area.id,rootId)}
  function noteParentId(note){return note?.topicId||note?.areaId||''}
  function noteBelongsToBranch(note,rootId){
    const pid=noteParentId(note);return !!pid&&(pid===rootId||isDescendant(pid,rootId));
  }

  function branchOrigins(rootId,scope){
    const gd=graphData(scope),visible=Object.fromEntries(gd.nodes.map(n=>[n.id,n])),rootNode=visible[rootId];
    const origins={};
    if(rootNode?.note){origins[rootId]={x:rootNode.x,y:rootNode.y,mapZ:Number(rootNode.mapZ??rootNode.z??0)};return origins}

    const draft=typeof mapDraft==='function'?mapDraft():null;
    (profileAreas?.()||[]).filter(a=>isAreaBranchMember(a,rootId)).forEach(a=>{
      const p=visible[a.id]||draft?.[a.id]||a;
      origins[a.id]={x:Number(p.x)||0,y:Number(p.y)||0,mapZ:Number(p.mapZ??p.z??0)||0};
    });

    // Visible notes always move with the branch. Hidden notes with a previously
    // anchored/manual position also move; untouched hidden notes remain orbiting
    // their parent and therefore inherit the parent's translated position later.
    (state.notes||[]).filter(n=>profileAllows(n.profile)&&n.showOnMap&&noteBelongsToBranch(n,rootId)).forEach(n=>{
      const p=visible[n.id]||draft?.[n.id]||noteStoredPosition(n);
      if(p)origins[n.id]={x:Number(p.x)||0,y:Number(p.y)||0,mapZ:Number(p.mapZ??p.z??0)||0};
    });
    return origins;
  }

  function installHitTargets(svg){
    svg?.querySelectorAll?.('.node').forEach(group=>{
      if(group.querySelector('.atlas-node-hit-target'))return;
      const disc=group.querySelector('.node-disc');if(!disc)return;
      const r=Math.max(12,Number(disc.getAttribute('r'))||0);
      const hit=svgEl('circle',{cx:disc.getAttribute('cx'),cy:disc.getAttribute('cy'),r:String(r),class:'atlas-node-hit-target',fill:'transparent','pointer-events':'all'});
      group.insertBefore(hit,disc);
    });
  }

  // Replace the old special-case binder. Every node is draggable; structural
  // parents move every descendant in their parentId branch. Dotted cross-links
  // never participate in movement.
  bindNetwork=function(scope){
    const svg=document.getElementById('network');if(!svg||svg.dataset.bound==='yes')return;svg.dataset.bound='yes';
    svg.addEventListener('pointerdown',e=>{
      const g=e.target.closest?.('.node');
      if(!g){
        const cam=mapCamera(svg.dataset.scope||null);
        dragging={kind:'pan',startX:e.clientX,startY:e.clientY,origCx:cam.cx,origCy:cam.cy,moved:false,pointerId:e.pointerId};
        svg.classList.add('is-panning');svg.setPointerCapture(e.pointerId);return;
      }
      e.preventDefault();
      const id=g.dataset.node,scopeId=svg.dataset.scope||null,gd=graphData(scopeId),node=gd.nodes.find(n=>n.id===id);if(!node)return;
      const p=clientToSvg(svg,e.clientX,e.clientY),origins=branchOrigins(id,scopeId);
      dragging={kind:'node-group',id,nodeType:node.note?'note':'area',startX:e.clientX,startY:e.clientY,startSvgX:p.x,startSvgY:p.y,origins,moved:false,pointerId:e.pointerId};
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove',e=>{
      if(!dragging)return;
      if(dragging.kind==='pan'){
        const cam=mapCamera(svg.dataset.scope||null),v=mapView(svg.dataset.scope||null),rect=svg.getBoundingClientRect();
        const dx=(e.clientX-dragging.startX)*v.w/rect.width,dy=(e.clientY-dragging.startY)*v.h/rect.height;
        if(Math.abs(dx)+Math.abs(dy)>2)dragging.moved=true;
        cam.cx=dragging.origCx-dx;cam.cy=dragging.origCy-dy;applyMapView(svg,svg.dataset.scope||null);return;
      }
      const p=clientToSvg(svg,e.clientX,e.clientY),dx=p.x-dragging.startSvgX,dy=p.y-dragging.startSvgY;
      if(Math.abs(e.clientX-dragging.startX)+Math.abs(e.clientY-dragging.startY)>3)dragging.moved=true;
      Object.entries(dragging.origins||{}).forEach(([id,o])=>updateMapDraft(id,{x:o.x+dx,y:o.y+dy,mapZ:o.mapZ}));
      mapCamera(svg.dataset.scope||null).needsFit=false;drawNetwork(svg.dataset.scope||null);
    });

    svg.addEventListener('pointerup',()=>{
      if(!dragging)return;const d=dragging;
      try{svg.releasePointerCapture(d.pointerId)}catch(_){ }
      dragging=null;svg.classList.remove('is-panning');if(d.kind==='pan')return;
      if(d.moved){toast('Layout changed · Anchor to save');return}
      if(d.nodeType==='note'){
        if(root.AtlasActions?.note)root.AtlasActions.note(d.id);else root.AtlasMarkdown?.openNote?.(d.id);
        return;
      }
      const a=areaById(d.id);if(a&&areaAllows(a)){
        state.settings.activeTab=getTopDomain(a)?.id||a.id;state.settings.selectedArea=a.id;state.settings.subtab='overview';
        renderTabs();if(a.level>=3)renderArea(a.id);else renderAll();save();
      }
    });

    svg.addEventListener('pointercancel',()=>{dragging=null;svg.classList.remove('is-panning')});
    svg.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();zoomMap(svg.dataset.scope||null,e.deltaY<0?1.12:1/1.12,e.clientX,e.clientY)},{passive:false});
  };

  drawNetwork=function(scope){const result=baseDrawNetwork(scope);installHitTargets(document.getElementById('network'));return result};

  // Anchor manual note positions alongside structural Area coordinates. These
  // additive fields travel with the existing canonical note object; no schema
  // migration or destructive conversion is required.
  anchorMapLayout=function(){
    const draft=typeof mapDraft==='function'?mapDraft():null;
    if(draft){
      (state.notes||[]).filter(n=>profileAllows(n.profile)&&n.showOnMap).forEach(n=>{
        const p=draft[n.id];if(!p)return;
        n.mapX=Number(p.x)||0;n.mapY=Number(p.y)||0;n.mapZ=Number(p.mapZ)||0;
      });
    }
    return baseAnchorMapLayout();
  };

  root.AtlasGraphInteractions=Object.freeze({version:'0.15.3-r1',branchOrigins,installHitTargets});
})(window);
