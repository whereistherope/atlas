const fs=require('fs');
const assert=require('assert');

const house=fs.readFileSync('styles/house.css','utf8');
const scroll=fs.readFileSync('styles/house-upcoming-scroll.css','utf8');

assert.match(house,/grid-template-rows:292px minmax\(0,\.78fr\) minmax\(0,1fr\)/,'Desktop House first row must be fixed by Calendar height, not Upcoming content');
assert.match(house,/\.house-widget-slot\{min-width:0;min-height:0;overflow:hidden\}/,'House grid slots must clip content instead of enlarging rows');
assert.match(house,/\.house-upcoming\{grid-area:upcoming;min-height:0;overflow:hidden\}/,'Upcoming grid slot must stay bounded to the Calendar row');
assert.match(scroll,/\.house-atlas-board \.house-upcoming>\.atlas-widget\{[\s\S]*height:100%;[\s\S]*min-height:0;[\s\S]*overflow:hidden/,'Upcoming widget must fill but not enlarge its grid slot');
assert.match(scroll,/\.house-atlas-board \.house-upcoming \.widget-body\{[\s\S]*min-height:0!important;[\s\S]*overflow-y:auto!important/,'Upcoming body must own vertical scrolling');
assert.match(scroll,/\.house-atlas-board \.house-upcoming \.widget-list\{height:auto;min-height:0;overflow:visible\}/,'Upcoming list must flow naturally inside its scroll body');

console.log('House Upcoming bounded layout contract ok');
