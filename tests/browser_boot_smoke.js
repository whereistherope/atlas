const http=require('http');
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg+xml':'image/svg+xml'};
const hardStop=setTimeout(()=>{console.error('Browser boot smoke exceeded 45 seconds.');process.exit(124)},45000);
let requestCount=0;

function safePath(urlPath){
  const clean=decodeURIComponent(String(urlPath||'/').split('?')[0]);
  const rel=clean==='/'?'index.html':clean.replace(/^\/+/, '');
  const full=path.resolve(root,rel);
  return full.startsWith(root+path.sep)||full===path.join(root,'index.html')?full:null;
}

const server=http.createServer((req,res)=>{
  requestCount+=1;
  const pathname=String(req.url||'/').split('?')[0];
  console.log('[HTTP '+requestCount+'] '+pathname);
  let full=safePath(req.url);
  if(!full){res.writeHead(403);res.end('Forbidden');return}
  try{
    if(fs.statSync(full).isDirectory())full=path.join(full,'index.html');
    const body=fs.readFileSync(full);
    res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(body);
  }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found')}
});

async function checkPage(browser,url,label,verify,contextOptions={}){
  const context=await browser.newContext(contextOptions);
  try{
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>{const text=String(error&&error.message||error);errors.push(text);console.error('['+label+' pageerror] '+text)});
    page.on('console',msg=>{if(msg.type()==='error'){errors.push(msg.text());console.error('['+label+' console] '+msg.text())}});
    await page.route('**/*',route=>{
      const target=new URL(route.request().url());
      if(target.hostname==='127.0.0.1'||target.hostname==='localhost')route.continue();else{console.log('['+label+' blocked] '+target.href);route.abort()}
    });
    console.log(label+': navigating');
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:12000});
    console.log(label+': DOMContentLoaded');
    await page.waitForFunction(()=>document.documentElement.classList.contains('atlas-ready'),null,{timeout:12000});
    console.log(label+': atlas-ready');
    await page.waitForFunction(()=>!document.getElementById('atlasSimpleLoader'),null,{timeout:3000});
    console.log(label+': loader removed');
    if(verify)await verify(page);
    const fatal=errors.filter(message=>!message.includes('ERR_FAILED')&&!message.includes('Failed to load resource'));
    if(fatal.length)throw new Error(label+' browser errors: '+fatal.join(' | '));
    console.log(label+': PASS');
  }finally{
    console.log(label+': closing context');
    await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,2000))]);
  }
}

async function verifyHouse(page){
  await page.waitForSelector('#atlasHouseBoard',{state:'attached',timeout:4000});
  const result=await page.evaluate(()=>{
    if(!document.body.classList.contains('atlas-house-view'))return {error:'House route did not activate.'};
    state.calendar=(state.calendar||[]).filter(event=>!String(event.id||'').startsWith('smoke-house-upcoming-'));
    state.notes=(state.notes||[]).filter(note=>note.id!=='smoke-house-list');
    state.notes.unshift({id:'smoke-house-list',profile:'us',space:'personal',areaId:'',topicId:'',type:'list',title:'Smoke list',body:'',tags:['List'],createdAt:Date.now(),updatedAt:Date.now(),showOnMap:false,listItems:[]});
    state.settings=state.settings||{};state.settings.listWidgetSelection=state.settings.listWidgetSelection||{};state.settings.listWidgetSelection.us='smoke-house-list';
    const base=new Date();
    for(let i=0;i<12;i++){
      const day=new Date(base.getFullYear(),base.getMonth(),base.getDate()+i);
      state.calendar.push({id:'smoke-house-upcoming-'+i,profile:'us',title:'House event '+(i+1),person:'together',date:day.toLocaleDateString('en-CA'),startTime:'09:00',endTime:'',timeZone:'Australia/Melbourne',arrivalTimeZone:'',color:'blue',entryType:'event',traveler:'',origin:'',destination:'',flightNumber:'',areaId:'',notes:'',createdAt:Date.now()+i,updatedAt:Date.now()+i});
    }
    AtlasHouse.render();
    const calendar=document.querySelector('.house-calendar');
    const upcoming=document.querySelector('.house-upcoming');
    const body=document.querySelector('.house-upcoming .widget-body');
    return {
      rows:document.querySelectorAll('.house-upcoming .widget-row').length,
      overflow:body?getComputedStyle(body).overflowY:'',
      module:!!window.AtlasHouseUpcomingScroll,
      calendarHeight:calendar?Math.round(calendar.getBoundingClientRect().height):0,
      upcomingHeight:upcoming?Math.round(upcoming.getBoundingClientRect().height):0,
      clientHeight:body?body.clientHeight:0,
      scrollHeight:body?body.scrollHeight:0,
      hasFilter:!!document.querySelector('.house-upcoming [data-upcoming-filter]')
    };
  });
  if(result.error)throw new Error(result.error);
  if(!result.module)throw new Error('House Upcoming scroll module did not load.');
  if(result.hasFilter)throw new Error('House Upcoming must stay an unfiltered household view.');
  if(result.rows<12)throw new Error('House Upcoming did not render the full 30-day event set.');
  if(!['auto','scroll'].includes(result.overflow))throw new Error('House Upcoming is not a bounded vertical scroll region.');
  if(Math.abs(result.calendarHeight-result.upcomingHeight)>1)throw new Error(`House Upcoming height ${result.upcomingHeight}px does not match Calendar row ${result.calendarHeight}px.`);
  if(!(result.scrollHeight>result.clientHeight))throw new Error(`House Upcoming content is not overflowing internally (${result.scrollHeight}px <= ${result.clientHeight}px).`);

  await page.focus('#atlasHouseBoard #widgetTodoInput');
  await page.fill('#atlasHouseBoard #widgetTodoInput','unsaved house todo');
  await page.evaluate(()=>AtlasHouse.render());
  await page.waitForFunction(()=>{const input=document.querySelector('#atlasHouseBoard #widgetTodoInput');return input&&input.value==='unsaved house todo'&&document.activeElement===input},null,{timeout:3000});

  await page.focus('#atlasHouseBoard [data-list-item-input]');
  await page.fill('#atlasHouseBoard [data-list-item-input]','unsaved list item');
  await page.evaluate(()=>AtlasHouse.render());
  await page.waitForFunction(()=>{const input=document.querySelector('#atlasHouseBoard [data-list-item-input]');return input&&input.value==='unsaved list item'&&document.activeElement===input},null,{timeout:3000});
}

