(function(){
'use strict';

var CACHE_KEY='atlas_house_legacy_snapshot_v1';
var COLOURS={slate:'#7f898d',blue:'#6689a5',teal:'#5f918b',green:'#76916b',amber:'#ae8954',red:'#a66767',purple:'#88749b',pink:'#a67689'};
var lastSignature='';
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
function personLabel(event){var person=String(event&&event.person||'');if(person==='fraser')return'Fraser';if(person==='alyssa')return'Alyssa';if(person==='together')return'Together';return'Together'}
function colour(event){return COLOURS[String(event&&event.color||'')]||'#70899a'}
function upcoming(){var start=todayKey(),end=dateKey(addDays(new Date(),30)),events=calendar().filter(function(event){return event&&event.date>=start&&event.date<=end});events.sort(function(a,b){var av=String(a.date||'')+' '+String(a.startTime||''),bv=String(b.date||'')+' '+String(b.startTime||'');return av<bv?-1:av>bv?1:0});return events}
function signature(events){var out=[],i,event;for(i=0;i<events.length;i++){event=events[i]||{};out.push(String(event.id||'')+'@'+String(event.updatedAt||'')+'@'+String(event.date||'')+'@'+String(event.startTime||'')+'@'+String(event.color||'')+'@'+String(event.person||''))}return out.join('|')}
function rowMarkup(event){var title=event&&event.title?event.title:'Untitled event',time=event&&event.startTime?' · '+esc(event.startTime):'',linked=event&&(event.entangledId||event.sourceEventId)?' ↔':'',main;if(event&&event.entryType==='travel'){main='<strong>'+esc(title)+linked+'</strong><small>'+esc(event.date||'')+time+'</small>'}else{main='<strong>'+esc(personLabel(event))+'</strong><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:700">'+esc(title)+linked+'</span><small>'+esc(event.date||'')+time+'</small>'}return '<div class="widget-row" data-house-calendar-id="'+esc(event&&event.id||'')+'" role="button" tabindex="0" aria-label="Edit '+esc(title)+'" style="cursor:pointer"><i style="background-color:'+colour(event)+'"></i><div>'+main+'</div><em>Us</em></div>'}
function render(){var list=byId('upcomingList'),meta=byId('upcomingMeta'),events=upcoming(),sig=signature(events),html='',i,top;if(!list)return;if(meta)meta.innerHTML=events.length+' / 30D · Us';if(sig===lastSignature&&list.querySelectorAll('.widget-row').length===events.length)return;top=list.parentNode&&typeof list.parentNode.scrollTop==='number'?list.parentNode.scrollTop:0;if(!events.length){list.innerHTML='<div class="widget-empty">Nothing scheduled.</div>';lastSignature=sig;return}for(i=0;i<events.length;i++)html+=rowMarkup(events[i]);list.innerHTML=html;lastSignature=sig;if(list.parentNode&&typeof list.parentNode.scrollTop==='number')list.parentNode.scrollTop=top}
function start(){render();if(timer)clearInterval(timer);timer=setInterval(render,1500)}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('online',function(){setTimeout(render,250)});
}());
