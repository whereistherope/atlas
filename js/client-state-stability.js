// Atlas client state stability: preserve local workspace view state across cloud reconciliation
// and avoid rebuilding an unchanged UI during background sync polling.
(function(root){
  'use strict';

  const Core=root.AtlasSyncV2Core;

  // Split is a legitimate local workspace mode. Older persistence validation only knew
  // nodes/list/predict and silently normalised split back to nodes during ensureState().
  if(typeof root.ensureState==='function'){
    const baseEnsureState=root.ensureState;
    root.ensureState=function(input){
      const requested=input?.settings?.mapViewMode;
      const result=baseEnsureState.apply(this,arguments);
      if(requested==='split'&&result?.settings)result.settings.mapViewMode='split';
      return result;
    };
  }

  function signature(){
    try{
      const settings=state?.settings||{};
      const ui={activeTab:settings.activeTab||'',selectedArea:settings.selectedArea||'',mapViewMode:settings.mapViewMode||'nodes',mapSplitRatio:settings.mapSplitRatio||'',mapSplitOrder:settings.mapSplitOrder||'',activeProfile:settings.activeProfile||'me',spaceFilter:settings.spaceFilter||'all',mapDepth:settings.mapDepth||4,widgetLayout:settings.widgetLayout||{},widgetFloat:settings.widgetFloat||{}};
      const records=Core?.canonical&&Core?.flattenState?Core.canonical(Core.flattenState(state)):'';
      return JSON.stringify(ui)+'|'+records;
    }catch(_){return''}
  }

  if(typeof root.renderAll==='function'){
    const baseRenderAll=root.renderAll;
    let lastSignature='';
    root.renderAll=function(...args){
      const syncDriven=args[0]===false;
      const nextSignature=signature();
      if(syncDriven&&nextSignature&&nextSignature===lastSignature)return;

      const scrollY=syncDriven?(root.scrollY||document.scrollingElement?.scrollTop||0):0;
      const splitList=document.querySelector('.network-split-list');
      const splitScroll=syncDriven&&splitList?splitList.scrollTop:0;
      const result=baseRenderAll.apply(this,args);
      lastSignature=signature();

      if(syncDriven){
        requestAnimationFrame(()=>{
          if(scrollY>0)root.scrollTo?.(0,scrollY);
          const nextList=document.querySelector('.network-split-list');
          if(nextList&&splitScroll>0)nextList.scrollTop=splitScroll;
        });
      }
      return result;
    };
    root.addEventListener('load',()=>{lastSignature=signature()},{once:true});
  }

  root.AtlasClientStateStability=Object.freeze({version:'0.16.9-r1',signature});
})(window);
