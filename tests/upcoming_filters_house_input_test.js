const fs=require('fs');
const assert=require('assert');

const upcoming=fs.readFileSync('js/house-upcoming-scroll.js','utf8');
const house=fs.readFileSync('js/house.js','utf8');
const css=fs.readFileSync('styles/house-upcoming-scroll.css','utf8');

assert.match(upcoming,/all:'All',work:'Work',personal:'Personal',travel:'Travel'/,'normal Upcoming filter set is missing');
assert.match(upcoming,/function normalUpcoming\(\)/,'normal Atlas must use the shared House-style Upcoming renderer');
assert.match(upcoming,/events\.map\(eventRow\)/,'normal and House Upcoming must share the event-row presentation');
assert.match(upcoming,/eventHue\(event\)/,'Upcoming rows must retain canonical calendar colours');
assert.match(upcoming,/calendarEventPersonLabel\(event\)/,'Upcoming ordinary events must retain Who-first presentation');
assert.match(upcoming,/if\(options\?\.profileId&&isHouse\(\)\)return houseUpcoming\(options\)/,'House must keep its full shared Upcoming mode');
assert.match(upcoming,/if\(!options\?\.profileId\)return normalUpcoming\(\)/,'normal Atlas must use filterable Upcoming mode');
assert.match(upcoming,/normalFilter='all'/,'normal Upcoming must default to All without persisting a hidden preference');
assert.match(css,/\.atlas-upcoming-filterbar/,'normal Upcoming filter styling missing');

assert.match(house,/function houseDraftSnapshot\(\)/,'House draft snapshot protection missing');
assert.match(house,/persist===false&&houseDraftSnapshot\(\)/,'background sync redraws must defer while a House input is focused');
assert.match(house,/pendingBackgroundRender=true/,'House must remember a deferred background redraw');
assert.match(house,/restoreHouseDraft\(draft\)/,'explicit House redraws must restore an active draft');
assert.match(house,/#widgetTodoInput,\[data-list-item-input\],\[data-list-name-input\]/,'House To-do and List entry fields must be protected');

console.log('Upcoming filters + House input stability contracts: PASS');
