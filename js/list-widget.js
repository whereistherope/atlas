// Atlas List widget. Lists are specialised synced Atlas notes, not a parallel data store.
(function(root){
  'use strict';
  if(typeof ATLAS_WIDGETS==='undefined'||typeof renderWidget!=='function')return;

  ATLAS_WIDGETS.list={title:'List',code:'LIST',zone:'right'};
  const baseDefaultWidgetLayout=defaultWidgetLayout;
  defaultWidgetLayout=function(){const layout=baseDefaultWidgetLayout();layout.list=layout.list||{open:false,zone:'right',order:5};return layout};
  const baseRenderWidget=renderWidget;
  const baseVisibleNotes=typeof visibleNotes==='function'?visibleNotes:null;
  const baseInboxCount=typeof inboxCount==='function'?inboxCount:null;
  const composerProfiles=new Set();

  // Lists use note records for existing Atlas sync, but remain a distinct UI type.
  if(baseVisibleNotes)visibleNotes=function(scope){return baseVisibleNotes(scope).filter(note=>note.type!=='list')};
  if(baseInboxCount)inboxCount=function(){return state.notes.filter(note=>profileAllows(note.profile)&&note.type!=='list'&&!note.areaId).length};
  if(typeof renderInbox==='function')renderInbox=function(){const notes=state.notes.filter(n=>profileAllows(n.profile)&&n.type!=='list'&&!n.areaId).sort((a,b)=>b.createdAt-a.createdAt);document.getElementById('app').innerHTML=`<div class="workspace-head"><div class="workspace-title"><div class="crumb">ATLAS / ${esc(activeProfile().name.toUpperCase())} / INBOX</div><h2>Inbox</h2><p>Unsorted notes and ideas. Link them to an area when their home becomes clear.</p></div><button class="btn primary" data-quick-add="note">+ Capture</button></div><section class="panel"><div class="panel-head"><h3>Unsorted</h3><span class="code">${notes.length} ITEMS</span></div>${notesHtml(notes)}</section>`};

  function profileIdFor(target){return target?.closest?.('.atlas-widget[data-widget-profile]')?.dataset.widgetProfile||state.settings.activeProfile||'me'}
  function listNotes(profileId){return (state.notes||[]).filter(note=>(note.profile||'me')===profileId&&note.type==='list').sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0))}
  function ensureSelections(){state.settings=state.settings||{};if(!state.settings.listWidgetSelection||typeof state.settings.listWidgetSelection!=='object'||Array.isArray(state.settings.listWidgetSelection))state.settings.listWidgetSelection={}}
  function selectedList(profileId){ensureSelections();const lists=listNotes(profileId);let current=lists.find(list=>list.id===state.settings.listWidgetSelection[profileId]);if(!current&&lists.length){current=lists[0];state.settings.listWidgetSelection[profileId]=current.id}return current||null}
  function listItems(note){if(!note)return[];if(!Array.isArray(note.listItems))note.listItems=[];return note.listItems}
  function rerender(){if(root.AtlasHouse?.isActive?.())root.AtlasHouse.render();else renderHome()}
  function updateList(note){note.updatedAt=now();save();rerender()}

  function listWidget(options={}){
    const profileId=String(options.profileId||state.settings.activeProfile||'me'),lists=listNotes(profileId),current=selectedList(profileId),creating=composerProfiles.has(profileId);
    const chooser=lists.length?`<div class="atlas-list-toolbar"><select data-list-select aria-label="Choose list">${lists.map(list=>`<option value="${list.id}" ${list.id===current?.id?'selected':''}>${esc(list.title||'Untitled list')}</option>`).join('')}</select><button type="button" data-list-action="new-list">+ List</button></div>`:'';
    const creator=creating||!lists.length?`<div class="quick-add atlas-list-create"><input data-list-name-input type="text" placeholder="List name…"><button type="button" data-list-action="create-list">Create</button>${lists.length?'<button type="button" data-list-action="cancel-list">×</button>':''}</div>`:'';
    let content='';
    if(current){const items=listItems(current);content=`<div class="quick-add"><input data-list-item-input type="text" placeholder="Add an item…"><button type="button" data-list-action="add-item" data-list-id="${current.id}">Add</button></div><div class="quick-list atlas-list-items">${items.length?items.map(item=>`<label class="quick-todo ${item.done?'done':''}"><input type="checkbox" data-list-item-id="${item.id}" data-list-id="${current.id}" ${item.done?'checked':''}><span>${esc(item.text)}</span><button type="button" data-list-delete-item="${item.id}" data-list-id="${current.id}">×</button></label>`).join(''):'<div class="widget-empty">No items yet.</div>'}</div>`}
    else if(!creating)content='<div class="widget-empty">No lists yet.</div>';
    return widgetShell('list',chooser+creator+content,current?`${listItems(current).filter(item=>!item.done).length} OPEN`:`${lists.length} LISTS`,options);
  }

  renderWidget=function(id,options={}){if(id==='list')return listWidget(options);return baseRenderWidget(id,options)};

  function installMenuItem(){const rail=document.getElementById('utilityRail');if(!rail||rail.querySelector('[data-widget-toggle="list"]'))return;const button=document.createElement('button');button.type='button';button.className='system-item';button.dataset.widgetToggle='list';button.textContent='List';const todo=rail.querySelector('[data-widget-toggle="todo"]');if(todo)todo.insertAdjacentElement('afterend',button);else rail.appendChild(button)}
  installMenuItem();

  function createList(profileId,name){name=String(name||'').trim();if(!name)return null;const note={id:uid('n'),profile:profileId,space:'personal',areaId:'',topicId:'',type:'list',title:name,body:'',tags:['List'],createdAt:now(),updatedAt:now(),showOnMap:false,listItems:[]};state.notes.unshift(note);ensureSelections();state.settings.listWidgetSelection[profileId]=note.id;composerProfiles.delete(profileId);log(`List created: ${name}.`,profileId);save();rerender();return note}
  function findList(id){return (state.notes||[]).find(note=>note.id===id&&note.type==='list')||null}
  function addItem(note,text){text=String(text||'').trim();if(!note||!text)return;listItems(note).push({id:uid('li'),text,done:false,createdAt:now(),updatedAt:now()});updateList(note)}

  document.addEventListener('change',event=>{
    const select=event.target.closest?.('[data-list-select]');if(select){const profileId=profileIdFor(select);ensureSelections();state.settings.listWidgetSelection[profileId]=select.value;save();rerender();return}
    const item=event.target.closest?.('[data-list-item-id]');if(item){const note=findList(item.dataset.listId),row=listItems(note).find(entry=>entry.id===item.dataset.listItemId);if(row){row.done=item.checked;row.updatedAt=now();updateList(note)}}
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter')return;
    if(event.target.matches?.('[data-list-name-input]')){event.preventDefault();createList(profileIdFor(event.target),event.target.value);return}
    if(event.target.matches?.('[data-list-item-input]')){event.preventDefault();const widget=event.target.closest('.atlas-widget'),note=findList(widget?.querySelector('[data-list-action="add-item"]')?.dataset.listId);addItem(note,event.target.value)}
  });

  document.addEventListener('click',event=>{
    const action=event.target.closest?.('[data-list-action]');if(action){const profileId=profileIdFor(action),kind=action.dataset.listAction;
      if(kind==='new-list'){composerProfiles.add(profileId);rerender();return}
      if(kind==='cancel-list'){composerProfiles.delete(profileId);rerender();return}
      if(kind==='create-list'){const input=action.closest('.atlas-widget')?.querySelector('[data-list-name-input]');createList(profileId,input?.value||'');return}
      if(kind==='add-item'){const input=action.closest('.atlas-widget')?.querySelector('[data-list-item-input]');addItem(findList(action.dataset.listId),input?.value||'');return}
    }
    const del=event.target.closest?.('[data-list-delete-item]');if(del){const note=findList(del.dataset.listId);if(!note)return;note.listItems=listItems(note).filter(item=>item.id!==del.dataset.listDeleteItem);updateList(note)}
  });

  root.AtlasLists=Object.freeze({version:'1',listNotes,selectedList,createList});
})(window);
