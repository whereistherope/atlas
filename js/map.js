// Nodes map camera, graph layout and rendering. Predict extensions are loaded by widgets.js.
function domainKeyForArea(a){if(!a)return'';let cur=a,guard=0;while(cur&&Number(cur.level)>2&&guard++<12)cur=areaById(cur.parentId);return cur?.id||a.id||''}
const GRAPH_PALETTE=['var(--graph-hue-1)','var(--graph-hue-2)','var(--graph-hue-3)','var(--graph-hue-4)','var(--graph-hue-5)','var(--graph-hue-6)'];
// Unanchored edits live only for this session. Persisted area coordinates remain
// the compatibility-safe preferred layout until the user explicitly anchors.
const mapDraftLayouts={};
function mapLayoutProfile(){return state.settings.activeProfile||'me'}
function mapDraft(profileId=mapLayoutProfile()){return mapDraftLayouts[profileId]||null}
function setMapDraftFromAreas(areas,profileId=mapLayoutProfile()){mapDraftLayouts[profileId]=Object.fromEntries((areas||[]).filter(a=>(a.profile||'me')===profileId).map(a=>[a.id,{x:Number(a.x)||0,y:Number(a.y)||0,mapZ:Number(a.mapZ)||0}]));return mapDraftLayouts[profileId]}
function updateMapDraft(id,position,profileId=mapLayoutProfile()){const draft=mapDraft(profileId)||setMapDraftFromAreas(state.areas,profileId);draft[id]={x:Number(position.x)||0,y:Number(position.y)||0,mapZ:Number(position.mapZ)||0}}
function anchorMapLayout(){const profileId=mapLayoutProfile(),draft=mapDraft(profileId)||setMapDraftFromAreas(state.areas,profileId);state.areas.filter(a=>(a.profile||'me')===profileId).forEach(a=>{const p=draft[a.id];if(p){a.x=p.x;a.y=p.y;a.mapZ=p.mapZ}});save();const button=document.querySelector('[data-map-anchor]');if(button){button.textContent='Anchored';button.classList.add('is-confirmed');setTimeout(()=>{if(button.isConnected){button.textContent='Anchor';button.classList.remove('is-confirmed')}},1400)}toast('Preferred constellation anchored')}
function stableOffset(text,range=18){let h=0;for(const c of String(text||''))h=(Math.imul(h,31)+c.charCodeAt(0))|0;return ((Math.abs(h)%1000)/999*2-1)*range}
function domainHueDeg(a){const rootId=domainKeyForArea(a);const roots=profileAreas(a?.profile||state.settings.activeProfile||'me').filter(x=>x.level===2).sort((x,y)=>x.name.localeCompare(y.name));return Math.max(0,roots.findIndex(x=>x.id===rootId))}
function domainHueFor(n){const a=n?.id?areaById(n.id)||areaById(n.parentId):null;if(!a)return'#858984';const idx=domainHueDeg(a);return GRAPH_PALETTE[idx%GRAPH_PALETTE.length]}
function areaActivityScore(id){const cutoff=now()-86400000*45;let score=0;state.notes.forEach(n=>{if(!profileAllows(n.profile)||n.createdAt<cutoff)return;const rid=n.topicId||n.areaId;if(rid===id||isDescendant(rid,id))score+=1});state.projects.forEach(p=>{if(!profileAllows(p.profile))return;const rid=p.topicId||p.areaId;if(rid===id||isDescendant(rid,id))score+=p.status==='ACTIVE'?2.5:1});state.calendar.forEach(e=>{if(!profileAllows(e.profile))return;const rid=e.areaId;if(rid&&(rid===id||isDescendant(rid,id)))score+=1.2});state.daily.forEach(d=>{if(!profileAllows(d.profile)||!d.areaId)return;if(d.areaId===id||isDescendant(d.areaId,id))score+=.55});return Math.max(0,Math.min(1,1-Math.exp(-score/5)))}
function quantumWeight(id){let w=2;state.notes.forEach(n=>{if(profileAllows(n.profile)&&(n.topicId===id||n.areaId===id))w+=2.4});state.projects.forEach(p=>{if(!profileAllows(p.profile))return;if(p.topicId===id||p.areaId===id)w+=5+(p.tasks||[]).length*.8+(p.milestones||[]).length*.7});state.calendar.forEach(e=>{if(profileAllows(e.profile)&&e.areaId===id)w+=1.5});state.daily.forEach(d=>{if(profileAllows(d.profile)&&d.areaId===id)w+=.7});return Math.min(38,Math.max(2,Math.round(w)))}
function graphData(scope){
  const max=state.settings.mapDepth;const nodes=[];
  let areas=profileAreas().filter(a=>spaceAllows(a.space)&&a.level<=max);
  if(scope){const include=new Set([scope]);let cur=areaById(scope);while(cur&&profileAllows(cur.profile)){include.add(cur.id);cur=areaById(cur.parentId)}profileAreas().forEach(a=>{if(a.id===scope||isDescendant(a.id,scope))include.add(a.id)});areas=areas.filter(a=>include.has(a.id))}
  const draft=mapDraft();nodes.push(...areas.map(a=>{const p=draft?.[a.id]||a;return{...a,x:Number(p.x)||0,y:Number(p.y)||0,mapZ:Number(p.mapZ)||0,heat:areaActivityScore(a.id),hue:domainHueFor(a),z:Number(p.mapZ||0)}}));
  if(max>=5){const noteGroups={};state.notes.filter(n=>profileAllows(n.profile)&&n.showOnMap&&spaceAllows(n.space)&&(!scope||n.areaId===scope||n.topicId===scope||isDescendant(n.topicId||n.areaId,scope))).forEach(n=>{const par=areaById(n.topicId)||areaById(n.areaId);if(!areaAllows(par))return;const pid=par?.id||'';(noteGroups[pid]||(noteGroups[pid]=[])).push({n,par})});Object.values(noteGroups).forEach(group=>{group.sort((a,b)=>String(a.n.title||'').localeCompare(String(b.n.title||'')));const par=group[0]?.par;if(!par)return;const rand=seeded(par.id+'notes'+activeProfile().id);group.forEach(({n},i)=>{const ang=rand()*Math.PI*2,rr=34+rand()*34;nodes.push({id:n.id,name:n.title,code:makeNodeCode(n.title),profile:n.profile,space:n.space,level:5,parentId:par.id,description:'',x:par.x+Math.cos(ang)*rr,y:par.y+Math.sin(ang)*rr,z:Number(par.mapZ||0)+(rand()-.5)*24,status:'default',note:true,heat:.25,hue:domainHueFor(par)})})})}
  const ids=new Set(nodes.map(n=>n.id));const links=[];nodes.forEach(n=>{if(n.parentId&&n.parentId!=='atlas'&&ids.has(n.parentId))links.push({source:n.parentId,target:n.id,type:'tree'})});profileLinks().forEach(l=>{if(ids.has(l.source)&&ids.has(l.target))links.push(l)});return{nodes,links}
}
function radius(level){return({1:0,2:9.0,3:6.8,4:5.0,5:3.2})[level]||5}
function depthScale(z){return .88+Math.max(-1,Math.min(1,Number(z||0)/280))*.12}
function visualRadius(n){return radius(n.level)*depthScale(n.z)}
function sphereProject(theta,phi,r=292){const cr=Math.cos(phi),x=r*cr*Math.cos(theta),z=r*cr*Math.sin(theta),y=r*Math.sin(phi);const tilt=.07;return{x:600+x,y:340+y*.90+z*tilt,z}}
function organiseSphericalLayout(s,profileId='me'){
  const areas=(s.areas||[]).filter(a=>(a.profile||'me')===profileId);if(!areas.length)return s;
  const byId=Object.fromEntries(areas.map(a=>[a.id,a])),kids={};areas.forEach(a=>(kids[a.parentId||'atlas']??=[]).push(a));Object.values(kids).forEach(arr=>arr.sort((a,b)=>String(a.name).localeCompare(String(b.name))));
  const roots=(kids.atlas||[]).slice(),cx=600,cy=340,rootCount=Math.max(1,roots.length),rootR=255;
  const pref=['WRK','LIFE','CRTV','DAIL'];roots.sort((a,b)=>{const ai=pref.indexOf(a.code),bi=pref.indexOf(b.code);return (ai<0?99:ai)-(bi<0?99:bi)||a.name.localeCompare(b.name)});
  const rootAngles=rootCount===4?[-2.24,-.74,.82,2.28]:roots.map((_,i)=>-Math.PI/2+i*Math.PI*2/rootCount);
  const ideal={};
  roots.forEach((r,i)=>{const a=rootAngles[i],rr=rootR+Math.min(44,(kids[r.id]||[]).length*8);ideal[r.id]={x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr*.73,z:Math.sin(a)*85};});
  function placeLocal(parent,heading){
    const cs=kids[parent.id]||[];if(!cs.length)return;
    const n=cs.length,plevel=Number(parent.level||2),childLevel=Number(cs[0]?.level||plevel+1);
    let ring=childLevel===3?112:childLevel===4?78:54;
    ring+=Math.max(0,n-5)*6;
    let span;
    if(plevel===2)span=n>=5?Math.PI*1.48:n===4?Math.PI*1.24:n===3?Math.PI*.96:n===2?Math.PI*.66:0;
    else span=n>=5?Math.PI*1.78:n===4?Math.PI*1.48:n===3?Math.PI*1.16:n===2?Math.PI*.78:0;
    const start=heading-span/2;
    cs.forEach((c,i)=>{const a=n===1?heading:start+(span*i/Math.max(1,n-1));const p=ideal[parent.id]||{x:parent.x||cx,y:parent.y||cy,z:0};ideal[c.id]={x:p.x+Math.cos(a)*ring,y:p.y+Math.sin(a)*ring,z:(p.z||0)*.52+stableOffset(c.id,60)};placeLocal(c,a)});
  }
  roots.forEach((r,i)=>placeLocal(r,rootAngles[i]));
  areas.forEach((a,i)=>{const p=ideal[a.id]||{x:cx+Math.cos(i/areas.length*Math.PI*2)*260,y:cy+Math.sin(i/areas.length*Math.PI*2)*185,z:0};a.x=p.x;a.y=p.y;a.mapZ=p.z||0});
  const tree=areas.filter(a=>a.parentId&&a.parentId!=='atlas'&&byId[a.parentId]).map(a=>({p:byId[a.parentId],c:a}));
  const target=c=>Number(c.level)===3?112:Number(c.level)===4?80:56;
  const labelW=a=>Math.max(25,Math.min(64,String(a.code||'').length*6.5));
  for(let iter=0;iter<520;iter++){
    // Strong local springs: direct relationships should remain visibly clustered.
    tree.forEach(({p,c})=>{let dx=c.x-p.x,dy=c.y-p.y,d=Math.hypot(dx,dy)||1,want=target(c),err=d-want,nx=dx/d,ny=dy/d,k=.045;const pm=p.level===2?.20:.34,cm=.72;p.x+=nx*err*k*pm;p.y+=ny*err*k*pm;c.x-=nx*err*k*cm;c.y-=ny*err*k*cm});
    // Keep siblings on an even local halo around the parent.
    Object.keys(kids).forEach(pid=>{if(pid==='atlas')return;const cs=kids[pid]||[],p=byId[pid];if(!p||cs.length<2)return;const desired=target(cs[0]);cs.forEach(c=>{let dx=c.x-p.x,dy=c.y-p.y,d=Math.hypot(dx,dy)||1;const f=(desired-d)*.018;c.x+=dx/d*f;c.y+=dy/d*f})});
    // Collision envelope includes code labels.
    for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++){
      const a=areas[i],b=areas[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001;const ra=radius(a.level),rb=radius(b.level);let min=ra+rb+28;if(Math.abs(dy)<24)min=Math.max(min,(labelW(a)+labelW(b))*.50+20);if(d<min){const nx=dx/d,ny=dy/d,push=(min-d)*.48+.08,am=a.level===2?.24:1,bm=b.level===2?.24:1,tot=am+bm;a.x-=nx*push*am/tot;a.y-=ny*push*am/tot;b.x+=nx*push*bm/tot;b.y+=ny*push*bm/tot}
    }
    // Very gentle return to canonical territories so the map stays orbital rather than drifting.
    areas.forEach(a=>{const home=ideal[a.id];if(!home)return;const k=a.level===2?.08:a.level===3?.026:.014;a.x+=(home.x-a.x)*k;a.y+=(home.y-a.y)*k});
  }
  areas.forEach(a=>{a.x=Math.round(a.x*10)/10;a.y=Math.round(a.y*10)/10;a.mapZ=Math.round((a.mapZ||0)*10)/10});
  s.settings=s.settings||{};s.settings.mapLayoutVersion=11;return s;
}
const mapCameras={};
function mapCamera(scope){const key=`${state.settings.activeProfile||'me'}:${scope||'home'}`;if(!mapCameras[key])mapCameras[key]={cx:600,cy:340,zoom:1,needsFit:true};return mapCameras[key]}
function mapViewportAspect(){const svg=document.getElementById('network');if(svg){const r=svg.getBoundingClientRect();if(r.width>20&&r.height>20)return Math.max(.72,Math.min(2.5,r.width/r.height))}return 1200/680}
function mapView(scope){const c=mapCamera(scope),z=Math.max(.15,Math.min(6,c.zoom||1));c.zoom=z;const aspect=mapViewportAspect(),h=680/z,w=h*aspect;return{x:c.cx-w/2,y:c.cy-h/2,w,h,z}}
function applyMapView(svg,scope){const v=mapView(scope);svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');const zv=document.getElementById('zoomValue');if(zv)zv.textContent=`${Math.round(v.z*100)}%`}
function setFitCamera(scope,nodes){const c=mapCamera(scope);if(!nodes?.length){c.cx=600;c.cy=340;c.zoom=1;c.needsFit=false;return}let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;nodes.forEach(n=>{const r=visualRadius(n)+38;minX=Math.min(minX,n.x-r);maxX=Math.max(maxX,n.x+r);minY=Math.min(minY,n.y-r);maxY=Math.max(maxY,n.y+r)});const bw=Math.max(360,maxX-minX),bh=Math.max(300,maxY-minY),aspect=mapViewportAspect(),baseH=680,baseW=baseH*aspect;c.cx=(minX+maxX)/2;c.cy=(minY+maxY)/2;c.zoom=Math.max(.26,Math.min(1.75,Math.min(baseW/(bw+76),baseH/(bh+72))));c.needsFit=false}
function fitMap(scope){const svg=document.getElementById('network');const gd=graphData(scope);setFitCamera(scope,gd.nodes);if(svg)applyMapView(svg,scope)}
function zoomMap(scope,factor,clientX=null,clientY=null){const svg=document.getElementById('network');if(!svg)return;const c=mapCamera(scope),old=mapView(scope),nextZoom=Math.max(.15,Math.min(6,old.z*factor));if(Math.abs(nextZoom-old.z)<.001)return;const rect=svg.getBoundingClientRect();let px=.5,py=.5;if(clientX!==null&&clientY!==null&&rect.width&&rect.height){px=(clientX-rect.left)/rect.width;py=(clientY-rect.top)/rect.height}const anchorX=old.x+px*old.w,anchorY=old.y+py*old.h,newH=680/nextZoom,newW=newH*mapViewportAspect();c.zoom=nextZoom;c.cx=anchorX+(0.5-px)*newW;c.cy=anchorY+(0.5-py)*newH;c.needsFit=false;applyMapView(svg,scope)}
function resetMapView(scope){fitMap(scope)}
function clientToSvg(svg,clientX,clientY){const p=svg.createSVGPoint();p.x=clientX;p.y=clientY;const ctm=svg.getScreenCTM();return ctm?p.matrixTransform(ctm.inverse()):{x:clientX,y:clientY}}
function seeded(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>((h=Math.imul(h^(h>>>13),1274126177))>>>0)/4294967296}
function svgEl(tag,attrs={}){const el=document.createElementNS(SVG_NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
function straightPath(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const ar=visualRadius(a)+1.5,br=visualRadius(b)+1.5;const x1=a.x+(dx/d)*ar,y1=a.y+(dy/d)*ar,x2=b.x-(dx/d)*br,y2=b.y-(dy/d)*br;return `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`}
function drawNetwork(scope){const svg=document.getElementById('network');if(!svg)return;svg.dataset.scope=scope||'';svg.style.setProperty('--map-label-opacity',String(state.settings.mapLabelOpacity??.78));svg.style.setProperty('--map-edge-opacity',String(state.settings.mapEdgeOpacity??.38));svg.style.setProperty('--map-cross-opacity',String((state.settings.mapEdgeOpacity??.38)*.62));svg.innerHTML='';const{nodes,links}=graphData(scope);const cam=mapCamera(scope);if(cam.needsFit)setFitCamera(scope,nodes);applyMapView(svg,scope);const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
  links.slice().sort((l1,l2)=>{const z1=((byId[l1.source]?.z||0)+(byId[l1.target]?.z||0))/2,z2=((byId[l2.source]?.z||0)+(byId[l2.target]?.z||0))/2;return z1-z2}).forEach(l=>{const a=byId[l.source],b=byId[l.target];if(!a||!b)return;const path=svgEl('path',{d:straightPath(a,b),class:`edge ${l.type==='cross'?'cross':'tree'}`,'data-source':l.source,'data-target':l.target});if(l.type==='cross')path.style.stroke=a.hue||domainHueFor(a);svg.appendChild(path)});
  const parents=new Set(links.filter(l=>l.type!=='cross').map(l=>l.source));nodes.slice().sort((a,b)=>(a.z||0)-(b.z||0)).forEach(n=>{const r=visualRadius(n),zNorm=Math.max(-1,Math.min(1,(n.z||0)/280));const g=svgEl('g',{class:`node level${n.level} ${n.id===scope?'active':''} ${n.note?'note':''} ${parents.has(n.id)?'has-children':''} ${zNorm<-.18?'is-back':zNorm>.18?'is-front':''}`});g.dataset.node=n.id;const disc=svgEl('circle',{cx:n.x,cy:n.y,r:r.toFixed(2),class:'node-disc'});g.appendChild(disc);const title=svgEl('title');title.textContent=n.name;g.appendChild(title);const gap=({2:18,3:16,4:14,5:11}[n.level]||14);const tx=svgEl('text',{x:n.x.toFixed(2),y:(n.y+r+gap).toFixed(2),class:'label','dominant-baseline':'hanging'});tx.textContent=n.code||makeNodeCode(n.name);g.appendChild(tx);svg.appendChild(g)});
  const inspect=document.getElementById('mapInspect');
  const focusNode=(id)=>{const connected=new Set([id]);svg.querySelectorAll('.edge').forEach(e=>{if(e.dataset.source===id)connected.add(e.dataset.target);if(e.dataset.target===id)connected.add(e.dataset.source)});svg.classList.add('has-focus');svg.querySelectorAll('.node').forEach(el=>el.classList.toggle('focus-near',connected.has(el.dataset.node)));svg.querySelectorAll('.edge').forEach(el=>el.classList.toggle('focus-near',el.dataset.source===id||el.dataset.target===id));const n=byId[id];if(inspect&&n)inspect.textContent=`${n.code||makeNodeCode(n.name)} / ${String(n.name||'').toUpperCase()}`};
  const clearFocus=()=>{svg.classList.remove('has-focus');svg.querySelectorAll('.focus-near').forEach(el=>el.classList.remove('focus-near'));if(inspect)inspect.textContent=''};
  svg.querySelectorAll('.node').forEach(el=>{el.addEventListener('pointerenter',()=>focusNode(el.dataset.node));el.addEventListener('pointerleave',clearFocus)});
  bindNetwork(scope);const dr=document.getElementById('depthRange');if(dr){dr.oninput=e=>{state.settings.mapDepth=Number(e.target.value);document.getElementById('depthValue').textContent=e.target.value;drawNetwork(scope);save()}}const lr=document.getElementById('labelOpacityRange');if(lr){lr.oninput=e=>{state.settings.mapLabelOpacity=Number(e.target.value)/100;document.getElementById('labelOpacityValue').textContent=e.target.value;const net=document.getElementById('network');if(net)net.style.setProperty('--map-label-opacity',String(state.settings.mapLabelOpacity));save()}}const er=document.getElementById('edgeOpacityRange');if(er){er.oninput=e=>{state.settings.mapEdgeOpacity=Number(e.target.value)/100;document.getElementById('edgeOpacityValue').textContent=e.target.value;const net=document.getElementById('network');if(net){net.style.setProperty('--map-edge-opacity',String(state.settings.mapEdgeOpacity));net.style.setProperty('--map-cross-opacity',String(state.settings.mapEdgeOpacity*.62))}save()}}document.querySelectorAll('[data-map-zoom]').forEach(b=>{b.onclick=()=>{const a=b.dataset.mapZoom;if(a==='in')zoomMap(scope,1.2);else if(a==='out')zoomMap(scope,1/1.2);else resetMapView(scope)}});document.querySelectorAll('[data-map-layout]').forEach(b=>{b.onclick=()=>{const profileId=mapLayoutProfile(),working={areas:state.areas.map(a=>({...a})),settings:{}};organiseSphericalLayout(working,profileId);setMapDraftFromAreas(working.areas,profileId);const gd=graphData(scope);setFitCamera(scope,gd.nodes);drawNetwork(scope);toast('Constellation reformed · Anchor to save')}});document.querySelectorAll('[data-map-anchor]').forEach(b=>{b.onclick=anchorMapLayout})}

function shortLabel(s,l){const lim={1:20,2:18,3:20,4:20,5:16}[l]||18;const v=String(s||'');return v.length>lim?v.slice(0,lim-1)+'…':v}
function bindNetwork(scope){
  const svg=document.getElementById('network');if(!svg||svg.dataset.bound==='yes')return;svg.dataset.bound='yes';
  svg.addEventListener('pointerdown',e=>{
    const g=e.target.closest?.('.node');
    if(!g){const cam=mapCamera(svg.dataset.scope||null);dragging={kind:'pan',startX:e.clientX,startY:e.clientY,origCx:cam.cx,origCy:cam.cy,moved:false,pointerId:e.pointerId};svg.classList.add('is-panning');svg.setPointerCapture(e.pointerId);return}
    const id=g.dataset.node;if(id.startsWith('n')){dragging={kind:'node',id,startX:e.clientX,startY:e.clientY,moved:false,pointerId:e.pointerId};svg.setPointerCapture(e.pointerId);return}
    const a=areaById(id);if(!a)return;const p=clientToSvg(svg,e.clientX,e.clientY),positions=Object.fromEntries(graphData(svg.dataset.scope||null).nodes.map(n=>[n.id,n]));
    const direct=profileAreas().filter(x=>x.parentId===id&&areaAllows(x));const group=[a,...direct];const origins=Object.fromEntries(group.map(x=>[x.id,{x:positions[x.id]?.x??x.x,y:positions[x.id]?.y??x.y,mapZ:positions[x.id]?.mapZ??x.mapZ}]));
    dragging={kind:'node-group',id,startX:e.clientX,startY:e.clientY,startSvgX:p.x,startSvgY:p.y,origins,moved:false,pointerId:e.pointerId};svg.setPointerCapture(e.pointerId)
  });
  svg.addEventListener('pointermove',e=>{
    if(!dragging)return;
    if(dragging.kind==='pan'){const cam=mapCamera(svg.dataset.scope||null),v=mapView(svg.dataset.scope||null),rect=svg.getBoundingClientRect();const dx=(e.clientX-dragging.startX)*v.w/rect.width,dy=(e.clientY-dragging.startY)*v.h/rect.height;if(Math.abs(dx)+Math.abs(dy)>2)dragging.moved=true;cam.cx=dragging.origCx-dx;cam.cy=dragging.origCy-dy;applyMapView(svg,svg.dataset.scope||null);return}
    if(dragging.id.startsWith('n'))return;
    const p=clientToSvg(svg,e.clientX,e.clientY),dx=p.x-dragging.startSvgX,dy=p.y-dragging.startSvgY;if(Math.abs(e.clientX-dragging.startX)+Math.abs(e.clientY-dragging.startY)>3)dragging.moved=true;
    Object.entries(dragging.origins||{}).forEach(([id,o])=>updateMapDraft(id,{x:o.x+dx,y:o.y+dy,mapZ:o.mapZ}));mapCamera(svg.dataset.scope||null).needsFit=false;drawNetwork(svg.dataset.scope||null)
  });
  svg.addEventListener('pointerup',e=>{if(!dragging)return;const d=dragging;try{svg.releasePointerCapture(d.pointerId)}catch(_){ }dragging=null;svg.classList.remove('is-panning');if(d.kind==='pan')return;const moved=d.moved,id=d.id;if(moved){toast('Layout changed · Anchor to save');return}if(id.startsWith('n'))return;const a=areaById(id);if(a&&areaAllows(a)){state.settings.activeTab=getTopDomain(a)?.id||a.id;state.settings.selectedArea=a.id;state.settings.subtab='overview';renderTabs();if(a.level>=3)renderArea(a.id);else renderAll();save()}});
  svg.addEventListener('pointercancel',()=>{dragging=null;svg.classList.remove('is-panning')});
  svg.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();zoomMap(svg.dataset.scope||null,e.deltaY<0?1.12:1/1.12,e.clientX,e.clientY)},{passive:false})
}
function getTopDomain(a){let cur=a;while(cur&&cur.level>2)cur=areaById(cur.parentId);return cur}
