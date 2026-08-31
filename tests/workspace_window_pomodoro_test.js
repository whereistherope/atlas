const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const drag=read('js/window-drag-local.js');
const ux=read('styles/editor-ux.css');
const pomo=read('js/pomodoro-widget.js');
const pomoCss=read('styles/pomodoro-widget.css');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');

for(const token of [
  "win.style.setProperty('position','fixed','important')",
  "win.style.setProperty('left',rect.left+'px','important')",
  "win.style.setProperty('top',rect.top+'px','important')",
  "win.style.setProperty('transform','none','important')",
  "win.style.setProperty('translate','none','important')",
  'ev.clientX-state.dx',
  'ev.clientY-state.dy'
]) assert(drag.includes(token),`free-window movement contract missing: ${token}`);
assert(!drag.includes('widgetSnapTarget'),'editor-window movement must not reuse widget docking/snap behaviour');
assert(!drag.includes('data-widget-snap'),'editor-window movement must remain independent of widget docking');

for(const token of [
  '.atlas-vnote-scroll{min-height:0;flex:1;overflow:auto;padding:14px;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column}',
  '.atlas-vnote-body{display:block;width:100%;flex:1 1 240px;min-height:120px;max-height:none',
  '.atlas-note-compose{display:flex;flex:1 1 240px;min-height:120px}',
  '#projectOverlay .atlas-project-rich-body{flex:1 1 auto;min-height:80px;max-height:none}'
]) assert(ux.includes(token),`responsive editor contract missing: ${token}`);

for(const token of [
  "ATLAS_WIDGETS.pomodoro={title:'Pomodoro',code:'FOCUS',zone:'right'}",
  "layout.pomodoro={open:false,zone:'right',order:5}",
  "renderWidget=function(id){return id==='pomodoro'?pomodoroWidget():originalRender(id)}",
  "const KEY='atlas_pomodoro_v1'",
  '25*60*1000',
  '5*60*1000',
  '15*60*1000',
  'root.AtlasPomodoro=Object.freeze'
]) assert(pomo.includes(token),`Pomodoro contract missing: ${token}`);
assert(pomoCss.includes('.pomodoro-clock'),'Pomodoro presentation missing');
assert(bootstrap.includes("loadStyle('./styles/pomodoro-widget.css')"),'Pomodoro CSS must boot');
assert(bootstrap.includes("loadScript('./js/pomodoro-widget.js','Atlas Pomodoro widget')"),'Pomodoro JS must boot');
assert(sw.includes("'./styles/pomodoro-widget.css'"),'Pomodoro CSS must be offline');
assert(sw.includes("'./js/pomodoro-widget.js'"),'Pomodoro JS must be offline');
assert(bootstrap.includes("const BUILD='0169r34'"),'r34 bootstrap expected');
assert(sw.includes("atlas-shell-0.16.9-r34"),'r34 shell expected');

console.log('Atlas free-window / responsive-editor / Pomodoro contracts: PASS');
