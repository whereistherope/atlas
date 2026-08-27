// Atlas v0.16.9-r20: widget visibility guarantee.
// Presentation/navigation only. Does not alter sync, data schema, or widget content.
(function(root){
  'use strict';
  if(typeof toggleWidget!=='function'||typeof widgetIsOpen!=='function')return;

  const baseToggleWidget=toggleWidget;
  const margin=12;

  function widgetEl(id){
    try{return document.querySelector(`.atlas-widget[data-widget="${CSS.escape(id)}"]`)}catch(_){return null}
  }

  function clampFloating(id,el){
    if(!el?.classList.contains('widget-floating'))return false;
    const rect=el.getBoundingClientRect();
    const maxLeft=Math.max(margin,window.innerWidth-Math.min(rect.width,window.innerWidth-margin*2)-margin);
    const maxTop=Math.max(64,window.innerHeight-Math.min(rect.height,window.innerHeight-76)-margin);
    const left=Math.min(maxLeft,Math.max(margin,Number.isFinite(rect.left)?rect.left:margin));
    const top=Math.min(maxTop,Math.max(64,Number.isFinite(rect.top)?rect.top:76));
    if(Math.abs(left-rect.left)<1&&Math.abs(top-rect.top)<1)return false;
    el.style.left=Math.round(left)+'px';
    el.style.top=Math.round(top)+'px';
    try{
      if(state?.settings?.widgetFloat){
        state.settings.widgetFloat[id]={x:Math.round(left),y:Math.round(top)};
        save();
      }
    }catch(_){ }
    return true;
  }

  function revealWidget(id){
    const el=widgetEl(id);
    if(!el){
      try{toast?.('Widget could not be displayed.');}catch(_){ }
      return false;
    }
    clampFloating(id,el);
    const rect=el.getBoundingClientRect();
    const visible=rect.bottom>58&&rect.top<window.innerHeight-10&&rect.right>8&&rect.left<window.innerWidth-8;
    if(!visible){
      try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})}catch(_){el.scrollIntoView()}
    }
    return true;
  }

  toggleWidget=function(id){
    const wasOpen=!!widgetIsOpen(id);
    const result=baseToggleWidget(id);
    if(!wasOpen){
      requestAnimationFrame(()=>requestAnimationFrame(()=>revealWidget(id)));
    }
    return result;
  };

  let resizeTimer=null;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      document.querySelectorAll('.atlas-widget.widget-floating[data-widget]').forEach(el=>clampFloating(el.dataset.widget,el));
    },120);
  });

  root.AtlasWidgetVisibility=Object.freeze({revealWidget,clampFloating});
})(window);
