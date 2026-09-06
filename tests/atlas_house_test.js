const fs=require('fs');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const boot=read('js/bootstrap.js');
const sw=read('sw.js');
const house=read('js/house.js');
const css=read('styles/house.css');
const entry=read('house/index.html');
const legacy=read('house/legacy.html');
const legacyJs=read('house/legacy.js');
const legacyCss=read('house/legacy.css');
const context=read('js/widget-context.js');
const list=read('js/list-widget.js');
const server=read('js/home-server-widget.js');
const weather=read('js/weather-widget.js');
const weatherSource=read('js/header-weather.js');

assert.match(boot,/const BUILD='0169r58'/,'r58 build marker missing');
assert.match(sw,/atlas-shell-0\.16\.9-r58/,'r58 service-worker cache missing');
for(const asset of ['./js/widget-context.js','./js/list-widget.js','./js/home-server-widget.js','./js/weather-widget.js','./js/house.js','./styles/weather-widget.css','./styles/house.css']){
  assert.ok(boot.includes(asset),`${asset} is not booted`);
  assert.ok(sw.includes(asset),`${asset} is not offline-cached`);
}
for(const asset of ['./house/','./house/index.html','./house/legacy.html','./house/legacy.css','./house/legacy.js'])assert.ok(sw.includes(asset),`${asset} route shell is not offline-cached`);

assert.match(entry,/\/iPad\/\.test\(ua\)&&\/OS 12\[_\\\.\]\//,'/house/ entry must detect iOS 12 iPads before modern Atlas loads');
assert.match(entry,/legacy\?'\.\/legacy\.html':'\.\.\/\?view=house'/,'modern devices must continue into the unchanged shared Atlas House route');
assert.match(legacy,/\.\/legacy\.css/,'legacy House CSS missing');
assert.match(legacy,/\.\/legacy\.js/,'legacy House runtime missing');
assert.doesNotMatch(legacyJs,/\?\.|\?\?|=>|\basync\b|\bawait\b|`/,'legacy House JavaScript must stay parseable by iOS 12 Safari');
assert.doesNotMatch(legacyCss,/color-mix\(|100dvh|100svh|100lvh/,'legacy House CSS must avoid modern-only presentation features');
assert.match(legacyJs,/ENTITY_TYPE='entity_state_v2'/,'legacy House must use Shared Atlas record-level sync records');
assert.match(legacyJs,/PROFILE='us'/,'legacy House must stay scoped to the shared Us profile');
assert.match(legacyJs,/kind==='calendar'/,'legacy House calendar must read real Atlas calendar records');
assert.match(legacyJs,/kind==='quickTodos'/,'legacy House To-do must read real Atlas quickTodos records');
assert.match(legacyJs,/data\.type==='list'/,'legacy House lists must use real Atlas List note records');
assert.match(legacyJs,/insertRecord\(value,'quickTodos'/,'legacy House must write normal Atlas To-do records');
assert.match(legacyJs,/insertRecord\(value,'notes'/,'legacy House must write normal Atlas List records');
assert.doesNotMatch(legacyJs,/indexedDB|deleteDatabase|canonical_state_v1/,'legacy House must not introduce a second Atlas database or stale canonical-state client');

assert.match(house,/\{id:'house',name:'House'\}/,'House navigation item missing');
assert.match(house,/renderWidget\(id,\{profileId:HOUSE_PROFILE\}\)/,'House must compose the real Atlas widget renderer');
assert.match(house,/HOUSE_PROFILE='us'/,'House must use the shared Us context');
for(const id of ['calendar','upcoming','weather','list','todo','server'])assert.ok(house.includes(`slot('${id}','${id}')`),`House ${id} widget slot missing`);
assert.doesNotMatch(house,/HOUSE_MOCK|houseSnapshot|eventRows|checklistRows|house-panel|house-clock/,'House must not invent parallel widgets or mock household data');
assert.doesNotMatch(css,/--bg:|--paper:|--ink:|background:radial-gradient|\.topbar[^\n]*display:none/,'House must not introduce a separate theme or hide Atlas chrome');
assert.match(css,/grid-template-areas:"calendar calendar upcoming" "weather list todo" "server server server"/,'House 4:3 widget composition missing');
assert.match(css,/\.house-atlas-board \.widget-body\{overflow:hidden!important;max-height:none!important\}/,'House widgets must not use internal scrollbars');
assert.match(css,/body\.atlas-house-view\{overflow:hidden\}/,'Landscape House surface must not page-scroll');
assert.match(css,/height:calc\(100dvh - 120px\)/,'House board must size to the visible landscape viewport');
assert.match(css,/\.house-calendar\{min-height:292px\}/,'House Calendar must reserve full-month height');
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

console.log('atlas house shared widgets + iOS 12 compatibility contract ok');
