// One-time local safety snapshot before a device can join v0.13.0 canonical Atlas.
(function(root){
  'use strict';
  const MARKER='atlas_v0130_precanonical_backup_v1';
  if(typeof load!=='function')return;
  const previousLoad=load;
  load=async function(){
    const result=await previousLoad.apply(this,arguments);
    try{
      if(db&&state&&typeof idbBackup==='function'){
        let already=false;try{already=localStorage.getItem(MARKER)==='done'}catch(_){}
        if(!already){
          await idbBackup(clone(state),'before Atlas v0.13.0 canonical sync');
          try{localStorage.setItem(MARKER,'done')}catch(_){}
        }
      }
    }catch(_){}
    return result;
  };
})(window);
