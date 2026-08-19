// Atlas v0.13.2-r2 visual table controls.
(function(root){
  'use strict';

  let savedRange=null;
  let activeCell=null;

  function visualEditor(){return document.getElementById('atlasVisualNoteEditor')}
  function body(){return document.getElementById('avBody')}
  function isOpen(){return visualEditor()?.classList.contains('open')}

  function selectionInBody(){
    const sel=root.getSelection?.(),el=body();
    return !!(sel&&sel.rangeCount&&el&&el.contains(sel.anchorNode));
  }

  function rememberSelection(){
    if(!selectionInBody())return;
    const sel=root.getSelection();
    savedRange=sel.getRangeAt(0).cloneRange();
    let node=sel.anchorNode;
    if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;
    activeCell=node?.closest?.('th,td')||null;
  }

  function restoreSelection(){
    const el=body();if(!el)return false;
    el.focus();
    const sel=root.getSelection();
    sel.removeAllRanges();
    if(savedRange&&el.contains(savedRange.commonAncestorContainer)){
      sel.addRange(savedRange);
      return true;
    }
    const range=document.createRange();
    range.selectNodeContents(el);range.collapse(false);sel.addRange(range);
    return false;
  }

  function placeCaret(node){
    const range=document.createRange(),sel=root.getSelection();
    range.selectNodeContents(node);range.collapse(false);sel.removeAllRanges();sel.addRange(range);
    savedRange=range.cloneRange();
    activeCell=node.closest?.('th,td')||null;
  }

  function insertNode(node){
    restoreSelection();
    const sel=root.getSelection();if(!sel?.rangeCount)return;
    const range=sel.getRangeAt(0);range.deleteContents();range.insertNode(node);
    const spacer=document.createElement('p');spacer.innerHTML='<br>';node.after(spacer);placeCaret(spacer);
  }

  function insertTable(){
    const wrap=document.createElement('div');wrap.className='atlas-table-wrap';
    const table=document.createElement('table');
    const thead=document.createElement('thead'),tbody=document.createElement('tbody'),headRow=document.createElement('tr');
    ['Column 1','Column 2'].forEach(text=>{const th=document.createElement('th');th.textContent=text;headRow.append(th)});
    thead.append(headRow);
    for(let r=0;r<2;r++){
      const tr=document.createElement('tr');
      for(let c=0;c<2;c++)tr.append(document.createElement('td'));
      tbody.append(tr);
    }
    table.append(thead,tbody);wrap.append(table);insertNode(wrap);
    const first=table.querySelector('th');if(first)placeCaret(first);
  }

  function selectedCell(){
    if(activeCell&&body()?.contains(activeCell))return activeCell;
    restoreSelection();
    let node=root.getSelection()?.anchorNode;
    if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;
    return node?.closest?.('th,td')||null;
  }

  function selectedTable(){return selectedCell()?.closest('table')||null}

  function addRow(){
    const cell=selectedCell(),table=cell?.closest('table');
    if(!cell||!table)return root.toast?.('Place the cursor inside a table first');
    const sourceRow=cell.parentElement,cols=table.rows[0]?.cells.length||1,tr=document.createElement('tr');
    for(let i=0;i<cols;i++)tr.append(document.createElement('td'));
    sourceRow.after(tr);placeCaret(tr.cells[Math.min(cell.cellIndex,tr.cells.length-1)]||tr.cells[0]);root.toast?.('Row added');
  }

  function deleteRow(){
    const cell=selectedCell(),table=cell?.closest('table');
    if(!cell||!table)return root.toast?.('Place the cursor inside a table first');
    const row=cell.parentElement;
    if(row.parentElement?.tagName==='THEAD')return root.toast?.('Header row cannot be deleted');
    const bodyRows=[...table.tBodies].flatMap(tb=>[...tb.rows]);
    if(bodyRows.length<=1)return root.toast?.('Keep at least one content row');
    const next=row.nextElementSibling||row.previousElementSibling;row.remove();
    const target=next?.cells[Math.min(cell.cellIndex,(next.cells.length||1)-1)]||table.querySelector('tbody td');if(target)placeCaret(target);
    root.toast?.('Row deleted');
  }

  function addColumn(){
    const cell=selectedCell(),table=cell?.closest('table');
    if(!cell||!table)return root.toast?.('Place the cursor inside a table first');
    const index=cell.cellIndex+1;
    [...table.rows].forEach(row=>{
      const tag=row.parentElement?.tagName==='THEAD'?'th':'td',newCell=document.createElement(tag);
      const before=row.cells[index]||null;row.insertBefore(newCell,before);
    });
    const target=cell.parentElement.cells[index]||cell;placeCaret(target);root.toast?.('Column added');
  }

  function deleteColumn(){
    const cell=selectedCell(),table=cell?.closest('table');
    if(!cell||!table)return root.toast?.('Place the cursor inside a table first');
    const cols=table.rows[0]?.cells.length||0;
    if(cols<=1)return root.toast?.('Keep at least one column');
    const index=cell.cellIndex;
    [...table.rows].forEach(row=>row.cells[index]?.remove());
    const target=table.rows[Math.min(cell.parentElement.rowIndex,table.rows.length-1)]?.cells[Math.min(index,cols-2)]||table.querySelector('th,td');if(target)placeCaret(target);
    root.toast?.('Column deleted');
  }

  function deleteTable(){
    const table=selectedTable();if(!table)return root.toast?.('Place the cursor inside a table first');
    const wrap=table.closest('.atlas-table-wrap')||table;
    const spacer=document.createElement('p');spacer.innerHTML='<br>';wrap.replaceWith(spacer);placeCaret(spacer);root.toast?.('Table deleted');
  }

  function closeMenus(except=null){
    document.querySelectorAll('#atlasVisualNoteEditor details.atlas-table-menu[open]').forEach(d=>{if(d!==except)d.removeAttribute('open')});
  }

  function installControls(){
    const toolbar=document.querySelector('#atlasVisualNoteEditor .atlas-vnote-toolbar');if(!toolbar||toolbar.dataset.tableR2)return;
    toolbar.dataset.tableR2='1';
    toolbar.querySelectorAll('[data-vrich="row"],[data-vrich="col"]').forEach(button=>button.remove());
    const tableButton=toolbar.querySelector('[data-vrich="table"]');if(!tableButton)return;
    tableButton.textContent='Insert Table';
    const menu=document.createElement('details');menu.className='atlas-table-menu';
    menu.innerHTML='<summary>Table ▾</summary><div class="atlas-table-menu-panel"><button type="button" data-table-op="add-row">Add row below</button><button type="button" data-table-op="delete-row">Delete row</button><button type="button" data-table-op="add-col">Add column right</button><button type="button" data-table-op="delete-col">Delete column</button><button type="button" class="danger" data-table-op="delete-table">Delete table</button></div>';
    tableButton.after(menu);
  }

  document.addEventListener('selectionchange',()=>{if(isOpen()&&selectionInBody())rememberSelection()});

  document.addEventListener('pointerdown',event=>{
    if(!isOpen())return;
    if(event.target.closest?.('#avBody'))setTimeout(rememberSelection,0);
    if(event.target.closest?.('#atlasVisualNoteEditor [data-vrich="table"], #atlasVisualNoteEditor .atlas-table-menu'))rememberSelection();
  },true);

  document.addEventListener('click',event=>{
    if(!isOpen())return;
    const insert=event.target.closest?.('#atlasVisualNoteEditor [data-vrich="table"]');
    if(insert){event.preventDefault();event.stopImmediatePropagation();insertTable();closeMenus();return}
    const op=event.target.closest?.('#atlasVisualNoteEditor [data-table-op]');
    if(op){
      event.preventDefault();event.stopPropagation();
      const action=op.dataset.tableOp;
      if(action==='add-row')addRow();else if(action==='delete-row')deleteRow();else if(action==='add-col')addColumn();else if(action==='delete-col')deleteColumn();else if(action==='delete-table')deleteTable();
      closeMenus();return;
    }
    const details=event.target.closest?.('#atlasVisualNoteEditor details.atlas-table-menu');if(!details)closeMenus();
  },true);

  const observer=new MutationObserver(()=>installControls());
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installControls,{once:true});else installControls();

  root.AtlasVisualTableControls=Object.freeze({version:'0.13.2-r2'});
})(window);
