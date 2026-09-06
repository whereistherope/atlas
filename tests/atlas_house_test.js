const fs=require('fs');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const boot=read('js/bootstrap.js');
const sw=read('sw.js');
const house=read('js/house.js');
const css=read('styles/house.css');
const entry=read('house/index.html');
const context=read('js/widget-context.js');
const list=read('js/list-widget.js');
const server=read('js/home-server-widget.js');
const weather=read('js/weather-widget.js');
const weatherSource=read('js/header-weather.js');

assert.match(boot,/const BUILD='0169r56'/,'r56 build marker missing');
assert.match(sw,/atlas-shell-0\.16\.9-r56/,'r56 service-worker cache missing');
for(const asset of ['./js/widget-context.js','./js/list-widget.js','./js/home-server-widget.js','./js/weather-widget.js','./js/house.js','./styles/weather-widget.css','./styles/house.css']){
  assert.ok(boot.includes(asset),`${asset} is not booted`);
  assert.ok(sw.includes(asset),`${asset} is not offline-cached`);
}
for(const asset of ['./house/','./house/index.html']) assert.ok(sw.includes(asset),`${asset} route shell is not offline-cached`);

assert.match(entry,/location\.replace\('\.\.\/\?view=house'\)/,'/house/ entry must route into the shared Atlas shell');
assert.match(house,/\{id:'house',name:'House'\}/,'House navigation item missing');
assert.match(house,/renderWidget\(id,\{profileId:HOUSE_PROFILE\}\)/,'House must compose the real Atlas widget renderer');
assert.match(house,/HOUSE_PROFILE='us'/,'House must use the shared Us context');
for(const id of ['calendar','upcoming','weather','list','todo','server'])assert.ok(house.includes(`slot('${id}','${id}')`),`House ${id} widget slot missing`);
assert.doesNotMatch(house,/HOUSE_MOCK|houseSnapshot|eventRows|checklistRows|house-panel|house-clock/,'House must not invent parallel widgets or mock household data');
assert.doesNotMatch(css,/--bg:|--paper:|--ink:|background:radial-gradient|\.topbar[^\n]*display:none/,'House must not introduce a separate theme or hide Atlas chrome');
assert.match(css,/grid-template-areas:"calendar calendar upcoming" "weather list todo" "server server server"/,'House 4:3 widget composition missing');
assert.match(css,/\.house-calendar>\.atlas-widget>\.widget-body\{overflow:visible!important\}/,'House Calendar must not use an internal scrollbar');
assert.match(css,/\.house-calendar\{min-height:300px\}/,'House Calendar must reserve full-month height');
assert.match(context,/todoWidget=function\(options=/,'profile-aware real To-do widget missing');
assert.match(context,/upcomingWidget=function\(options=/,'profile-aware real Upcoming widget missing');
assert.match(context,/calendarWidget=function\(options=/,'profile-aware real Calendar widget missing');
assert.match(list,/ATLAS_WIDGETS\.list=/,'List must be a first-class Atlas widget');
assert.match(list,/note\.type==='list'/,'List must use synced Atlas notes rather than a parallel store');
assert.match(list,/note=>note\.type!=='list'/,'List records must stay out of ordinary note surfaces');
assert.match(server,/ATLAS_WIDGETS\.server=/,'Home Server must be a first-class Atlas widget');
assert.match(weather,/ATLAS_WIDGETS\.weather=/,'Weather must be a first-class Atlas widget');
assert.match(weatherSource,/getCurrent:currentSnapshot/,'Weather widget must reuse the header weather cache/source');
assert.match(weatherSource,/iconFor/,'Weather source must expose condition iconography');
assert.doesNotMatch(weather,/fetch\s*\(|localStorage|indexedDB/,'Weather widget must reuse the shared weather source rather than create another feed');
assert.match(sw,/shellNavigation/,'service worker must distinguish root shell navigation');
assert.match(sw,/response&&response\.ok&&shellNavigation/,'/house/ navigation must not overwrite cached Atlas root shell');

console.log('atlas house shared widgets contract ok');
