const fs=require('fs');
const assert=require('assert');

const house=fs.readFileSync('styles/house.css','utf8');
const scroll=fs.readFileSync('styles/house-upcoming-scroll.css','utf8');

assert.match(house,/grid-template-rows:minmax\(0,1\.55fr\) minmax\(0,\.78fr\) minmax\(0,1fr\)/,'House rows must not grow from widget min-content');
assert.match(house,/\.house-widget-slot\{min-width:0;min-height:0;overflow:hidden\}/,'House grid slots must clip content instead of enlarging rows');
assert.match(house,/\.house-upcoming\{grid-area:upcoming;min-height:0;overflow:hidden\}/,'Upcoming grid slot must stay bounded to the Calendar row');
assert.match(scroll,/\.house-atlas-board \.house-upcoming \.widget-body\{[\s\S]*overflow-y:auto!important/,'Upcoming body must own vertical scrolling');
assert.match(scroll,/\.house-atlas-board \.house-upcoming \.widget-list\{height:auto;min-height:100%;overflow:visible\}/,'Upcoming list must flow inside its scroll body');

console.log('House Upcoming bounded layout contract ok');
