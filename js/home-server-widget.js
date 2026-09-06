// Atlas Home Server widget. Milestone one uses safe mock status only; API wiring comes later.
(function(root){
  'use strict';
  if(typeof ATLAS_WIDGETS==='undefined'||typeof renderWidget!=='function')return;

  ATLAS_WIDGETS.server={title:'Home Server',code:'HOME',zone:'bottom'};
  const baseDefaultWidgetLayout=defaultWidgetLayout;
  defaultWidgetLayout=function(){const layout=baseDefaultWidgetLayout();layout.server=layout.server||{open:false,zone:'bottom',order:2};return layout};
  const baseRenderWidget=renderWidget;
  let snapshot={
    services:[
      {id:'proxmox',name:'Proxmox',status:'online',detail:'ONLINE'},
      {id:'tailscale',name:'Tailscale',status:'online',detail:'CONNECTED'},
      {id:'uptime',name:'Uptime Kuma',status:'online',detail:'HEALTHY'},
      {id:'pihole',name:'Pi-hole',status:'online',detail:'BLOCKING'}
    ],
    metrics:[
      {id:'cpu',label:'CPU',value:14},
      {id:'memory',label:'MEMORY',value:38},
      {id:'storage',label:'STORAGE',value:42}
    ]
  };

  const clone=value=>JSON.parse(JSON.stringify(value));
  function statusClass(status){return status==='online'?'server-ok':status==='warn'?'server-warn':status==='offline'?'server-off':'server-unknown'}
  function serverWidget(options={}){
    const services=Array.isArray(snapshot.services)?snapshot.services:[],metrics=Array.isArray(snapshot.metrics)?snapshot.metrics:[];
    const serviceRows=`<div class="widget-list server-service-list">${services.map(service=>`<div class="widget-row ${statusClass(service.status)}"><i></i><div><strong>${esc(service.name)}</strong><small>${esc(service.detail||String(service.status||'UNKNOWN').toUpperCase())}</small></div><em>${esc(String(service.status||'unknown').toUpperCase())}</em></div>`).join('')}</div>`;
    const metricRows=`<div class="server-widget-metrics">${metrics.map(metric=>{const value=Math.max(0,Math.min(100,Number(metric.value)||0));return `<div class="widget-kpi"><span>${esc(metric.label)}</span><b>${value}%</b></div>`}).join('')}</div>`;
    return widgetShell('server',serviceRows+metricRows,'MOCK / READ ONLY',options);
  }

  renderWidget=function(id,options={}){if(id==='server')return serverWidget(options);return baseRenderWidget(id,options)};

  function installMenuItem(){const rail=document.getElementById('utilityRail');if(!rail||rail.querySelector('[data-widget-toggle="server"]'))return;const button=document.createElement('button');button.type='button';button.className='system-item';button.dataset.widgetToggle='server';button.textContent='Home Server';const calendar=rail.querySelector('[data-widget-toggle="calendar"]');if(calendar)calendar.insertAdjacentElement('afterend',button);else rail.appendChild(button)}
  installMenuItem();

  function rerender(){if(root.AtlasHouse?.isActive?.())root.AtlasHouse.render();else if(state?.settings?.activeTab==='home')renderHome()}
  root.AtlasHomeServer=Object.freeze({version:'1',getSnapshot:()=>clone(snapshot),setSnapshot(next){snapshot=clone(next||{services:[],metrics:[]});rerender()},resetMock(){snapshot={services:[{id:'proxmox',name:'Proxmox',status:'online',detail:'ONLINE'},{id:'tailscale',name:'Tailscale',status:'online',detail:'CONNECTED'},{id:'uptime',name:'Uptime Kuma',status:'online',detail:'HEALTHY'},{id:'pihole',name:'Pi-hole',status:'online',detail:'BLOCKING'}],metrics:[{id:'cpu',label:'CPU',value:14},{id:'memory',label:'MEMORY',value:38},{id:'storage',label:'STORAGE',value:42}]};rerender()}});
})(window);
