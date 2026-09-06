// Atlas Weather widget. Reuses the same Melbourne weather source/cache as the Atlas header.
(function(root){
  'use strict';
  if(typeof ATLAS_WIDGETS==='undefined'||typeof renderWidget!=='function')return;

  ATLAS_WIDGETS.weather={title:'Weather',code:'WX',zone:'right'};
  const baseDefaultWidgetLayout=defaultWidgetLayout;
  defaultWidgetLayout=function(){const layout=baseDefaultWidgetLayout();layout.weather=layout.weather||{open:false,zone:'right',order:6};return layout};
  const baseRenderWidget=renderWidget;

  function weatherWidget(options={}){
    const api=root.AtlasHeaderWeather,current=api?.getCurrent?.();
    if(!current){
      const body='<div class="atlas-weather-readout is-loading"><div class="atlas-weather-icon" aria-hidden="true">·</div><div class="atlas-weather-copy"><strong>--°</strong><span>MELBOURNE</span><small>WEATHER LOADING</small></div></div>';
      return widgetShell('weather',body,'MELBOURNE',options);
    }
    const age=Math.max(0,Date.now()-Number(current.at||0)),stale=age>6*60*60*1000;
    const body=`<div class="atlas-weather-readout ${stale?'is-stale':''}"><div class="atlas-weather-icon" aria-hidden="true">${esc(api.iconFor?.(current.code)||current.icon||'·')}</div><div class="atlas-weather-copy"><strong>${Math.round(Number(current.temperature))}°</strong><span>${esc(api.labelFor?.(current.code)||current.label||'WEATHER')}</span><small>MELBOURNE${stale?' · CACHED':''}</small></div></div>`;
    return widgetShell('weather',body,'CURRENT',options);
  }

  renderWidget=function(id,options={}){if(id==='weather')return weatherWidget(options);return baseRenderWidget(id,options)};

  function installMenuItem(){
    const rail=document.getElementById('utilityRail');if(!rail||rail.querySelector('[data-widget-toggle="weather"]'))return;
    const button=document.createElement('button');button.type='button';button.className='system-item';button.dataset.widgetToggle='weather';button.textContent='Weather';
    const calendar=rail.querySelector('[data-widget-toggle="calendar"]');if(calendar)calendar.insertAdjacentElement('afterend',button);else rail.appendChild(button);
  }
  installMenuItem();

  function refreshVisible(){
    document.querySelectorAll('.atlas-widget[data-widget="weather"]').forEach(widget=>{
      const profileId=widget.dataset.widgetProfile||'';
      widget.outerHTML=renderWidget('weather',profileId?{profileId}:{});
    });
  }
  root.addEventListener?.('atlasweather',refreshVisible);
  root.AtlasHeaderWeather?.refresh?.();

  root.AtlasWeatherWidget=Object.freeze({version:'1',render:weatherWidget});
})(window);
