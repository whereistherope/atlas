// Persistent state, schema migrations and backups. Storage identifiers are compatibility contracts.
const APP_VERSION='0.12.4'; const DATA_VERSION=8; const DB_NAME='atlas_personal_os'; const DB_VERSION=3; const DB_STORE='state'; const BACKUP_STORE='backups'; const AUTH_STORE='auth'; const AUTH_KEY='atlas-lock'; const AUTH_FALLBACK_KEY='atlas_lock_config_v1'; const DB_KEY='atlas-v1'; const FALLBACK_KEY='atlas_v1_fallback'; const SVG_NS='http://www.w3.org/2000/svg';
const now=()=>Date.now(); const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'item';
const fmtDate=t=>new Intl.DateTimeFormat('en-AU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(t));
const fmtTime=t=>new Intl.DateTimeFormat('en-AU',{hour:'2-digit',minute:'2-digit'}).format(new Date(t));
const todayKey=()=>new Date().toLocaleDateString('en-CA');

const demo={
  version:DATA_VERSION,
  meta:{createdAt:now(),lastSavedAt:now(),lastAppVersion:APP_VERSION},
  settings:{activeTab:'home',subtab:'overview',spaceFilter:'all',activeProfile:'me',mapDepth:4,mapLabelOpacity:.72,mapEdgeOpacity:.32,mapViewMode:'nodes',predictionSeed:1,selectedArea:'',editorTab:'structure',mapLayoutVersion:10,theme:'day',calendarCursor:'',widgetLayout:{},widgetFloat:{}},
  profiles:[{id:'me',name:'Me',kind:'person'},{id:'alyssa',name:'Alyssa',kind:'person'},{id:'us',name:'Us',kind:'shared'}],
  areas:[
    {id:'work',name:'Work',code:'WRK',space:'work',level:2,parentId:'atlas',description:'Professional operating picture, development and delivery.',x:600,y:90,status:'active'},
    {id:'lifestyle',name:'Lifestyle',code:'LIFE',space:'personal',level:2,parentId:'atlas',description:'Cars, technology, reading, style, finance and home.',x:165,y:330,status:'active'},
    {id:'creative',name:'Creative',code:'CRTV',space:'personal',level:2,parentId:'atlas',description:'Ideas, writing and long-form creative projects.',x:1035,y:330,status:'active'},
    {id:'daily',name:'Daily',code:'DAIL',space:'personal',level:2,parentId:'atlas',description:'Daily capture, context and open loops.',x:600,y:595,status:'active'},
    {id:'ground-ops',name:'Ground Operations',code:'GOPS',space:'work',level:3,parentId:'work',description:'Ground operations oversight, guidance, surveillance and industry interfaces.',x:425,y:190,status:'active'},
    {id:'career',name:'Career',code:'CARE',space:'work',level:3,parentId:'work',description:'Progression, development and professional positioning.',x:775,y:190,status:'default'},
    {id:'cars',name:'Cars',code:'AUTO',space:'personal',level:3,parentId:'lifestyle',description:'Current car, future purchase research and automotive ideas.',x:105,y:470,status:'active'},
    {id:'technology',name:'Technology',code:'TECH',space:'personal',level:3,parentId:'lifestyle',description:'Devices, home server and software projects.',x:255,y:535,status:'default'},
    {id:'reading',name:'Reading',code:'READ',space:'personal',level:3,parentId:'lifestyle',description:'Books, reading list and notes.',x:350,y:405,status:'default'},
    {id:'home-life',name:'Home',code:'HOME',space:'personal',level:3,parentId:'lifestyle',description:'The house: maintenance, improvements, utilities, plans and shared household life.',x:250,y:265,status:'active'},
    {id:'quantum-story',name:'Quantum Story',code:'QNTM',space:'personal',level:3,parentId:'creative',description:'Causality, quantum computation and the novella project.',x:1090,y:470,status:'active'},
    {id:'ideas',name:'Ideas',code:'IDEA',space:'personal',level:3,parentId:'creative',description:'Loose concepts worth keeping alive.',x:920,y:520,status:'default'},
    {id:'rcp2635',name:'RCP 2635',code:'RCP26',space:'work',level:4,parentId:'ground-ops',description:'Ground handling guidance and operational-interface work.',x:220,y:285,status:'active'},
    {id:'surveillance',name:'Surveillance',code:'SURV',space:'work',level:4,parentId:'ground-ops',description:'Ground operations surveillance framework and evidence.',x:390,y:335,status:'active'},
    {id:'airports',name:'Airports',code:'APT',space:'work',level:4,parentId:'ground-ops',description:'Airport engagement and shared operational boundaries.',x:550,y:270,status:'default'},
    {id:'ghsp',name:'GHSPs',code:'GHSP',space:'work',level:4,parentId:'ground-ops',description:'Ground handling service provider ecosystem.',x:315,y:435,status:'default'},
    {id:'reg-framework',name:'Regulatory Frameworks',code:'REG',space:'work',level:4,parentId:'ground-ops',description:'CASA, ICAO and related ground operations frameworks.',x:535,y:425,status:'default'},
    {id:'x5',name:'BMW X5',code:'BMWX5',space:'personal',level:4,parentId:'cars',description:'Current benchmark for a future SUV purchase.',x:55,y:610,status:'default'},
    {id:'xtrail',name:'X-Trail T30',code:'XT30',space:'personal',level:4,parentId:'cars',description:'Current vehicle and maintenance/project notes.',x:185,y:615,status:'default'},
    {id:'decoherence',name:'Decoherence',code:'DECO',space:'personal',level:4,parentId:'quantum-story',description:'Narrative mechanism for environmental suppression of causal superposition.',x:1160,y:605,status:'active'}
  ],
  links:[
    {id:'lnk1',source:'rcp2635',target:'reg-framework',type:'cross'},{id:'lnk2',source:'rcp2635',target:'airports',type:'cross'},{id:'lnk3',source:'surveillance',target:'airports',type:'cross'},{id:'lnk4',source:'rcp2635',target:'ghsp',type:'cross'},
    {id:'lnk5',source:'x5',target:'career',type:'cross'}
  ],
  projects:[
    {id:'p-rcp',space:'work',areaId:'ground-ops',topicId:'rcp2635',code:'GO-P01',title:'RCP 2635 · Ground Handling Guidance',status:'ACTIVE',objective:'Build a coherent picture of ground handling roles, interfaces and assurance mechanisms to support practical guidance development.',next:'Consolidate airport and GHSP interface findings into the guidance architecture.',tags:['RCP2635','Guidance','GHSP','Airports'],createdAt:now()-86400000*20,milestones:[
      {id:'m1',title:'Regulatory landscape reviewed',done:true},{id:'m2',title:'Initial airport engagement',done:true},{id:'m3',title:'GHSP / airline engagement',done:false,current:true},{id:'m4',title:'Draft guidance architecture',done:false},{id:'m5',title:'Internal review',done:false},{id:'m6',title:'Industry validation',done:false}
    ],tasks:[{id:'t1',title:'Map GHSP operating models',done:true},{id:'t2',title:'Capture airport interface themes',done:true},{id:'t3',title:'Consolidate international approaches',done:false},{id:'t4',title:'Draft guidance structure',done:false}]},
    {id:'p-surv',space:'work',areaId:'ground-ops',topicId:'surveillance',code:'GO-P02',title:'Ground Operations Surveillance Model',status:'ACTIVE',objective:'Create a repeatable surveillance model focused on operational interfaces, procedures, assurance and evidence.',next:'Refine evidence expectations and trial question structure.',tags:['Surveillance','Evidence'],createdAt:now()-86400000*14,milestones:[{id:'sm1',title:'Training transition',done:true},{id:'sm2',title:'Draft surveillance themes',done:true},{id:'sm3',title:'Trial question set',done:false,current:true},{id:'sm4',title:'Reusable surveillance pack',done:false}],tasks:[{id:'st1',title:'Catalogue evidence approach',done:true},{id:'st2',title:'Refine finding prompts',done:false}]},
    {id:'p-quantum',space:'personal',areaId:'creative',topicId:'quantum-story',code:'CRT-P01',title:'Quantum Causality Novella',status:'ACTIVE',objective:'Develop the quantum-causality story into a coherent novella with a grounded scientific metaphor and slow-burn conspiracy structure.',next:'Lock the opening act and causal discovery sequence.',tags:['Writing','Quantum','Story'],createdAt:now()-86400000*25,milestones:[{id:'qm1',title:'Core causality model',done:true},{id:'qm2',title:'Agency / Cold War premise',done:true},{id:'qm3',title:'Opening act architecture',done:false,current:true},{id:'qm4',title:'First complete draft',done:false}],tasks:[{id:'qt1',title:'Resolve protagonist name',done:false},{id:'qt2',title:'Draft revised Chapter 1',done:false}]},
    {id:'p-car',space:'personal',areaId:'lifestyle',topicId:'cars',code:'LIFE-P01',title:'Future SUV Purchase',status:'WATCHING',objective:'Narrow a future SUV purchase around luxury, estate-utility feel and realistic ownership cost.',next:'Compare G05 X5 against Discovery 5 and Patrol alternatives.',tags:['Cars','Finance','SUV'],createdAt:now()-86400000*10,milestones:[{id:'cm1',title:'Define use-case and feel',done:true},{id:'cm2',title:'Build shortlist',done:true},{id:'cm3',title:'Finance / lease comparison',done:false,current:true},{id:'cm4',title:'Purchase decision',done:false}],tasks:[{id:'ct1',title:'Track suitable G05 X5 listings',done:false}]}
  ],
  notes:[
    {id:'n1',space:'work',areaId:'ground-ops',topicId:'rcp2635',type:'meeting',title:'Airport engagement theme',body:'Focus discussion on operational boundaries, shared turnaround risks and how airports assure interfaces with airlines and GHSPs.',tags:['Airports','Interfaces'],createdAt:now()-3600000*6,showOnMap:false},
    {id:'n2',space:'work',areaId:'ground-ops',topicId:'surveillance',type:'training',title:'Finding due input',body:'When adding a new finding, the finding due input is completed by an STO; inspector does not need to fill it.',tags:['EAP','Finding'],createdAt:now()-3600000*28,showOnMap:false},
    {id:'n3',space:'personal',areaId:'creative',topicId:'decoherence',type:'idea',title:'Decoherence as social normalisation',body:'Treat consciousness as part of the environment: most people become part of the mechanism that suppresses awareness of causal superposition rather than noticing it directly.',tags:['Decoherence','Causality'],createdAt:now()-3600000*18,showOnMap:true},
    {id:'n4',space:'personal',areaId:'lifestyle',topicId:'cars',type:'reference',title:'G05 X5 benchmark',body:'2019 X5 xDrive30d M Sport remains the benchmark for luxury SUV feel and proportions.',tags:['BMW','X5'],createdAt:now()-3600000*34,showOnMap:false}
  ],
  daily:[
    {id:'d1',date:todayKey(),createdAt:now()-3600000*1.5,text:'Atlas concept expanded from the Ground Ops Control Board into a full second-brain operating system.',areaId:'ideas'},
    {id:'d2',date:todayKey(),createdAt:now()-3600000*.5,text:'Keep the network as the hero and let projects / notes / milestones sit behind each area.',areaId:'ideas'}
  ],
  calendar:[],
  quickTodos:[],
  scratch:{me:'',alyssa:'',us:''},
  activity:[{id:'a1',time:now()-3600000*2,text:'Atlas initialised from the Ground Operations Control Board concept.'}],
  relayReceipts:[],
  relayLedger:{}
};

let state=clone(demo); let activeProjectId=''; let db=null; let dragging=null;

function migrateLegacy(raw){
  if(!raw||!Array.isArray(raw.workstreams))return raw;
  const s=clone(demo);
  s.projects=s.projects.filter(p=>p.space!=='work');
  s.projects.push(...raw.workstreams.map((w,i)=>({id:w.id||uid('p'),space:'work',areaId:'ground-ops',topicId:String(w.id||'').includes('rcp')?'rcp2635':String(w.id||'').includes('surv')?'surveillance':String(w.id||'').includes('airport')?'airports':'',code:w.code||`GO-P${String(i+1).padStart(2,'0')}`,title:w.title||'Ground Ops Project',status:w.status||'ACTIVE',objective:w.objective||w.description||'',next:w.next||'',tags:Array.isArray(w.tags)?w.tags:[],createdAt:now(),milestones:(w.tasks||[]).map((t,mi)=>({id:uid('m'),title:Array.isArray(t)?t[0]:t.title||'Milestone',done:Array.isArray(t)?!!t[1]:!!t.done,current:false})),tasks:[]})));
  if(Array.isArray(raw.notes))s.notes.push(...raw.notes.map(n=>({id:n.id||uid('n'),space:'work',areaId:'ground-ops',topicId:'',type:n.category||'note',title:String(n.text||'Ground Ops note').slice(0,70),body:n.text||'',tags:[n.tag].filter(Boolean),createdAt:n.time||now(),showOnMap:false})));
  s.activity.unshift({id:uid('a'),time:now(),text:'Legacy Ground Operations Control Board migrated into Atlas.'});
  return s;
}
function applyWideMapLayout(s){
  const W=1200,H=680;
  const anchors={
    work:[600,90],lifestyle:[165,330],creative:[1035,330],daily:[600,595],
    'ground-ops':[425,190],career:[775,190],cars:[105,470],technology:[255,535],reading:[350,405],
    'quantum-story':[1090,470],ideas:[920,520],rcp2635:[220,285],surveillance:[390,335],airports:[550,270],
    ghsp:[315,435],'reg-framework':[535,425],x5:[55,610],xtrail:[185,615],decoherence:[1160,605]
  };
  (s.areas||[]).forEach(a=>{
    if(anchors[a.id]){[a.x,a.y]=anchors[a.id];return}
    const ox=Number.isFinite(Number(a.x))?Number(a.x):450, oy=Number.isFinite(Number(a.y))?Number(a.y):260;
    a.x=Math.max(55,Math.min(W-55,70+(ox/900)*(W-140)));
    a.y=Math.max(55,Math.min(H-55,55+(oy/520)*(H-110)));
  });
  s.settings=s.settings||{};s.settings.mapLayoutVersion=3;
  return s;
}
function organiseHierarchyLayout(s){
  const cx=600,cy=340;
  const areas=(s.areas||[]);
  const byId=Object.fromEntries(areas.map(a=>[a.id,a]));
  const kids={};
  areas.forEach(a=>{const p=a.parentId||'atlas';(kids[p]||(kids[p]=[])).push(a)});
  const preferred=['work','lifestyle','creative','daily'];
  const sortNodes=list=>list.sort((a,b)=>{
    const ai=preferred.indexOf(a.id),bi=preferred.indexOf(b.id);
    if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;return ai-bi}
    return String(a.name||a.id).localeCompare(String(b.name||b.id));
  });
  Object.values(kids).forEach(sortNodes);
  const roots=kids.atlas||[];
  if(!roots.length){s.settings=s.settings||{};s.settings.mapLayoutVersion=7;return s}

  // Compact radial-tree seed. Each domain owns an outward sector, but descendants
  // fan around their parent rather than lining up on a grid.
  const rootAngles={work:-Math.PI/2,lifestyle:Math.PI,creative:0,daily:Math.PI/2};
  const extra=roots.filter(r=>rootAngles[r.id]===undefined);
  extra.forEach((r,i)=>rootAngles[r.id]=-Math.PI/2+(i+1)*(Math.PI*2/(extra.length+1)));
  const rootDist=215;
  const levelDist={3:145,4:108,5:76};
  const inheritedRoot={};
  const ideal={};
  const subtreeCount=id=>1+(kids[id]||[]).reduce((n,c)=>n+subtreeCount(c.id),0);

  roots.forEach(root=>{
    const a=rootAngles[root.id]??0;
    root.x=cx+Math.cos(a)*rootDist;root.y=cy+Math.sin(a)*rootDist;
    ideal[root.id]={x:root.x,y:root.y};inheritedRoot[root.id]=root.id;
  });

  const placeChildren=(parent,heading,fan)=>{
    const children=kids[parent.id]||[];
    if(!children.length)return;
    const n=children.length;
    const childLevel=Number(children[0]?.level||4);
    const maxR=Math.max(...children.map(c=>radius(Number(c.level||4))));
    const base=levelDist[childLevel]||96;
    // Work out how much arc we need to keep siblings clear, but cap the fan so
    // branches remain visually bundled. If needed, radius grows modestly instead.
    const maxFan=Number(parent.level)<=2?Math.PI*.92:Number(parent.level)===3?Math.PI*.72:Math.PI*.58;
    let dist=base;
    let step=n>1?Math.min(maxFan/(n-1),Math.PI/3):0;
    if(n>1){
      const need=2*maxR+26;
      const minStep=Math.max(.12,Math.min(.72,2*Math.asin(Math.min(.94,need/(2*dist)))));
      if(step<minStep){step=minStep;dist=Math.max(dist,need/(2*Math.sin(step/2)))}
      const actualFan=Math.min(maxFan,step*(n-1));
      step=n>1?actualFan/(n-1):0;
      const required=need/(2*Math.sin(Math.max(.08,step/2)));
      dist=Math.max(dist,Math.min(required,base+82));
    }
    const weights=children.map(c=>Math.max(1,Math.sqrt(subtreeCount(c.id))));
    const totalW=weights.reduce((a,b)=>a+b,0);
    let acc=0;
    children.forEach((child,i)=>{
      const centred=n===1?0:((acc+weights[i]/2)/totalW-.5)*(step*(n-1));
      const angle=heading+centred;
      // small deterministic stagger prevents the graph feeling mechanically circular
      const stagger=((i%2)*2-1)*Math.min(10,Number(child.level)*2);
      const d=dist+stagger;
      child.x=parent.x+Math.cos(angle)*d;
      child.y=parent.y+Math.sin(angle)*d;
      ideal[child.id]={x:child.x,y:child.y};
      inheritedRoot[child.id]=inheritedRoot[parent.id]||parent.id;
      const nextFan=Math.max(Math.PI*.24,fan*.64);
      placeChildren(child,angle,nextFan);
      acc+=weights[i];
    });
  };
  roots.forEach(root=>placeChildren(root,rootAngles[root.id]??0,Math.PI*.9));

  // Orphans sit on a compact outer arc. They remain part of the open canvas.
  const reachable=new Set();
  const walk=id=>{(kids[id]||[]).forEach(n=>{reachable.add(n.id);walk(n.id)})};walk('atlas');
  areas.filter(a=>!reachable.has(a.id)).forEach((a,i)=>{
    const ang=-.25+i*.46,rr=420+Math.floor(i/9)*115;
    a.x=cx+rr*Math.cos(ang);a.y=cy+rr*Math.sin(ang);ideal[a.id]={x:a.x,y:a.y};
  });

  // Organic relaxation: tree links behave like springs, nodes repel only when they
  // are genuinely crowded, and a weak pull toward the radial seed preserves domains.
  const mobility=a=>({2:.20,3:.56,4:.84,5:1}[Number(a.level)]||.72);
  const targetLength=child=>({2:rootDist,3:145,4:108,5:76}[Number(child.level)]||100);
  const CLEAR=22;
  for(let iter=0;iter<420;iter++){
    const force=Object.fromEntries(areas.map(a=>[a.id,{x:0,y:0}]));
    // tree springs only; dotted cross-links never influence layout
    areas.forEach(child=>{
      const parent=child.parentId==='atlas'?{id:'atlas',x:cx,y:cy,level:1}:byId[child.parentId];
      if(!parent)return;
      let dx=child.x-parent.x,dy=child.y-parent.y,d=Math.hypot(dx,dy)||1;
      const want=targetLength(child),err=d-want,k=.030;
      const fx=(dx/d)*err*k,fy=(dy/d)*err*k;
      force[child.id].x-=fx;force[child.id].y-=fy;
      if(parent.id!=='atlas'&&force[parent.id]){force[parent.id].x+=fx*.45;force[parent.id].y+=fy*.45}
    });
    // collisions + a tiny comfort halo
    for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++){
      const a=areas[i],b=areas[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d<.001){const q=(i*53+j*97)*Math.PI/180;dx=Math.cos(q);dy=Math.sin(q);d=1}
      const min=radius(Number(a.level))+radius(Number(b.level))+CLEAR;
      const halo=min+24;
      if(d<halo){
        const nx=dx/d,ny=dy/d;
        const push=d<min?(min-d)*.18:(halo-d)*.018;
        force[a.id].x-=nx*push;force[a.id].y-=ny*push;
        force[b.id].x+=nx*push;force[b.id].y+=ny*push;
      }
    }
    areas.forEach(a=>{
      const f=force[a.id],home=ideal[a.id];
      if(home){f.x+=(home.x-a.x)*.012;f.y+=(home.y-a.y)*.012}
      const m=mobility(a);a.x+=f.x*m;a.y+=f.y*m;
    });
  }

  // Hard final collision guarantee. Resolve only actual circle intersections and
  // use the minimum displacement necessary, preventing the old grid-like drift.
  for(let iter=0;iter<500;iter++){
    let hit=false;
    for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++){
      const a=areas[i],b=areas[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      const min=radius(Number(a.level))+radius(Number(b.level))+18;
      if(d>=min-.2)continue;hit=true;
      if(d<.001){const q=(i*41+j*73)*Math.PI/180;dx=Math.cos(q);dy=Math.sin(q);d=1}
      const nx=dx/d,ny=dy/d,over=min-d+.5;
      const ma=mobility(a),mb=mobility(b),sum=ma+mb;
      a.x-=nx*over*(ma/sum);a.y-=ny*over*(ma/sum);
      b.x+=nx*over*(mb/sum);b.y+=ny*over*(mb/sum);
    }
    if(!hit)break;
  }

  areas.forEach(a=>{a.x=Math.round(a.x);a.y=Math.round(a.y)});
  s.settings=s.settings||{};s.settings.mapLayoutVersion=7;
  return s;
}
function makeNodeCode(name){
  const raw=String(name||'NODE').toUpperCase().replace(/&/g,' AND ').replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  const parts=raw.split(' ').filter(Boolean);
  if(!parts.length)return 'NODE';
  const joined=parts.join('');
  if(joined.length>=3&&joined.length<=5)return joined;
  if(parts.length===1)return (parts[0].slice(0,4)+(parts[0].length<3?'X':'')).slice(0,5);
  if(parts[0].length<=3&&/\d/.test(parts.slice(1).join('')))return (parts[0]+parts.slice(1).join('').replace(/[^0-9A-Z]/g,'')).slice(0,5);
  let code=parts.map(p=>p[0]).join('');
  if(code.length<3){code=(parts[0].slice(0,2)+parts[1].slice(0,2)+parts.slice(2).map(p=>p[0]).join('')).slice(0,5)}
  if(code.length<3)code=(joined+'XXX').slice(0,3);
  return code.slice(0,5);
}
function normaliseAreaCodes(s){(s.areas||[]).forEach(a=>{const c=String(a.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');a.code=(c.length>=3&&c.length<=5)?c:makeNodeCode(a.name)});return s}
function applyTheme(){const theme=state?.settings?.theme==='night'?'night':'day';document.body.dataset.theme=theme;const b=document.getElementById('themeBtn');if(b)b.textContent=theme==='night'?'Day':'Night'}
function profileStarterAreas(profileId,kind='person'){
  if(profileId==='alyssa')return[
    {id:'aly-life',profile:'alyssa',name:'Lifestyle',code:'LIFE',space:'personal',level:2,parentId:'atlas',description:'Alyssa’s personal life, interests and plans.',status:'active'},
    {id:'aly-home',profile:'alyssa',name:'Home',code:'HOME',space:'personal',level:3,parentId:'aly-life',description:'Household, home projects and domestic life from Alyssa’s perspective.',status:'active'},
    {id:'aly-creative',profile:'alyssa',name:'Creative',code:'CRTV',space:'personal',level:2,parentId:'atlas',description:'Ideas, interests and creative projects.',status:'default'},
    {id:'aly-daily',profile:'alyssa',name:'Daily',code:'DAIL',space:'personal',level:2,parentId:'atlas',description:'Daily capture and open loops.',status:'active'}
  ];
  if(profileId==='us')return[
    {id:'us-home',profile:'us',name:'Home',code:'HOME',space:'personal',level:2,parentId:'atlas',description:'The shared household: maintenance, improvements, utilities and the things you run together.',status:'active'},
    {id:'us-plans',profile:'us',name:'Plans',code:'PLAN',space:'personal',level:2,parentId:'atlas',description:'Shared plans, trips, purchases, projects and decisions.',status:'active'},
    {id:'us-daily',profile:'us',name:'Daily',code:'DAIL',space:'personal',level:2,parentId:'atlas',description:'Shared daily context and open loops.',status:'default'}
  ];
  return[];
}
function migrateData(s){
  const from=Number(s?.version||1);
  // Data migrations are additive and snapshot-backed: existing records remain intact.
  if(from<2){s.meta=s.meta||{};s.meta.migratedFrom=from}
  if(from<3){
    if(!Array.isArray(s.profiles))s.profiles=[{id:'me',name:'Me',kind:'person'},{id:'alyssa',name:'Alyssa',kind:'person'},{id:'us',name:'Us',kind:'shared'}];
    if(!Array.isArray(s.calendar))s.calendar=[];
    ['projects','notes','daily'].forEach(k=>(s[k]||[]).forEach(r=>{if(!r.profile)r.profile='me'}));
    const life=(s.areas||[]).find(a=>a.id==='lifestyle'||String(a.name).toLowerCase()==='lifestyle');
    const home=(s.areas||[]).find(a=>String(a.name).toLowerCase()==='home'&&a.parentId===life?.id);
    if(life&&!home){s.areas.push({id:'home-life',name:'Home',code:'HOME',space:'personal',level:3,parentId:life.id,description:'The house: maintenance, improvements, utilities, plans and shared household life.',x:Number(life.x||165)-75,y:Number(life.y||330)-155,status:'active'})}
  }
  if(from<4){
    if(!Array.isArray(s.profiles)||!s.profiles.length)s.profiles=[{id:'me',name:'Me',kind:'person'},{id:'alyssa',name:'Alyssa',kind:'person'},{id:'us',name:'Us',kind:'shared'}];
    (s.areas||[]).forEach(a=>{if(!a.profile)a.profile='me'});
    (s.links||[]).forEach(l=>{if(!l.profile)l.profile=(s.areas||[]).find(a=>a.id===l.source)?.profile||'me'});
    (s.activity||[]).forEach(a=>{if(!a.profile)a.profile='me'});
    ['projects','notes','daily','calendar'].forEach(k=>(s[k]||[]).forEach(r=>{if(!r.profile)r.profile='me'}));
    ['alyssa','us'].forEach(pid=>{if(!(s.areas||[]).some(a=>a.profile===pid))s.areas.push(...profileStarterAreas(pid,pid==='us'?'shared':'person'))});
    // Shared calendar copies must not point into another profile's private graph.
    (s.calendar||[]).filter(e=>e.profile==='us'&&e.sourceEventId).forEach(e=>{if(e.areaId){const sourceArea=(s.areas||[]).find(a=>a.id===e.areaId);e.sourceAreaLabel=sourceArea?.name||e.sourceAreaLabel||'';e.areaId=''}});
    s.settings=s.settings||{};s.settings.mapLayoutVersion=8;
  }
  if(from<5){
    if(!Array.isArray(s.quickTodos))s.quickTodos=[];
    if(!s.scratch||typeof s.scratch!=='object'||Array.isArray(s.scratch))s.scratch={};
    (s.profiles||[]).forEach(p=>{if(typeof s.scratch[p.id]!=='string')s.scratch[p.id]=''});
    s.settings=s.settings||{};if(typeof s.settings.sidePane!=='string')s.settings.sidePane='';
  }
  if(from<6){
    s.settings=s.settings||{};
    if(!s.settings.widgetLayout||typeof s.settings.widgetLayout!=='object')s.settings.widgetLayout={};
    if(!s.settings.widgetFloat||typeof s.settings.widgetFloat!=='object')s.settings.widgetFloat={};
    if(!['nodes','list','predict'].includes(s.settings.mapViewMode))s.settings.mapViewMode='nodes';if(!Number.isFinite(Number(s.settings.predictionSeed)))s.settings.predictionSeed=1;
    s.settings.sidePane='';
  }
  if(from<7){
    // Add receipt history without rewriting any existing content.
    if(!Array.isArray(s.relayReceipts))s.relayReceipts=[];
  }
  if(from<8){
    // Durable idempotency memory is separate from the bounded receipt UI history.
    // Version-7 receipts cannot reconstruct the original request fingerprint, so
    // retain their accepted identity conservatively and reject unverifiable reuse.
    if(!s.relayLedger||typeof s.relayLedger!=='object'||Array.isArray(s.relayLedger))s.relayLedger={};
    (s.relayReceipts||[]).filter(r=>r?.relayId&&r.status==='accepted').forEach(r=>{
      if(!s.relayLedger[r.relayId])s.relayLedger[r.relayId]={relayId:r.relayId,fingerprint:r.fingerprint||'',profileId:r.profileId||'',operation:r.operation||'',recordId:r.recordId||'',time:r.time||0};
    });
  }
  s.version=DATA_VERSION;
  return s;
}
function ensureState(s){
  s=migrateLegacy(s);
  if(!s||typeof s!=='object') s=clone(demo);
  s=migrateData(s);
  if(!s.meta)s.meta={};
  if(!s.meta.createdAt)s.meta.createdAt=now();
  if(!s.settings)s.settings=clone(demo.settings);
  for(const k of ['areas','links','projects','notes','daily','calendar','profiles','quickTodos','activity','relayReceipts']) if(!Array.isArray(s[k])) s[k]=[];
  if(!s.relayLedger||typeof s.relayLedger!=='object'||Array.isArray(s.relayLedger))s.relayLedger={};
  s.profiles.forEach(p=>{if(!s.areas.some(a=>(a.profile||'me')===p.id))s.areas.push(...profileStarterAreas(p.id,p.kind))});if(!s.scratch||typeof s.scratch!=='object'||Array.isArray(s.scratch))s.scratch={};s.profiles.forEach(p=>{if(typeof s.scratch[p.id]!=='string')s.scratch[p.id]=''});
  s.settings.activeTab=s.settings.activeTab||'home'; s.settings.subtab=s.settings.subtab||'overview'; s.settings.sidePane=typeof s.settings.sidePane==='string'?s.settings.sidePane:''; s.settings.toolPaneFloating=!!s.settings.toolPaneFloating; s.settings.toolPaneDock=['top','left','right','float'].includes(s.settings.toolPaneDock)?s.settings.toolPaneDock:(s.settings.toolPaneFloating?'float':'top'); s.settings.toolPaneFloating=s.settings.toolPaneDock==='float'; s.settings.toolPaneX=Number.isFinite(Number(s.settings.toolPaneX))?Number(s.settings.toolPaneX):0; s.settings.toolPaneY=Number.isFinite(Number(s.settings.toolPaneY))?Number(s.settings.toolPaneY):0; s.settings.spaceFilter=s.settings.spaceFilter||'all'; s.settings.activeProfile=s.settings.activeProfile||'me'; s.settings.calendarCursor=s.settings.calendarCursor||''; s.settings.mapDepth=Number(s.settings.mapDepth)||4; s.settings.mapLabelOpacity=Math.max(0,Math.min(1,Number.isFinite(Number(s.settings.mapLabelOpacity))?Number(s.settings.mapLabelOpacity):.72)); s.settings.mapEdgeOpacity=Math.max(0,Math.min(1,Number.isFinite(Number(s.settings.mapEdgeOpacity))?Number(s.settings.mapEdgeOpacity):.32)); s.settings.editorTab=s.settings.editorTab||'structure'; s.settings.theme=s.settings.theme==='night'?'night':'day'; s.settings.mapViewMode=['nodes','list','predict'].includes(s.settings.mapViewMode)?s.settings.mapViewMode:'nodes';s.settings.predictionSeed=Number.isFinite(Number(s.settings.predictionSeed))?Number(s.settings.predictionSeed):1; if(!s.settings.widgetLayout||typeof s.settings.widgetLayout!=='object')s.settings.widgetLayout={}; if(!s.settings.widgetFloat||typeof s.settings.widgetFloat!=='object')s.settings.widgetFloat={}; s.settings.sidePane='';
  if(Number(s.settings.mapLayoutVersion||0)<3) s=applyWideMapLayout(s);
  const needsSphere=Number(s.settings.mapLayoutVersion||0)<11||s.areas.some(a=>!Number.isFinite(Number(a.x))||!Number.isFinite(Number(a.y))||!Number.isFinite(Number(a.mapZ)));
  if(needsSphere){s.profiles.forEach(p=>organiseSphericalLayout(s,p.id));s.settings.mapLayoutVersion=11}
  s=normaliseAreaCodes(s);
  return s;
}
function openDB(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(DB_STORE))d.createObjectStore(DB_STORE);if(!d.objectStoreNames.contains(BACKUP_STORE))d.createObjectStore(BACKUP_STORE,{keyPath:'id'});if(!d.objectStoreNames.contains(AUTH_STORE))d.createObjectStore(AUTH_STORE)};req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(req.error)}catch(e){reject(e)}})}
function idbGet(){return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const r=tx.objectStore(DB_STORE).get(DB_KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function idbSet(v){return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(v,DB_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
function idbBackup(snapshot,reason='manual'){return new Promise((resolve,reject)=>{if(!db||!snapshot)return resolve();const tx=db.transaction(BACKUP_STORE,'readwrite');const store=tx.objectStore(BACKUP_STORE);const stamp=now();store.put({id:`${stamp}-${Math.random().toString(36).slice(2,7)}`,createdAt:stamp,reason,appVersion:APP_VERSION,dataVersion:Number(snapshot.version||1),data:clone(snapshot)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
function idbBackups(){return new Promise((resolve,reject)=>{if(!db)return resolve([]);const tx=db.transaction(BACKUP_STORE,'readonly');const r=tx.objectStore(BACKUP_STORE).getAll();r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>reject(r.error)})}
function authGet(){return new Promise((resolve)=>{if(!db){try{return resolve(JSON.parse(localStorage.getItem(AUTH_FALLBACK_KEY)||'null'))}catch(_){return resolve(null)}}try{const tx=db.transaction(AUTH_STORE,'readonly');const r=tx.objectStore(AUTH_STORE).get(AUTH_KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null)}catch(_){resolve(null)}})}
function authSet(v){return new Promise((resolve)=>{if(!db){try{localStorage.setItem(AUTH_FALLBACK_KEY,JSON.stringify(v))}catch(_){}return resolve()}try{const tx=db.transaction(AUTH_STORE,'readwrite');tx.objectStore(AUTH_STORE).put(v,AUTH_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve()}catch(_){resolve()}})}
