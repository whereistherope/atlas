const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const js=fs.readFileSync('js/calendar.js','utf8');
const css=fs.readFileSync('styles/calendar-extras.css','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  "'Australia/Melbourne'",
  "'Australia/Sydney'",
  "'Australia/Brisbane'",
  "'Australia/Adelaide'",
  "'Australia/Darwin'",
  "'Australia/Perth'",
  'calendarEventTimeMeta',
  'timeZone:validCalendarTimeZone',
  'color:calendarColourValue',
  'timeZone:source.timeZone',
  'color:source.color',
  'calendar-colour-palette'
]) assert(js.includes(token),`calendar feature contract missing: ${token}`);

const context={Intl,Date,console,document:{addEventListener(){}}};
vm.createContext(context);vm.runInContext(js,context);
assert.strictEqual(context.validCalendarTimeZone('Australia/Melbourne'),'Australia/Melbourne');
assert.strictEqual(context.validCalendarTimeZone('Not/AZone'),'');
assert.strictEqual(context.calendarZoneParts('2026-01-15','10:00','Australia/Brisbane').toISOString(),'2026-01-15T00:00:00.000Z','Brisbane wall time must map to UTC+10');
assert.strictEqual(context.calendarZoneParts('2026-01-15','10:00','Australia/Adelaide').toISOString(),'2026-01-14T23:30:00.000Z','Adelaide summer wall time must respect DST');
assert.strictEqual(context.calendarZoneParts('2026-07-15','10:00','Australia/Adelaide').toISOString(),'2026-07-15T00:30:00.000Z','Adelaide winter wall time must respect standard time');
assert(context.calendarColourValue('blue'),'calendar palette colour should resolve');
assert.strictEqual(context.calendarColourValue('made-up'),'');

assert(css.includes('.calendar-colour-swatch'),'calendar colour palette styling missing');
assert(css.includes('@media(max-width:700px)'),'calendar controls must remain mobile responsive');
assert(bootstrap.includes("loadStyle('./styles/calendar-extras.css')"),'calendar extras CSS must boot');
assert(sw.includes("'./styles/calendar-extras.css'"),'calendar extras CSS must be offline cached');
const build=bootstrap.match(/const BUILD='0169r(\d+)'/)?.[1],shell=sw.match(/atlas-shell-0\.16\.9-r(\d+)/)?.[1];
assert(build&&shell&&build===shell,'bootstrap and service worker release numbers must stay aligned');
console.log('Atlas calendar time zone and colour contracts: PASS');
