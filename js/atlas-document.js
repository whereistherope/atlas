// Atlas v0.14.0: Atlas Document v1 rich document layer.
(function(root){
  'use strict';

  const SCHEMA='atlas_document';
  const VERSION=1;
  const ALLOWED_TAGS=new Set(['P','DIV','SPAN','BR','STRONG','B','EM','I','DEL','S','STRIKE','CODE','PRE','BLOCKQUOTE','UL','OL','LI','INPUT','A','H1','H2','H3','H4','H5','H6','HR','FIGURE','IMG','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','COLGROUP','COL']);
  const SAFE_DATA=new Set(['atlasAsset','atlasLoaded','taskList','taskItem','indent','atlasCol','atlasMerge']);
  let activeNoteId='';
  let activeProjectIndex=-1;
  let selectedCells=[];
  let resizeState=null;

  function noteById(id){return state.notes.find(n=>n.id===id)||null}
  function projectByIndex(i){return Number.isInteger(i)?state.projects[i]||null:null}
  function validDoc(doc){return !!doc&&doc.schema===SCHEMA&&doc.version===VERSION&&typeof doc.html==='string'}
  function makeDoc(el){
    return {schema:SCHEMA,version:VERSION,html:sanitizeHtml(el),plainText:(el?.innerText||'').trim(),updatedAt:Date.now()};
  }

  function sanitizeHtml(rootEl){
    if(!rootEl)return'';
    const clone=rootEl.cloneNode(true);
    clone.querySelectorAll('script,style,iframe,object,embed,form,button,textarea,select').forEach(n=>n.remove());
    const walker=document.createTreeWalker(clone,NodeFilter.SHOW_ELEMENT);
    const remove=[];
    while(walker.nextNode()){
      const el=walker.currentNode;
      if(!ALLOWED_TAGS.has(el.tagName)){remove.push(el);continue}
      [...el.attributes].forEach(attr=>{
        const name=attr.name.toLowerCase();
        if(name.startsWith('on')){el.removeAttribute(attr.name);return}
        if(name==='href'){
          try{const u=new URL(attr.value,location.href);if(!['http:','https:'].includes(u.protocol))el.removeAttribute(attr.name);else el.setAttribute('href',u.href)}catch(_){el.removeAttribute(attr.name)}
          return;
        }
        if(name==='src'){
          if(el.tagName==='IMG'&&el.dataset.atlasAsset){el.removeAttribute('src');return}
          try{const u=new URL(attr.value,location.href);if(!['http:','https:','blob:'].includes(u.protocol))el.removeAttribute(attr.name)}catch(_){el.removeAttribute(attr.name)}
          return;
        }
        if(['colspan','rowspan','alt','title','type','checked','contenteditable','target','rel'].includes(name))return;
        if(name==='class'){
          const keep=[...el.classList].filter(c=>['atlas-table-wrap','atlas-md-image','task-item','atlas-doc-indented'].includes(c));
          el.className=keep.join(' ');if(!keep.length)el.removeAttribute('class');return;
        }
        if(name==='style'){
          const width=el.style.width,marginLeft=el.style.marginLeft;
          el.removeAttribute('style');if(width)el.style.width=width;if(marginLeft)el.style.marginLeft=marginLeft;return;
        }
        if(name.startsWith('data-')){
          const key=name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
          if(SAFE_DATA.has(key))return;
        }
        el.removeAttribute(attr.name);
      });
    }
    remove.reverse().forEach(el=>el.replaceWith(...el.childNodes));
    clone.querySelectorAll('img[data-atlas-asset]').forEach(img=>img.removeAttribute('src'));
    return clone.innerHTML;
  }

  async function restoreDoc(el,doc){
    if(!el||!validDoc(doc))return false;
    el.innerHTML=doc.html;
    el.querySelectorAll('li.task-item input[type="checkbox"]').forEach(input=>{input.disabled=false;input.contentEditable='false'});
    await root.AtlasMarkdown?.hydrateImages?.(el);
    installTableResizeHandles(el);
    return true;
  }

  function currentSelection(){const sel=root.getSelection?.();return sel&&sel.rangeCount?sel.getRangeAt(0):null}
  function body(){return document.getElementById('avBody')}
  function selectionCell(){
    let node=root.getSelection?.()?.anchorNode;if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;
    return node?.closest?.('th,td')||null;
  }
  function selectionBlocks(){
    const el=body(),range=currentSelection();if(!el||!range)return[];
    const blocks=[...el.querySelectorAll('p,div:not(.atlas-table-wrap),h1,h2,h3,h4,h5,h6,blockquote,li,pre')].filter(n=>{try{return range.intersectsNode(n)}catch(_){return false}});
    if(blocks.length)return blocks.filter((n,i,a)=>!a.some((other,j)=>j!==i&&other.contains(n)));
    let node=range.commonAncestorContainer;if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;const block=node.closest?.('p,div,h1,h2,h3,h4,h5,h6,blockquote,li,pre');return block&&el.contains(block)?[block]:[];
  }

  function indent(delta){
    const blocks=selectionBlocks();if(!blocks.length)return root.toast?.('Place the cursor in text first');
    blocks.forEach(block=>{
      if(block.tagName==='LI'){
        block.dataset.indent=String(Math.max(0,Math.min(8,Number(block.dataset.indent||0)+delta)));
        return;
      }
      const level=Math.max(0,Math.min(8,Number(block.dataset.indent||0)+delta));
      if(level){block.dataset.indent=String(level);block.classList.add('atlas-doc-indented');block.style.marginLeft=`${level*2}em`}
      else{delete block.dataset.indent;block.classList.remove('atlas-doc-indented');block.style.marginLeft=''}
    });
  }

  function cellsInSelection(){
    const range=currentSelection(),el=body();if(!range||!el)return[];
    const cells=[...el.querySelectorAll('th,td')].filter(cell=>{try{return range.intersectsNode(cell)}catch(_){return false}});
    if(cells.length)return cells;
    const cell=selectionCell();return cell?[cell]:[];
  }

  function rectangularCells(cells){
    if(cells.length<2)return null;
    const table=cells[0].closest('table');if(!table||cells.some(c=>c.closest('table')!==table))return null;
    if(cells.some(c=>(c.colSpan||1)!==1||(c.rowSpan||1)!==1))return null;
    const coords=cells.map(c=>({cell:c,row:c.parentElement.rowIndex,col:c.cellIndex}));
    const minR=Math.min(...coords.map(x=>x.row)),maxR=Math.max(...coords.map(x=>x.row)),minC=Math.min(...coords.map(x=>x.col)),maxC=Math.max(...coords.map(x=>x.col));
    const expected=[];for(let r=minR;r<=maxR;r++)for(let c=minC;c<=maxC;c++){const cell=table.rows[r]?.cells[c];if(cell)expected.push(cell)}
    if(expected.length!==(maxR-minR+1)*(maxC-minC+1)||expected.some(c=>!cells.includes(c)))return null;
    return {table,minR,maxR,minC,maxC,cells:expected};
  }

  function mergeSelectedCells(){
    const rect=rectangularCells(cellsInSelection());
    if(!rect)return root.toast?.('Select a rectangular group of unmerged table cells');
    const anchor=rect.table.rows[rect.minR].cells[rect.minC];
    const pieces=rect.cells.map(c=>c.innerHTML.trim()).filter(Boolean);
    anchor.colSpan=rect.maxC-rect.minC+1;anchor.rowSpan=rect.maxR-rect.minR+1;anchor.dataset.atlasMerge='true';
    if(pieces.length)anchor.innerHTML=pieces.join('<br>');
    rect.cells.filter(c=>c!==anchor).forEach(c=>c.remove());
    placeCaret(anchor);installTableResizeHandles(rect.table.closest('.atlas-table-wrap')||rect.table);root.toast?.('Cells merged');
  }

  function unmergeCell(){
    const cell=selectionCell();if(!cell)return root.toast?.('Place the cursor in a merged cell first');
    const cols=cell.colSpan||1,rows=cell.rowSpan||1;if(cols===1&&rows===1)return root.toast?.('Cell is not merged');
    const table=cell.closest('table'),startRow=cell.parentElement.rowIndex,startCol=cell.cellIndex;cell.colSpan=1;cell.rowSpan=1;delete cell.dataset.atlasMerge;
    for(let r=0;r<rows;r++){
      const row=table.rows[startRow+r];if(!row)continue;
      const addCount=r===0?cols-1:cols;
      let reference=row.cells[startCol+(r===0?1:0)]||null;
      for(let c=0;c<addCount;c++){const n=document.createElement(row.parentElement?.tagName==='THEAD'?'th':'td');row.insertBefore(n,reference)}
    }
    placeCaret(cell);installTableResizeHandles(table.closest('.atlas-table-wrap')||table);root.toast?.('Cell unmerged');
  }

  function ensureColgroup(table){
    let group=table.querySelector(':scope > colgroup');
    const count=Math.max(...[...table.rows].map(r=>[...r.cells].reduce((n,c)=>n+(c.colSpan||1),0)),1);
    if(!group){group=document.createElement('colgroup');table.prepend(group)}
    while(group.children.length<count)group.append(document.createElement('col'));
    while(group.children.length>count)group.lastElementChild.remove();
    const unset=[...group.children].every(c=>!c.style.width);
    if(unset)[...group.children].forEach(c=>c.style.width=`${100/count}%`);
    return group;
  }

  function installTableResizeHandles(scope=document){
    scope.querySelectorAll?.('.atlas-vnote-body table,.atlas-project-rich-body table,table').forEach(table=>{
      const group=ensureColgroup(table);const header=table.rows[0];if(!header)return;
      header.querySelectorAll('.atlas-col-resize').forEach(h=>h.remove());
      [...header.cells].forEach((cell,index)=>{
        if(index>=group.children.length-1)return;
        cell.style.position='relative';
        const handle=document.createElement('span');handle.className='atlas-col-resize';handle.contentEditable='false';handle.dataset.colIndex=String(index);handle.setAttribute('aria-hidden','true');cell.append(handle);
      });
    });
  }

  function beginResize(event,handle){
    const table=handle.closest('table'),group=ensureColgroup(table),index=Number(handle.dataset.colIndex),cols=[...group.children];if(!cols[index]||!cols[index+1])return;
    event.preventDefault();event.stopPropagation();handle.setPointerCapture?.(event.pointerId);
    const widths=cols.map(col=>parseFloat(col.style.width)||100/cols.length);
    resizeState={handle,table,group,index,startX:event.clientX,widths,totalPx:table.getBoundingClientRect().width||1,pointerId:event.pointerId};
    document.body.classList.add('atlas-resizing-column');
  }
  function moveResize(event){
    if(!resizeState||event.pointerId!==resizeState.pointerId)return;
    const {group,index,startX,widths,totalPx}=resizeState,delta=(event.clientX-startX)/totalPx*100,left=Math.max(8,widths[index]+delta),right=Math.max(8,widths[index+1]-delta),combined=widths[index]+widths[index+1];
    const adjustedLeft=Math.min(combined-8,left),adjustedRight=combined-adjustedLeft;
    group.children[index].style.width=`${adjustedLeft}%`;group.children[index+1].style.width=`${adjustedRight}%`;
  }
  function endResize(event){if(!resizeState||event.pointerId!==resizeState.pointerId)return;resizeState=null;document.body.classList.remove('atlas-resizing-column')}

  function placeCaret(node){const range=document.createRange(),sel=root.getSelection();range.selectNodeContents(node);range.collapse(false);sel.removeAllRanges();sel.addRange(range)}

  function installControls(){
    const toolbar=document.querySelector('#atlasVisualNoteEditor .atlas-vnote-toolbar');if(toolbar&&!toolbar.dataset.atlasDocV1){
      toolbar.dataset.atlasDocV1='1';
      const out=document.createElement('button');out.type='button';out.dataset.atlasDocOp='outdent';out.textContent='← Outdent';
      const inn=document.createElement('button');inn.type='button';inn.dataset.atlasDocOp='indent';inn.textContent='Indent →';
      const anchor=toolbar.querySelector('[data-vrich="quote"]')||toolbar.lastElementChild;anchor?.before(out,inn);
    }
    const menu=document.querySelector('#atlasVisualNoteEditor .atlas-table-menu-panel');if(menu&&!menu.dataset.atlasDocV1){
      menu.dataset.atlasDocV1='1';
      const merge=document.createElement('button');merge.type='button';merge.dataset.atlasDocOp='merge';merge.textContent='Merge selected cells';
      const unmerge=document.createElement('button');unmerge.type='button';unmerge.dataset.atlasDocOp='unmerge';unmerge.textContent='Unmerge cell';
      const danger=menu.querySelector('.danger');menu.insertBefore(merge,danger);menu.insertBefore(unmerge,danger);
    }
    installTableResizeHandles(document.getElementById('atlasVisualNoteEditor')||document);
  }

  function restoreActiveNote(){
    const n=noteById(activeNoteId),el=body();if(!n||!el)return;
    if(validDoc(n.document))setTimeout(()=>restoreDoc(el,n.document),0);
    else installTableResizeHandles(el);
    const status=document.getElementById('avStatus');if(status)status.textContent=validDoc(n.document)?'Atlas Document v1 · Markdown fallback retained':'Atlas Document v1 · will upgrade on save';
  }

  function captureNoteSave(){
    const n=noteById(activeNoteId),el=body();if(!n||!el)return;
    n.document=makeDoc(el);
  }

  function restoreProjectDocs(){
    const p=projectByIndex(activeProjectIndex);if(!p)return;
    const objective=document.getElementById('epObjectiveRich'),next=document.getElementById('epNextRich');
    if(objective&&validDoc(p.objectiveDocument))restoreDoc(objective,p.objectiveDocument);else if(objective)installTableResizeHandles(objective);
    if(next&&validDoc(p.nextDocument))restoreDoc(next,p.nextDocument);else if(next)installTableResizeHandles(next);
  }
  function captureProjectDocs(){
    const p=projectByIndex(activeProjectIndex);if(!p)return;
    const objective=document.getElementById('epObjectiveRich'),next=document.getElementById('epNextRich');
    if(objective)p.objectiveDocument=makeDoc(objective);if(next)p.nextDocument=makeDoc(next);
  }

  const baseOpen=root.AtlasMarkdown?.openNote;
  if(typeof baseOpen==='function'){
    const wrapped=function(id){activeNoteId=id;const result=baseOpen.apply(this,arguments);restoreActiveNote();installControls();return result};
    root.AtlasMarkdown=Object.freeze({...root.AtlasMarkdown,openNote:wrapped,documentVersion:VERSION});
    try{openNoteEditor=function(i){const n=state.notes[i];if(n)wrapped(n.id)}}catch(_){ }
  }
  const baseProjectOpen=typeof openProjectEditor==='function'?openProjectEditor:null;
  if(baseProjectOpen){openProjectEditor=function(i){activeProjectIndex=i;const result=baseProjectOpen.apply(this,arguments);setTimeout(()=>{restoreProjectDocs();installTableResizeHandles(document.getElementById('editorPane'))},0);return result}}

  document.addEventListener('pointerdown',event=>{
    const handle=event.target.closest?.('.atlas-col-resize');if(handle){beginResize(event,handle);return}
    if(event.target.closest?.('[data-note-open]'))activeNoteId=event.target.closest('[data-note-open]').dataset.noteOpen||activeNoteId;
  },true);
  document.addEventListener('pointermove',moveResize,true);document.addEventListener('pointerup',endResize,true);document.addEventListener('pointercancel',endResize,true);

  document.addEventListener('selectionchange',()=>{selectedCells=cellsInSelection()});
  document.addEventListener('click',event=>{
    const op=event.target.closest?.('[data-atlas-doc-op]');if(!op)return;
    event.preventDefault();event.stopPropagation();
    if(op.dataset.atlasDocOp==='indent')indent(1);else if(op.dataset.atlasDocOp==='outdent')indent(-1);else if(op.dataset.atlasDocOp==='merge')mergeSelectedCells();else if(op.dataset.atlasDocOp==='unmerge')unmergeCell();
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#atlasVisualNoteEditor [data-note-save]'))captureNoteSave();
    if(event.target.closest?.('[data-ed-action="save-project-detail"]'))captureProjectDocs();
  },true);

  document.addEventListener('keydown',event=>{
    if(event.target?.id==='avBody'&&event.key==='Tab'){
      const cell=selectionCell();if(cell)return;
      event.preventDefault();indent(event.shiftKey?-1:1);
    }
  },true);

  const observer=new MutationObserver(()=>installControls());if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installControls,{once:true});else installControls();

  root.AtlasDocument=Object.freeze({schema:SCHEMA,version:VERSION,make:makeDoc,restore:restoreDoc,isDocument:validDoc});
})(window);
