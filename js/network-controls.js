// Atlas v0.15.12-r1: one collapsible control surface for the relationship map.
(function(root){
  'use strict';

  const baseDrawNetwork=typeof drawNetwork==='function'?drawNetwork:null;
  if(!baseDrawNetwork)return;

  function ensureAnchorControl(hud,scope=null){
    if(!hud)return;
    let group=hud.querySelector('[aria-label="Map layout controls"]');
    if(!group){
      group=document.createElement('div');
      group.className='zoom-controls';
      group.setAttribute('aria-label','Map layout controls');
      hud.appendChild(group);
    }
    let anchor=group.querySelector('[data-map-anchor]');
    if(!anchor){
      anchor=document.createElement('button');
      anchor.type='button';
      anchor.className='zoom-reset';
      anchor.dataset.mapAnchor='';
      anchor.setAttribute('aria-label','Anchor preferred constellation');
      anchor.textContent='Anchor';
      group.appendChild(anchor);
    }
    anchor.onclick=()=>root.AtlasNetworkLayout?.anchor?.();
  }

  function installUnifiedGraphControls(scope=null){
    const svg=document.getElementById('network');if(!svg)return;
    const wrap=svg.closest?.('.map-wrap')||svg.parentElement;if(!wrap)return;
    const mapControls=wrap.querySelector('.map-controls');
    const hud=mapControls?.querySelector('.map-hud')||wrap.querySelector('.map-hud');
    const control=wrap.querySelector('[data-network-physics]');
    if(!mapControls||!hud||!control)return;

    control.classList.add('atlas-graph-control');
    control.dataset.networkControls='';
    const summary=control.querySelector(':scope > summary');
    if(summary){
      summary.textContent='Controls';
      summary.setAttribute('aria-label','Toggle graph controls');
    }

    const panel=control.querySelector('.atlas-physics-panel');if(!panel)return;
    let mapGroup=panel.querySelector('[data-map-controls-group]');
    if(!mapGroup){
      mapGroup=document.createElement('section');
      mapGroup.className='atlas-map-controls-group';
      mapGroup.dataset.mapControlsGroup='';
      const heading=document.createElement('div');
      heading.className='atlas-control-heading';
      heading.textContent='View & layout';
      const body=document.createElement('div');
      body.className='atlas-map-control-stack';
      body.appendChild(hud);
      mapGroup.append(heading,body);
      panel.insertBefore(mapGroup,panel.firstChild);
    }else if(!mapGroup.contains(hud)){
      (mapGroup.querySelector('.atlas-map-control-stack')||mapGroup).appendChild(hud);
    }

    ensureAnchorControl(hud,svg.dataset.scope||scope);

    const physicsHeading=panel.querySelector('.atlas-physics-heading');
    if(physicsHeading)physicsHeading.textContent='Physics';

    if(control.parentElement!==mapControls)mapControls.appendChild(control);
    if(!control.dataset.unifiedInitialised){
      control.open=false;
      control.dataset.unifiedInitialised='yes';
    }
  }

  drawNetwork=function(scope){
    const result=baseDrawNetwork(scope);
    installUnifiedGraphControls(scope);
    return result;
  };

  root.AtlasNetworkControls=Object.freeze({version:'0.15.12-r1',install:installUnifiedGraphControls});
})(window);
