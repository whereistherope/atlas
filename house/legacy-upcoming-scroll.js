(function(){
'use strict';

var CACHE_KEY='atlas_house_legacy_snapshot_v1';
var timer=null;

function byId(id){return document.getElementById(id)}
function safeJSON(raw){try{return JSON.parse(raw)}catch(error){return null}}
function readLocal(key){try{return localStorage.getItem(key)}catch(error){return null}}
function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function pad2(value){value=String(value);return value.length<2?'0'+value:value}
function dateKey(date){return date.getFullYear()+'-'+pad2(date.getMonth()+1)+'-'+pad2(date.getDate())}
function todayKey(){return dateKey(new Date())}
function addDays(date,days){var copy=new Date(date.getFullYear(),date.getMonth(),date.getDate());copy.setDate(copy.getDate()+days);return copy}
function calendar(){var snapshot=safeJSON(readLocal(CACHE_KEY)||'null');return snapshot&&snapshot.calendar instanceof Array?snapshot.calendar:[]}
function upcoming(){var start=todayKey(),end=dateKey(addDays(new Date(),30)),events=calendar().filter(function(event){return event&&event.date>=start&&event.date<=end});events.sort(function(a,b){var av=String(a.date||'')+' '+String(a.startTime||''),bv=String(b.date||'')+' '+String(b.startTime||'');return av<bv?-1:av>bv?1:0});return events}
function signature(events){var out=[],i,event;for(i=0;i<events.length;i++){event=events[i]||{};out.push(String(event.id||'')+'@'+String(event.updatedAt||'')+'@'+String(event.date||'')+'@'+String(event.startTime||''))}return out.join('|')}
function currentMatches(list,events){var rows=list.querySelectorAll('.widget-row'),i;if(rows.length!==events.length)return false;for(i=0;i<events.length;i++)if(rows[i].getAttribute('data-house-calendar-id')!==String(events[i].id||''))return false;return true}
function rowMarkup(event){var title=event&&event.title?event.title:'Untitled event',time=event&&event.startTime?' · '+esc(event.startTime):'';return '<div class="widget-row" data-house-calendar-id="'+esc(event.id||'')+'" role="button" tabindex="0" aria-label="Edit '+esc(title)+'" style="cursor:pointer"><i></i><div><strong>'+esc(title)+'</strong><small>'+esc(event.date||'')+time+'</small></div><em>Us</em></div>'}
function ensureRail(){var list=byId('upcomingList'),body=list&&list.parentNode,rail;if(!list||!body)return null;rail=body.querySelector('.atlas-house-scroll-rail');if(!rail){rail=document.createElement('span');rail.className='atlas-house-scroll-rail';rail.setAttribute('aria-hidden','true');rail.innerHTML='<i></i>';body.appendChild(rail)}return rail}
function updateRail(){var list=byId('upcomingList'),rail=ensureRail(),thumb,track,ratio,height,maxTop,top;if(!list||!rail)return;thumb=rail.querySelector('i');if(!thumb)return;if(list.scrollHeight<=list.clientHeight+1){rail.style.display='none';return}rail.style.display='block';track=rail.clientHeight;ratio=list.clientHeight/list.scrollHeight;height=Math.max(18,Math.round(track*ratio));if(height>track)height=track;maxTop=Math.max(0,track-height);top=list.scrollHeight>list.clientHeight?Math.round(maxTop*(list.scrollTop/(list.scrollHeight-list.clientHeight))):0;thumb.style.height=height+'px';thumb.style.top=top+'px'}
function render(){var list=byId('upcomingList'),meta=byId('upcomingMeta'),events=upcoming(),sig=signature(events),html='',i,top;if(!list)return;if(meta)meta.innerHTML=events.length+' / 30D · Us';if(!events.length){if(list.getAttribute('data-house-upcoming-signature')!==sig||list.querySelector('.widget-row')){list.innerHTML='<div class="widget-empty">Nothing scheduled.</div>';list.setAttribute('data-house-upcoming-signature',sig)}updateRail();return}if(!currentMatches(list,events)||list.getAttribute('data-house-upcoming-signature')!==sig){top=list.scrollTop||0;for(i=0;i<events.length;i++)html+=rowMarkup(events[i]);list.innerHTML=html;list.setAttribute('data-house-upcoming-signature',sig);list.scrollTop=top}updateRail()}
function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(render,20)}
function bind(){var list=byId('upcomingList');if(!list)return;list.onscroll=updateRail;if(window.addEventListener)window.addEventListener('resize',schedule,false);if(window.MutationObserver)new MutationObserver(schedule).observe(list,{childList:true,subtree:true});render()}

bind();
}());
