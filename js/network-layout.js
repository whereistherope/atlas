// Atlas v0.15.10-r1: deterministic constrained-force network grammar.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  if(!baseGraphData||!baseDrawNetwork)return;

  const CX=600,CY=340;
  const ROOT_RADIUS=184;
  const ROOT_START=-Math.PI*.76;
  const BASE_CHILD_RADIUS=84;
  const MIN_SIBLING_CLEARANCE=58;
  const LABEL_GAP=10;
  const LABEL_LINE=10;

  // The radial hierarchy is the deterministic seed. These forces then let the
  // graph respond to itself without turning into an uncontrolled force cloud.
  const FORCE_ITERATIONS=360;
  const FORCE_NODE_REPEL=1450;
  const FORCE_LINK_STRENGTH=.058;
  const FORCE_DIRECTION_MEMORY=.0025;
  const FORCE_CENTER_STRENGTH=.0036;
  const FORCE_BRANCH_GAP=18;
  const FORCE_MAX_STEP=4.5;

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
    const preferredStep=clamp(.66-(Math.max(0,count-4)*.045),.42,.66);
    const span=Math.min(Math.PI*1.48,preferredStep*(count-1));
    const step=span/(count-1);
    return Array.from({length:count},(_,i)=>outward-span/2+i*step);
  }

  function childRadius(count,angles){
    if(count<=1)return BASE_CHILD_RADIUS;
    const step=Math.abs((angles[1]??0)-(angles[0]??0));
    const minForClearance=step>0?MIN_SIBLING_CLEARANCE/(2*Math.sin(step/2)):BASE_CHILD_RADIUS;
    return Math.ceil(Math.max(BASE_CHILD_RADIUS,minForClearance)/4)*4;
  }

  function computeSeedLayout(profileId=activeProfileId()){
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
        positions[child.id]={x:round(pp.x+Math.cos(angle)*radius),y:round(pp.y+Math.sin(angle)*radius),mapZ:round((pp.mapZ||0)*.22+signedUnit(child.id+'z')*12),angle,level:childLevel,parentId:child.parentId||parent.id};
        placeFan(child,pp);
      });
    }

    roots.forEach(rootNode=>placeFan(rootNode,{x:CX,y:CY}));
    return positions;
  }

  function topRootId(id,byId){
    let node=byId[id],guard=0;
    while(node&&node.parentId!=='atlas'&&byId[node.parentId]&&guard++<18)node=byId[node.parentId];
    return node?.id||id;
  }

  function collisionRadius(node){
    const code=String(node.code||node.name||'');
    const labelAllowance=Math.min(22,Math.max(8,code.length*2.1));
    return (typeof visualRadius==='function'?visualRadius(node):5)+14+labelAllowance;
  }

  function deterministicNudge(a,b){
    const angle=(hash(`${a}|${b}|force`)%6283)/1000;
    return{x:Math.cos(angle),y:Math.sin(angle)};
  }

  function relaxLayout(nodes,seed,options={}){
    const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const ids=nodes.map(n=>n.id).filter(id=>seed[id]);
    const pos=Object.fromEntries(ids.map(id=>[id,{x:num(seed[id].x),y:num(seed[id].y),mapZ:num(seed[id].mapZ)}]));
    const pinned=options.pinned||new Set();
    const iterations=options.iterations||FORCE_ITERATIONS;
    const tree=nodes.filter(n=>n.parentId&&n.parentId!=='atlas'&&byId[n.parentId]&&pos[n.parentId]&&pos[n.id]).map(n=>({parent:n.parentId,child:n.id}));
    const branchOf=Object.fromEntries(ids.map(id=>[id,topRootId(id,byId)]));
    const branches={};ids.forEach(id=>(branches[branchOf[id]]??=[]).push(id));
    const targetDistance={},targetDirection={};

    tree.forEach(edge=>{
      const p=seed[edge.parent],c=seed[edge.child],dx=c.x-p.x,dy=c.y-p.y,d=Math.hypot(dx,dy)||1;
      targetDistance[`${edge.parent}|${edge.child}`]=d;
      targetDirection[`${edge.parent}|${edge.child}`]={x:dx/d,y:dy/d};
    });

    for(let iter=0;iter<iterations;iter++){
      const cool=1-.82*(iter/Math.max(1,iterations));
      const delta=Object.fromEntries(ids.map(id=>[id,{x:0,y:0}]));

      // Obsidian-like charge + collision. Different top-level branches receive a
      // little extra separation so one cluster cannot settle on top of another.
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
        const a=ids[i],b=ids[j];let dx=pos[b].x-pos[a].x,dy=pos[b].y-pos[a].y,d2=dx*dx+dy*dy;
        if(d2<1){const n=deterministicNudge(a,b);dx=n.x;dy=n.y;d2=1}
        const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,crossBranch=branchOf[a]!==branchOf[b];
        const repel=Math.min(1.7,(FORCE_NODE_REPEL*(crossBranch?1.35:1))/Math.max(625,d2))*cool;
        if(!pinned.has(a)){delta[a].x-=nx*repel;delta[a].y-=ny*repel}
        if(!pinned.has(b)){delta[b].x+=nx*repel;delta[b].y+=ny*repel}
        const minDistance=collisionRadius(byId[a])+collisionRadius(byId[b])+(crossBranch?14:4);
        if(d<minDistance){
          const push=(minDistance-d)*.26*cool;
          if(!pinned.has(a)){delta[a].x-=nx*push;delta[a].y-=ny*push}
          if(!pinned.has(b)){delta[b].x+=nx*push;delta[b].y+=ny*push}
        }
      }

      // Structural links behave like springs. Dotted/cross-links are deliberately
      // absent here: relationships are visible, but never pull clusters together.
      tree.forEach(({parent,child})=>{
        let dx=pos[child].x-pos[parent].x,dy=pos[child].y-pos[parent].y,d=Math.hypot(dx,dy)||1;
        const nx=dx/d,ny=dy/d,key=`${parent}|${child}`,want=targetDistance[key]||BASE_CHILD_RADIUS,err=d-want,force=err*FORCE_LINK_STRENGTH*cool;
        if(!pinned.has(parent)){delta[parent].x+=nx*force*.28;delta[parent].y+=ny*force*.28}
        if(!pinned.has(child)){delta[child].x-=nx*force*.72;delta[child].y-=ny*force*.72}
        const dir=targetDirection[key];
        if(dir&&!pinned.has(child)){
          const idealX=pos[parent].x+dir.x*want,idealY=pos[parent].y+dir.y*want;
          delta[child].x+=(idealX-pos[child].x)*FORCE_DIRECTION_MEMORY*cool;
          delta[child].y+=(idealY-pos[child].y)*FORCE_DIRECTION_MEMORY*cool;
        }
      });

      // Treat each top-level branch as an envelope as well as a set of individual
      // nodes. This is the missing cluster-vs-cluster behaviour visible in the
      // manually corrected screenshot.
      const envelopes={};
      Object.entries(branches).forEach(([branch,members])=>{
        const cx=members.reduce((s,id)=>s+pos[id].x,0)/members.length,cy=members.reduce((s,id)=>s+pos[id].y,0)/members.length;
        const radius=Math.max(...members.map(id=>Math.hypot(pos[id].x-cx,pos[id].y-cy)+collisionRadius(byId[id])));
        envelopes[branch]={cx,cy,radius,members};
      });
      const branchIds=Object.keys(envelopes);
      for(let i=0;i<branchIds.length;i++)for(let j=i+1;j<branchIds.length;j++){
        const a=envelopes[branchIds[i]],b=envelopes[branchIds[j]];let dx=b.cx-a.cx,dy=b.cy-a.cy,d=Math.hypot(dx,dy);
        if(d<1){const n=deterministicNudge(branchIds[i],branchIds[j]);dx=n.x;dy=n.y;d=1}
        const want=a.radius+b.radius+FORCE_BRANCH_GAP;
        if(d>=want)continue;
        const nx=dx/d,ny=dy/d,push=Math.min(2.35,(want-d)*.03)*cool;
        a.members.forEach(id=>{if(!pinned.has(id)){delta[id].x-=nx*push;delta[id].y-=ny*push}});
        b.members.forEach(id=>{if(!pinned.has(id)){delta[id].x+=nx*push;delta[id].y+=ny*push}});
      }

      // A weak common centre gives the graph an overall body without fixing every
      // root to an exact orbit after relaxation.
      ids.forEach(id=>{
        if(pinned.has(id))return;
        delta[id].x+=(CX-pos[id].x)*FORCE_CENTER_STRENGTH*cool;
        delta[id].y+=(CY-pos[id].y)*FORCE_CENTER_STRENGTH*cool;
      });

      ids.forEach(id=>{
        if(pinned.has(id))return;
        let dx=delta[id].x,dy=delta[id].y,m=Math.hypot(dx,dy),cap=FORCE_MAX_STEP*cool;
        if(m>cap){dx*=cap/m;dy*=cap/m}
        pos[id].x+=dx;pos[id].y+=dy;
      });
    }

    return Object.fromEntries(ids.map(id=>[id,{...seed[id],x:round(pos[id].x),y:round(pos[id].y),mapZ:round(pos[id].mapZ)}]));
  }

  function computeBaseLayout(profileId=activeProfileId()){
    const nodes=sourceNodes(profileId),seed=computeSeedLayout(profileId);
    return relaxLayout(nodes,seed);
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
    const nodes=sourceNodes(profileId),base=computeBaseLayout(profileId),offs=cumulativeOffsets(profileId,base),draft=includeDraft&&typeof mapDraft==='function'?mapDraft(profileId):null,out={},pinned=new Set();
    Object.entries(base).forEach(([id,p])=>{
      const o=offs[id]||{x:0,y:0,z:0},anchored={x:round(p.x+o.x),y:round(p.y+o.y),mapZ:round(p.mapZ+o.z)};
      if(Math.abs(o.x)+Math.abs(o.y)>.5)pinned.add(id);
      if(draft?.[id]){
        out[id]={x:num(draft[id].x),y:num(draft[id].y),mapZ:num(draft[id].mapZ)};
        if(Math.hypot(out[id].x-anchored.x,out[id].y-anchored.y)>1)pinned.add(id);
      }else out[id]=anchored;
    });
    // During manual movement, the moved branch stays under the pointer while the
    // rest of the graph gets a short deterministic settle around it.
    return pinned.size?relaxLayout(nodes,out,{pinned,iterations:110}):out;
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
    toast?.('Force-relaxed constellation anchored');
  }

  async function reformGuidedLayout(scope=null){
    const profileId=activeProfileId();
    (state.areas||[]).filter(a=>(a.profile||'me')===profileId).forEach(a=>{delete a.mapOffsetX;delete a.mapOffsetY;delete a.mapOffsetZ});
    (state.notes||[]).filter(n=>(n.profile||'me')===profileId).forEach(n=>{delete n.mapOffsetX;delete n.mapOffsetY;delete n.mapOffsetZ});
    delete mapDraftLayouts[profileId];await save?.();const cam=mapCamera(scope);cam.needsFit=true;drawNetwork(scope);toast?.('Force-relaxed layout restored');
  }

  function clippedEndpoint(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,r=visualRadius(a)+1.5;return{x:a.x+dx/d*r,y:a.y+dy/d*r}}
  function directCrossRoute(a,b){const start=clippedEndpoint(a,b),end=clippedEndpoint(b,a);return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}

  function routeCrossEdges(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    svg.querySelectorAll('.edge.cross').forEach(path=>{
      const a=byId[path.dataset.source],b=byId[path.dataset.target];if(!a||!b)return;
      path.setAttribute('d',directCrossRoute(a,b));path.classList.add('direct-cross-route');path.classList.remove('centre-routed-cross','tracked-cross-route');delete path.dataset.routeLane;
    });
  }

  function estimatedLabelBox(node,label,y){const text=String(label.textContent||'');const width=Math.max(18,text.length*4.9),height=8.6;return{x1:node.x-width/2-2,x2:node.x+width/2+2,y1:y-height*.25,y2:y+height+2}}
  function boxesOverlap(a,b){return a.x1<b.x2&&a.x2>b.x1&&a.y1<b.y2&&a.y2>b.y1}

  function placeLabelsBelow(scope){
    const svg=document.getElementById('network');if(!svg)return;const gd=graphData(scope),byId=Object.fromEntries(gd.nodes.map(n=>[n.id,n]));
    const nodeBoxes=gd.nodes.map(n=>{const r=visualRadius(n)+5;return{id:n.id,x1:n.x-r,x2:n.x+r,y1:n.y-r,y2:n.y+r}}),placed=[];
    const groups=[...svg.querySelectorAll('.node')].sort((a,b)=>(byId[a.dataset.node]?.y||0)-(byId[b.dataset.node]?.y||0));
    groups.forEach(group=>{
      const node=byId[group.dataset.node],label=group.querySelector('.label');if(!node||!label)return;
      let y=node.y+visualRadius(node)+LABEL_GAP,box;
      for(let attempt=0;attempt<10;attempt++){box=estimatedLabelBox(node,label,y);const hitsNode=nodeBoxes.some(other=>other.id!==node.id&&boxesOverlap(box,other)),hitsLabel=placed.some(other=>boxesOverlap(box,other));if(!hitsNode&&!hitsLabel)break;y+=LABEL_LINE}
      label.setAttribute('x',node.x.toFixed(2));label.setAttribute('y',y.toFixed(2));label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','hanging');label.classList.add('atlas-uniform-label');placed.push(box||estimatedLabelBox(node,label,y));
    });
  }

  anchorMapLayout=anchorGuidedLayout;
  drawNetwork=function(scope){const result=baseDrawNetwork(scope);routeCrossEdges(scope);placeLabelsBelow(scope);document.querySelectorAll('[data-map-layout]').forEach(button=>{button.onclick=()=>reformGuidedLayout(scope)});document.querySelectorAll('[data-map-anchor]').forEach(button=>{button.onclick=()=>anchorGuidedLayout()});return result};

  root.AtlasNetworkLayout=Object.freeze({version:'0.15.10-r1',computeSeedLayout,computeBaseLayout,relaxLayout,guidedPositions,cumulativeOffsets,assignRootAngles,childFanAngles,childRadius,directCrossRoute,routeCrossEdges,placeLabelsBelow,reform:reformGuidedLayout,anchor:anchorGuidedLayout});
})(window);
