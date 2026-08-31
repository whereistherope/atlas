// Atlas Pomodoro widget. Timer state is local runtime utility state; Atlas records are untouched.
(function(root){
  'use strict';

  if(typeof ATLAS_WIDGETS==='undefined'||typeof widgetShell!=='function')return;

  const KEY='atlas_pomodoro_v1';
  const DURATIONS={focus:25*60*1000,short:5*60*1000,long:15*60*1000};
  const LABELS={focus:'FOCUS',short:'SHORT BREAK',long:'LONG BREAK'};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return{}}};
  const initial=read();
  let timer={
    mode:['focus','short','long'].includes(initial.mode)?initial.mode:'focus',
    remaining:Number.isFinite(initial.remaining)?Math.max(0,initial.remaining):DURATIONS.focus,
    running:!!initial.running,
    endAt:Number.isFinite(initial.endAt)?initial.endAt:0,
    sessions:Number.isFinite(initial.sessions)?Math.max(0,initial.sessions):0
  };
  if(timer.running&&timer.endAt<=Date.now()){timer.running=false;timer.remaining=0}

  function persist(){try{localStorage.setItem(KEY,JSON.stringify(timer))}catch(_){}}
  function remaining(){return timer.running?Math.max(0,timer.endAt-Date.now()):Math.max(0,timer.remaining)}
  function format(ms){const total=Math.ceil(ms/1000),m=Math.floor(total/60),s=total%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function duration(){return DURATIONS[timer.mode]}
  function pct(){return Math.max(0,Math.min(100,100-(remaining()/duration()*100)))}

  function switchMode(mode){
    if(!DURATIONS[mode])return;
    timer.mode=mode;timer.running=false;timer.endAt=0;timer.remaining=DURATIONS[mode];persist();refreshWidget();
  }
  function start(){if(timer.running)return;if(remaining()<=0)timer.remaining=duration();timer.running=true;timer.endAt=Date.now()+timer.remaining;persist();paint()}
  function pause(){if(!timer.running)return;timer.remaining=remaining();timer.running=false;timer.endAt=0;persist();paint()}
  function reset(){timer.running=false;timer.endAt=0;timer.remaining=duration();persist();paint()}
  function complete(){
    if(!timer.running||remaining()>0)return;
    const wasFocus=timer.mode==='focus';
    if(wasFocus)timer.sessions+=1;
    timer.running=false;timer.endAt=0;timer.mode=wasFocus?'short':'focus';timer.remaining=duration();persist();
    root.toast?.(wasFocus?'Focus block complete · take a break':'Break complete · back to focus');
    refreshWidget();
  }

  function body(){
    const rem=remaining();
    return `<div class="atlas-pomodoro" data-pomodoro-root>
      <div class="pomodoro-modes" role="group" aria-label="Timer mode">
        <button type="button" data-pomodoro-mode="focus" class="${timer.mode==='focus'?'active':''}">25 Focus</button>
        <button type="button" data-pomodoro-mode="short" class="${timer.mode==='short'?'active':''}">5 Break</button>
        <button type="button" data-pomodoro-mode="long" class="${timer.mode==='long'?'active':''}">15 Long</button>
      </div>
      <div class="pomodoro-clock" data-pomodoro-clock>${format(rem)}</div>
      <div class="pomodoro-progress" aria-hidden="true"><i data-pomodoro-progress style="width:${pct().toFixed(2)}%"></i></div>
      <div class="pomodoro-meta"><span>${LABELS[timer.mode]}</span><span>${timer.sessions} SESSION${timer.sessions===1?'':'S'}</span></div>
      <div class="pomodoro-actions">
        <button type="button" data-pomodoro-action="${timer.running?'pause':'start'}" class="primary">${timer.running?'Pause':'Start'}</button>
        <button type="button" data-pomodoro-action="reset">Reset</button>
      </div>
    </div>`;
  }
  function pomodoroWidget(){return widgetShell('pomodoro',body(),timer.running?'RUNNING':LABELS[timer.mode])}

  ATLAS_WIDGETS.pomodoro={title:'Pomodoro',code:'FOCUS',zone:'right'};
  const originalDefault=defaultWidgetLayout;
  defaultWidgetLayout=function(){const layout=originalDefault();layout.pomodoro={open:false,zone:'right',order:5};return layout};
  const originalRender=renderWidget;
  renderWidget=function(id){return id==='pomodoro'?pomodoroWidget():originalRender(id)};

  function installMenuItem(){
    if(document.querySelector('[data-widget-toggle="pomodoro"]'))return;
    const existing=document.querySelector('[data-widget-toggle]');
    const panel=existing?.parentElement;
    if(!panel)return;
    const button=document.createElement('button');button.type='button';button.className='system-item';button.dataset.widgetToggle='pomodoro';button.textContent='Pomodoro';panel.appendChild(button);
  }

  function paint(){
    complete();
    const rootEl=document.querySelector('[data-pomodoro-root]');if(!rootEl)return;
    const clock=rootEl.querySelector('[data-pomodoro-clock]'),bar=rootEl.querySelector('[data-pomodoro-progress]');
    if(clock)clock.textContent=format(remaining());if(bar)bar.style.width=pct().toFixed(2)+'%';
  }
  function refreshWidget(){
    if(state?.settings?.activeTab!=='home'||!widgetIsOpen('pomodoro'))return;
    const current=document.querySelector('.atlas-widget[data-widget="pomodoro"]');
    if(current)current.outerHTML=pomodoroWidget();
    widgetMenuState?.();
  }

  document.addEventListener('click',e=>{
    const mode=e.target.closest('[data-pomodoro-mode]');if(mode){switchMode(mode.dataset.pomodoroMode);return}
    const action=e.target.closest('[data-pomodoro-action]');if(!action)return;
    if(action.dataset.pomodoroAction==='start')start();else if(action.dataset.pomodoroAction==='pause')pause();else if(action.dataset.pomodoroAction==='reset')reset();
    refreshWidget();
  });

  installMenuItem();
  setInterval(paint,250);
  root.AtlasPomodoro=Object.freeze({start,pause,reset,switchMode,getState:()=>({...timer,remaining:remaining()})});
})(window);
