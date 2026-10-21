const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const calendar=fs.readFileSync('js/calendar.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles/calendar-extras.css','utf8');
const app=fs.readFileSync('js/app.js','utf8');
const upcoming=fs.readFileSync('js/house-upcoming-scroll.js','utf8');
const houseCalendar=fs.readFileSync('js/house-calendar-visuals.js','utf8');
const legacy=fs.readFileSync('house/legacy.js','utf8');
const legacyEdit=fs.readFileSync('house/legacy-upcoming-edit.js','utf8');
const backup=fs.readFileSync('js/cloud-backup.js','utf8');
const restore=fs.readFileSync('js/cloud-restore.js','utf8');
const db=fs.readFileSync('js/db.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  'calendarEventEndDate','calendarEventIncludesDate','calendarEventRangeOverlaps',
  'calendarEventDateRangeLabel','calendarEventSpanMarker','updateCalendarSpanUI',
  "endDate:source.endDate||''",'calSpansDates','calEndDate'
]) assert(calendar.includes(token),`multi-day calendar contract missing: ${token}`);

const context={Intl,Date,console,document:{addEventListener(){}}};
vm.createContext(context);
vm.runInContext(calendar,context);

const trip={date:'2026-10-16',endDate:'2026-10-18'};
assert.strictEqual(context.calendarEventEndDate(trip),'2026-10-18');
assert.strictEqual(context.calendarEventSpansDates(trip),true);
assert.strictEqual(context.calendarEventIncludesDate(trip,'2026-10-16'),true);
assert.strictEqual(context.calendarEventIncludesDate(trip,'2026-10-17'),true);
assert.strictEqual(context.calendarEventIncludesDate(trip,'2026-10-18'),true);
assert.strictEqual(context.calendarEventIncludesDate(trip,'2026-10-19'),false);
assert.strictEqual(context.calendarEventRangeOverlaps(trip,'2026-10-17','2026-10-17'),true);
assert.strictEqual(context.calendarEventRangeOverlaps(trip,'2026-10-19','2026-10-25'),false);
assert.strictEqual(context.calendarEventDateRangeLabel(trip),'16–18 Oct 2026');
assert.strictEqual(context.calendarShiftDate('2026-10-31',1),'2026-11-01');
assert.match(context.calendarEventSpanMarker(trip,'2026-10-16'),/atlas-span-arrow/);
assert.match(context.calendarEventSpanMarker(trip,'2026-10-17'),/atlas-span-arrow/);
assert.match(context.calendarEventSpanMarker(trip,'2026-10-18'),/cal-span-end-dot/);
assert.strictEqual(context.calendarEventSpanMarker(trip,'2026-10-19'),'');

assert(index.includes('id="calSpansDates"'),'calendar editor span toggle missing');
assert(index.includes('id="calEndDate"'),'calendar editor end-date field missing');
assert(css.includes('.cal-span-marker'),'multi-day event marker styling missing');
assert(!css.includes('.cal-event.cal-span:before'),'legacy grey span connector styling must stay removed');
assert(!calendar.includes("return'Continues'"),'multi-day cards must not show Continues copy');
assert(!calendar.includes('`Starts ${calendarEventTimeMeta(event)}`'),'multi-day cards must not show Starts copy');
assert(css.includes('.calendar-span-row'),'multi-day editor styling missing');
assert(app.includes('calendarEventRangeOverlaps(e,today,max)'),'quick Upcoming must include ongoing spans');
assert(upcoming.includes('calendarEventRangeOverlaps(event,start,end)'),'shared Upcoming must include ongoing spans');
assert(houseCalendar.includes('calendarEventIncludesDate(event,date)'),'House mini calendar must mark every day in a span');
assert(legacy.includes('calendarRangeOverlaps'),'legacy House must understand multi-day ranges');
assert(legacyEdit.includes("data.endDate=source.endDate||''"),'legacy linked-event edits must preserve endDate');
assert(backup.includes("'date','endDate','startTime'"),'manual cloud backup must preserve endDate');
assert(restore.includes("'date','endDate','startTime'"),'manual cloud restore must preserve endDate');
assert(db.includes('DATA_VERSION=9'),'multi-day calendar requires data version 9');
assert(db.includes('if(from<9)'),'data version 9 migration missing');
assert(bootstrap.includes("const BUILD='0169r75'"),'calendar return-trip release build must be r75');
assert(sw.includes("atlas-shell-0.16.9-r75"),'service worker cache must match r75');

console.log('Atlas multi-day calendar contracts: PASS');