async function verifyNormalUpcoming(page){
  const initial=await page.evaluate(()=>{
    const lock=document.getElementById('lockScreen');if(lock)lock.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    const auth=document.querySelector('.auth-overlay');if(auth)auth.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    state.settings.activeProfile='me';
    state.calendar=(state.calendar||[]).filter(event=>!String(event.id||'').startsWith('smoke-normal-upcoming-'));
    const base=new Date();
    for(let i=0;i<12;i++){
      const day=new Date(base.getFullYear(),base.getMonth(),base.getDate()+i);
      const travel=i===11,work=i<9;
      state.calendar.push({id:'smoke-normal-upcoming-'+i,profile:'me',space:work?'work':'personal',title:travel?'Smoke travel':'Smoke event '+(i+1),person:'fraser',date:day.toLocaleDateString('en-CA'),startTime:'09:00',endTime:'',timeZone:'Australia/Melbourne',arrivalTimeZone:'',color:i===0?'amber':'blue',entryType:travel?'travel':'event',traveler:travel?'Fraser':'',origin:travel?'MEL':'',destination:travel?'SYD':'',flightNumber:travel?'VA999':'',areaId:'',notes:'',createdAt:Date.now()+i,updatedAt:Date.now()+i});
    }
    document.getElementById('app').innerHTML=upcomingWidget();
    const select=document.querySelector('[data-upcoming-filter]');
    const first=document.querySelector('.atlas-widget[data-widget="upcoming"] .widget-row');
    return {
      rows:document.querySelectorAll('.atlas-widget[data-widget="upcoming"] .widget-row').length,
      options:select?Array.from(select.options).map(option=>option.value):[],
      firstWho:first?.querySelector('strong')?.textContent||'',
      firstMarker:first?.querySelector('i')?.style.background||''
    };
  });
  if(initial.rows!==12)throw new Error(`Normal Upcoming should show the full 30-day set, got ${initial.rows}.`);
  if(initial.options.join(',')!=='all,work,personal,travel')throw new Error('Normal Upcoming filters are incomplete.');
  if(initial.firstWho!=='Fraser')throw new Error('Normal Upcoming is not using the House person-first row presentation.');
  if(!initial.firstMarker)throw new Error('Normal Upcoming is not using calendar event colours.');

  await page.selectOption('[data-upcoming-filter]','work');
  const workRows=await page.locator('.atlas-widget[data-widget="upcoming"] .widget-row').count();
  if(workRows!==9)throw new Error(`Work Upcoming filter expected 9 rows, got ${workRows}.`);
  await page.selectOption('[data-upcoming-filter]','travel');
  const travel=await page.evaluate(()=>({rows:document.querySelectorAll('.atlas-widget[data-widget="upcoming"] .widget-row').length,text:document.querySelector('.atlas-widget[data-widget="upcoming"] .widget-row strong')?.textContent||''}));
  if(travel.rows!==1||!travel.text.includes('Smoke travel'))throw new Error('Travel Upcoming filter did not isolate the travel event.');
  await page.selectOption('[data-upcoming-filter]','all');
}

