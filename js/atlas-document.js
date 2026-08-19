// Atlas v0.14.0: Atlas Document v1 rich document layer.
(function(root){
  'use strict';

  const SCHEMA='atlas_document';
  const VERSION=1;
  const ALLOWED_TAGS=new Set(['P','DIV','SPAN','BR','STRONG','B','EM','I','DEL','S','STRIKE','CODE','PRE','BLOCKQUOTE','UL','OL','LI','INPUT','A','H1','H2','H3','H4','H5','H6','HR','FIGURE','IMG','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','COLGROUP','COL']);
  const SAFE_DATA=new Set(['atlasAsset','atlasLoaded','taskList','taskItem','indent','atlasMerge']);
  let activeNoteId='';
  let activeProjectIndex=-1;
  let resizeState=null;

  function noteById(id){return state.notes.find(n=>n.id===id)||null}
  function projectByIndex(i){return Number.isInteger(i)?state.projects[i]||null:null}
  function validDoc(doc){return !!doc&&doc.schema===SCHEMA&&doc.version===VERSION&&typeof doc.html==='string'}
  function makeDoc(el){return{schema:SCHEMA,version:VERSION,html:sanitizeHtml(el),plainText:(el?.innerText||'').trim(),updatedAt:Date.now()}}

  function sanitizeHtml(rootEl){
    if(!rootEl)return'';
    const clone=rootEl.cloneNode(true);
    clone.querySelectorAll('script,style,iframe,object,embed,form,button,textarea,select,.atlas-col-resize').forEach(n=>n.remove());
    const walker=document.createTreeWalker(clone,NodeFilter.SHOW_ELEMENT),remove=[];
    while(walker.nextNode()){
      const el=walker.currentNode;if(!ALLOWED_TAGS.has(el.tagName)){remove.push(el);continue}
      [...el.attributes].forEach(attr=>{
        const name=attr.name.toLowerCase();
        if(name.startsWith('on')){el.removeAttribute(attr.name);return}
        if(name==='href'){
          try{const u=new URL(attr.value,location.href);if(!['http:','https:'].includes(u.protocol))el.removeAttribute(attr.name);else el.setAttribute('href',u.href)}catch(_){el.removeAttribute(attr.name)}return;
        }
        if(name==='src'){
          if(el.tagName==='IMG'&&el.dataset.atlasAsset){el.removeAttribute('src');return}
          try{const u=new URL(attr.value,location.href);if(!['http:','https:','blob:'].includes(u.protocol))el.removeAttribute(attr.name)}catch(_){el.removeAttribute(attr.name)}return;
        }
        if(['colspan','rowspan','alt','title','type','checked','contenteditable','target','rel'].includes(name))return;
        if(name==='class'){
          const keep=[...el.classList].filter(c=>['atlas-table-wrap','atlas-md-image','task-item','atlas-doc-indented'].includes(c));el.className=keep.join(' ');if(!keep.length)el.removeAttribute('class');return;
        }
        if(name==='style'){
          const width=el.style.width,marginLeft=el.style.marginLeft;el.removeAttribute('style');if(width)el.style.width=width;if(marginLeft)el.style.marginLeft=marginLeft;return;
        }
        if(name.startsWith('data-')){
          const key=name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(SAFE_DATA.has(key))return;
        }
        el.removeAttribute(attr.name);
      });
    }
    remove.reverse().forEach(el=>el.replaceWith(...el.childNodes));
    clone.querySelectorAll('img[data-atlas-asset]').forEach(img=>img.removeAttribute('src'));
    return clone.innerHTML;
  }

  async function restoreDoc(el,doc){
    if(!el||!validDoc(doc))return false;el.innerHTML=doc.html;
    el.querySelectorAll('li.task-item input[type="checkbox"]').forEach(input=>{input.disabled=false;input.contentEditable='false'});
    await root.AtlasMarkdown?.hydrateImages?.(el);installTableResizeHandles(el);return true;
  }

  function currentSelection(){const sel=root.getSelection?.();return sel&&sel.rangeCount?sel.getRangeAt(0):null}
  function body(){return document.getElementById('avBody')}
  function activeWritingSurface(){
    const range=currentSelection();if(!range)return body();let node=range.commonAncestorContainer;if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;
    return node?.closest?.('#avBody,.atlas-project-rich-body')||body();
  }
  function selectionCell(){let node=root.getSelection?.()?.anchorNode;if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;return node?.closest?.('th,td')||null}
  function placeCaret(node){const range=document.createRange(),sel=root.getSelection();range.selectNodeContents(node);range.collapse(false);sel.removeAllRanges();sel.addRange(range)}

  function selectionBlocks(){
    const el=activeWritingSurface(),range=currentSelection();if(!el||!range)return[];
    const blocks=[...el.querySelectorAll('p,div:not(.atlas-table-wrap),h1,h2,h3,h4,h5,h6,blockquote,li,pre')].filter(n=>{try{return range.intersectsNode(n)}catch(_){return false}});
    if(blocks.length)return blocks.filter((n,i,a)=>!a.some((other,j)=>j!==i&&other.contains(n)));
    let node=range.commonAncestorContainer;if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;const block=node.closest?.('p,div,h1,h2,h3,h4,h5,h6,blockquote,li,pre');return block&&el.contains(block)?[block]:[];
  }
  function indent(delta){
    const blocks=selectionBlocks();if(!blocks.length)return root.toast?.('Place the cursor in text first');
    blocks.forEach(block=>{
      const level=Math.max(0,Math.min(8,Number(block.dataset.indent||0)+delta));
      if(level){block.dataset.indent=String(level);block.classList.add('atlas-doc-indented');block.style.marginLeft=`${level*2}em`}
      else{delete block.dataset.indent;block.classList.remove('atlas-doc-indented');block.style.marginLeft=''}
    });
  }

  function cellsInSelection(){
    const range=currentSelection(),el=activeWritingSurface();if(!range||!el)return[];
    const cells=[...el.querySelectorAll('th,td')].filter(cell=>{try{return range.intersectsNode(cell)}catch(_){return false}});if(cells.length)return cells;
    const cell=selectionCell();return cell?[cell]:[];
  }
  function rectangularCells(cells){
    if(cells.length<2)return null;const table=cells[0].closest('table');if(!table||cells.some(c=>c.closest('table')!==table))return null;
    if(cells.some(c=>(c.colSpan||1)!==1||(c.rowSpan||1)!==1))return null;
    const coords=cells.map(c=>({cell:c,row:c.parentElement.rowIndex,col:c.cellIndex})),minR=Math.min(...coords.map(x=>x.row)),maxR=Math.max(...coords.map(x=>x.row)),minC=Math.min(...coords.map(x=>x.col)),maxC=Math.max(...coords.map(x=>x.col));
    const expected=[];for(let r=minR;r<=maxR;r++)for(let c=minC;c<=maxC;c++){const cell=table.rows[r]?.cells[c];if(cell)expected.push(cell)}
    if(expected.length!==(maxR-minR+1)*(maxC-minC+1)||expected.some(c=>!cells.includes(c)))return null;return{table,minR,maxR,minC,maxC,cells:expected};
  }
  function mergeRect(rect){
    const anchor=rect.table.rows[rect.minR].cells[rect.minC],pieces=rect.cells.map(c=>c.innerHTML.trim()).filter(Boolean);
    anchor.colSpan=rect.maxC-rect.minC+1;anchor.rowSpan=rect.maxR-rect.minR+1;anchor.dataset.atlasMerge='true';if(pieces.length)anchor.innerHTML=pieces.join('<br>');
    rect.cells.filter(c=>c!==anchor).forEach(c=>c.remove());placeCaret(anchor);installTableResizeHandles(rect.table.closest('.atlas-table-wrap')||rect.table);root.toast?.('Cells merged');
  }
  function mergeSelectedCells(){const rect=rectangularCells(cellsInSelection());if(!rect)return root.toast?.('Select a rectangular group of unmerged table cells');mergeRect(rect)}
  function mergeAdjacent(direction){
    const cell=selectionCell();if(!cell)return root.toast?.('Place the cursor in a table cell first');if((cell.colSpan||1)!==1||(cell.rowSpan||1)!==1)return root.toast?.('Unmerge this cell first');
    const table=cell.closest('table'),r=cell.parentElement.rowIndex,c=cell.cellIndex,target=direction==='right'?table.rows[r]?.cells[c+1]:table.rows[r+1]?.cells[c];
    if(!target||target.closest('table')!==table)return root.toast?.(`No cell ${direction==='right'?'to the right':'below'} to merge`);if((target.colSpan||1)!==1||(target.rowSpan||1)!==1)return root.toast?.('Adjacent cell is already merged');
    mergeRect({table,minR:r,maxR:direction==='below'?r+1:r,minC:c,maxC:direction==='right'?c+1:c,cells:[cell,target]});
  }
  function unmergeCell(){
    const cell=selectionCell();if(!cell)return root.toast?.('Place the cursor in a merged cell first');const cols=cell.colSpan||1,rows=cell.rowSpan||1;if(cols===1&&rows===1)return root.toast?.('Cell is not merged');
    const table=cell.closest('table'),startRow=cell.parentElement.rowIndex,startCol=cell.cellIndex;cell.colSpan=1;cell.rowSpan=1;delete cell.dataset.atlasMerge;
    for(let r=0;r<rows;r++){const row=table.rows[startRow+r];if(!row)continue;const addCount=r===0?cols-1:cols,reference=row.cells[startCol+(r===0?1:0)]||null;for(let c=0;c<addCount;c++){const n=document.createElement(row.parentElement?.tagName==='THEAD'?'th':'td');row.insertBefore(n,reference)}}
    placeCaret(cell);installTableResizeHandles(table.closest('.atlas-table-wrap')||table);root.toast?.('Cell unmerged');
  }

  function ensureColgroup(table){
    let group=table.querySelector(':scope > colgroup');const count=Math.max(...[...table.rows].map(r=>[...r.cells].reduce((n,c)=>n+(c.colSpan||1),0)),1);
    if(!group){group=document.createElement('colgroup');table.prepend(group)}while(group.children.length<count)group.append(document.createElement('col'));while(group.children.length>count)group.lastElementChild.remove();
    if([...group.children].every(c=>!c.style.width))[...group.children].forEach(c=>c.style.width=`${100/count}%`);return group;
  }
  function installTableResizeHandles(scope){
    if(!scope)return;scope.querySelectorAll?.('table').forEach(table=>{
      const group=ensureColgroup(table),header=table.rows[0];if(!header)return;header.querySelectorAll('.atlas-col-resize').forEach(h=>h.remove());
      [...header.cells].forEach((cell,index)=>{if(index>=group.children.length-1)return;cell.style.position='relative';const handle=document.createElement('span');handle.className='atlas-col-resize';handle.contentEditable='false';handle.dataset.colIndex=String(index);handle.setAttribute('aria-hidden','true');cell.append(handle)});
    });
  }
  function beginResize(event,handle){
    const table=handle.closest('table'),group=ensureColgroup(table),index=Number(handle.dataset.colIndex),cols=[...group.children];if(!cols[index]||!cols[index+1])return;
    event.preventDefault();event.stopPropagation();handle.setPointerCapture?.(event.pointerId);const widths=cols.map(col=>parseFloat(col.style.width)||100/cols.length);
    resizeState={group,index,startX:event.clientX,widths,totalPx:table.getBoundingClientRect().width||1,pointerId:event.pointerId};document.body.classList.add('atlas-resizing-column');
  }
  function moveResize(event){
    if(!resizeState||event.pointerId!==resizeState.pointerId)return;const{group,index,startX,widths,totalPx}=resizeState,delta=(event.clientX-startX)/totalPx*100,combined=widths[index]+widths[index+1],left=Math.max(8,Math.min(combined-8,widths[index]+delta));
    group.children[index].style.width=`${left}%`;group.children[index+1].style.width=`${combined-left}%`;
  }
  function endResize(event){if(!resizeState||event.pointerId!==resizeState.pointerId)return;resizeState=null;document.body.classList.remove('atlas-resizing-column')}

  function installControls(){
    const visual=document.getElementById('atlasVisualNoteEditor'),toolbar=visual?.querySelector('.atlas-vnote-toolbar');
    if(toolbar&&!toolbar.dataset.atlasDocV1){toolbar.dataset.atlasDocV1='1';const out=document.createElement('button');out.type='button';out.dataset.atlasDocOp='outdent';out.textContent='← Outdent';const inn=document.createElement('button');inn.type='button';inn.dataset.atlasDocOp='indent';inn.textContent='Indent →';const anchor=toolbar.querySelector('[data-vrich="quote"]')||toolbar.lastElementChild;anchor?.before(out,inn)}
    const menu=visual?.querySelector('.atlas-table-menu-panel');if(menu&&!menu.dataset.atlasDocV1){
      menu.dataset.atlasDocV1='1';const before=menu.querySelector('.danger');
      [['merge','Merge selected cells'],['merge-right','Merge with cell right'],['merge-below','Merge with cell below'],['unmerge','Unmerge cell']].forEach(([action,label])=>{const b=document.createElement('button');b.type='button';b.dataset.atlasDocOp=action;b.textContent=label;menu.insertBefore(b,before)});
    }
    if(visual)installTableResizeHandles(visual);
  }

  function restoreActiveNote(){
    const n=noteById(activeNoteId),el=body();if(!n||!el)return;if(validDoc(n.document))setTimeout(()=>restoreDoc(el,n.document),0);else installTableResizeHandles(el);
    const status=document.getElementById('avStatus');if(status)status.textContent=validDoc(n.document)?'Atlas Document v1 · Markdown fallback retained':'Atlas Document v1 · will upgrade on save';
  }
  function captureNoteSave(){const n=noteById(activeNoteId),el=body();if(n&&el)n.document=makeDoc(el)}
  function restoreProjectDocs(){
    const p=projectByIndex(activeProjectIndex);if(!p)return;const objective=document.getElementById('epObjectiveRich'),next=document.getElementById('epNextRich');
    if(objective&&validDoc(p.objectiveDocument))restoreDoc(objective,p.objectiveDocument);else if(objective)installTableResizeHandles(objective);
    if(next&&validDoc(p.nextDocument))restoreDoc(next,p.nextDocument);else if(next)installTableResizeHandles(next);
  }
  function captureProjectDocs(){const p=projectByIndex(activeProjectIndex);if(!p)return;const objective=document.getElementById('epObjectiveRich'),next=document.getElementById('epNextRich');if(objective)p.objectiveDocument=makeDoc(objective);if(next)p.nextDocument=makeDoc(next)}

  const baseOpen=root.AtlasMarkdown?.openNote;
  if(typeof baseOpen==='function'){
    const wrapped=function(id){activeNoteId=id;const result=baseOpen.apply(this,arguments);restoreActiveNote();installControls();return result};root.AtlasMarkdown=Object.freeze({...root.AtlasMarkdown,openNote:wrapped,documentVersion:VERSION});try{openNoteEditor=function(i){const n=state.notes[i];if(n)wrapped(n.id)}}catch(_){ }
  }
  const baseProjectOpen=typeof openProjectEditor==='function'?openProjectEditor:null;
  if(baseProjectOpen){openProjectEditor=function(i){activeProjectIndex=i;const result=baseProjectOpen.apply(this,arguments);setTimeout(()=>{restoreProjectDocs();installTableResizeHandles(document.getElementById('editorPane'))},0);return result}}

  document.addEventListener('pointerdown',event=>{const handle=event.target.closest?.('.atlas-col-resize');if(handle){beginResize(event,handle);return}const card=event.target.closest?.('[data-note-open]');if(card)activeNoteId=card.dataset.noteOpen||activeNoteId},true);
  document.addEventListener('pointermove',moveResize,true);document.addEventListener('pointerup',endResize,true);document.addEventListener('pointercancel',endResize,true);
  document.addEventListener('click',event=>{
    const card=event.target.closest?.('[data-note-open]');if(card){activeNoteId=card.dataset.noteOpen||activeNoteId;setTimeout(()=>{restoreActiveNote();installControls()},0)}
    const op=event.target.closest?.('[data-atlas-doc-op]');if(op){event.preventDefault();event.stopPropagation();const action=op.dataset.atlasDocOp;if(action==='indent')indent(1);else if(action==='outdent')indent(-1);else if(action==='merge')mergeSelectedCells();else if(action==='merge-right')mergeAdjacent('right');else if(action==='merge-below')mergeAdjacent('below');else if(action==='unmerge')unmergeCell();return}
    if(event.target.closest?.('#atlasVisualNoteEditor [data-note-save]'))captureNoteSave();if(event.target.closest?.('[data-ed-action="save-project-detail"]'))captureProjectDocs();
  },true);
  document.addEventListener('keydown',event=>{if((event.target?.id==='avBody'||event.target?.classList?.contains('atlas-project-rich-body'))&&event.key==='Tab'){if(selectionCell())return;event.preventDefault();indent(event.shiftKey?-1:1)}},true);

  const observer=new MutationObserver(()=>installControls());if(document.body)observer.observe(document.body,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installControls,{once:true});else installControls();
  root.AtlasDocument=Object.freeze({schema:SCHEMA,version:VERSION,make:makeDoc,restore:restoreDoc,isDocument:validDoc});
})(window);
