// Atlas v0.13.2 visual note editor. Rich editing surface; Markdown remains the storage format.
(function(root){
  'use strict';

  const BUCKET='atlas-note-assets';
  const ASSET_SCHEME='atlas-asset://';
  const signedCache=new Map();
  let assetClient=null,activeNoteId='',savedRange=null;

  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const safeExternalUrl=url=>{try{const u=new URL(String(url||''));return ['http:','https:'].includes(u.protocol)?u.href:''}catch(_){return''}};

  function noteById(id){return state.notes.find(n=>n.id===id)}
  function editor(){return document.getElementById('avBody')}

  function nodeMarkdown(node){
    if(node.nodeType===Node.TEXT_NODE)return node.nodeValue||'';
    if(node.nodeType!==Node.ELEMENT_NODE)return'';
    const tag=node.tagName;
    const children=()=>[...node.childNodes].map(nodeMarkdown).join('');
    if(tag==='BR')return'\n';
    if(tag==='STRONG'||tag==='B')return`**${children()}**`;
    if(tag==='EM'||tag==='I')return`*${children()}*`;
    if(tag==='DEL'||tag==='S'||tag==='STRIKE')return`~~${children()}~~`;
    if(tag==='CODE'&&node.parentElement?.tagName!=='PRE')return`\`${node.textContent||''}\``;
    if(tag==='A'){
      const href=safeExternalUrl(node.getAttribute('href'));
      return href?`[${children()||href}](${href})`:children();
    }
    if(tag==='IMG'){
      const path=node.dataset?.atlasAsset;
      const src=path?`${ASSET_SCHEME}${encodeURIComponent(path)}`:safeExternalUrl(node.getAttribute('src'));
      return src?`![${node.getAttribute('alt')||'Image'}](${src})`:'';
    }
    if(tag==='FIGURE'){
      const img=node.querySelector('img');
      return img?`${nodeMarkdown(img)}\n\n`:'';
    }
    if(/^H[1-6]$/.test(tag))return`${'#'.repeat(Number(tag[1]))} ${children().trim()}\n\n`;
    if(tag==='P')return`${children().trimEnd()}\n\n`;
    if(tag==='BLOCKQUOTE')return`${children().trim().split('\n').map(line=>`> ${line}`).join('\n')}\n\n`;
    if(tag==='PRE')return`\`\`\`\n${node.textContent||''}\n\`\`\`\n\n`;
    if(tag==='UL'||tag==='OL')return`${listMarkdown(node)}\n`;
    if(tag==='TABLE')return`${tableMarkdown(node)}\n\n`;
    if(tag==='HR')return'---\n\n';
    if(tag==='DIV'&&node.classList.contains('atlas-table-wrap'))return children();
    if(tag==='DIV')return`${children().trimEnd()}\n\n`;
    if(tag==='SPAN')return children();
    if(tag==='INPUT')return'';
    return children();
  }

  function liInlineMarkdown(li){
    return [...li.childNodes]
      .filter(n=>!(n.nodeType===Node.ELEMENT_NODE&&['UL','OL','INPUT'].includes(n.tagName)))
      .map(nodeMarkdown).join('').trim();
  }

  function listMarkdown(list,depth=0){
    const ordered=list.tagName==='OL',indent='  '.repeat(depth),items=[...list.children].filter(el=>el.tagName==='LI');
    return items.map((li,index)=>{
      const checkbox=[...li.children].find(el=>el.tagName==='INPUT'&&el.type==='checkbox');
      const prefix=checkbox?`- [${checkbox.checked?'x':' '}] `:(ordered?`${index+1}. `:'- ');
      let line=`${indent}${prefix}${liInlineMarkdown(li)}`;
      const nested=[...li.children].filter(el=>el.tagName==='UL'||el.tagName==='OL');
      if(nested.length)line+='\n'+nested.map(n=>listMarkdown(n,depth+1)).join('\n');
      return line;
    }).join('\n');
  }

  function tableMarkdown(table){
    const rows=[...table.rows];
    if(!rows.length)return'';
    const values=row=>[...row.cells].map(cell=>[...cell.childNodes].map(nodeMarkdown).join('').replace(/\n+/g,' ').replace(/\|/g,'\\|').trim());
    const header=values(rows[0]),cols=Math.max(1,header.length);
    const top=`| ${header.join(' | ')} |`;
    const separator=`| ${Array.from({length:cols},()=> '---').join(' | ')} |`;
    const body=rows.slice(1).map(row=>{
      const vals=values(row);while(vals.length<cols)vals.push('');
      return`| ${vals.slice(0,cols).join(' | ')} |`;
    });
    return[top,separator,...body].join('\n');
  }

  function htmlToMarkdown(body){
    return[...body.childNodes].map(nodeMarkdown).join('').replace(/\n{3,}/g,'\n\n').trim();
  }

  async function ensureAssetClient(){
    if(assetClient)return assetClient;
    const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;
    if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas Cloud is unavailable.');
    assetClient=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const session=await root.AtlasCloud?.getSession?.();
    if(!session?.access_token||!session?.refresh_token)throw new Error('Sign in to Atlas Cloud before inserting images.');
    const set=await assetClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
    if(set.error)throw set.error;
    return assetClient;
  }

  async function signedAssetUrl(path){
    const cached=signedCache.get(path);
    if(cached&&cached.until>Date.now())return cached.url;
    const c=await ensureAssetClient(),{data,error}=await c.storage.from(BUCKET).createSignedUrl(path,3600);
    if(error)throw error;
    signedCache.set(path,{url:data.signedUrl,until:Date.now()+45*60*1000});
    return data.signedUrl;
  }

  async function hydrateEditorImages(body){
    await root.AtlasMarkdown?.hydrateImages?.(body);
    body.querySelectorAll('img[data-atlas-asset]').forEach(img=>{
      img.closest('figure')?.setAttribute('contenteditable','false');
    });
  }

  function makeTaskListsEditable(body){
    body.querySelectorAll('li.task-item').forEach(li=>{
      const input=li.querySelector(':scope > input[type="checkbox"]');
      if(input){input.disabled=false;input.contentEditable='false';li.parentElement?.setAttribute('data-task-list','');li.dataset.taskItem='';}
    });
  }

  function ensureOverlay(){
    let el=document.getElementById('atlasVisualNoteEditor');
    if(el)return el;
    el=document.createElement('div');
    el.id='atlasVisualNoteEditor';
    el.className='atlas-vnote-overlay';
    el.innerHTML=`
      <div class="atlas-vnote-backdrop" data-note-close></div>
      <section class="atlas-vnote-sheet" role="dialog" aria-modal="true" aria-label="Visual note editor">
        <header class="atlas-vnote-head">
          <div><div class="code">VISUAL NOTE EDITOR</div><strong id="avHeading">Edit note</strong></div>
          <div class="atlas-vnote-head-actions"><button type="button" class="btn" data-note-close>Close</button><button type="button" class="btn primary" data-note-save>Save</button></div>
        </header>
        <div class="atlas-vnote-scroll">
          <div class="atlas-vnote-fields">
            <label>Title<input id="avTitle"></label><label>Type<input id="avType"></label><label>Area<select id="avArea"></select></label><label>Topic<select id="avTopic"></select></label>
          </div>
          <div class="atlas-vnote-toolbar" role="toolbar" aria-label="Note formatting">
            <button type="button" data-vrich="h2">H2</button><button type="button" data-vrich="h3">H3</button>
            <button type="button" data-vrich="bold"><strong>B</strong></button><button type="button" data-vrich="italic"><em>I</em></button>
            <button type="button" data-vrich="bullet">• List</button><button type="button" data-vrich="number">1. List</button><button type="button" data-vrich="check">☑︎ Task</button>
            <button type="button" data-vrich="link">Link</button><button type="button" data-vrich="quote">Quote</button><button type="button" data-vrich="code">Code</button>
            <button type="button" data-vrich="table">Table</button><button type="button" data-vrich="row">+ Row</button><button type="button" data-vrich="col">+ Col</button><button type="button" data-vrich="image">Image</button>
          </div>
          <div id="avBody" class="atlas-vnote-body atlas-markdown" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="Write your note…"></div>
          <div class="atlas-vnote-fields atlas-vnote-fields-bottom"><label>Tags<input id="avTags" placeholder="comma, separated"></label><label>Map<select id="avMap"><option value="false">Keep off map</option><option value="true">Show as node</option></select></label></div>
          <div id="avStatus" class="atlas-vnote-status">Visual editing · saved as Markdown</div>
          <input id="avImageInput" type="file" accept="image/*" hidden>
        </div>
      </section>`;
    document.body.appendChild(el);
    return el;
  }

  function fillSelects(n){
    const areas=profileAreas(),area=document.getElementById('avArea'),topic=document.getElementById('avTopic');
    area.innerHTML='<option value="">Inbox</option>'+areas.map(a=>`<option value="${h(a.id)}">${h(a.name)}</option>`).join('');
    topic.innerHTML='<option value="">None</option>'+areas.filter(a=>a.level>=3).map(a=>`<option value="${h(a.id)}">${h(a.name)}</option>`).join('');
    area.value=n.areaId||'';topic.value=n.topicId||'';
  }

  function openVisualNoteEditor(id){
    const n=noteById(id);
    if(!n||!profileAllows(n.profile))return;
    activeNoteId=id;savedRange=null;
    document.getElementById('atlasNoteEditor')?.classList.remove('open');
    const el=ensureOverlay(),body=editor();
    document.getElementById('avTitle').value=n.title||'';
    document.getElementById('avType').value=n.type||'note';
    body.innerHTML=root.AtlasMarkdown?.render?.(n.body||'')||h(n.body||'');
    makeTaskListsEditable(body);hydrateEditorImages(body);
    document.getElementById('avTags').value=(n.tags||[]).join(', ');
    document.getElementById('avMap').value=n.showOnMap?'true':'false';
    document.getElementById('avHeading').textContent=n.title||'Untitled';
    document.getElementById('avStatus').textContent='Visual editing · saved as Markdown';
    fillSelects(n);el.classList.add('open');
    setTimeout(()=>{body.focus();placeCaretAtEnd(body);saveSelection()},80);
  }

  function closeVisualNoteEditor(){
    document.getElementById('atlasVisualNoteEditor')?.classList.remove('open');activeNoteId='';savedRange=null;
  }

  function selectionInsideEditor(){
    const sel=root.getSelection?.(),body=editor();
    return !!(sel&&sel.rangeCount&&body&&body.contains(sel.anchorNode));
  }

  function saveSelection(){
    if(!selectionInsideEditor())return;
    savedRange=root.getSelection().getRangeAt(0).cloneRange();
  }

  function restoreSelection(){
    const body=editor();if(!body)return;
    body.focus();const sel=root.getSelection();sel.removeAllRanges();
    if(savedRange&&body.contains(savedRange.commonAncestorContainer))sel.addRange(savedRange);
    else{const range=document.createRange();range.selectNodeContents(body);range.collapse(false);sel.addRange(range)}
  }

  function placeCaretAtEnd(node){
    const range=document.createRange(),sel=root.getSelection();range.selectNodeContents(node);range.collapse(false);sel.removeAllRanges();sel.addRange(range);
  }

  function command(name,value=null){
    restoreSelection();document.execCommand(name,false,value);saveSelection();updateToolbarState();
  }

  function selectedText(){restoreSelection();return root.getSelection()?.toString()||''}

  function insertNodeAtCaret(node){
    restoreSelection();const sel=root.getSelection();if(!sel?.rangeCount)return;
    const range=sel.getRangeAt(0);range.deleteContents();range.insertNode(node);
    const spacer=document.createElement('p');spacer.innerHTML='<br>';node.after(spacer);placeCaretAtEnd(spacer);saveSelection();
  }

  function insertTaskList(){
    const text=selectedText().trim()||'Task',ul=document.createElement('ul');ul.dataset.taskList='';
    const li=document.createElement('li');li.className='task-item';li.dataset.taskItem='';
    const input=document.createElement('input');input.type='checkbox';input.contentEditable='false';
    const span=document.createElement('span');span.textContent=text;li.append(input,span);ul.append(li);insertNodeAtCaret(ul);
    setTimeout(()=>{const r=document.createRange(),s=root.getSelection();r.selectNodeContents(span);r.collapse(false);s.removeAllRanges();s.addRange(r);saveSelection()},0);
  }

  function insertTable(){
    const wrap=document.createElement('div');wrap.className='atlas-table-wrap';
    const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody'),headRow=document.createElement('tr');
    ['Column 1','Column 2','Column 3'].forEach(text=>{const th=document.createElement('th');th.textContent=text;headRow.append(th)});thead.append(headRow);
    for(let r=0;r<2;r++){const tr=document.createElement('tr');for(let c=0;c<3;c++)tr.append(document.createElement('td'));tbody.append(tr)}
    table.append(thead,tbody);wrap.append(table);insertNodeAtCaret(wrap);
    const first=table.querySelector('th');if(first){const range=document.createRange(),sel=root.getSelection();range.selectNodeContents(first);range.collapse(false);sel.removeAllRanges();sel.addRange(range);saveSelection()}
  }

  function closestFromSelection(selector){
    restoreSelection();let node=root.getSelection()?.anchorNode;if(node?.nodeType===Node.TEXT_NODE)node=node.parentElement;return node?.closest?.(selector)||null;
  }

  function addTableRow(){
    const table=closestFromSelection('table');if(!table)return root.toast?.('Place the cursor inside a table first');
    const cols=table.rows[0]?.cells.length||1,tr=document.createElement('tr');for(let i=0;i<cols;i++)tr.append(document.createElement('td'));
    let tbody=table.tBodies[0];if(!tbody){tbody=document.createElement('tbody');table.append(tbody)}tbody.append(tr);root.toast?.('Table row added');
  }

  function addTableColumn(){
    const table=closestFromSelection('table');if(!table)return root.toast?.('Place the cursor inside a table first');
    [...table.rows].forEach(row=>row.append(document.createElement(row.parentElement?.tagName==='THEAD'?'th':'td')));root.toast?.('Table column added');
  }

  async function toolbar(action){
    if(action==='bold')command('bold');
    else if(action==='italic')command('italic');
    else if(action==='h2')command('formatBlock','h2');
    else if(action==='h3')command('formatBlock','h3');
    else if(action==='bullet')command('insertUnorderedList');
    else if(action==='number')command('insertOrderedList');
    else if(action==='check')insertTaskList();
    else if(action==='quote')command('formatBlock','blockquote');
    else if(action==='code')command('formatBlock','pre');
    else if(action==='link'){
      const url=prompt('Link URL','https://');if(!url)return;
      const safe=safeExternalUrl(url);if(!safe)return root.toast?.('Use an http or https link');
      if(selectedText())command('createLink',safe);else{const a=document.createElement('a');a.href=safe;a.textContent=safe;a.target='_blank';a.rel='noopener noreferrer';insertNodeAtCaret(a)}
    }else if(action==='table')insertTable();
    else if(action==='row')addTableRow();
    else if(action==='col')addTableColumn();
    else if(action==='image'){saveSelection();document.getElementById('avImageInput').click()}
  }

  async function uploadImage(file){
    if(!file||!activeNoteId)return;
    const status=document.getElementById('avStatus');status.textContent='Uploading image…';
    try{
      if(file.size>10*1024*1024)throw new Error('Image must be under 10 MB.');
      const c=await ensureAssetClient(),session=await root.AtlasCloud?.getSession?.();if(!session?.user?.id)throw new Error('Sign in to Atlas Cloud first.');
      const clean=String(file.name||'image').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90),path=`${session.user.id}/notes/${activeNoteId}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${clean}`;
      const {error}=await c.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;
      const url=await signedAssetUrl(path),alt=clean.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')||'Image';
      const figure=document.createElement('figure');figure.className='atlas-md-image';figure.contentEditable='false';
      const img=document.createElement('img');img.alt=alt;img.src=url;img.dataset.atlasAsset=path;img.dataset.atlasLoaded='true';figure.append(img);insertNodeAtCaret(figure);
      status.textContent='Image inserted · saved as Markdown reference';
    }catch(error){status.textContent=String(error?.message||'Image upload failed.');root.toast?.('Image upload failed')}
  }

  function normalizeTaskLists(){
    const body=editor();if(!body)return;
    body.querySelectorAll('ul[data-task-list] > li').forEach(li=>{
      if(li.querySelector(':scope > input[type="checkbox"]'))return;
      const input=document.createElement('input');input.type='checkbox';input.contentEditable='false';li.prepend(input);li.classList.add('task-item');li.dataset.taskItem='';
    });
  }

  function updateToolbarState(){
    if(!selectionInsideEditor())return;
    const active={bold:document.queryCommandState('bold'),italic:document.queryCommandState('italic'),bullet:document.queryCommandState('insertUnorderedList'),number:document.queryCommandState('insertOrderedList')};
    document.querySelectorAll('#atlasVisualNoteEditor [data-vrich]').forEach(button=>button.classList.toggle('active',!!active[button.dataset.vrich]));
  }

  async function saveVisualNote(){
    const n=noteById(activeNoteId);if(!n)return;
    const title=document.getElementById('avTitle').value.trim(),areaId=document.getElementById('avArea').value,topicId=document.getElementById('avTopic').value;
    n.title=title||'Untitled';n.type=document.getElementById('avType').value.trim()||'note';n.areaId=areaId;n.topicId=topicId;n.body=htmlToMarkdown(editor());
    n.tags=document.getElementById('avTags').value.split(',').map(s=>s.trim()).filter(Boolean);n.showOnMap=document.getElementById('avMap').value==='true';n.updatedAt=now();
    const ar=areaById(topicId)||areaById(areaId);if(ar)n.space=ar.space;
    log(`Note edited: ${n.title}.`);await save();renderAll();closeVisualNoteEditor();root.toast?.('Note saved');
  }

  root.addEventListener('click',event=>{
    const card=event.target.closest?.('[data-note-open]');
    if(!card||event.target.closest?.('a,button,input,select,textarea'))return;
    event.preventDefault();event.stopPropagation();openVisualNoteEditor(card.dataset.noteOpen);
  },true);

  document.addEventListener('selectionchange',()=>{if(selectionInsideEditor()){saveSelection();updateToolbarState()}});
  document.addEventListener('pointerdown',event=>{if(event.target.closest?.('#atlasVisualNoteEditor [data-vrich]'))saveSelection()},true);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#atlasVisualNoteEditor [data-note-close]')){closeVisualNoteEditor();return}
    if(event.target.closest?.('#atlasVisualNoteEditor [data-note-save]')){saveVisualNote();return}
    const rich=event.target.closest?.('#atlasVisualNoteEditor [data-vrich]');if(rich){event.preventDefault();toolbar(rich.dataset.vrich)}
  });
  document.addEventListener('input',event=>{if(event.target?.id==='avBody'){normalizeTaskLists();saveSelection()}});
  document.addEventListener('change',event=>{
    if(event.target?.id==='avImageInput'){const file=event.target.files?.[0];event.target.value='';if(file)uploadImage(file)}
  });
  document.addEventListener('keydown',event=>{
    if(!document.getElementById('atlasVisualNoteEditor')?.classList.contains('open'))return;
    if(event.key==='Escape'){closeVisualNoteEditor();return}
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveVisualNote();return}
    if(event.target?.id==='avBody'&&event.key==='Tab'&&closestFromSelection('li')){event.preventDefault();command(event.shiftKey?'outdent':'indent');return}
    if(event.target?.id==='avBody'&&event.key==='Enter')setTimeout(()=>{normalizeTaskLists();saveSelection()},0);
  });

  const base=root.AtlasMarkdown||{};
  root.AtlasMarkdown=Object.freeze({...base,openNote:openVisualNoteEditor,toMarkdown:htmlToMarkdown,version:'0.13.2'});
  try{openNoteEditor=function(i){const n=state.notes[i];if(n)openVisualNoteEditor(n.id)}}catch(_){ }

  const link=document.createElement('link');link.rel='stylesheet';link.href='./styles/visual-note-editor.css?v=0132r1';document.head.appendChild(link);
  root.AtlasVisualNoteEditor=Object.freeze({version:'0.13.2',open:openVisualNoteEditor,toMarkdown:htmlToMarkdown});
  try{if(!sessionStorage.getItem('atlas_visual_editor_ready_0132')){sessionStorage.setItem('atlas_visual_editor_ready_0132','1');setTimeout(()=>root.toast?.('Visual editor ready · v0.13.2'),500)}}catch(_){ }
})(window);
