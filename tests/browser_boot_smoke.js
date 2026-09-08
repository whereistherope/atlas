const http=require('http');
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
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

async function verifyMobileCalendar(page){
  await page.evaluate(()=>{
    const lock=document.getElementById('lockScreen');if(lock)lock.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    const auth=document.querySelector('.auth-overlay');if(auth)auth.setAttribute('style','display:none!important;pointer-events:none!important;visibility:hidden!important');
    renderCalendar();
  });
  await page.tap('[data-cal-add]',{force:true,timeout:3000});
  await page.waitForFunction(()=>{
    const overlay=document.getElementById('calendarOverlay');
    return overlay&&!overlay.classList.contains('hidden')&&document.getElementById('calPerson')&&document.getElementById('calEntryType');
  },null,{timeout:3000});
  const order=await page.evaluate(()=>{
    const ids=['calEntryType','calPerson','calTitle','calDate','calTimeZone','calArea','calNotes','calEntangle','saveCalendarEvent'];
    return ids.map(id=>{const el=document.getElementById(id);if(!el)return -1;const all=Array.from(document.querySelectorAll('#calendarOverlay *'));return all.indexOf(el)});
  });
  if(order.some(index=>index<0)||order.some((index,i)=>i&&index<=order[i-1]))throw new Error('Mobile new-event form is not in the required order.');
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

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base='http://127.0.0.1:'+address.port;
  console.log('Browser smoke server: '+base);
  const browser=await chromium.launch({headless:true});
  try{
    await checkPage(browser,base+'/', 'Atlas root');
    await checkPage(browser,base+'/?view=house','Atlas House',async page=>{
      await page.waitForSelector('#atlasHouseBoard',{state:'attached',timeout:4000});
      const houseClass=await page.evaluate(()=>document.body.classList.contains('atlas-house-view'));
      if(!houseClass)throw new Error('House route did not activate.');
    });
    await checkPage(browser,base+'/', 'Atlas mobile calendar',verifyMobileCalendar,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
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
