// Atlas v0.15.5-r1: deterministic recursive orbital network grammar.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  if(!baseGraphData||!baseDrawNetwork)return;

  const CX=600,CY=340,ROOT_RX=300,ROOT_RY=205;
  const ROOT_SLOTS=[-2.42,-1.62,-.78,.04,.82,1.62,2.38,3.10];
  const PREFERRED_ROOT_SLOT={WRK:0,WORK:0,LIFE:2,CRTV:4,CREATIVE:4,DAIL:6,DAILY:6};
  const STEP={2:0,3:132,4:94,5:68,6:54};

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

    const positions={},headings={};

    roots.forEach((r,i)=>{
      const a=rootAngles[r.id]??(-Math.PI/2+i*Math.PI*2/Math.max(1,roots.length));
      const radialJitter=signedUnit(r.id+'root')*16;
      positions[r.id]={x:round(CX+Math.cos(a)*(ROOT_RX+radialJitter)),y:round(CY+Math.sin(a)*(ROOT_RY+radialJitter*.55)),mapZ:round(signedUnit(r.id+'z')*18),angle:a,level:Number(r.level)||2,parentId:r.parentId||'atlas'};
      headings[r.id]=a;
    });

    function placeChildren(parent){
      const cs=kids[parent.id]||[];if(!cs.length)return;
      const pp=positions[parent.id];if(!pp)return;
      const heading=headings[parent.id]??Math.atan2(pp.y-CY,pp.x-CX);
      const count=cs.length,total=cs.reduce((s,c)=>s+leafCount(c.id),0);
      const spread=count<=1?0:clamp(.48+Math.log2(count+1)*.18,.52,1.34);
      let cursor=-spread/2;

      cs.forEach((child,index)=>{
        const weight=leafCount(child.id)/Math.max(1,total);
        const share=count<=1?0:spread*weight;
        const centre=count<=1?0:cursor+share/2;
        cursor+=share;

        // Local orbital grammar: children fan around their own parent. Small,
        // deterministic variation prevents ruler-lines without introducing chaos.
        const angleJitter=signedUnit(child.id+'angle')*(count>4?.055:.08);
        const childHeading=heading+centre+angleJitter;
        const level=clamp(Number(child.level)||Math.min(5,(Number(parent.level)||2)+1),2,6);
        const baseDistance=STEP[level]||68;
        const densityBoost=Math.min(22,Math.max(0,count-3)*4);
        const distance=baseDistance+densityBoost+signedUnit(child.id+'radius')*Math.min(13,baseDistance*.13);
        const tangent=signedUnit(child.id+'tangent')*(level>=4?8:11);
        const nx=Math.cos(childHeading),ny=Math.sin(childHeading),tx=-ny,ty=nx;
        positions[child.id]={
          x:round(pp.x+nx*distance+tx*tangent),
          y:round(pp.y+ny*distance*.78+ty*tangent*.72),
          mapZ:round((pp.mapZ||0)*.36+signedUnit(child.id+'z')*20),
          angle:childHeading,level,parentId:child.parentId||parent.id
        };
        headings[child.id]=childHeading;
        placeChildren(child);
      });
    }

    roots.forEach(placeChildren);
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
    toast?.('Orbital constellation anchored');
  }

  async function reformGuidedLayout(scope=null){
    const profileId=activeProfileId();
    (state.areas||[]).filter(a=>(a.profile||'me')===profileId).forEach(a=>{delete a.mapOffsetX;delete a.mapOffsetY;delete a.mapOffsetZ});
    (state.notes||[]).filter(n=>(n.profile||'me')===profileId).forEach(n=>{delete n.mapOffsetX;delete n.mapOffsetY;delete n.mapOffsetZ});
    delete mapDraftLayouts[profileId];await save?.();const cam=mapCamera(scope);cam.needsFit=true;drawNetwork(scope);toast?.('Orbital constellation restored');
  }

  function edgeCurve(a,b,type,index=0){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
    const ar=visualRadius(a)+1.5,br=visualRadius(b)+1.5;
    const x1=a.x+(dx/d)*ar,y1=a.y+(dy/d)*ar,x2=b.x-(dx/d)*br,y2=b.y-(dy/d)*br;
    const key=`${a.id}|${b.id}|${type}`;
    const side=signedUnit(key)>=0?1:-1;
    const bend=type==='cross'?Math.min(72,Math.max(18,d*.18+((hash(key)%4)-1.5)*7)):Math.min(22,Math.max(5,d*.055));
    const cx=(x1+x2)/2+nx*bend*side,cy=(y1+y2)/2+ny*bend*side;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  function routeEdges(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    svg.querySelectorAll('.edge').forEach((path,index)=>{
      const a=byId[path.dataset.source],b=byId[path.dataset.target];if(!a||!b)return;
      path.setAttribute('d',edgeCurve(a,b,path.classList.contains('cross')?'cross':'tree',index));
      path.classList.add('orbital-route');
    });
  }

  anchorMapLayout=anchorGuidedLayout;

  drawNetwork=function(scope){
    const result=baseDrawNetwork(scope);routeEdges(scope);
    document.querySelectorAll('[data-map-layout]').forEach(button=>{button.onclick=()=>reformGuidedLayout(scope)});
    document.querySelectorAll('[data-map-anchor]').forEach(button=>{button.onclick=()=>anchorGuidedLayout()});
    return result;
  };

  root.AtlasNetworkLayout=Object.freeze({version:'0.15.5-r1',computeBaseLayout,guidedPositions,cumulativeOffsets,edgeCurve,routeEdges,reform:reformGuidedLayout,anchor:anchorGuidedLayout});
})(window);
