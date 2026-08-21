// Atlas v0.15.6-r1: deterministic contained constellation clusters.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  if(!baseGraphData||!baseDrawNetwork)return;

  const CX=600,CY=340,ROOT_RX=265,ROOT_RY=178;
  const ROOT_SLOTS=[-2.40,-1.61,-.79,.02,.80,1.60,2.39,3.12];
  const PREFERRED_ROOT_SLOT={WRK:0,WORK:0,LIFE:2,CRTV:4,CREATIVE:4,DAIL:6,DAILY:6};
  const ORBIT={3:[92,132],4:[62,88],5:[43,61],6:[36,50]};

  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const round=v=>Math.round(Number(v||0)*10)/10;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=value=>{let h=2166136261;for(const c of String(value||''))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
  const signedUnit=value=>((hash(value)%2001)/1000)-1;

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
      if(slot!==undefined&&!used.has(slot)&&roots.length<=ROOT_SLOTS.length){out[r.id]=ROOT_SLOTS[slot];used.add(slot)}else deferred.push(r);
    });
    const free=ROOT_SLOTS.map((_,i)=>i).filter(i=>!used.has(i));
    deferred.forEach((r,i)=>{
      if(free[i]!==undefined&&roots.length<=ROOT_SLOTS.length){out[r.id]=ROOT_SLOTS[free[i]];return}
      const ordered=roots.slice().sort(rootSort),idx=ordered.findIndex(x=>x.id===r.id);out[r.id]=-Math.PI/2+idx*Math.PI*2/Math.max(1,roots.length);
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

    const positions={};
    roots.forEach((r,i)=>{
      const a=rootAngles[r.id]??(-Math.PI/2+i*Math.PI*2/Math.max(1,roots.length));
      positions[r.id]={x:round(CX+Math.cos(a)*ROOT_RX),y:round(CY+Math.sin(a)*ROOT_RY),mapZ:round(signedUnit(r.id+'z')*14),angle:a,level:Number(r.level)||2,parentId:r.parentId||'atlas'};
    });

    function orbitAngles(parent,count,ringIndex,ringCount,outward){
      if(ringCount<=0)return[];
      if(ringCount===1){
        const bend=signedUnit(parent.id+':single:'+ringIndex)*.48;
        return [outward+bend];
      }
      const span=count>=7?4.30:count>=5?3.95:count>=3?3.45:2.40;
      const start=outward-span/2;
      const phase=ringIndex?span/(Math.max(2,ringCount)*2):0;
      return Array.from({length:ringCount},(_,i)=>start+phase+(span*(i+.5)/ringCount)+signedUnit(parent.id+':slot:'+ringIndex+':'+i)*.055);
    }

    function placeCluster(parent,ancestorPos){
      const cs=(kids[parent.id]||[]).slice();if(!cs.length)return;
      const pp=positions[parent.id];if(!pp)return;
      const inward=ancestorPos?Math.atan2(ancestorPos.y-pp.y,ancestorPos.x-pp.x):Math.atan2(CY-pp.y,CX-pp.x);
      const outward=inward+Math.PI;

      // Larger subtrees get first access to the outer ring so their own packet has room.
      cs.sort((a,b)=>leafCount(b.id)-leafCount(a.id)||String(a.name||a.id).localeCompare(String(b.name||b.id)));
      const useTwoRings=cs.length>5;
      const inner=[],outer=[];
      cs.forEach((child,i)=>{
        if(useTwoRings&&(leafCount(child.id)>1||i%2===1))outer.push(child);else inner.push(child);
      });
      if(useTwoRings&&outer.length===0)outer.push(inner.pop());

      const groups=[inner,outer];
      groups.forEach((group,ringIndex)=>{
        if(!group.length)return;
        const level=clamp(Number(group[0]?.level)||Math.min(5,(Number(parent.level)||2)+1),3,6),radii=ORBIT[level]||ORBIT[5];
        const angles=orbitAngles(parent,cs.length,ringIndex,group.length,outward);
        group.forEach((child,index)=>{
          const childLevel=clamp(Number(child.level)||level,3,6);
          const childRadii=ORBIT[childLevel]||radii;
          const subtree=leafCount(child.id);
          const baseDistance=(ringIndex?childRadii[1]:childRadii[0])+Math.min(24,Math.max(0,subtree-1)*3.5);
          const distance=baseDistance*(1+signedUnit(child.id+':radius')*.075);
          const angle=angles[index];
          positions[child.id]={
            x:round(pp.x+Math.cos(angle)*distance),
            y:round(pp.y+Math.sin(angle)*distance*.88),
            mapZ:round((pp.mapZ||0)*.28+signedUnit(child.id+'z')*17),
            angle,level:childLevel,parentId:child.parentId||parent.id
          };
          placeCluster(child,pp);
        });
      });
    }

    roots.forEach(root=>placeCluster(root,{x:CX,y:CY}));
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
    toast?.('Constellation anchored');
  }

  async function reformGuidedLayout(scope=null){
    const profileId=activeProfileId();
    (state.areas||[]).filter(a=>(a.profile||'me')===profileId).forEach(a=>{delete a.mapOffsetX;delete a.mapOffsetY;delete a.mapOffsetZ});
    (state.notes||[]).filter(n=>(n.profile||'me')===profileId).forEach(n=>{delete n.mapOffsetX;delete n.mapOffsetY;delete n.mapOffsetZ});
    delete mapDraftLayouts[profileId];await save?.();const cam=mapCamera(scope);cam.needsFit=true;drawNetwork(scope);toast?.('Contained constellation restored');
  }

  function crossCurve(a,b,lane=0){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
    const ar=visualRadius(a)+1.5,br=visualRadius(b)+1.5;
    const x1=a.x+(dx/d)*ar,y1=a.y+(dy/d)*ar,x2=b.x-(dx/d)*br,y2=b.y-(dy/d)*br;
    const key=`${a.id}|${b.id}`;
    const side=lane===0?(signedUnit(key)>=0?1:-1):(lane>0?1:-1);
    const bend=Math.min(78,Math.max(20,d*.15)+Math.abs(lane)*9+(hash(key)%7));
    const cx1=x1+dx*.32+nx*bend*side,cy1=y1+dy*.32+ny*bend*side;
    const cx2=x1+dx*.68+nx*bend*side,cy2=y1+dy*.68+ny*bend*side;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${cx1.toFixed(2)} ${cy1.toFixed(2)} ${cx2.toFixed(2)} ${cy2.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  function routeCrossEdges(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    const paths=[...svg.querySelectorAll('.edge.cross')].sort((p,q)=>`${p.dataset.source}|${p.dataset.target}`.localeCompare(`${q.dataset.source}|${q.dataset.target}`));
    const sourceGroups={};paths.forEach(path=>(sourceGroups[path.dataset.source]??=[]).push(path));
    paths.forEach(path=>{
      const a=byId[path.dataset.source],b=byId[path.dataset.target];if(!a||!b)return;
      const group=sourceGroups[path.dataset.source]||[path],idx=group.indexOf(path),lane=idx-(group.length-1)/2;
      path.setAttribute('d',crossCurve(a,b,lane));path.classList.add('tracked-cross-route');path.dataset.routeLane=String(lane);
    });
  }

  function placeRadialLabels(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    svg.querySelectorAll('.node').forEach(group=>{
      const node=byId[group.dataset.node],label=group.querySelector('.label');if(!node||!label)return;
      const parent=byId[node.parentId],anchor=parent||{x:CX,y:CY};
      let dx=node.x-anchor.x,dy=node.y-anchor.y,d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
      const gap=visualRadius(node)+(node.level>=5?8:10);
      label.setAttribute('x',(node.x+dx*gap).toFixed(2));label.setAttribute('y',(node.y+dy*gap).toFixed(2));
      label.setAttribute('text-anchor',dx>.28?'start':dx<-.28?'end':'middle');
      label.setAttribute('dominant-baseline',dy>.25?'hanging':dy<-.25?'auto':'middle');
    });
  }

  anchorMapLayout=anchorGuidedLayout;

  drawNetwork=function(scope){
    const result=baseDrawNetwork(scope);routeCrossEdges(scope);placeRadialLabels(scope);
    document.querySelectorAll('[data-map-layout]').forEach(button=>{button.onclick=()=>reformGuidedLayout(scope)});
    document.querySelectorAll('[data-map-anchor]').forEach(button=>{button.onclick=()=>anchorGuidedLayout()});
    return result;
  };

  root.AtlasNetworkLayout=Object.freeze({version:'0.15.6-r1',computeBaseLayout,guidedPositions,cumulativeOffsets,crossCurve,routeCrossEdges,placeRadialLabels,reform:reformGuidedLayout,anchor:anchorGuidedLayout});
})(window);
