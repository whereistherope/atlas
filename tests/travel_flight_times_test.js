const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('js/travel-flight-times.js','utf8');

for(const token of [
  'atlas-flight-times',
  'departureTime',
  'arrivalTime',
  'Sign in to Atlas Cloud to look up flight times.',
  'Looking up scheduled times',
  'Scheduled ${result.departureTime}–${result.arrivalTime}',
  'atlas-aircraft-glyph'
]) assert(src.includes(token),`flight-time contract missing: ${token}`);

assert(!/[🛫🛬✈]/u.test(src),'travel flight-time runtime must not render emoji aircraft');

class MutationObserver{constructor(cb){this.cb=cb}observe(){}}
const window={calendarTravelIsMelbourne:value=>String(value||'').toUpperCase()==='MEL'};
const document={
  readyState:'complete',
  documentElement:{},
  addEventListener(){},
  getElementById(){return null}
};
const context={window,document,MutationObserver,console,setTimeout,clearTimeout,fetch:async()=>{throw new Error('not called')}};
vm.createContext(context);vm.runInContext(src,context);
const api=window.AtlasFlightTimes;
assert(api&&typeof api.planeSvg==='function','flight-time API should expose aircraft renderer');
const depart=api.travelIcon({origin:'MEL',destination:'SYD'});
const arrive=api.travelIcon({origin:'SYD',destination:'MEL'});
const neutral=api.travelIcon({origin:'SYD',destination:'BNE'});
assert(depart.includes('<svg')&&depart.includes('rotate(-10'),'departure icon should be monochrome SVG with take-off attitude');
assert(arrive.includes('<svg')&&arrive.includes('rotate(10'),'arrival icon should be monochrome SVG with landing attitude');
assert(neutral.includes('<svg')&&neutral.includes('rotate(0'),'neutral flight icon should be monochrome SVG');
console.log('Atlas travel flight-time contracts: PASS');
