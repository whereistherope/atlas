const fs=require('fs');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const boot=read('js/bootstrap.js');
const sw=read('sw.js');
const clarity=read('js/calendar-clarity.js');
const weather=read('js/header-weather.js');
const css=read('styles/calendar-clarity.css');

assert.match(boot,/const BUILD='0169r52'/,'r52 build marker missing');
assert.match(sw,/atlas-shell-0\.16\.9-r52/,'r52 service-worker cache missing');
for(const asset of ['./js/calendar-clarity.js','./js/header-weather.js','./styles/calendar-clarity.css']){
  assert.ok(boot.includes(asset),`${asset} is not booted`);
  assert.ok(sw.includes(asset),`${asset} is not offline-cached`);
}

assert.match(clarity,/weekday===0\|\|weekday===6/,'weekend detection missing');
assert.match(clarity,/aria-current','date'/,'current-day accessibility marker missing');
assert.match(css,/\.cal-cell\.weekend/,'weekend cell treatment missing');
assert.match(css,/\.cal-cell\.today/,'today treatment missing');
assert.match(css,/box-shadow:inset/,'today inset frame missing');
assert.match(css,/\.cal-cell\.today \.cal-day/,'today date marker missing');

assert.match(weather,/api\.open-meteo\.com\/v1\/forecast/,'Melbourne weather endpoint missing');
assert.match(weather,/latitude=-37\.8136&longitude=144\.9631/,'Melbourne coordinates missing');
assert.match(weather,/REFRESH_MS=15\*60\*1000/,'weather refresh interval missing');
assert.match(weather,/atlas_melbourne_weather_v1/,'weather cache missing');
assert.match(weather,/host\.insertBefore\(weather,first\)/,'weather must render before MEL time');
assert.match(weather,/condition\.textContent=labelFor/,'weather condition label missing');

console.log('calendar weather clarity contract ok');
