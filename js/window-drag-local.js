// Atlas v0.16.9-r21 · local draggable windows.
// Binds only to window headers. No document-level pointerdown interception.
(function(root){
  'use strict';

  const windowSel='.modal,.atlas-note-editor-sheet,.atlas-vnote-sheet,.atlas-command-shell';
  const handleSel='.modal-head,.atlas-note-editor-head,.atlas-vnote-head,.atlas-command-input-row,[data-atlas-window-handle]';
  const interactiveSel='button,a,input,textarea,select,summary,details,[contenteditable="true"],[data-no-window-drag]';
  const margin=8;

  function numeric(el,name){return parseFloat(el.style.getPropertyValue(name))||0}

  function clamp(win,x,y,baseLeft,baseTop,width,height){
    const maxX=Math.max(margin-baseLeft,innerWidth-margin-width-baseLeft);
    const maxY=Math.max(margin-baseTop,innerHeight-margin-Math.min(height,innerHeight-margin*2)-baseTop);
    return {
      x:Math.min(Math.max(x,margin-baseLeft),maxX),
      y:Math.min(Math.max(y,margin-baseTop),maxY)
    };
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
      const startX=numeric(win,'--atlas-window-x'),startY=numeric(win,'--atlas-window-y');
      const baseLeft=rect.left-startX,baseTop=rect.top-startY;
      const state={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:startX,y:startY,baseLeft,baseTop,width:rect.width,height:rect.height};
      win.classList.add('atlas-window-dragging');
      try{handle.setPointerCapture(e.pointerId)}catch(_){ }

      const move=ev=>{
        if(ev.pointerId!==state.id)return;
        const next=clamp(win,state.x+ev.clientX-state.sx,state.y+ev.clientY-state.sy,state.baseLeft,state.baseTop,state.width,state.height);
        win.style.setProperty('--atlas-window-x',Math.round(next.x)+'px');
        win.style.setProperty('--atlas-window-y',Math.round(next.y)+'px');
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
  // Dynamic Atlas windows are mounted as top-level overlays. Watching only direct
  // body additions catches those lifecycle mounts without observing every DOM edit
  // inside editors, notes, widgets and the network graph.
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes||[])if(node.nodeType===1)scan(node);
    }
  });
  observer.observe(document.body,{childList:true});

  root.AtlasWindowDragLocal=Object.freeze({scan,bind});
})(window);
