const fs=require('fs');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const boot=read('js/bootstrap.js');
const sw=read('sw.js');
const clarity=read('js/calendar-clarity.js');
const weather=read('js/header-weather.js');
const css=read('styles/calendar-clarity.css');
const houseVisuals=read('js/house-calendar-visuals.js');

assert.match(boot,/const BUILD='0169r66'/,'r66 build marker missing');
assert.match(sw,/atlas-shell-0\.16\.9-r66/,'r66 service-worker cache missing');
for(const asset of ['./js/calendar-clarity.js','./js/header-weather.js','./js/house-calendar-visuals.js','./styles/calendar-clarity.css']){
  assert.ok(boot.includes(asset)||asset.startsWith('./styles/'),`${asset} is not booted`);
  assert.ok(sw.includes(asset),`${asset} is not offline-cached`);
}

assert.match(clarity,/weekday===0\|\|weekday===6/,'weekend detection missing');
assert.match(clarity,/aria-current','date'/,'current-day accessibility marker missing');
assert.match(clarity,/Link to profiles/,'personal calendar must visibly expose profile linking');
assert.match(clarity,/Us \/ House/,'profile linking must include the Us / House destination');
assert.match(clarity,/function orderCalendarForm\(\)/,'calendar form ordering helper missing');
assert.match(clarity,/form\.insertBefore\(entryType,title\)/,'Entry type must be first in the event form');
assert.match(clarity,/typeField|entryType/,'calendar form must retain Entry type');
assert.match(clarity,/title\.insertAdjacentElement\('beforebegin',person\)/,'Who must sit before event details');
assert.match(clarity,/timeRow\.insertAdjacentElement\('afterend',meta\)/,'Time zone and Colour must sit after Date/Start/End');
assert.match(clarity,/meta\.insertAdjacentElement\('afterend',area\)/,'Area must sit after Time zone and Colour');
assert.match(clarity,/area\.insertAdjacentElement\('afterend',notes\)/,'Notes must sit after Area');
assert.match(clarity,/notes\.insertAdjacentElement\('afterend',link\)/,'Link to profiles must sit after Notes');
assert.match(clarity,/link\.insertAdjacentElement\('afterend',actions\)/,'Save actions must sit after Link to profiles');
assert.match(clarity,/openUpcomingForEdit/,'Upcoming calendar rows must open the event editor');
assert.match(clarity,/source\?\.id\|\|item\.id/,'linked Upcoming events must edit the personal source where available');
assert.match(css,/\.cal-cell\.weekend/,'weekend cell treatment missing');
assert.match(css,/\.cal-cell\.today/,'today treatment missing');
assert.match(css,/box-shadow:inset/,'today inset frame missing');
assert.match(css,/\.cal-cell\.today \.cal-day/,'today date marker missing');
assert.match(css,/\.entangle-row/,'calendar profile linking needs a visible treatment');
assert.match(css,/profile-link-heading/,'calendar profile-link heading treatment missing');
assert.match(houseVisuals,/eventHue\(event\)/,'modern House calendar must reuse canonical event colours');
assert.match(houseVisuals,/house-mini-event-dots/,'modern House calendar needs per-event colour dots');
assert.match(houseVisuals,/style=\"background:\$\{eventHue\(e\)\}/,'modern House Upcoming must use each event colour');

assert.match(weather,/api\.open-meteo\.com\/v1\/forecast/,'Melbourne weather endpoint missing');
assert.match(weather,/latitude=-37\.8136&longitude=144\.9631/,'Melbourne coordinates missing');
assert.match(weather,/REFRESH_MS=15\*60\*1000/,'weather refresh interval missing');
assert.match(weather,/atlas_melbourne_weather_v1/,'weather cache missing');
assert.match(weather,/host\.insertBefore\(weather,first\)/,'weather must render before MEL time');
assert.match(weather,/condition\.textContent=labelFor/,'weather condition label missing');
assert.match(weather,/getCurrent:currentSnapshot/,'header weather must expose shared cached conditions');
assert.match(weather,/iconFor/,'header weather must expose simple weather iconography');
assert.match(css,/\.chrono-weather time\{[^}]*display:inline!important/,'weather condition must stay visible');
assert.doesNotMatch(css,/@media\(max-width:850px\)\{\.chrono-weather time\{display:none\}/,'iPad must not hide weather condition');

console.log('calendar weather clarity + r66 form order contract ok');
