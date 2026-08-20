// Atlas v0.14.0-r6: draggable overall table width.
// Explicit-event driven only; no DOM observers.
(function(root){
  'use strict';

  let resize=null;

  function surfaceFor(table){return table?.closest?.('#avBody,.atlas-project-rich-body')||null}
  function boxFor(table){return table?.closest?.('.atlas-table-wrap')||table}

  function install(scope=document){
    const tables=scope.matches?.('table')?[scope]:[...scope.querySelectorAll?.('table')||[]];
    tables.forEach(table=>{
      const header=table.rows?.[0];if(!header)return;
      header.querySelectorAll('.atlas-table-width-resize').forEach(h=>h.remove());
      const last=header.cells?.[header.cells.length-1];if(!last)return;
      last.style.position='relative';
      const h=document.createElement('span');
      h.className='atlas-table-width-resize';
      h.contentEditable='false';
      h.setAttribute('aria-label','Resize table width');
      h.setAttribute('title','Drag to resize table width');
      last.append(h);
    });
  }

  function start(event,handle){
    const table=handle.closest('table'),surface=surfaceFor(table),box=boxFor(table);if(!table||!surface||!box)return;
    event.preventDefault();event.stopPropagation();
    handle.setPointerCapture?.(event.pointerId);
    const surfaceRect=surface.getBoundingClientRect(),boxRect=box.getBoundingClientRect();
    resize={pointerId:event.pointerId,handle,table,box,surface,startX:event.clientX,startWidth:boxRect.width,maxWidth:surfaceRect.width};
    document.body.classList.add('atlas-resizing-table-width');
  }

  function move(event){
    if(!resize||event.pointerId!==resize.pointerId)return;
    event.preventDefault();
    const delta=event.clientX-resize.startX;
    const minPx=Math.min(420,resize.maxWidth);
    const widthPx=Math.max(minPx,Math.min(resize.maxWidth,resize.startWidth+delta));
    const pct=Math.max(30,Math.min(100,(widthPx/resize.maxWidth)*100));
    resize.box.style.width=`${pct.toFixed(2)}%`;
    resize.box.style.maxWidth='100%';
    if(resize.box===resize.table)resize.table.style.width=`${pct.toFixed(2)}%`;
    else resize.table.style.width='100%';
  }

  function end(event){
    if(!resize||event.pointerId!==resize.pointerId)return;
    resize=null;document.body.classList.remove('atlas-resizing-table-width');
  }

  function activate(){
    const note=document.getElementById('avBody');if(note)install(note);
    document.querySelectorAll('.atlas-project-rich-body').forEach(install);
  }
  function schedule(){[0,20,70,180].forEach(ms=>setTimeout(activate,ms))}

  document.addEventListener('pointerdown',event=>{
    const h=event.target.closest?.('.atlas-table-width-resize');if(h){start(event,h);return}
    if(event.target.closest?.('[data-vrich="table"],[data-prich="table"],[data-table-op],.atlas-table-menu,.atlas-project-doc-table-menu'))schedule();
  },true);
  document.addEventListener('pointermove',move,true);
  document.addEventListener('pointerup',end,true);
  document.addEventListener('pointercancel',end,true);
  document.addEventListener('focusin',event=>{if(event.target.closest?.('#avBody,.atlas-project-rich-body'))schedule()});

  schedule();
  root.AtlasTableWidth=Object.freeze({version:'0.14.0-r6',refresh:activate});
})(window);
