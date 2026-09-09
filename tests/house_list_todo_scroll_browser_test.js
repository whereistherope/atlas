const http=require('http');
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png'};
function safePath(urlPath){const clean=decodeURIComponent(String(urlPath||'/').split('?')[0]);const rel=clean==='/'?'index.html':clean.replace(/^\/+/, '');const full=path.resolve(root,rel);return full.startsWith(root+path.sep)||full===path.join(root,'index.html')?full:null}
const server=http.createServer((req,res)=>{let full=safePath(req.url);if(!full){res.writeHead(403);res.end();return}try{if(fs.statSync(full).isDirectory())full=path.join(full,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(full))}catch(_){res.writeHead(404);res.end()}});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.route('**/*',route=>{const target=new URL(route.request().url());if(target.hostname==='127.0.0.1'||target.hostname==='localhost')route.continue();else route.abort()});
    await page.goto(base+'/?view=house',{waitUntil:'domcontentloaded',timeout:12000});
    await page.waitForFunction(()=>document.documentElement.classList.contains('atlas-ready'),null,{timeout:12000});
    await page.waitForSelector('#atlasHouseBoard');
    const result=await page.evaluate(()=>{
      state.quickTodos=(state.quickTodos||[]).filter(t=>!String(t.id||'').startsWith('scroll-todo-'));
      state.notes=(state.notes||[]).filter(n=>n.id!=='scroll-list');
      for(let i=0;i<10;i++)state.quickTodos.push({id:'scroll-todo-'+i,profile:'us',text:'Todo '+i,done:false,createdAt:Date.now()+i});
      state.notes.unshift({id:'scroll-list',profile:'us',space:'personal',areaId:'',topicId:'',type:'list',title:'Scroll list',body:'',tags:['List'],createdAt:Date.now(),updatedAt:Date.now(),showOnMap:false,listItems:Array.from({length:10},(_,i)=>({id:'li-'+i,text:'List '+i,done:false,createdAt:Date.now()+i,updatedAt:Date.now()+i}))});
      state.settings.listWidgetSelection=state.settings.listWidgetSelection||{};state.settings.listWidgetSelection.us='scroll-list';
      AtlasHouse.render();
      const todo=document.querySelector('.house-todo .quick-list');
      const list=document.querySelector('.house-list .atlas-list-items');
      const todoRow=todo?.querySelector('.quick-todo');
      const listRow=list?.querySelector('.quick-todo');
      return {
        todoRows:todo?.querySelectorAll('.quick-todo').length||0,
        listRows:list?.querySelectorAll('.quick-todo').length||0,
        todoClient:todo?.clientHeight||0,todoScroll:todo?.scrollHeight||0,todoOverflow:todo?getComputedStyle(todo).overflowY:'',todoRow:todoRow?.getBoundingClientRect().height||0,
        listClient:list?.clientHeight||0,listScroll:list?.scrollHeight||0,listOverflow:list?getComputedStyle(list).overflowY:'',listRow:listRow?.getBoundingClientRect().height||0,
        middleHeight:document.querySelector('.house-list')?.getBoundingClientRect().height||0
      };
    });
    if(result.todoRows!==10||result.listRows!==10)throw new Error('House task widgets did not render all rows.');
    if(!['auto','scroll'].includes(result.todoOverflow)||!['auto','scroll'].includes(result.listOverflow))throw new Error('House task widgets are not scrollable.');
    if(!(result.todoScroll>result.todoClient)&&!(result.listScroll>result.listClient))throw new Error('House task widgets did not overflow internally.');
    if(result.todoRow&&result.todoClient>result.todoRow*8+12)throw new Error('House To-do visible region exceeds roughly eight rows.');
    if(result.listRow&&result.listClient>result.listRow*8+12)throw new Error('House List visible region exceeds roughly eight rows.');
    if(result.middleHeight<170)throw new Error('House task row did not grow with content before scrolling.');
    console.log('House List/To-do 8-row scroll regression: PASS');
    await page.close();
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error&&error.stack||error);try{server.close()}catch(_){}process.exit(1)});
