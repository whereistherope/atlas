// Atlas v0.13.1 direct note editor + safe Markdown renderer.
(function(root){
  'use strict';
  const BUCKET='atlas-note-assets';
  const ASSET_SCHEME='atlas-asset://';
  const signedCache=new Map();
  let assetClient=null,activeNoteId='',observer=null;

  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr=h;
  const safeExternalUrl=url=>{try{const u=new URL(String(url||''));return ['http:','https:'].includes(u.protocol)?u.href:''}catch(_){return''}};
  const assetPath=url=>String(url||'').startsWith(ASSET_SCHEME)?decodeURIComponent(String(url).slice(ASSET_SCHEME.length)):'';

  function renderInline(input){
    let text=h(input),stash=[];
    const hold=html=>{const key=`\u0000${stash.length}\u0000`;stash.push(html);return key};
    text=text.replace(/`([^`]+)`/g,(_,code)=>hold(`<code>${code}</code>`));
    text=text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,(_,alt,url)=>{
      const path=assetPath(url);
      if(path)return hold(`<figure class="atlas-md-image"><img alt="${attr(alt)}" data-atlas-asset="${attr(path)}" loading="lazy"><figcaption>${alt?attr(alt):''}</figcaption></figure>`);
      const safe=safeExternalUrl(url);return safe?hold(`<figure class="atlas-md-image"><img alt="${attr(alt)}" src="${attr(safe)}" loading="lazy"><figcaption>${alt?attr(alt):''}</figcaption></figure>`):h(`![${alt}](${url})`);
    });
    text=text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(_,label,url)=>{const safe=safeExternalUrl(url);return safe?hold(`<a href="${attr(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`):h(`[${label}](${url})`)});
    text=text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    text=text.replace(/__([^_]+)__/g,'<strong>$1</strong>');
    text=text.replace(/~~([^~]+)~~/g,'<del>$1</del>');
    text=text.replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
    text=text.replace(/(^|[^_])_([^_\n]+)_/g,'$1<em>$2</em>');
    text=text.replace(/\u0000(\d+)\u0000/g,(_,i)=>stash[Number(i)]||'');
    return text;
  }
  function isTableSeparator(line){return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)}
  function cells(line){return line.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim())}
  function blockStart(line,next=''){
    const t=line.trim();return !t||/^```/.test(t)||/^#{1,6}\s+/.test(t)||/^>\s?/.test(t)||/^[-*+]\s+/.test(t)||/^\d+[.)]\s+/.test(t)||/^---+$/.test(t)||(t.includes('|')&&isTableSeparator(next));
  }
  function markdownToHtml(markdown){
    const lines=String(markdown??'').replace(/\r\n?/g,'\n').split('\n'),out=[];let i=0;
    while(i<lines.length){
      const line=lines[i],trim=line.trim();
      if(!trim){i++;continue}
      if(/^```/.test(trim)){
        const lang=trim.slice(3).trim().replace(/[^a-zA-Z0-9_-]/g,''),code=[];i++;
        while(i<lines.length&&!/^```/.test(lines[i].trim()))code.push(lines[i++]);if(i<lines.length)i++;
        out.push(`<pre><code${lang?` class="language-${attr(lang)}"`:''}>${h(code.join('\n'))}</code></pre>`);continue;
      }
      const heading=trim.match(/^(#{1,6})\s+(.+)$/);if(heading){out.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);i++;continue}
      if(/^---+$/.test(trim)){out.push('<hr>');i++;continue}
      if(line.includes('|')&&i+1<lines.length&&isTableSeparator(lines[i+1])){
        const headers=cells(line),rows=[];i+=2;while(i<lines.length&&lines[i].trim()&&lines[i].includes('|'))rows.push(cells(lines[i++]));
        out.push(`<div class="atlas-table-wrap"><table><thead><tr>${headers.map(c=>`<th>${renderInline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${headers.map((_,x)=>`<td>${renderInline(r[x]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
      }
      if(/^>\s?/.test(trim)){
        const q=[];while(i<lines.length&&/^\s*>\s?/.test(lines[i]))q.push(lines[i++].replace(/^\s*>\s?/,''));out.push(`<blockquote>${q.map(renderInline).join('<br>')}</blockquote>`);continue;
      }
      if(/^[-*+]\s+/.test(trim)){
        const items=[];while(i<lines.length&&/^\s*[-*+]\s+/.test(lines[i])){
          const raw=lines[i++].replace(/^\s*[-*+]\s+/,''),check=raw.match(/^\[([ xX])\]\s*(.*)$/);
          items.push(check?`<li class="task-item"><input type="checkbox" disabled ${check[1].toLowerCase()==='x'?'checked':''}><span>${renderInline(check[2])}</span></li>`:`<li>${renderInline(raw)}</li>`);
        }out.push(`<ul>${items.join('')}</ul>`);continue;
      }
      if(/^\d+[.)]\s+/.test(trim)){
        const items=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i]))items.push(`<li>${renderInline(lines[i++].replace(/^\s*\d+[.)]\s+/,''))}</li>`);out.push(`<ol>${items.join('')}</ol>`);continue;
      }
      const para=[line];i++;while(i<lines.length&&!blockStart(lines[i],lines[i+1]||'')){para.push(lines[i++])}
      out.push(`<p>${para.map(renderInline).join('<br>')}</p>`);
    }
    return out.join('');
  }

  async function ensureAssetClient(){
    if(assetClient)return assetClient;
    const config=root.ATLAS_CLOUD_CONFIG,lib=root.supabase;if(!config?.url||!config?.publishableKey||typeof lib?.createClient!=='function')throw new Error('Atlas Cloud is unavailable.');
    assetClient=lib.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const session=await root.AtlasCloud?.getSession?.();if(!session?.access_token||!session?.refresh_token)throw new Error('Sign in to Atlas Cloud before inserting images.');
    const set=await assetClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});if(set.error)throw set.error;return assetClient;
  }
  async function signedAssetUrl(path){
    const cached=signedCache.get(path);if(cached&&cached.until>Date.now())return cached.url;
    const c=await ensureAssetClient(),{data,error}=await c.storage.from(BUCKET).createSignedUrl(path,3600);if(error)throw error;
    signedCache.set(path,{url:data.signedUrl,until:Date.now()+45*60*1000});return data.signedUrl;
  }
  async function hydrateAssetImages(rootEl=document){
    const imgs=[...rootEl.querySelectorAll?.('img[data-atlas-asset]:not([data-atlas-loaded])')||[]];
    await Promise.all(imgs.map(async img=>{img.dataset.atlasLoaded='loading';try{img.src=await signedAssetUrl(img.dataset.atlasAsset);img.dataset.atlasLoaded='true'}catch(_){img.dataset.atlasLoaded='error';img.alt=(img.alt||'Image')+' — unavailable'}}));
  }
  function startObserver(){if(observer||!document.body)return;observer=new MutationObserver(m=>{if(m.some(x=>x.addedNodes?.length))hydrateAssetImages(document)});observer.observe(document.body,{subtree:true,childList:true});hydrateAssetImages(document)}

  function noteById(id){return state.notes.find(n=>n.id===id)}
  function noteCard(n){
    return `<article class="note atlas-note-card clickable" data-note-open="${attr(n.id)}"><div class="note-top"><div class="note-title">${h(n.title||'Untitled')}</div><span class="note-type">${h(n.type||'note')}</span></div><div class="note-body atlas-markdown">${markdownToHtml(n.body||'')}</div><div class="tags">${(n.tags||[]).map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div><div class="meta">${fmtDate(n.createdAt)} · ${h(areaById(n.topicId)?.name||areaById(n.areaId)?.name||'Inbox')}</div><div class="atlas-note-edit-hint">Tap to edit</div></article>`;
  }
  notesHtml=function(notes){return `<div class="notes-list">${notes.length?notes.map(noteCard).join(''):'<div class="empty">No notes yet.</div>'}</div>`};

  function ensureOverlay(){
    let el=document.getElementById('atlasNoteEditor');if(el)return el;
    el=document.createElement('div');el.id='atlasNoteEditor';el.className='atlas-note-editor-overlay';el.innerHTML=`<div class="atlas-note-editor-backdrop" data-note-close></div><section class="atlas-note-editor-sheet" role="dialog" aria-modal="true" aria-label="Edit note"><header class="atlas-note-editor-head"><div><div class="code">NOTE EDITOR</div><strong id="aneHeading">Edit note</strong></div><div class="atlas-note-head-actions"><button type="button" class="btn" data-note-preview>Preview</button><button type="button" class="btn" data-note-close>Close</button><button type="button" class="btn primary" data-note-save>Save</button></div></header><div class="atlas-note-editor-scroll"><div class="atlas-note-fields"><label>Title<input id="aneTitle"></label><label>Type<input id="aneType"></label><label>Area<select id="aneArea"></select></label><label>Topic<select id="aneTopic"></select></label></div><div class="atlas-note-toolbar" role="toolbar" aria-label="Note formatting"><button type="button" data-md="h2">H2</button><button type="button" data-md="h3">H3</button><button type="button" data-md="bold"><strong>B</strong></button><button type="button" data-md="italic"><em>I</em></button><button type="button" data-md="bullet">• List</button><button type="button" data-md="number">1. List</button><button type="button" data-md="check">☑︎ Task</button><button type="button" data-md="link">Link</button><button type="button" data-md="quote">Quote</button><button type="button" data-md="code">Code</button><button type="button" data-md="table">Table</button><button type="button" data-md="image">Image</button></div><div class="atlas-note-compose"><textarea id="aneBody" spellcheck="true" placeholder="Write your note…"></textarea><div id="anePreview" class="atlas-note-preview atlas-markdown" hidden></div></div><div class="atlas-note-fields atlas-note-fields-bottom"><label>Tags<input id="aneTags" placeholder="comma, separated"></label><label>Map<select id="aneMap"><option value="false">Keep off map</option><option value="true">Show as node</option></select></label></div><div id="aneStatus" class="atlas-note-status"></div><input id="aneImageInput" type="file" accept="image/*" hidden></div></section>`;document.body.appendChild(el);return el;
  }
  function fillSelects(n){
    const areas=profileAreas();const area=document.getElementById('aneArea'),topic=document.getElementById('aneTopic');
    area.innerHTML='<option value="">Inbox</option>'+areas.map(a=>`<option value="${attr(a.id)}">${h(a.name)}</option>`).join('');
    topic.innerHTML='<option value="">None</option>'+areas.filter(a=>a.level>=3).map(a=>`<option value="${attr(a.id)}">${h(a.name)}</option>`).join('');area.value=n.areaId||'';topic.value=n.topicId||'';
  }
  function openRichNoteEditor(id){
    const n=noteById(id);if(!n||!profileAllows(n.profile))return;activeNoteId=id;const el=ensureOverlay();
    document.getElementById('aneTitle').value=n.title||'';document.getElementById('aneType').value=n.type||'note';document.getElementById('aneBody').value=n.body||'';document.getElementById('aneTags').value=(n.tags||[]).join(', ');document.getElementById('aneMap').value=n.showOnMap?'true':'false';document.getElementById('aneHeading').textContent=n.title||'Untitled';document.getElementById('aneStatus').textContent='';fillSelects(n);
    const preview=document.getElementById('anePreview'),body=document.getElementById('aneBody');preview.hidden=true;body.hidden=false;document.querySelector('[data-note-preview]').textContent='Preview';el.classList.add('open');setTimeout(()=>body.focus(),80);
  }
  function closeRichNoteEditor(){document.getElementById('atlasNoteEditor')?.classList.remove('open');activeNoteId=''}
  openNoteEditor=function(i){const n=state.notes[i];if(n)openRichNoteEditor(n.id)};

  function replaceSelection(before,after='',placeholder='text'){
    const ta=document.getElementById('aneBody'),start=ta.selectionStart,end=ta.selectionEnd,selected=ta.value.slice(start,end)||placeholder,next=before+selected+after;ta.setRangeText(next,start,end,'end');ta.focus();ta.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function prefixLines(prefix,ordered=false){
    const ta=document.getElementById('aneBody'),start=ta.selectionStart,end=ta.selectionEnd,text=ta.value.slice(start,end)||'Item',parts=text.split('\n'),next=parts.map((line,i)=>ordered?`${i+1}. ${line}`:`${prefix}${line}`).join('\n');ta.setRangeText(next,start,end,'end');ta.focus();ta.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function insertTemplate(text){const ta=document.getElementById('aneBody'),at=ta.selectionStart;ta.setRangeText(text,at,ta.selectionEnd,'end');ta.focus();ta.dispatchEvent(new Event('input',{bubbles:true}))}
  function toolbar(action){
    if(action==='bold')replaceSelection('**','**','bold text');else if(action==='italic')replaceSelection('*','*','italic text');else if(action==='h2')prefixLines('## ');else if(action==='h3')prefixLines('### ');else if(action==='bullet')prefixLines('- ');else if(action==='number')prefixLines('',true);else if(action==='check')prefixLines('- [ ] ');else if(action==='quote')prefixLines('> ');else if(action==='code')replaceSelection('`','`','code');else if(action==='link')replaceSelection('[','](https://)','link text');else if(action==='table')insertTemplate('\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Value | Value | Value |\n');else if(action==='image')document.getElementById('aneImageInput').click();
  }
  async function uploadImage(file){
    if(!file||!activeNoteId)return;const status=document.getElementById('aneStatus');status.textContent='Uploading image…';
    try{
      if(file.size>10*1024*1024)throw new Error('Image must be under 10 MB.');const c=await ensureAssetClient(),session=await root.AtlasCloud?.getSession?.();if(!session?.user?.id)throw new Error('Sign in to Atlas Cloud first.');
      const clean=String(file.name||'image').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90),path=`${session.user.id}/notes/${activeNoteId}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${clean}`;
      const {error}=await c.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;
      const alt=clean.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')||'Image';insertTemplate(`\n![${alt}](${ASSET_SCHEME}${encodeURIComponent(path)})\n`);status.textContent='Image inserted. Save the note to sync it.';
    }catch(error){status.textContent=String(error?.message||'Image upload failed.');root.toast?.('Image upload failed')}
  }
  function updatePreview(){const body=document.getElementById('aneBody'),preview=document.getElementById('anePreview');preview.innerHTML=markdownToHtml(body.value);hydrateAssetImages(preview)}
  function togglePreview(){const body=document.getElementById('aneBody'),preview=document.getElementById('anePreview'),button=document.querySelector('[data-note-preview]');const showing=!preview.hidden;if(showing){preview.hidden=true;body.hidden=false;button.textContent='Preview';body.focus()}else{updatePreview();preview.hidden=false;body.hidden=true;button.textContent='Edit'}}
  async function saveRichNote(){
    const n=noteById(activeNoteId);if(!n)return;const title=document.getElementById('aneTitle').value.trim(),areaId=document.getElementById('aneArea').value,topicId=document.getElementById('aneTopic').value;
    n.title=title||'Untitled';n.type=document.getElementById('aneType').value.trim()||'note';n.areaId=areaId;n.topicId=topicId;n.body=document.getElementById('aneBody').value;n.tags=document.getElementById('aneTags').value.split(',').map(s=>s.trim()).filter(Boolean);n.showOnMap=document.getElementById('aneMap').value==='true';n.updatedAt=now();const ar=areaById(topicId)||areaById(areaId);if(ar)n.space=ar.space;log(`Note edited: ${n.title}.`);await save();renderAll();closeRichNoteEditor();root.toast?.('Note saved');
  }

  document.addEventListener('click',event=>{
    const card=event.target.closest?.('[data-note-open]');if(card&&!event.target.closest('a,button,input,select,textarea')){event.preventDefault();openRichNoteEditor(card.dataset.noteOpen);return}
    if(event.target.closest?.('[data-note-close]')){closeRichNoteEditor();return}
    if(event.target.closest?.('[data-note-save]')){saveRichNote();return}
    if(event.target.closest?.('[data-note-preview]')){togglePreview();return}
    const md=event.target.closest?.('[data-md]');if(md){event.preventDefault();toolbar(md.dataset.md)}
  },true);
  document.addEventListener('input',event=>{if(event.target?.id==='aneBody'&&!document.getElementById('anePreview')?.hidden)updatePreview()});
  document.addEventListener('change',event=>{if(event.target?.id==='aneImageInput'){const file=event.target.files?.[0];event.target.value='';if(file)uploadImage(file)}});
  document.addEventListener('keydown',event=>{if(!document.getElementById('atlasNoteEditor')?.classList.contains('open'))return;if(event.key==='Escape')closeRichNoteEditor();if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveRichNote()}});

  const link=document.createElement('link');link.rel='stylesheet';link.href='./styles/note-editor.css';document.head.appendChild(link);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
  root.AtlasMarkdown=Object.freeze({render:markdownToHtml,openNote:openRichNoteEditor,hydrateImages:hydrateAssetImages});
})(window);
