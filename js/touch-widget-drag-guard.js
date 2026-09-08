// Disable movable Atlas widgets on touch-first mobile devices while preserving desktop drag.
(function(root){
  'use strict';
  if(typeof beginWidgetDrag!=='function')return;

  const baseBeginWidgetDrag=beginWidgetDrag;

  function isIOSLike(){
    try{
      const ua=navigator.userAgent||'';
      return Number(navigator.maxTouchPoints||0)>0&&(/iPad|iPhone|iPod/.test(ua)||/Macintosh/.test(ua));
    }catch(_){return false}
  }

  function dragBlocked(event){
    if(event&&event.pointerType==='touch')return true;
    return isIOSLike();
  }

  beginWidgetDrag=function(id,event){
    if(dragBlocked(event))return;
    return baseBeginWidgetDrag(id,event);
  };

  root.AtlasTouchWidgetDragGuard=Object.freeze({version:'1',dragBlocked});
})(window);
