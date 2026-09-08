(function(){
'use strict';

var COLOURS={slate:'#7f898d',blue:'#6689a5',teal:'#5f918b',green:'#76916b',amber:'#ae8954',red:'#a66767',purple:'#88749b',pink:'#a67689'};

function byId(id){return document.getElementById(id)}
function sync(){
  var select=byId('houseCalendarColor'),palette=byId('houseCalendarColourPalette'),buttons,i,value;
  if(!select||!palette)return;
  value=String(select.value||'');buttons=palette.querySelectorAll('[data-house-calendar-colour]');
  for(i=0;i<buttons.length;i++)buttons[i].setAttribute('aria-pressed',buttons[i].getAttribute('data-house-calendar-colour')===value?'true':'false');
}
function ensure(){
  var select=byId('houseCalendarColor'),field,palette,auto,id,button;
  if(!select||byId('houseCalendarColourPalette')){sync();return}
  field=select.parentNode;if(!field)return;
  palette=document.createElement('div');palette.id='houseCalendarColourPalette';palette.className='house-calendar-colour-palette';palette.setAttribute('role','group');palette.setAttribute('aria-label','Calendar event colour');
  auto=document.createElement('button');auto.type='button';auto.className='house-calendar-colour-auto';auto.setAttribute('data-house-calendar-colour','');auto.setAttribute('aria-label','Automatic colour');auto.appendChild(document.createTextNode('Auto'));palette.appendChild(auto);
  for(id in COLOURS){if(!COLOURS.hasOwnProperty(id))continue;button=document.createElement('button');button.type='button';button.className='house-calendar-colour-swatch';button.setAttribute('data-house-calendar-colour',id);button.setAttribute('aria-label',id);button.title=id;button.style.backgroundColor=COLOURS[id];palette.appendChild(button)}
  select.style.display='none';field.appendChild(palette);sync();
}
function choose(target){
  var select=byId('houseCalendarColor'),value;if(!select)return;
  value=target.getAttribute('data-house-calendar-colour')||'';select.value=value;sync();
  try{var event=document.createEvent('HTMLEvents');event.initEvent('change',true,false);select.dispatchEvent(event)}catch(error){}
}
function colourButton(target){var node=target;while(node&&node!==document.body){if(node.getAttribute&&node.getAttribute('data-house-calendar-colour')!==null)return node;node=node.parentNode}return null}
function bind(){
  ensure();
  document.addEventListener('click',function(event){var button=colourButton(event.target||event.srcElement);if(button){if(event.preventDefault)event.preventDefault();choose(button);return}setTimeout(sync,0)},true);
  document.addEventListener('change',function(event){if((event.target||event.srcElement)===byId('houseCalendarColor'))sync()},true);
  var overlay=byId('houseCalendarOverlay');if(overlay&&window.MutationObserver)new MutationObserver(function(){setTimeout(function(){ensure();sync()},0)}).observe(overlay,{attributes:true,attributeFilter:['class']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
}());
