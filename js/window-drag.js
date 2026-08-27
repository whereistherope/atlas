// Atlas temporary window movement. Presentation state only; nothing is persisted.
(function(root){
  'use strict';

  const WINDOW_SELECTOR='.overlay.open > .modal, .atlas-vnote-overlay.open .atlas-vnote-sheet, .atlas-command-backdrop.open .atlas-command-shell, [role="dialog"].atlas-window-opt-in';
  const HANDLE_SELECTOR='.modal-head, .atlas-vnote-head, .atlas-command-input-row, [data-atlas-window-handle]';
  let active=null;

  function isInteractiveTarget(target){
    return !!target.closest('button,a,input,textarea,select,summary,[contenteditable="true"],[data-no-window-drag]');
  }

  function makeMovable(win){
    if(!win||win.dataset.atlasMovable==='1')return;
    const handle=win.querySelector(HANDLE_SELECTOR);
    if(!handle)return;
    win.dataset.atlasMovable='1';
    win.classList.add('atlas-window-movable');
    handle.classList.add('atlas-window-handle');
  }

  function scan(rootNode=document){
    rootNode.querySelectorAll?.('.modal,.atlas-vnote-sheet,.atlas-command-shell,[role="dialog"].atlas-window-opt-in').forEach(makeMovable);
  }

  function start(event){
    const handle=event.target.closest?.(HANDLE_SELECTOR);
    if(!handle||isInteractiveTarget(event.target))return;
    const win=handle.closest('.modal,.atlas-vnote-sheet,.atlas-command-shell,[role="dialog"].atlas-window-opt-in');
    if(!win||!win.classList.contains('atlas-window-movable'))return;
    const rect=win.getBoundingClientRect();
    const x=parseFloat(win.style.getPropertyValue('--atlas-window-x'))||0;
    const y=parseFloat(win.style.getPropertyValue('--atlas-window-y'))||0;
    active={win,handle,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x,y,width:rect.width,height:rect.height};
    win.classList.add('atlas-window-dragging');
    try{handle.setPointerCapture(event.pointerId)}catch(_){ }
    event.preventDefault();
  }

  function move(event){
    if(!active||event.pointerId!==active.pointerId)return;
    const margin=8;
    let nextX=active.x+(event.clientX-active.startX);
    let nextY=active.y+(event.clientY-active.startY);
    const rect=active.win.getBoundingClientRect();
    const currentX=parseFloat(active.win.style.getPropertyValue('--atlas-window-x'))||0;
    const currentY=parseFloat(active.win.style.getPropertyValue('--atlas-window-y'))||0;
    const baseLeft=rect.left-currentX,baseTop=rect.top-currentY;
    const minX=margin-baseLeft,maxX=innerWidth-margin-active.width-baseLeft;
    const minY=margin-baseTop,maxY=innerHeight-margin-Math.min(active.height,innerHeight-margin*2)-baseTop;
    nextX=Math.min(Math.max(nextX,minX),Math.max(minX,maxX));
    nextY=Math.min(Math.max(nextY,minY),Math.max(minY,maxY));
    active.win.style.setProperty('--atlas-window-x',`${Math.round(nextX)}px`);
    active.win.style.setProperty('--atlas-window-y',`${Math.round(nextY)}px`);
    event.preventDefault();
  }

  function stop(event){
    if(!active||event.pointerId!==active.pointerId)return;
    active.win.classList.remove('atlas-window-dragging');
    try{active.handle.releasePointerCapture(event.pointerId)}catch(_){ }
    active=null;
  }

  function resetClosedWindows(){
    document.querySelectorAll('.atlas-window-movable').forEach(win=>{
      const host=win.closest('.overlay,.atlas-vnote-overlay,.atlas-command-backdrop');
      const open=host?.classList.contains('open');
      if(host&&!open){
        win.style.removeProperty('--atlas-window-x');
        win.style.removeProperty('--atlas-window-y');
      }
    });
  }

  document.addEventListener('pointerdown',start,true);
  document.addEventListener('pointermove',move,true);
  document.addEventListener('pointerup',stop,true);
  document.addEventListener('pointercancel',stop,true);

  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList')record.addedNodes.forEach(node=>{if(node.nodeType===1){makeMovable(node);scan(node)}});
      if(record.type==='attributes'){makeMovable(record.target.querySelector?.('.modal,.atlas-vnote-sheet,.atlas-command-shell')||record.target);}
    }
    scan();resetClosedWindows();
  });

  function mount(){
    scan();
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  root.AtlasWindowDrag=Object.freeze({scan});
})(window);
