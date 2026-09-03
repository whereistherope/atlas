// Atlas calendar clarity: quiet weekend treatment and a stronger current-day marker.
(function(root){
  'use strict';
  function decorateCalendar(){
    const grid=document.querySelector('.calendar-grid');if(!grid)return;
    grid.querySelectorAll('.cal-weekday').forEach((cell,index)=>cell.classList.toggle('weekend',index===0||index===6));
    grid.querySelectorAll('.cal-cell[data-calendar-date]').forEach(cell=>{
      const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(cell.dataset.calendarDate||'');if(!match)return;
      const day=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
      const weekday=day.getDay();cell.classList.toggle('weekend',weekday===0||weekday===6);
      if(cell.classList.contains('today'))cell.setAttribute('aria-current','date');else cell.removeAttribute('aria-current');
    });
  }
  if(typeof root.renderCalendar==='function'){
    const baseRenderCalendar=root.renderCalendar;
    root.renderCalendar=function(){const result=baseRenderCalendar.apply(this,arguments);decorateCalendar();return result};
  }
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-cal-nav]'))setTimeout(decorateCalendar,0)});
  root.AtlasCalendarClarity=Object.freeze({version:'1',decorate:decorateCalendar});
})(window);
