// Atlas Travel: scheduled flight-time lookup and monochrome aircraft glyphs.
(function(root){
  'use strict';
  const cache=new Map();
  let timer=0,requestId=0;

  function planeSvg(kind='flight'){
    const angle=kind==='depart'?-10:kind==='arrive'?10:0;
    return `<svg class="atlas-aircraft-glyph" viewBox="0 0 28 22" role="img" aria-label="${kind==='depart'?'Departing flight':kind==='arrive'?'Arriving flight':'Flight'}"><path class="atlas-aircraft-runway" d="M2 19.25H26"/><path class="atlas-aircraft-body" transform="rotate(${angle} 14 11)" d="M4.1 13.8 10.6 11 7.7 6.6l1.8-.7 5 3.9 6.8-2.3c1.5-.5 3 .2 3.5 1.6.2.6-.1 1.2-.8 1.5L9.2 16.8 4.1 13.8Z"/></svg>`;
  }
  function travelIcon(event){
    const isMelbourne=value=>typeof root.calendarTravelIsMelbourne==='function'&&root.calendarTravelIsMelbourne(value);
    if(isMelbourne(event?.origin))return planeSvg('depart');
    if(isMelbourne(event?.destination))return planeSvg('arrive');
    return planeSvg('flight');
  }
  root.calendarTravelIcon=travelIcon;

  function flightInput(){return document.getElementById('calFlight')}
  function statusNode(){
    const input=flightInput();if(!input)return null;
    let node=document.getElementById('calFlightLookupStatus');
    if(!node){node=document.createElement('small');node.id='calFlightLookupStatus';node.className='calendar-flight-lookup-status';node.textContent='Enter a flight number to fill scheduled times.';input.insertAdjacentElement('afterend',node)}
    return node;
  }
  function setStatus(text,state=''){const node=statusNode();if(!node)return;node.textContent=text;node.dataset.state=state}
  function cleanFlight(value){return String(value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10)}
  function validFlight(value){return /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(value)}
  function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)}
  function isTravelEditor(){return document.getElementById('calEntryType')?.value==='travel'}
  function applyTimes(result){
    const start=document.getElementById('calStart'),end=document.getElementById('calEnd');
    if(start&&result.departureTime)start.value=result.departureTime;
    if(end&&result.arrivalTime)end.value=result.arrivalTime;
    try{root.refreshCalendarTimeZoneHint?.()}catch(_){}
  }
  async function fetchTimes(flightNumber,date){
    const key=`${date}|${flightNumber}`;if(cache.has(key))return cache.get(key);
    const cloud=root.AtlasCloud,status=cloud?.getStatus?.();
    if(!status?.authenticated)throw new Error('Sign in to Atlas Cloud to look up flight times.');
    const session=await cloud.getSession?.();
    const token=session?.access_token,config=root.ATLAS_CLOUD_CONFIG;
    if(!token||!config?.url||!config?.publishableKey)throw new Error('Atlas Cloud session unavailable.');
    const response=await fetch(`${config.url}/functions/v1/atlas-flight-times`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':config.publishableKey},body:JSON.stringify({flightNumber,date})});
    let result={};try{result=await response.json()}catch(_){}
    if(!response.ok||!result?.ok)throw new Error(String(result?.error||'Flight times unavailable.'));
    cache.set(key,result);return result;
  }
  async function lookupFlightTimes(){
    if(!isTravelEditor())return;
    const flight=cleanFlight(flightInput()?.value),date=document.getElementById('calDate')?.value||'';
    if(!flight){setStatus('Enter a flight number to fill scheduled times.');return}
    if(!validFlight(flight)){setStatus('Enter a complete flight number, for example VA823.','warn');return}
    if(!validDate(date)){setStatus('Select the travel date first.','warn');return}
    const id=++requestId;setStatus('Looking up scheduled times…','busy');
    try{
      const result=await fetchTimes(flight,date);if(id!==requestId)return;
      applyTimes(result);setStatus(`Scheduled ${result.departureTime}–${result.arrivalTime}`,'ok');
    }catch(error){if(id!==requestId)return;setStatus(String(error?.message||'Flight times unavailable.'),'warn')}
  }
  function scheduleLookup(){clearTimeout(timer);timer=setTimeout(lookupFlightTimes,550)}
  function ensure(){if(isTravelEditor())statusNode()}

  document.addEventListener('input',event=>{if(event.target?.id==='calFlight')scheduleLookup()});
  document.addEventListener('change',event=>{if(event.target?.id==='calFlight'||event.target?.id==='calDate')scheduleLookup();if(event.target?.id==='calEntryType')setTimeout(ensure,0)});
  const observer=new MutationObserver(ensure);observer.observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();

  root.AtlasFlightTimes=Object.freeze({version:'1',lookup:lookupFlightTimes,planeSvg,travelIcon});
})(window);
