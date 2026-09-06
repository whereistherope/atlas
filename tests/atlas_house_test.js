const fs=require('fs');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const boot=read('js/bootstrap.js');
const sw=read('sw.js');
const house=read('js/house.js');
const css=read('styles/house.css');
const entry=read('house/index.html');

assert.match(boot,/const BUILD='0169r54'/,'r54 build marker missing');
assert.match(sw,/atlas-shell-0\.16\.9-r54/,'r54 service-worker cache missing');
for(const asset of ['./js/house.js','./styles/house.css']){
  assert.ok(boot.includes(asset),`${asset} is not booted`);
  assert.ok(sw.includes(asset),`${asset} is not offline-cached`);
}
for(const asset of ['./house/','./house/index.html']) assert.ok(sw.includes(asset),`${asset} route shell is not offline-cached`);

assert.match(entry,/location\.replace\('\.\.\/\?view=house'\)/,'/house/ entry must route into the shared Atlas shell');
assert.match(house,/\{id:'house',name:'House'\}/,'House navigation item missing');
assert.match(house,/originalRenderAll/,'House must extend rather than replace the Atlas render pipeline');
assert.match(house,/window\.AtlasHouse=/,'Atlas House adapter boundary missing');
assert.match(house,/setSnapshot\(snapshot\)/,'House snapshot injection seam missing');
assert.match(house,/label:'CPU',value:14/,'mock CPU telemetry missing');
assert.match(house,/label:'MEMORY',value:38/,'mock memory telemetry missing');
assert.match(house,/label:'STORAGE',value:42/,'mock storage telemetry missing');
assert.doesNotMatch(house,/\bfetch\s*\(/,'milestone one must not call a real homelab API');
assert.doesNotMatch(house,/\bindexedDB\b|\blocalStorage\b/,'House mock data must not create a parallel persistence layer');
assert.doesNotMatch(house,/\b(password|secret|apiKey|api_key|accessToken|access_token)\s*[:=]/i,'frontend homelab secrets are forbidden');
assert.doesNotMatch(house,/drawNetwork|networkPanel|graphData/,'House must not render the Atlas network graph');

assert.match(css,/body\.atlas-house-mode\{[\s\S]*--bg:#070b10/,'House must use the Atlas night palette without changing persisted theme');
assert.match(css,/\.atlas-house-mode \.topbar[\s\S]*display:none!important/,'normal Atlas chrome must be hidden in House mode');
assert.match(css,/grid-template-areas:"today upcoming" "shopping tasks" "server server"/,'4:3 House grid contract missing');
assert.match(css,/@media\(max-height:800px\) and \(orientation:landscape\)/,'old iPad landscape compaction missing');
assert.match(css,/@media\(max-width:850px\) and \(orientation:portrait\)/,'portrait recovery layout missing');

console.log('atlas house dashboard contract ok');
