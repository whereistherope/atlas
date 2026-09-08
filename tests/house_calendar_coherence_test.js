const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const modern=read('js/house-upcoming-scroll.js');
const legacy=read('house/legacy-upcoming-scroll.js');
const legacyHtml=read('house/legacy.html');
const palette=read('house/legacy-calendar-colour-palette.js');
const paletteCss=read('house/legacy-calendar-colour-palette.css');
const sw=read('sw.js');

assert.match(modern,/eventHue\(event\)/,'modern House Upcoming must preserve canonical event colours');
assert.match(modern,/calendarEventPersonLabel\(event\)/,'modern House Upcoming must preserve Who display');
assert.match(modern,/calendarEvents\(profileId\).*30/s,'modern House Upcoming must keep the full 30-day source');
assert.doesNotMatch(modern,/slice\(0,8\)/,'House-specific Upcoming renderer must not truncate to eight rows');

assert.match(legacy,/COLOURS=\{slate:'#7f898d',blue:'#6689a5',teal:'#5f918b',green:'#76916b',amber:'#ae8954',red:'#a66767',purple:'#88749b',pink:'#a67689'\}/,'legacy Upcoming must use canonical calendar colours');
assert.match(legacy,/background-color:'\+colour\(event\)/,'legacy Upcoming rows must paint their event colour directly');
assert.match(legacy,/String\(event\.color\|\|''\)/,'legacy Upcoming signature must react to colour changes');
assert.match(legacy,/String\(event\.person\|\|''\)/,'legacy Upcoming signature must react to Who changes');
assert.doesNotMatch(legacy,/slice\(0,5\)|limit=5/,'legacy House Upcoming must not truncate the 30-day list');
assert.doesNotMatch(legacy,/\?\.|\?\?|=>|\basync\b|\bawait\b|`/,'legacy Upcoming must stay parseable by iOS 12 Safari');

assert.match(legacyHtml,/legacy-calendar-colour-palette\.css\?v=r72&hotfix=r75/,'legacy House must load the colour swatch styling with a cache-busting hotfix token');
assert.match(legacyHtml,/legacy-calendar-colour-palette\.js\?v=r72&hotfix=r75/,'legacy House must load the colour swatch runtime with a cache-busting hotfix token');
assert.match(legacyHtml,/legacy-upcoming-scroll\.js\?v=r72&hotfix=r75/,'legacy House Upcoming runtime must be cache-busted with the coherence hotfix');
assert.match(palette,/data-house-calendar-colour/,'legacy editor must expose colour swatch controls');
assert.match(palette,/select\.style\.display='none'/,'legacy colour select must be replaced visually by the swatch palette');
assert.match(paletteCss,/aria-pressed="true"/,'selected legacy colour swatch must have a visible state');
assert.doesNotMatch(palette,/\?\.|\?\?|=>|\basync\b|\bawait\b|`/,'legacy colour palette must stay parseable by iOS 12 Safari');
assert.ok(sw.includes('./house/legacy-calendar-colour-palette.js'),'legacy colour palette runtime must be offline-cached');
assert.ok(sw.includes('./house/legacy-calendar-colour-palette.css'),'legacy colour palette styling must be offline-cached');

console.log('House calendar coherence checks passed.');
