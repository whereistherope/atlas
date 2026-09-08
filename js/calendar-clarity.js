// Atlas calendar clarity: quiet weekend treatment, current-day marker, profile linking and event editing.
(function(root){
  'use strict';
  function atlasState(){try{return typeof state!=='undefined'?state:null}catch(_){return null}}
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
  function orderCalendarForm(){
    const form=document.getElementById('calTitle')?.closest('.form');if(!form)return;
    const title=document.getElementById('calTitle')?.closest('.field');
    const timeRow=document.getElementById('calEnd')?.closest('.row3');
    const entryType=document.getElementById('calEntryType')?.closest('.field');
    const person=document.getElementById('calPersonField');
    const travel=document.getElementById('calTravelFields');
    const meta=document.getElementById('calTimeZone')?.closest('.calendar-event-extras');
    const area=document.getElementById('calArea')?.closest('.field');
    const notes=document.getElementById('calNotes')?.closest('.field');
    const link=document.getElementById('entangleRow');
    const actions=document.getElementById('saveCalendarEvent')?.closest('.inline-actions');
    if(!title||!timeRow)return;

    // Keep presentation changes idempotent. The previous broad MutationObserver could
    // repeatedly move these same nodes while the overlay was opening, starving taps
    // and freezing the main thread on mobile browsers.
    if(entryType){
      if(entryType.parentNode!==form)form.insertBefore(entryType,title);
      else if(person&&entryType.nextElementSibling!==person)form.insertBefore(entryType,person);
      else if(!person&&entryType.nextElementSibling!==title)form.insertBefore(entryType,title);
    }
    if(person&&person.nextElementSibling!==title)title.insertAdjacentElement('beforebegin',person);
    if(travel&&title.nextElementSibling!==travel)title.insertAdjacentElement('afterend',travel);
    if(meta&&timeRow.nextElementSibling!==meta)timeRow.insertAdjacentElement('afterend',meta);
    if(area&&meta&&meta.nextElementSibling!==area)meta.insertAdjacentElement('afterend',area);
    if(notes&&area&&area.nextElementSibling!==notes)area.insertAdjacentElement('afterend',notes);
    if(link&&notes&&notes.nextElementSibling!==link)notes.insertAdjacentElement('afterend',link);
    if(actions&&link&&link.nextElementSibling!==actions)link.insertAdjacentElement('afterend',actions);
  }
  function surfaceProfileLink(){
    orderCalendarForm();
    const row=document.getElementById('entangleRow');if(!row)return;
    const active=atlasState()?.settings?.activeProfile||'me';
    if(active!=='us'&&row.style.display!=='flex')row.style.display='flex';
    const copy=row.querySelector('span');if(copy){
      let heading=copy.querySelector('[data-profile-link-heading]');
      if(!heading){heading=document.createElement('small');heading.dataset.profileLinkHeading='yes';heading.className='profile-link-heading';copy.insertBefore(heading,copy.firstChild)}
      if(heading.textContent!=='Link to profiles')heading.textContent='Link to profiles';
      const strong=copy.querySelector('strong');if(strong&&strong.textContent!=='Us / House')strong.textContent='Us / House';
      const smalls=copy.querySelectorAll('small'),detail=smalls.length?smalls[smalls.length-1]:null;
      if(detail&&detail!==heading&&detail.textContent!=='Keep a linked copy on the shared Us calendar and Atlas House.')detail.textContent='Keep a linked copy on the shared Us calendar and Atlas House.';
    }
  }
  function scheduleCalendarPresentation(){setTimeout(surfaceProfileLink,0)}
  function openUpcomingForEdit(event){
    const row=event.target.closest?.('[data-calendar-id]'),current=atlasState();if(!row||!current||typeof openCalendarEvent!=='function')return false;
    const item=(current.calendar||[]).find(entry=>entry.id===row.dataset.calendarId);if(!item)return false;
    const source=item.sourceEventId&&(current.calendar||[]).find(entry=>entry.id===item.sourceEventId);
    event.preventDefault();event.stopPropagation();openCalendarEvent(source?.id||item.id);scheduleCalendarPresentation();return true;
  }
  if(typeof root.renderCalendar==='function'){
    const baseRenderCalendar=root.renderCalendar;
    root.renderCalendar=function(){const result=baseRenderCalendar.apply(this,arguments);decorateCalendar();return result};
  }
  surfaceProfileLink();
  document.addEventListener('click',event=>{
    if(openUpcomingForEdit(event))return;
    if(event.target.closest?.('[data-cal-nav]'))setTimeout(decorateCalendar,0);
    if(event.target.closest?.('[data-cal-add],[data-cal-travel-add],[data-calendar-event],[data-calendar-date]'))scheduleCalendarPresentation();
  },true);
  root.AtlasCalendarClarity=Object.freeze({version:'4',decorate:decorateCalendar,surfaceProfileLink,orderCalendarForm,openUpcomingForEdit});
})(window);
