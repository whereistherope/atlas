// Atlas v0.15.4-r1: deterministic guided network layout.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  if(!baseGraphData||!baseDrawNetwork)return;

  const CX=600,CY=340,Y_SCALE=.60;
  const RADII={1:72,2:150,3:280,4:395,5:470,6:520};
  const ROOT_SLOTS=[-2.356,-1.571,-.785,0,.785,1.571,2.356,3.142];
  const PREFERRED_ROOT_SLOT={WRK:0,WORK:0,LIFE:2,CRTV:4,CREATIVE:4,DAIL:6,DAILY:6};

  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const round=v=>Math.round(Number(v||0)*10)/10;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const angleDistance=(a,b)=>{let d=Math.abs(a-b)%(Math.PI*2);return d>Math.PI?Math.PI*2-d:d};

  function activeProfileId(){return state?.settings?.activeProfile||'me'}
  function structuralParent(note){return note?.topicId||note?.areaId||''}
  function nodeOffsetSource(id){return areaById?.(id)||(state.notes||[]).find(n=>n.id===id)||null}
  function localOffset(id){const n=nodeOffsetSource(id);return{x:num(n?.mapOffsetX),y:num(n?.mapOffsetY),z:num(n?.mapOffsetZ)}}

  function sourceNodes(profileId=activeProfileId()){
    const areas=(state.areas||[]).filter(a=>(a.profile||'me')===profileId).map(a=>({id:a.id,name:a.name||a.id,code:a.code||'',level:Number(a.level)||2,parentId:a.parentId||'atlas',note:false}));
    const areaIds=new Set(areas.map(a=>a.id));
    const notes=(state.notes||[]).filter(n=>(n.profile||'me')===profileId&&n.showOnMap&&areaIds.has(structuralParent(n))).map(n=>({id:n.id,name:n.title||'Untitled',code:makeNodeCode?.(n.title)||'',level:5,parentId:structuralParent(n),note:true}));
    return [...areas,...notes];
  }

  function rootSort(a,b){
    const ac=String(a.code||a.name||'').toUpperCase(),bc=String(b.code||b.name||'').toUpperCase();
    const ai=PREFERRED_ROOT_SLOT[ac],bi=PREFERRED_ROOT_SLOT[bc];
    if(ai!==undefined||bi!==undefined){if(ai===undefined)return 1;if(bi===undefined)return-1;if(ai!==bi)return ai-bi}
    return String(a.name||a.id).localeCompare(String(b.name||b.id));
  }

  function assignRootAngles(roots){
    const out={},used=new Set(),deferred=[];
    roots.slice().sort(rootSort).forEach(r=>{
      const key=String(r.code||r.name||'').toUpperCase(),slot=PREFERRED_ROOT_SLOT[key];
      if(slot!==undefined&&!used.has(slot)){out[r.id]=ROOT_SLOTS[slot];used.add(slot)}else deferred.push(r);
    });
    const free=ROOT_SLOTS.map((_,i)=>i).filter(i=>!used.has(i));
    deferred.forEach((r,i)=>{
      if(free[i]!==undefined){out[r.id]=ROOT_SLOTS[free[i]];used.add(free[i]);return}
      out[r.id]=-Math.PI+i*Math.PI*2/Math.max(1,deferred.length);
    });
    return out;
  }

  function computeBaseLayout(profileId=activeProfileId()){
    const nodes=sourceNodes(profileId),byId=Object.fromEntries(nodes.map(n=>[n.id,n])),kids={};
    nodes.forEach(n=>(kids[n.parentId||'atlas']??=[]).push(n));
    Object.values(kids).forEach(list=>list.sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id))));
    const roots=nodes.filter(n=>n.parentId==='atlas'||!byId[n.parentId]).sort(rootSort),rootAngles=assignRootAngles(roots),leafMemo={};

    function leafCount(id){
      if(leafMemo[id])return leafMemo[id];const cs=kids[id]||[];
      return leafMemo[id]=cs.length?cs.reduce((s,c)=>s+leafCount(c.id),0):1;
    }

    const positions={},angles={};
    function assignBranch(node,start,end,rootAngle){
      const cs=kids[node.id]||[];
      if(!cs.length){angles[node.id]=(start+end)/2;return}
      const span=Math.max(.001,end-start),gap=cs.length>1?Math.min(.028,span/(cs.length*6)):0;
      const usable=Math.max(.001,span-gap*Math.max(0,cs.length-1)),total=cs.reduce((s,c)=>s+leafCount(c.id),0);let cursor=start;
      cs.forEach((c,i)=>{
        const part=usable*(leafCount(c.id)/Math.max(1,total)),s=cursor,e=s+part;assignBranch(c,s,e,rootAngle);cursor=e+(i<cs.length-1?gap:0);
      });
      angles[node.id]=node.parentId==='atlas'?rootAngle:cs.reduce((sum,c)=>sum+(angles[c.id]||rootAngle)*leafCount(c.id),0)/Math.max(1,total);
    }

    roots.forEach(root=>{
      const center=rootAngles[root.id]??0,others=roots.filter(r=>r.id!==root.id).map(r=>angleDistance(center,rootAngles[r.id]??0));
      const nearest=others.length?Math.min(...others):Math.PI*2;
      const leaves=leafCount(root.id),half=roots.length===1?1.15:clamp(.36+Math.log2(leaves+1)*.075,.38,Math.min(.72,nearest*.40));
      assignBranch(root,center-half,center+half,center);
    });

    nodes.forEach(n=>{
      const level=clamp(Number(n.level)||2,1,6),angle=angles[n.id]??0,r=RADII[level]||RADII[5];
      positions[n.id]={x:round(CX+Math.cos(angle)*r),y:round(CY+Math.sin(angle)*r*Y_SCALE),mapZ:round(stableOffset?.(n.id,18)||0),angle,level,parentId:n.parentId||'atlas'};
    });
    return positions;
  }

  function cumulativeOffsets(profileId=activeProfileId(),base=null){
    base=base||computeBaseLayout(profileId);const nodes=sourceNodes(profileId),byId=Object.fromEntries(nodes.map(n=>[n.id,n])),memo={};
    function total(id,guard=0){
      if(memo[id])return memo[id];if(guard>16)return{x:0,y:0,z:0};const n=byId[id],own=localOffset(id);if(!n||n.parentId==='atlas'||!byId[n.parentId])return memo[id]=own;
      const p=total(n.parentId,guard+1);return memo[id]={x:p.x+own.x,y:p.y+own.y,z:p.z+own.z};
    }
    Object.keys(base).forEach(id=>total(id));return memo;
  }

  function guidedPositions(profileId=activeProfileId(),includeDraft=true){
    const base=computeBaseLayout(profileId),offs=cumulativeOffsets(profileId,base),draft=includeDraft&&typeof mapDraft==='function'?mapDraft(profileId):null,out={};
    Object.entries(base).forEach(([id,p])=>{
      if(draft?.[id]){out[id]={x:num(draft[id].x),y:num(draft[id].y),mapZ:num(draft[id].mapZ)};return}
      const o=offs[id]||{x:0,y:0,z:0};out[id]={x:round(p.x+o.x),y:round(p.y+o.y),mapZ:round(p.mapZ+o.z)};
    });
    return out;
  }

  // Graph geometry is always derived from hierarchy first. Scope, depth and Space
  // filtering only decide what is shown; they do not reshuffle the underlying map.
  graphData=function(scope){
    const gd=baseGraphData(scope),positions=guidedPositions(activeProfileId(),true);
    gd.nodes.forEach(n=>{const p=positions[n.id];if(!p)return;n.x=p.x;n.y=p.y;n.mapZ=p.mapZ;n.z=p.mapZ});
    return gd;
  };

  // A first drag must begin from the guided constellation, never legacy absolute
  // coordinates. This keeps the rest of the map stable while a branch is moved.
  setMapDraftFromAreas=function(_areas,profileId=activeProfileId()){
    const positions=guidedPositions(profileId,false);mapDraftLayouts[profileId]=Object.fromEntries(Object.entries(positions).map(([id,p])=>[id,{x:p.x,y:p.y,mapZ:p.mapZ}]));return mapDraftLayouts[profileId];
  };

  function nodeRecord(id){return areaById?.(id)||(state.notes||[]).find(n=>n.id===id)||null}
  async function anchorGuidedLayout(){
    const profileId=activeProfileId(),base=computeBaseLayout(profileId),desired=guidedPositions(profileId,true),nodes=sourceNodes(profileId).slice().sort((a,b)=>(a.level||0)-(b.level||0)||String(a.name).localeCompare(String(b.name))),cumulative={};
    nodes.forEach(n=>{
      const p=desired[n.id]||base[n.id];if(!p||!base[n.id])return;const parent=cumulative[n.parentId]||{x:0,y:0,z:0};
      const local={x:round(p.x-base[n.id].x-parent.x),y:round(p.y-base[n.id].y-parent.y),z:round(p.mapZ-base[n.id].mapZ-parent.z)};
      const record=nodeRecord(n.id);if(record){record.mapOffsetX=local.x;record.mapOffsetY=local.y;record.mapOffsetZ=local.z}
      cumulative[n.id]={x:parent.x+local.x,y:parent.y+local.y,z:parent.z+local.z};
    });
    delete mapDraftLayouts[profileId];await save?.();mapCamera(null).needsFit=false;drawNetwork(document.getElementById('network')?.dataset.scope||null);
    const button=document.querySelector('[data-map-anchor]');if(button){button.textContent='Anchored';button.classList.add('is-confirmed');setTimeout(()=>{if(button.isConnected){button.textContent='Anchor';button.classList.remove('is-confirmed')}},1400)}
    toast?.('Guided constellation anchored');
  }

  async function reformGuidedLayout(scope=null){
    const profileId=activeProfileId();
    (state.areas||[]).filter(a=>(a.profile||'me')===profileId).forEach(a=>{delete a.mapOffsetX;delete a.mapOffsetY;delete a.mapOffsetZ});
    (state.notes||[]).filter(n=>(n.profile||'me')===profileId).forEach(n=>{delete n.mapOffsetX;delete n.mapOffsetY;delete n.mapOffsetZ});
    delete mapDraftLayouts[profileId];await save?.();const cam=mapCamera(scope);cam.needsFit=true;drawNetwork(scope);toast?.('Guided constellation restored');
  }

  anchorMapLayout=anchorGuidedLayout;

  drawNetwork=function(scope){
    const result=baseDrawNetwork(scope);
    document.querySelectorAll('[data-map-layout]').forEach(button=>{button.onclick=()=>reformGuidedLayout(scope)});
    document.querySelectorAll('[data-map-anchor]').forEach(button=>{button.onclick=()=>anchorGuidedLayout()});
    return result;
  };

  root.AtlasNetworkLayout=Object.freeze({version:'0.15.4-r1',computeBaseLayout,guidedPositions,cumulativeOffsets,reform:reformGuidedLayout,anchor:anchorGuidedLayout});
})(window);
