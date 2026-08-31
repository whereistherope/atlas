// Atlas local draggable windows.
// Window headers move their surface directly in viewport coordinates. No grid/snap layer.
(function(root){
  'use strict';

  const windowSel='.modal,.atlas-note-editor-sheet,.atlas-vnote-sheet,.atlas-command-shell';
  const handleSel='.modal-head,.atlas-note-editor-head,.atlas-vnote-head,.atlas-command-input-row,[data-atlas-window-handle]';
  const interactiveSel='button,a,input,textarea,select,summary,details,[contenteditable="true"],[data-no-window-drag]';
  const hostSel='.overlay,.atlas-note-editor-overlay,.atlas-vnote-overlay';
  const margin=8;
  let front=100200;

  function clampPoint(x,y,width,height){
    return {
      x:Math.min(Math.max(x,margin),Math.max(margin,innerWidth-margin-width)),
      y:Math.min(Math.max(y,margin),Math.max(margin,innerHeight-margin-height))
    };
  }

  function promote(win){
    front+=1;
    const host=win.closest(hostSel);
    if(host)host.style.setProperty('z-index',String(front),'important');
    win.style.setProperty('z-index','2','important');
  }

  function anchorToViewport(win,rect){
    // Remove centring/inset constraints once the user takes control of the window.
    win.style.setProperty('position','fixed','important');
    win.style.setProperty('left',rect.left+'px','important');
    win.style.setProperty('top',rect.top+'px','important');
    win.style.setProperty('right','auto','important');
    win.style.setProperty('bottom','auto','important');
    win.style.setProperty('margin','0','important');
    win.style.setProperty('transform','none','important');
    win.style.setProperty('translate','none','important');
    win.style.width=rect.width+'px';
    win.style.height=rect.height+'px';
  }

  function bind(win){
    if(!win||win.dataset.atlasLocalDrag==='1')return;
    const handle=win.querySelector(handleSel);if(!handle)return;
    win.dataset.atlasLocalDrag='1';
    win.classList.add('atlas-window-movable');
    handle.classList.add('atlas-window-handle');

    handle.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      if(e.target.closest?.(interactiveSel))return;
      const rect=win.getBoundingClientRect();
      anchorToViewport(win,rect);
      promote(win);
      const state={id:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top,width:rect.width,height:rect.height};
      win.classList.add('atlas-window-dragging');
      try{handle.setPointerCapture(e.pointerId)}catch(_){ }

      const move=ev=>{
        if(ev.pointerId!==state.id)return;
        const next=clampPoint(ev.clientX-state.dx,ev.clientY-state.dy,state.width,state.height);
        win.style.setProperty('left',next.x.toFixed(2)+'px','important');
        win.style.setProperty('top',next.y.toFixed(2)+'px','important');
        ev.preventDefault();
      };
      const end=ev=>{
        if(ev.pointerId!==state.id)return;
        handle.removeEventListener('pointermove',move);
        handle.removeEventListener('pointerup',end);
        handle.removeEventListener('pointercancel',end);
        win.classList.remove('atlas-window-dragging');
        try{handle.releasePointerCapture(state.id)}catch(_){ }
      };
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',end);
      handle.addEventListener('pointercancel',end);
      e.preventDefault();
    });
  }

  function scan(node=document){
    if(node.matches?.(windowSel))bind(node);
    node.querySelectorAll?.(windowSel).forEach(bind);
  }

  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes||[])if(node.nodeType===1)scan(node);
    }
  });
  observer.observe(document.body,{childList:true});

  root.AtlasWindowDragLocal=Object.freeze({scan,bind});
})(window);
