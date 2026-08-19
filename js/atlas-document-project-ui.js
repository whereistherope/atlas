// Atlas v0.14.0: expose Atlas Document controls in Project Workspace toolbars.
(function(){
  'use strict';
  function install(){
    document.querySelectorAll('.atlas-project-rich-toolbar').forEach(toolbar=>{
      if(toolbar.dataset.atlasDocUi)return;toolbar.dataset.atlasDocUi='1';
      const quote=toolbar.querySelector('[data-prich="quote"]')||toolbar.lastElementChild;
      const out=document.createElement('button');out.type='button';out.dataset.atlasDocOp='outdent';out.textContent='← Outdent';
      const inn=document.createElement('button');inn.type='button';inn.dataset.atlasDocOp='indent';inn.textContent='Indent →';
      quote?.before(out,inn);
      const table=toolbar.querySelector('[data-prich="table"]');
      if(table){
        const menu=document.createElement('details');menu.className='atlas-project-doc-table-menu';
        menu.innerHTML='<summary>Table ▾</summary><div><button type="button" data-atlas-doc-op="merge">Merge selected cells</button><button type="button" data-atlas-doc-op="merge-right">Merge with cell right</button><button type="button" data-atlas-doc-op="merge-below">Merge with cell below</button><button type="button" data-atlas-doc-op="unmerge">Unmerge cell</button></div>';
        table.after(menu);
      }
    });
  }
  const observer=new MutationObserver(install);if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
