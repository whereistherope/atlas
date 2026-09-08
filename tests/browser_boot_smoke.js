const http=require('http');
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const hardStop=setTimeout(()=>{console.error('Browser boot smoke exceeded 45 seconds.');process.exit(124)},45000);

function safePath(urlPath){
  const clean=decodeURIComponent(String(urlPath||'/').split('?')[0]);
  const rel=clean==='/'?'index.html':clean.replace(/^\/+/, '');
  const full=path.resolve(root,rel);
  return full.startsWith(root+path.sep)||full===path.join(root,'index.html')?full:null;
}

const server=http.createServer((req,res)=>{
  let full=safePath(req.url);
  if(!full){res.writeHead(403);res.end('Forbidden');return}
  try{
    if(fs.statSync(full).isDirectory())full=path.join(full,'index.html');
    const body=fs.readFileSync(full);
    res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(body);
  }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found')}
});

async function checkPage(browser,url,label,verify){
  const context=await browser.newContext();
  try{
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error&&error.message||error)));
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
    await page.route('**/*',route=>{
      const target=new URL(route.request().url());
      if(target.hostname==='127.0.0.1'||target.hostname==='localhost')route.continue();else route.abort();
    });
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:12000});
    await page.waitForFunction(()=>document.documentElement.classList.contains('atlas-ready'),null,{timeout:12000});
    await page.waitForFunction(()=>!document.getElementById('atlasSimpleLoader'),null,{timeout:3000});
    if(verify)await verify(page);
    const fatal=errors.filter(message=>!message.includes('ERR_FAILED')&&!message.includes('Failed to load resource'));
    if(fatal.length)throw new Error(label+' browser errors: '+fatal.join(' | '));
    console.log(label+': PASS');
  }finally{
    await context.close();
  }
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base='http://127.0.0.1:'+address.port;
  const browser=await chromium.launch({headless:true});
  try{
    await checkPage(browser,base+'/', 'Atlas root');
    await checkPage(browser,base+'/?view=house','Atlas House',async page=>{
      await page.waitForSelector('#atlasHouseBoard',{state:'attached',timeout:4000});
      const houseClass=await page.evaluate(()=>document.body.classList.contains('atlas-house-view'));
      if(!houseClass)throw new Error('House route did not activate.');
    });
  }finally{
    await browser.close();
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
