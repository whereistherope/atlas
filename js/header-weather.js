// Atlas header weather: compact Melbourne conditions with local cache and no credentials.
(function(root){
  'use strict';
  const CACHE_KEY='atlas_melbourne_weather_v1';
  const REFRESH_MS=15*60*1000;
  const MAX_STALE_MS=6*60*60*1000;
  const URL='https://api.open-meteo.com/v1/forecast?latitude=-37.8136&longitude=144.9631&current=temperature_2m,weather_code&timezone=Australia%2FMelbourne';

  const labelFor=code=>{
    code=Number(code);
    if(code===0)return'CLEAR';
    if([1,2].includes(code))return'FAIR';
    if(code===3)return'CLOUDY';
    if([45,48].includes(code))return'FOG';
    if([51,53,55,56,57].includes(code))return'DRIZZLE';
    if([61,63,65,66,67].includes(code))return'RAIN';
    if([71,73,75,77].includes(code))return'SNOW';
    if([80,81,82,85,86].includes(code))return'SHOWERS';
    if([95,96,99].includes(code))return'STORM';
    return'WEATHER';
  };

  function mount(){
    const host=document.querySelector('.page-chrono');
    if(!host||document.getElementById('atlasWeather'))return;
    host.setAttribute('aria-label','Melbourne weather, Melbourne time and UTC time');
    const weather=document.createElement('div');
    weather.className='chrono-row chrono-weather';weather.id='atlasWeather';
    weather.innerHTML='<span>WX</span><strong id="weatherTemp">--°</strong><time id="weatherCondition">MEL</time>';
    const divider=document.createElement('span');divider.className='chrono-separator chrono-weather-separator';divider.setAttribute('aria-hidden','true');divider.textContent='|';
    const first=host.firstElementChild;host.insertBefore(weather,first);host.insertBefore(divider,first);
  }

  function readCache(){
    try{const value=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return value&&Number.isFinite(Number(value.temperature))&&Number.isFinite(Number(value.code))&&Number.isFinite(Number(value.at))?value:null}catch(_){return null}
  }
  function writeCache(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify(value))}catch(_){}}
  function paint(value,{stale=false}={}){
    mount();const temp=document.getElementById('weatherTemp'),condition=document.getElementById('weatherCondition');if(!temp||!condition)return;
    temp.textContent=`${Math.round(Number(value.temperature))}°`;
    condition.textContent=labelFor(value.code);
    const host=document.getElementById('atlasWeather');if(host)host.dataset.stale=stale?'true':'false';
  }

  async function refresh(force=false){
    mount();const cached=readCache(),age=cached?Date.now()-Number(cached.at):Infinity;
    if(cached&&age<=MAX_STALE_MS)paint(cached,{stale:age>REFRESH_MS});
    if(!force&&cached&&age<REFRESH_MS)return cached;
    if(typeof navigator!=='undefined'&&navigator.onLine===false)return cached;
    try{
      const response=await fetch(URL,{cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('weather unavailable');
      const payload=await response.json(),current=payload?.current,temperature=Number(current?.temperature_2m),code=Number(current?.weather_code);
      if(!Number.isFinite(temperature)||!Number.isFinite(code))throw new Error('weather unavailable');
      const value={temperature,code,at:Date.now()};writeCache(value);paint(value);return value;
    }catch(_){if(cached)paint(cached,{stale:true});return cached}
  }

  function start(){mount();refresh();setInterval(()=>{if(document.visibilityState!=='hidden')refresh()},REFRESH_MS);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});root.addEventListener?.('online',()=>refresh(true))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.AtlasHeaderWeather=Object.freeze({version:'1',refresh,labelFor});
})(window);