async function verifyMobileCalendar(page){
  await page.evaluate(()=>{
    const lock=document.getElementById('lockScreen');if(lock)lock.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    const auth=document.querySelector('.auth-overlay');if(auth)auth.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    renderCalendar();
  });
  await page.tap('[data-cal-add]',{force:true,timeout:3000});
  await page.waitForFunction(()=>{
    const overlay=document.getElementById('calendarOverlay');
    if(!overlay||overlay.classList.contains('hidden'))return false;
    const ids=['calEntryType','calPerson','calTitle','calDate','calTimeZone','calArea','calNotes','calEntangle','saveCalendarEvent'];
    const all=Array.from(document.querySelectorAll('#calendarOverlay *'));
    const order=ids.map(id=>{const el=document.getElementById(id);return el?all.indexOf(el):-1});
    return order.every(index=>index>=0)&&order.every((index,i)=>!i||index>order[i-1]);
  },null,{timeout:3000});
  await page.evaluate(()=>closeOverlay('calendarOverlay'));

  await page.evaluate(()=>{
    state.calendar=(state.calendar||[]).filter(event=>event.id!=='smoke-mobile-event');
    state.calendar.push({id:'smoke-mobile-event',profile:state.settings.activeProfile||'me',title:'Mobile smoke event',person:'fraser',date:todayKey(),startTime:'17:00',endTime:'',timeZone:'Australia/Melbourne',arrivalTimeZone:'',color:'blue',entryType:'event',traveler:'',origin:'',destination:'',flightNumber:'',areaId:'',notes:'',createdAt:Date.now(),updatedAt:Date.now()});
    renderCalendar();
  });
  await page.tap('[data-calendar-event="smoke-mobile-event"]',{force:true,timeout:3000});
  await page.waitForFunction(()=>{
    const overlay=document.getElementById('calendarOverlay');
    const title=document.getElementById('calTitle');
    return overlay&&!overlay.classList.contains('hidden')&&title&&title.value==='Mobile smoke event';
  },null,{timeout:3000});
}

async function verifyTouchWidgetDrag(page){
  const result=await page.evaluate(()=>{
    const lock=document.getElementById('lockScreen');if(lock)lock.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    const auth=document.querySelector('.auth-overlay');if(auth)auth.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    renderHome();
    const handle=document.querySelector('[data-widget-drag]');
    if(!handle)return {error:'No widget drag handle rendered.'};
    const id=handle.dataset.widgetDrag,before=widgetCfg(id).zone;
    let prevented=false;
    beginWidgetDrag(id,{pointerType:'touch',pointerId:91,clientX:20,clientY:20,preventDefault(){prevented=true}});
    return {before,after:widgetCfg(id).zone,dragging:document.body.classList.contains('widget-dragging'),prevented,module:!!window.AtlasTouchWidgetDragGuard};
  });
  if(result.error)throw new Error(result.error);
  if(!result.module)throw new Error('Touch widget drag guard did not load.');
  if(result.before!==result.after||result.dragging||result.prevented)throw new Error('Touch interaction still initiated widget dragging.');
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base='http://127.0.0.1:'+address.port;
  console.log('Browser smoke server: '+base);
  const browser=await chromium.launch({headless:true});
  try{
    await checkPage(browser,base+'/', 'Atlas root',verifyNormalUpcoming);
    await checkPage(browser,base+'/?view=house','Atlas House',verifyHouse,{viewport:{width:1440,height:900}});
    await checkPage(browser,base+'/', 'Atlas mobile calendar',verifyMobileCalendar,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await checkPage(browser,base+'/', 'Atlas touch widget drag',verifyTouchWidgetDrag,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  }finally{
    console.log('Closing browser');
    await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);
  }
  clearTimeout(hardStop);
  server.close();
})().catch(error=>{
  console.error(error&&error.stack||error);
  clearTimeout(hardStop);
  try{server.closeAllConnections&&server.closeAllConnections()}catch(_){}
  try{server.close()}catch(_){}
  process.exit(1);
});
