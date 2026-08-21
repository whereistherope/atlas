// Atlas v0.15.9-r1: canonical constellation routing correction.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  if(!baseGraphData||!baseDrawNetwork)return;

  const CX=600,CY=340;
  const ROOT_RADIUS=184;
  const ROOT_START=-Math.PI*.76;
  const BASE_CHILD_RADIUS=84;
  const MIN_SIBLING_CLEARANCE=64;
  const DENSE_FAN_RADIUS=92;
  const LABEL_GAP=10;
  const LABEL_LINE=10;

  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const round=v=>Math.round(Number(v||0)*10)/10;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=value=>{let h=2166136261;for(const c of String(value||''))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
  const signedUnit=value=>((hash(value)%2001)/1000)-1;

  function activeProfileId(){return state?.settings?.activeProfile||'me'}
  function structuralParent(note){return note?.topicId||note?.areaId||''}
  function nodeOffsetSource(id){return areaById?.(id)||(state.notes||[]).find(n=>n.id===id)||null}
  function localOffset(id){const n=nodeOffsetSource(id);return{x:num(n?.mapOffsetX),y:num(n?.mapOffsetY),z:num(n?.mapOffsetZ)}}

  // The network is rendered from the currently loaded Atlas state. Canonical sync
  // owns that state upstream; this layout module never creates a second local graph.
  function sourceNodes(profileId=activeProfileId()){
    const areas=(state.areas||[]).filter(a=>(a.profile||'me')===profileId).map(a=>({id:a.id,name:a.name||a.id,code:a.code||'',level:Number(a.level)||2,parentId:a.parentId||'atlas',note:false}));
    const areaIds=new Set(areas.map(a=>a.id));
    const notes=(state.notes||[]).filter(n=>(n.profile||'me')===profileId&&n.showOnMap&&areaIds.has(structuralParent(n))).map(n=>({id:n.id,name:n.title||'Untitled',code:makeNodeCode?.(n.title)||'',level:5,parentId:structuralParent(n),note:true}));
    return [...areas,...notes];
  }

  function rootSort(a,b){
    const order={WRK:0,WORK:0,LIFE:1,CRTV:2,CREATIVE:2,DAIL:3,DAILY:3,HOME:4};
    const ac=String(a.code||a.name||'').toUpperCase(),bc=String(b.code||b.name||'').toUpperCase();
    const ai=order[ac],bi=order[bc];
    if(ai!==undefined||bi!==undefined){if(ai===undefined)return 1;if(bi===undefined)return-1;if(ai!==bi)return ai-bi}
    return String(a.name||a.id).localeCompare(String(b.name||b.id));
  }

  function assignRootAngles(roots){
    const ordered=roots.slice().sort(rootSort),out={};
    ordered.forEach((r,i)=>out[r.id]=ROOT_START+i*(Math.PI*2/Math.max(1,ordered.length)));
    return out;
  }

  function childFanAngles(count,outward){
    if(count<=0)return[];
    if(count===1)return[outward];
    const preferredStep=.72;
    const span=Math.min(Math.PI*1.46,Math.max(1.24,preferredStep*(count-1)));
    const step=span/(count-1);
    return Array.from({length:count},(_,i)=>outward-span/2+i*step);
  }

  // Keep the v0.15.8 fan grammar. Only dense sibling sets get a little more room;
  // ordinary branches retain their existing geometry instead of being re-laid out.
  function childRadius(count,angles){
    const base=count>=5?DENSE_FAN_RADIUS:BASE_CHILD_RADIUS;
    if(count<=1)return base;
    const step=Math.abs((angles[1]??0)-(angles[0]??0));
    const minForClearance=step>0?MIN_SIBLING_CLEARANCE/(2*Math.sin(step/2)):base;
    return Math.ceil(Math.max(base,minForClearance)/4)*4;
  }

  function computeBaseLayout(profileId=activeProfileId()){
    const nodes=sourceNodes(profileId),byId=Object.fromEntries(nodes.map(n=>[n.id,n])),kids={};
    nodes.forEach(n=>(kids[n.parentId||'atlas']??=[]).push(n));
    Object.values(kids).forEach(list=>list.sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id))));
    const roots=nodes.filter(n=>n.parentId==='atlas'||!byId[n.parentId]).sort(rootSort),rootAngles=assignRootAngles(roots),positions={};

    roots.forEach(r=>{
      const a=rootAngles[r.id]??ROOT_START;
      positions[r.id]={x:round(CX+Math.cos(a)*ROOT_RADIUS),y:round(CY+Math.sin(a)*ROOT_RADIUS),mapZ:round(signedUnit(r.id+'z')*10),angle:a,level:Number(r.level)||2,parentId:r.parentId||'atlas'};
    });

    function placeFan(parent,ancestorPos){
      const cs=kids[parent.id]||[];if(!cs.length)return;
      const pp=positions[parent.id];if(!pp)return;
      const inward=ancestorPos?Math.atan2(ancestorPos.y-pp.y,ancestorPos.x-pp.x):Math.atan2(CY-pp.y,CX-pp.x);
      const outward=inward+Math.PI;
      const angles=childFanAngles(cs.length,outward);
      const radius=childRadius(cs.length,angles);

      cs.forEach((child,index)=>{
        const angle=angles[index],childLevel=clamp(Number(child.level)||Math.min(5,(Number(parent.level)||2)+1),3,6);
        positions[child.id]={
          x:round(pp.x+Math.cos(angle)*radius),
          y:round(pp.y+Math.sin(angle)*radius),
          mapZ:round((pp.mapZ||0)*.22+signedUnit(child.id+'z')*12),
          angle,level:childLevel,parentId:child.parentId||parent.id
        };
        placeFan(child,pp);
      });
    }

    roots.forEach(rootNode=>placeFan(rootNode,{x:CX,y:CY}));
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

  graphData=function(scope){
    const gd=baseGraphData(scope),positions=guidedPositions(activeProfileId(),true);
    gd.nodes.forEach(n=>{const p=positions[n.id];if(!p)return;n.x=p.x;n.y=p.y;n.mapZ=p.mapZ;n.z=p.mapZ});
    return gd;
  };

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
    toast?.('Canonical constellation anchored');
  }

  async function reformGuidedLayout(scope=null){
    const profileId=activeProfileId();
    (state.areas||[]).filter(a=>(a.profile||'me')===profileId).forEach(a=>{delete a.mapOffsetX;delete a.mapOffsetY;delete a.mapOffsetZ});
    (state.notes||[]).filter(n=>(n.profile||'me')===profileId).forEach(n=>{delete n.mapOffsetX;delete n.mapOffsetY;delete n.mapOffsetZ});
    delete mapDraftLayouts[profileId];await save?.();const cam=mapCamera(scope);cam.needsFit=true;drawNetwork(scope);toast?.('Canonical constellation restored');
  }

  function clippedEndpoint(a,b){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,r=visualRadius(a)+1.5;
    return{x:a.x+dx/d*r,y:a.y+dy/d*r};
  }

  // Cross-network relationships are relationships, not routes. Draw a straight
  // segment between their actual endpoints and allow natural crossings through
  // the existing constellation. No imaginary hub and no obstacle detours.
  function directCrossRoute(a,b){
    const start=clippedEndpoint(a,b),end=clippedEndpoint(b,a);
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  function routeCrossEdges(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    svg.querySelectorAll('.edge.cross').forEach(path=>{
      const a=byId[path.dataset.source],b=byId[path.dataset.target];if(!a||!b)return;
      path.setAttribute('d',directCrossRoute(a,b));path.classList.add('direct-cross-route');delete path.dataset.routeLane;
    });
  }

  function estimatedLabelBox(node,label,y){
    const text=String(label.textContent||'');
    const width=Math.max(18,text.length*4.9),height=8.6;
    return{x1:node.x-width/2-2,x2:node.x+width/2+2,y1:y-height*.25,y2:y+height+2};
  }
  function boxesOverlap(a,b){return a.x1<b.x2&&a.x2>b.x1&&a.y1<b.y2&&a.y2>b.y1}

  function placeLabelsBelow(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    const nodeBoxes=gd.nodes.map(n=>{const r=visualRadius(n)+5;return{id:n.id,x1:n.x-r,x2:n.x+r,y1:n.y-r,y2:n.y+r}});
    const placed=[];
    const groups=[...svg.querySelectorAll('.node')].sort((a,b)=>(byId[a.dataset.node]?.y||0)-(byId[b.dataset.node]?.y||0));
    groups.forEach(group=>{
      const node=byId[group.dataset.node],label=group.querySelector('.label');if(!node||!label)return;
      let y=node.y+visualRadius(node)+LABEL_GAP,box;
      for(let attempt=0;attempt<10;attempt++){
        box=estimatedLabelBox(node,label,y);
        const hitsNode=nodeBoxes.some(other=>other.id!==node.id&&boxesOverlap(box,other));
        const hitsLabel=placed.some(other=>boxesOverlap(box,other));
        if(!hitsNode&&!hitsLabel)break;
        y+=LABEL_LINE;
      }
      label.setAttribute('x',node.x.toFixed(2));label.setAttribute('y',y.toFixed(2));
      label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','hanging');
      label.classList.add('atlas-uniform-label');placed.push(box||estimatedLabelBox(node,label,y));
    });
  }

  anchorMapLayout=anchorGuidedLayout;

  drawNetwork=function(scope){
    const result=baseDrawNetwork(scope);routeCrossEdges(scope);placeLabelsBelow(scope);
    document.querySelectorAll('[data-map-layout]').forEach(button=>{button.onclick=()=>reformGuidedLayout(scope)});
    document.querySelectorAll('[data-map-anchor]').forEach(button=>{button.onclick=()=>anchorGuidedLayout()});
    return result;
  };

  root.AtlasNetworkLayout=Object.freeze({version:'0.15.9-r1',computeBaseLayout,guidedPositions,cumulativeOffsets,assignRootAngles,childFanAngles,childRadius,directCrossRoute,routeCrossEdges,placeLabelsBelow,reform:reformGuidedLayout,anchor:anchorGuidedLayout});
})(window);
