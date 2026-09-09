const http=require('http');
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png'};
function safePath(urlPath){const clean=decodeURIComponent(String(urlPath||'/').split('?')[0]);const rel=clean==='/'?'index.html':clean.replace(/^\/+/, '');const full=path.resolve(root,rel);return full.startsWith(root+path.sep)||full===path.join(root,'index.html')?full:null}
const server=http.createServer((req,res)=>{let full=safePath(req.url);if(!full){res.writeHead(403);res.end();return}try{if(fs.statSync(full).isDirectory())full=path.join(full,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(full))}catch(_){res.writeHead(404);res.end()}});

async function ready(page,url){
  await page.route('**/*',route=>{const target=new URL(route.request().url());if(target.hostname==='127.0.0.1'||target.hostname==='localhost')route.continue();else route.abort()});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:12000});
  await page.waitForFunction(()=>document.documentElement.classList.contains('atlas-ready'),null,{timeout:12000});
  await page.evaluate(()=>{const lock=document.getElementById('lockScreen');if(lock)lock.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');const auth=document.querySelector('.auth-overlay');if(auth)auth.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important')});
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  try{
    const normal=await browser.newPage({viewport:{width:1400,height:900}});
    await ready(normal,base+'/');
    const scroll=await normal.evaluate(()=>{
      state.settings.activeProfile='me';
      state.calendar=(state.calendar||[]).filter(e=>!String(e.id||'').startsWith('scroll-test-'));
      const baseDate=new Date();
      for(let i=0;i<10;i++){const d=new Date(baseDate.getFullYear(),baseDate.getMonth(),baseDate.getDate()+i);state.calendar.push({id:'scroll-test-'+i,profile:'me',space:'personal',title:'Scroll event '+i,person:'fraser',date:d.toLocaleDateString('en-CA'),startTime:'09:00',endTime:'',timeZone:'Australia/Melbourne',arrivalTimeZone:'',color:'blue',entryType:'event',traveler:'',origin:'',destination:'',flightNumber:'',areaId:'',notes:'',createdAt:Date.now()+i,updatedAt:Date.now()+i})}
      document.getElementById('app').innerHTML=upcomingWidget();
      const list=document.querySelector('.normal-upcoming-list');
      const rows=[...list.querySelectorAll('.widget-row')];
      return {rows:rows.length,clientHeight:list.clientHeight,scrollHeight:list.scrollHeight,rowHeight:rows[0]?rows[0].getBoundingClientRect().height:0,overflow:getComputedStyle(list).overflowY};
    });
    if(scroll.rows<10)throw new Error('Normal Upcoming did not retain full 30-day rows.');
    if(!['auto','scroll'].includes(scroll.overflow))throw new Error('Normal Upcoming is not scrollable.');
    if(!(scroll.scrollHeight>scroll.clientHeight))throw new Error('Normal Upcoming did not overflow internally.');
    if(scroll.rowHeight&&scroll.clientHeight>scroll.rowHeight*4+8)throw new Error('Normal Upcoming visible region exceeds roughly four rows.');
    await normal.close();

    const house=await browser.newPage({viewport:{width:1400,height:900}});
    await ready(house,base+'/?view=house');
    await house.waitForSelector('#atlasHouseBoard');
    await house.evaluate(()=>{
      state.quickTodos=(state.quickTodos||[]).filter(t=>t.id!=='house-button-existing');
      state.notes=(state.notes||[]).filter(n=>n.id!=='house-button-list');
      state.notes.unshift({id:'house-button-list',profile:'us',space:'personal',areaId:'',topicId:'',type:'list',title:'Button test',body:'',tags:['List'],createdAt:Date.now(),updatedAt:Date.now(),showOnMap:false,listItems:[]});
      state.settings.listWidgetSelection=state.settings.listWidgetSelection||{};state.settings.listWidgetSelection.us='house-button-list';
      AtlasHouse.render();
    });

    await house.fill('#atlasHouseBoard #widgetTodoInput','button todo works');
    await house.click('#atlasHouseBoard [data-widget-action="add-todo"]');
    await house.waitForFunction(()=>state.quickTodos.some(t=>t.profile==='us'&&t.text==='button todo works'),null,{timeout:3000});
    await house.waitForFunction(()=>{const input=document.querySelector('#atlasHouseBoard #widgetTodoInput');return input&&input.value===''},null,{timeout:3000});

    await house.fill('#atlasHouseBoard [data-list-item-input]','button list works');
    await house.click('#atlasHouseBoard [data-list-action="add-item"]');
    await house.waitForFunction(()=>{const n=(state.notes||[]).find(note=>note.id==='house-button-list');return !!n?.listItems?.some(item=>item.text==='button list works')},null,{timeout:3000});
    await house.waitForFunction(()=>{const input=document.querySelector('#atlasHouseBoard [data-list-item-input]');return input&&input.value===''},null,{timeout:3000});
    await house.close();

    console.log('Upcoming scroll + House Add button browser regression: PASS');
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error&&error.stack||error);try{server.close()}catch(_){}process.exit(1)});
