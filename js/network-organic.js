// Atlas v0.15.13-r1: organic deterministic settle layered over the hierarchy seed.
(function(root){
  'use strict';

  const baseGraphData=typeof graphData==='function'?graphData:null;
  if(!baseGraphData)return;

  const CX=600,CY=340;
  const ITERATIONS=440;
  const MAX_STEP=5.2;
  const DAMPING=.79;
  let cache=new Map();

  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const round=v=>Math.round(Number(v||0)*10)/10;
  const hash=value=>{let h=2166136261;for(const c of String(value||''))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
  const unit=value=>((hash(value)%2001)/1000)-1;

  function physics(){
    const p=state?.settings?.networkPhysics||{};
    const center=clamp(num(p.center??50),0,100),repel=clamp(num(p.repel??50),0,100),link=clamp(num(p.linkStrength??50),0,100),distance=clamp(num(p.linkDistance??50),0,100),collision=clamp(num(p.collision??50),0,100);
    return {center,repel,link,distance,collision,
      charge:800+repel*22,
      spring:.025+link*.0007,
      distanceScale:.70+distance*.006,
      collisionGap:10+collision*.30,
      centerShift:.012+center*.00028,
      rootGravity:.00015+center*.0000045
    };
  }

  function physicsKey(p){return `${p.center}:${p.repel}:${p.link}:${p.distance}:${p.collision}`}
  function parentMap(nodes){return Object.fromEntries(nodes.map(n=>[n.id,n.parentId||'atlas']))}
  function topRoot(id,parents){let cur=id,guard=0;while(parents[cur]&&parents[cur]!=='atlas'&&parents[parents[cur]]&&guard++<20)cur=parents[cur];return cur}
  function nodeMass(n){return n.level<=2?1.55:n.level===3?1.28:n.level===4?1.08:.90}
  function collisionRadius(n,p){
    const code=String(n.code||n.name||'');
    const dot=typeof visualRadius==='function'?visualRadius(n):5;
    const labelHalf=Math.min(28,Math.max(9,code.length*2.35));
    return dot+labelHalf+8+p.collisionGap*.45;
  }
  function desiredLink(child,p){
    const base=child.level<=3?98:child.level===4?78:62;
    return base*p.distanceScale;
  }
  function pinnedIds(nodes){
    const out=new Set();
    const active=typeof dragging!=='undefined'&&dragging?.kind==='node-group'?dragging:null;
    Object.keys(active?.origins||{}).forEach(id=>out.add(id));
    nodes.forEach(n=>{
      const record=areaById?.(n.id)||(state.notes||[]).find(x=>x.id===n.id);
      if(!record)return;
      const moved=Math.abs(num(record.mapOffsetX))+Math.abs(num(record.mapOffsetY));
      if(moved>.5)out.add(n.id);
    });
    return out;
  }

  function settle(nodes,links,p){
    const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const ids=nodes.map(n=>n.id),parents=parentMap(nodes),branch=Object.fromEntries(ids.map(id=>[id,topRoot(id,parents)]));
    const pos=Object.fromEntries(nodes.map(n=>[n.id,{x:num(n.x)+unit(n.id+':ox')*4.5,y:num(n.y)+unit(n.id+':oy')*4.5,mapZ:num(n.mapZ??n.z)}]));
    const vel=Object.fromEntries(ids.map(id=>[id,{x:0,y:0}]));
    const pinned=pinnedIds(nodes);
    pinned.forEach(id=>{const n=byId[id];if(n)pos[id]={x:num(n.x),y:num(n.y),mapZ:num(n.mapZ??n.z)}});
    const tree=links.filter(l=>l.type==='tree'&&byId[l.source]&&byId[l.target]);

    for(let iter=0;iter<ITERATIONS;iter++){
      const t=iter/Math.max(1,ITERATIONS-1),cool=.22+.78*(1-t)*(1-t);
      const force=Object.fromEntries(ids.map(id=>[id,{x:0,y:0}]));

      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
        const aid=ids[i],bid=ids[j],a=byId[aid],b=byId[bid];
        let dx=pos[bid].x-pos[aid].x,dy=pos[bid].y-pos[aid].y,d2=dx*dx+dy*dy;
        if(d2<1){const ang=(hash(`${aid}|${bid}|organic`)%6283)/1000;dx=Math.cos(ang);dy=Math.sin(ang);d2=1}
        const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,cross=branch[aid]!==branch[bid];
        const charge=p.charge*nodeMass(a)*nodeMass(b)*(cross?1.18:1);
        const repel=Math.min(2.6,charge/Math.max(520,d2))*cool;
        if(!pinned.has(aid)){force[aid].x-=nx*repel;force[aid].y-=ny*repel}
        if(!pinned.has(bid)){force[bid].x+=nx*repel;force[bid].y+=ny*repel}

        const min=collisionRadius(a,p)+collisionRadius(b,p)+(cross?p.collisionGap*.45:0);
        if(d<min){
          const push=Math.min(5,(min-d)*.34)*cool;
          if(!pinned.has(aid)){force[aid].x-=nx*push;force[aid].y-=ny*push}
          if(!pinned.has(bid)){force[bid].x+=nx*push;force[bid].y+=ny*push}
        }
      }

      tree.forEach(edge=>{
        const a=edge.source,b=edge.target,child=byId[b];
        let dx=pos[b].x-pos[a].x,dy=pos[b].y-pos[a].y,d=Math.hypot(dx,dy)||1;
        const nx=dx/d,ny=dy/d,want=desiredLink(child,p),spring=(d-want)*p.spring*cool;
        const parentShare=byId[a]?.level<=2?.34:.42,childShare=1-parentShare;
        if(!pinned.has(a)){force[a].x+=nx*spring*parentShare;force[a].y+=ny*spring*parentShare}
        if(!pinned.has(b)){force[b].x-=nx*spring*childShare;force[b].y-=ny*spring*childShare}
      });

      // Obsidian-like centring: translate the graph's centroid toward the canvas
      // instead of pulling every node individually into a circular clump.
      const free=ids.filter(id=>!pinned.has(id));
      if(free.length){
        const centroidX=ids.reduce((s,id)=>s+pos[id].x,0)/ids.length;
        const centroidY=ids.reduce((s,id)=>s+pos[id].y,0)/ids.length;
        const shiftX=(CX-centroidX)*p.centerShift*cool,shiftY=(CY-centroidY)*p.centerShift*cool;
        free.forEach(id=>{force[id].x+=shiftX;force[id].y+=shiftY});
      }

      // Only root nodes receive a tiny gravity term. This gives the overall map a
      // centre without preserving the old equal-angle root orbit as final geometry.
      ids.forEach(id=>{
        if(pinned.has(id)||byId[id].level>2)return;
        force[id].x+=(CX-pos[id].x)*p.rootGravity*cool;
        force[id].y+=(CY-pos[id].y)*p.rootGravity*cool;
      });

      ids.forEach(id=>{
        if(pinned.has(id)){vel[id].x=0;vel[id].y=0;return}
        vel[id].x=(vel[id].x+force[id].x)*DAMPING;
        vel[id].y=(vel[id].y+force[id].y)*DAMPING;
        const speed=Math.hypot(vel[id].x,vel[id].y),cap=MAX_STEP*cool;
        if(speed>cap){vel[id].x*=cap/speed;vel[id].y*=cap/speed}
        pos[id].x+=vel[id].x;pos[id].y+=vel[id].y;
      });
    }

    return Object.fromEntries(ids.map(id=>[id,{x:round(pos[id].x),y:round(pos[id].y),mapZ:round(pos[id].mapZ)}]));
  }

  function fullOrganicLayout(full){
    const p=physics();
    const coordKey=full.nodes.map(n=>`${n.id}:${n.parentId}:${n.level}:${round(n.x)}:${round(n.y)}`).join('|');
    const key=`${state?.settings?.activeProfile||'me'}|${physicsKey(p)}|${coordKey}`;
    if(cache.has(key))return cache.get(key);
    const layout=settle(full.nodes,full.links,p);
    if(cache.size>20)cache=new Map();
    cache.set(key,layout);return layout;
  }

  graphData=function(scope){
    const gd=baseGraphData(scope);
    const full=scope?baseGraphData(null):gd;
    const layout=fullOrganicLayout(full);
    gd.nodes.forEach(n=>{const p=layout[n.id];if(!p)return;n.x=p.x;n.y=p.y;n.mapZ=p.mapZ;n.z=p.mapZ});
    return gd;
  };

  root.AtlasOrganicNetwork=Object.freeze({version:'0.15.13-r1',settle,physics});
})(window);
