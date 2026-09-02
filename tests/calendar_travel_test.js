const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const js=fs.readFileSync('js/calendar.js','utf8');
const directionJs=fs.readFileSync('js/travel-direction.js','utf8');
const css=fs.readFileSync('styles/calendar-extras.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'CALENDAR_TRAVEL_PLACES',
  "entryType==='travel'",
  'traveler:',
  'origin:',
  'destination:',
  'flightNumber:',
  'arrivalTimeZone:',
  'calendarTravelPlace',
  'calendarTravelTimeLine',
  'data-cal-travel-add',
  'calArrivalTimeZone'
]) assert(js.includes(token),`calendar travel contract missing: ${token}`);

const context={Intl,Date,console,document:{addEventListener(){}}};
vm.createContext(context);vm.runInContext(js,context);
assert.strictEqual(context.calendarTravelTimeZone('MEL'),'Australia/Melbourne');
assert.strictEqual(context.calendarTravelTimeZone('Melbourne'),'Australia/Melbourne');
assert.strictEqual(context.calendarTravelTimeZone('Sydney'),'Australia/Sydney');
assert.strictEqual(context.calendarTravelTimeZone('BNE'),'Australia/Brisbane');
assert.strictEqual(context.calendarTravelTimeZone('Adelaide'),'Australia/Adelaide');
assert.strictEqual(context.calendarTravelPlace({origin:'MEL',destination:'Sydney'}),'Sydney');
assert.strictEqual(context.calendarTravelPlace({origin:'Sydney',destination:'MEL'}),'Sydney');
assert.strictEqual(context.calendarTravelTimeLine({flightNumber:'va823',startTime:'08:30',endTime:'09:55'}),'VA823 · 08:30–09:55');
assert.strictEqual(context.calendarTravelAutoTitle({traveler:'Fraser',origin:'MEL',destination:'Sydney',flightNumber:'va823'}),'Fraser · Sydney · VA823');

assert(directionJs.includes('atlas-travel-arrow'),'minimal travel arrow renderer missing');
assert(!/[🛫🛬✈]/u.test(directionJs),'runtime travel renderer must not use emoji aircraft');
assert(!directionJs.includes('atlas-flight-times'),'manual travel must not include flight lookup');
assert(css.includes('.cal-travel-event'),'travel card styling missing');
assert(css.includes('.calendar-travel-fields'),'travel editor styling missing');
assert(css.includes('.atlas-travel-arrow'),'minimal travel arrow styling missing');
assert(!css.includes('calendar-flight-lookup-status'),'manual travel should not carry lookup-status UI');
assert(bootstrap.includes("await loadScript('./js/travel-direction.js'"),'travel direction renderer must be required at boot');
assert(!bootstrap.includes('travel-flight-times.js'),'automatic flight-time lookup must stay disabled');
assert(sw.includes("'./js/travel-direction.js'"),'travel direction renderer must be offline cached');
assert(!sw.includes("'./js/travel-flight-times.js'"),'flight lookup runtime must not be cached');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');
console.log('Atlas manual calendar travel contracts: PASS');
