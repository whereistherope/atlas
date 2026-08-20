// Atlas v0.14.0-r4: deterministic rich-editor integration for Safari/iPad.
// No observers. UI activation is scheduled only from explicit user/editor events.
(function(root){
  'use strict';

  let lastSurface=null;
  let lastRange=null;
  let activeCell=null;
  let selectedCells=[];
  let pendingNoteId='';

  const surfaceSelector='#avBody,.atlas-project-rich-body';

  function surfaceFor(node){
    if(!node)return null;
    if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;
    return node?.closest?.(surfaceSelector)||null;
  }

  function selectionSnapshot(){
    const sel=root.getSelection?.();
    if(!sel||!sel.rangeCount)return;
    const surface=surfaceFor(sel.anchorNode);
    if(!surface)return;
    const range=sel.getRangeAt(0);
    lastSurface=surface;
    try{lastRange=range.cloneRange()}catch(_){lastRange=null}
    let node=sel.anchorNode;
    if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;
    const cell=node?.closest?.('th,td');
    if(cell&&surface.contains(cell))activeCell=cell;
    try{
      selectedCells=[...surface.querySelectorAll('th,td')].filter(c=>range.intersectsNode(c));
    }catch(_){selectedCells=cell?[cell]:[]}
  }

  function rememberCellFromTarget(target){
    const cell=target?.closest?.('th,td');
    if(!cell)return;
    const surface=surfaceFor(cell);if(!surface)return;
    activeCell=cell;lastSurface=surface;
    try{
      const r=document.createRange();r.selectNodeContents(cell);r.collapse(false);lastRange=r;
    }catch(_){ }
    selectedCells=[cell];
  }

  function restoreSelection(){
    if(!lastSurface?.isConnected||!lastRange)return false;
    try{
      if(!lastSurface.contains(lastRange.commonAncestorContainer))return false;
      const sel=root.getSelection();sel.removeAllRanges();sel.addRange(lastRange);lastSurface.focus();return true;
    }catch(_){return false}
  }

  function setCaret(cell){
    if(!cell?.isConnected)return;
    activeCell=cell;lastSurface=surfaceFor(cell);selectedCells=[cell];
    try{
      const r=document.createRange(),sel=root.getSelection();r.selectNodeContents(cell);r.collapse(false);sel.removeAllRanges();sel.addRange(r);lastRange=r.cloneRange();lastSurface?.focus();
    }catch(_){ }
  }

  function addButton(parent,action,label,before=null){
    if(!parent||parent.querySelector(`[data-atlas-doc-op="${action}"]`))return;
    const b=document.createElement('button');b.type='button';b.dataset.atlasDocOp=action;b.textContent=label;parent.insertBefore(b,before);
  }

  function ensureNoteControls(){
    const overlay=document.getElementById('atlasVisualNoteEditor');
    if(!overlay?.classList.contains('open'))return false;
    const toolbar=overlay.querySelector('.atlas-vnote-toolbar');
    if(toolbar){
      const anchor=toolbar.querySelector('[data-vrich="quote"]')||toolbar.lastElementChild;
      addButton(toolbar,'outdent','← Outdent',anchor);
      addButton(toolbar,'indent','Indent →',anchor);
    }
    const menu=overlay.querySelector('.atlas-table-menu-panel');
    if(menu){
      const danger=menu.querySelector('.danger');
      addButton(menu,'merge','Merge selected cells',danger);
      addButton(menu,'merge-right','Merge with cell right',danger);
      addButton(menu,'merge-below','Merge with cell below',danger);
      addButton(menu,'unmerge','Unmerge cell',danger);
    }
    try{root.AtlasDocument?.refreshTables?.(document.getElementById('avBody'))}catch(_){ }
    return !!toolbar;
  }

  function ensureProjectControls(){
    const toolbars=[...document.querySelectorAll('.atlas-project-rich-toolbar')];
    if(!toolbars.length)return false;
    toolbars.forEach(toolbar=>{
      const anchor=toolbar.querySelector('[data-prich="quote"]')||toolbar.lastElementChild;
      addButton(toolbar,'outdent','← Outdent',anchor);
      addButton(toolbar,'indent','Indent →',anchor);
      const tableButton=toolbar.querySelector('[data-prich="table"]');
      if(tableButton&&!toolbar.querySelector('.atlas-project-doc-table-menu')){
        const menu=document.createElement('details');menu.className='atlas-project-doc-table-menu';menu.innerHTML='<summary>Table ▾</summary><div class="atlas-project-doc-table-panel"></div>';tableButton.after(menu);
      }
      const panel=toolbar.querySelector('.atlas-project-doc-table-panel');
      if(panel){
        addButton(panel,'merge','Merge selected cells');
        addButton(panel,'merge-right','Merge with cell right');
        addButton(panel,'merge-below','Merge with cell below');
        addButton(panel,'unmerge','Unmerge cell');
      }
    });
    document.querySelectorAll('.atlas-project-rich-body').forEach(el=>{try{root.AtlasDocument?.refreshTables?.(el)}catch(_){}});
    return true;
  }

  function restorePendingRichNote(){
    if(!pendingNoteId)return;
    const body=document.getElementById('avBody');
    const note=state?.notes?.find?.(n=>n.id===pendingNoteId);
    if(!body||!note)return;
    if(root.AtlasDocument?.isDocument?.(note.document)){
      try{root.AtlasDocument.restore(body,note.document)}catch(_){ }
    }
  }

  function activateEditors(){
    const note=ensureNoteControls();
    ensureProjectControls();
    if(note)restorePendingRichNote();
  }

  function scheduleActivation(){
    // Fixed, short retries handle the fact that legacy editors create their DOM
    // after the click that requested them. This is not a background observer.
    [0,16,50,120,260].forEach(delay=>setTimeout(activateEditors,delay));
  }

  function cellContent(cell){return cell?.innerHTML?.trim()||''}
  function combineInto(anchor,target){
    const a=cellContent(anchor),b=cellContent(target);
    if(a&&b)anchor.innerHTML=`${a}<br>${b}`;
    else if(!a&&b)anchor.innerHTML=b;
  }

  function currentCell(){return activeCell?.isConnected?activeCell:null}

  function mergeRight(){
    const cell=currentCell();if(!cell)return root.toast?.('Tap the first table cell, then choose Merge with cell right');
    const row=cell.parentElement,target=cell.nextElementSibling;
    if(!target||!target.matches('th,td')||target.parentElement!==row)return root.toast?.('No cell to the right');
    if((cell.rowSpan||1)!==1||(target.rowSpan||1)!==1)return root.toast?.('Unmerge vertically merged cells first');
    combineInto(cell,target);cell.colSpan=(cell.colSpan||1)+(target.colSpan||1);cell.dataset.atlasMerge='true';target.remove();
    setCaret(cell);try{root.AtlasDocument?.refreshTables?.(cell.closest('.atlas-table-wrap')||cell.closest('table'))}catch(_){}root.toast?.('Cells merged');
  }

  function logicalStartColumn(cell){
    let col=0;for(const c of cell.parentElement.cells){if(c===cell)return col;col+=c.colSpan||1}return col;
  }
  function cellAtLogicalColumn(row,column){
    let col=0;for(const c of row.cells){const span=c.colSpan||1;if(column>=col&&column<col+span)return c;col+=span}return null;
  }

  function mergeBelow(){
    const cell=currentCell();if(!cell)return root.toast?.('Tap the upper table cell, then choose Merge with cell below');
    const table=cell.closest('table'),rowIndex=cell.parentElement.rowIndex,nextRow=table?.rows?.[rowIndex+(cell.rowSpan||1)];
    if(!nextRow)return root.toast?.('No cell below');
    const start=logicalStartColumn(cell),target=cellAtLogicalColumn(nextRow,start);
    if(!target)return root.toast?.('No matching cell below');
    if((cell.colSpan||1)!==(target.colSpan||1))return root.toast?.('Cells must have the same width to merge vertically');
    combineInto(cell,target);cell.rowSpan=(cell.rowSpan||1)+(target.rowSpan||1);cell.dataset.atlasMerge='true';target.remove();
    setCaret(cell);try{root.AtlasDocument?.refreshTables?.(cell.closest('.atlas-table-wrap')||table)}catch(_){}root.toast?.('Cells merged');
  }

  function rectangularSelection(cells){
    const live=cells.filter(c=>c?.isConnected);if(live.length<2)return null;
    const table=live[0].closest('table');if(!table||live.some(c=>c.closest('table')!==table))return null;
    if(live.some(c=>(c.colSpan||1)!==1||(c.rowSpan||1)!==1))return null;
    const coords=live.map(cell=>({cell,row:cell.parentElement.rowIndex,col:logicalStartColumn(cell)}));
    const minR=Math.min(...coords.map(x=>x.row)),maxR=Math.max(...coords.map(x=>x.row)),minC=Math.min(...coords.map(x=>x.col)),maxC=Math.max(...coords.map(x=>x.col));
    const expected=[];
    for(let r=minR;r<=maxR;r++)for(let c=minC;c<=maxC;c++){const found=cellAtLogicalColumn(table.rows[r],c);if(found&&!expected.includes(found))expected.push(found)}
    const width=maxC-minC+1,height=maxR-minR+1;
    if(expected.length!==width*height||expected.some(c=>!live.includes(c)))return null;
    return{table,minR,maxR,minC,maxC,cells:expected};
  }

  function mergeSelected(){
    const rect=rectangularSelection(selectedCells);
    if(!rect)return root.toast?.('Select multiple rectangular cells, or use Merge right / below');
    const anchor=cellAtLogicalColumn(rect.table.rows[rect.minR],rect.minC);if(!anchor)return;
    const pieces=rect.cells.map(cellContent).filter(Boolean);if(pieces.length)anchor.innerHTML=pieces.join('<br>');
    anchor.colSpan=rect.maxC-rect.minC+1;anchor.rowSpan=rect.maxR-rect.minR+1;anchor.dataset.atlasMerge='true';rect.cells.filter(c=>c!==anchor).forEach(c=>c.remove());
    setCaret(anchor);try{root.AtlasDocument?.refreshTables?.(anchor.closest('.atlas-table-wrap')||rect.table)}catch(_){}root.toast?.('Cells merged');
  }

  function unmerge(){
    const cell=currentCell();if(!cell)return root.toast?.('Tap a merged cell first');
    const colSpan=cell.colSpan||1,rowSpan=cell.rowSpan||1;if(colSpan===1&&rowSpan===1)return root.toast?.('Cell is not merged');
    const table=cell.closest('table'),startColumn=logicalStartColumn(cell),startRow=cell.parentElement.rowIndex,tag=cell.tagName.toLowerCase();
    cell.colSpan=1;cell.rowSpan=1;delete cell.dataset.atlasMerge;
    for(let r=0;r<rowSpan;r++){
      const row=table.rows[startRow+r];if(!row)continue;
      const count=r===0?colSpan-1:colSpan;
      for(let i=0;i<count;i++){
        const newCell=document.createElement(r===0?tag:(row.parentElement?.tagName==='THEAD'?'th':'td'));
        let before=null,logical=0;
        for(const existing of row.cells){if(logical>startColumn+i){before=existing;break}logical+=existing.colSpan||1}
        row.insertBefore(newCell,before);
      }
    }
    setCaret(cell);try{root.AtlasDocument?.refreshTables?.(cell.closest('.atlas-table-wrap')||table)}catch(_){}root.toast?.('Cell unmerged');
  }

  function selectedBlocks(){
    if(!restoreSelection())return[];
    const range=root.getSelection()?.rangeCount?root.getSelection().getRangeAt(0):null,surface=lastSurface;if(!range||!surface)return[];
    const selector='p,div:not(.atlas-table-wrap),h1,h2,h3,h4,h5,h6,blockquote,li,pre';
    const blocks=[...surface.querySelectorAll(selector)].filter(n=>{try{return range.intersectsNode(n)}catch(_){return false}});
    if(blocks.length)return blocks.filter((n,i,a)=>!a.some((other,j)=>j!==i&&other.contains(n)));
    let node=range.commonAncestorContainer;if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;const block=node.closest?.(selector);return block&&surface.contains(block)?[block]:[];
  }

  function indent(delta){
    const blocks=selectedBlocks();if(!blocks.length)return root.toast?.('Place the cursor in text first');
    blocks.forEach(block=>{
      const level=Math.max(0,Math.min(8,Number(block.dataset.indent||0)+delta));
      if(level){block.dataset.indent=String(level);block.classList.add('atlas-doc-indented');block.style.marginLeft=`${level*2}em`}
      else{delete block.dataset.indent;block.classList.remove('atlas-doc-indented');block.style.marginLeft=''}
    });
    selectionSnapshot();
  }

  // Remember note identity before legacy/private editor handlers run.
  root.addEventListener('pointerdown',event=>{
    const card=event.target.closest?.('[data-note-open]');if(card)pendingNoteId=card.dataset.noteOpen||'';
    rememberCellFromTarget(event.target);
    if(event.target.closest?.('.atlas-vnote-toolbar,.atlas-table-menu,.atlas-project-rich-toolbar,.atlas-project-doc-table-menu'))return;
    const surface=surfaceFor(event.target);if(surface)setTimeout(selectionSnapshot,0);
  },true);

  root.addEventListener('click',event=>{
    const card=event.target.closest?.('[data-note-open]');if(card)pendingNoteId=card.dataset.noteOpen||pendingNoteId;
    // Any editor-opening or editor-interaction click gets a finite activation pass.
    if(card||event.target.closest?.('#captureBtn,[data-quick-add],[data-ed-action="add-note"],[data-prich],[data-vrich],.atlas-table-menu,.atlas-project-doc-table-menu'))scheduleActivation();

    const op=event.target.closest?.('[data-atlas-doc-op]');if(!op)return;
    event.preventDefault();event.stopImmediatePropagation();
    const action=op.dataset.atlasDocOp;
    if(action==='indent')indent(1);
    else if(action==='outdent')indent(-1);
    else if(action==='merge-right')mergeRight();
    else if(action==='merge-below')mergeBelow();
    else if(action==='merge')mergeSelected();
    else if(action==='unmerge')unmerge();
  },true);

  document.addEventListener('selectionchange',()=>selectionSnapshot());
  document.addEventListener('focusin',event=>{if(surfaceFor(event.target)){selectionSnapshot();scheduleActivation()}});

  root.addEventListener('keydown',event=>{
    const surface=surfaceFor(event.target);if(!surface)return;
    if(event.key==='Tab'&&!activeCell){event.preventDefault();selectionSnapshot();indent(event.shiftKey?-1:1)}
  },true);

  // Covers an editor that was already open when the upgraded runtime arrived.
  scheduleActivation();
  root.AtlasDocumentUI=Object.freeze({version:'0.14.0-r4',activate:activateEditors});
})(window);
