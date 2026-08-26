// Pure record-level reconciliation primitives for Atlas Sync v2.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AtlasSyncV2Core=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const COLLECTIONS=['profiles','areas','links','projects','notes','daily','calendar','quickTodos','activity'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const plain=value=>!!value&&Object.prototype.toString.call(value)==='[object Object]';
  const canonical=value=>{
    if(value===undefined)return'undefined';
    if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;
    if(plain(value))return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  };
  const equal=(a,b)=>canonical(a)===canonical(b);
  const keyFor=(kind,id)=>`${kind}:${encodeURIComponent(String(id))}`;
  const makeRecord=(kind,id,data,deleted=false)=>({kind:String(kind),id:String(id),deleted:!!deleted,data:deleted?null:clone(data)});
  const tombstoneFor=record=>record?makeRecord(record.kind,record.id,null,true):undefined;
  const recordEqual=(a,b)=>{
    if(a===undefined||b===undefined)return a===b;
    return a.kind===b.kind&&a.id===b.id&&!!a.deleted===!!b.deleted&&(a.deleted||equal(a.data,b.data));
  };

  function flattenState(state){
    const out={};
    for(const kind of COLLECTIONS){
      for(const item of (Array.isArray(state?.[kind])?state[kind]:[])){
        if(!item||item.id===undefined||item.id===null||String(item.id)==='')continue;
        const record=makeRecord(kind,item.id,item,false);out[keyFor(kind,item.id)]=record;
      }
    }
    const scratch=plain(state?.scratch)?state.scratch:{};
    for(const [id,value] of Object.entries(scratch)){
      const record=makeRecord('scratch',id,String(value??''),false);out[keyFor('scratch',id)]=record;
    }
    return out;
  }

  function isIdArray(value){return Array.isArray(value)&&value.every(item=>plain(item)&&item.id!==undefined&&item.id!==null&&String(item.id)!=='')}
  function mergePrimitiveArray(remote,local){
    const result=[],seen=new Set();
    for(const item of [...(Array.isArray(remote)?remote:[]),...(Array.isArray(local)?local:[])]){
      const fp=canonical(item);if(seen.has(fp))continue;seen.add(fp);result.push(clone(item));
    }
    return result;
  }
  function mergeArrayById(base,remote,local,path){
    const bMap=new Map((base||[]).map(item=>[String(item.id),item]));
    const rMap=new Map((remote||[]).map(item=>[String(item.id),item]));
    const lMap=new Map((local||[]).map(item=>[String(item.id),item]));
    const order=[];for(const item of (remote||[]))if(!order.includes(String(item.id)))order.push(String(item.id));for(const item of (local||[]))if(!order.includes(String(item.id)))order.push(String(item.id));for(const item of (base||[]))if(!order.includes(String(item.id)))order.push(String(item.id));
    const result=[];
    for(const id of order){
      const b=bMap.get(id),r=rMap.get(id),l=lMap.get(id),lc=!equal(l,b),rc=!equal(r,b);let chosen;
      if(!lc&&!rc)chosen=r;
      else if(lc&&!rc)chosen=l;
      else if(rc&&!lc)chosen=r;
      else if(equal(l,r))chosen=l;
      else if(l===undefined&&r!==undefined)chosen=r; // deletion vs concurrent edit: preserve the edit
      else if(r===undefined&&l!==undefined)chosen=l;
      else if(l!==undefined&&r!==undefined)chosen=mergeValue(b,r,l,[...path,id]);
      if(chosen!==undefined)result.push(clone(chosen));
    }
    return result;
  }
  function shouldPreserveBothText(path){
    const key=String(path[path.length-1]||'').toLowerCase();return ['scratch','body','objective','next','text','description','content'].includes(key)
  }
  function mergeValue(base,remote,local,path=[]){
    if(equal(local,base))return clone(remote);
    if(equal(remote,base))return clone(local);
    if(equal(local,remote))return clone(local);
    if(plain(base)||plain(remote)||plain(local)){
      if(plain(remote)&&plain(local)){
        const out={},keys=new Set([...Object.keys(plain(base)?base:{}),...Object.keys(remote),...Object.keys(local)]);
        for(const key of keys){const value=mergeValue(plain(base)?base[key]:undefined,remote[key],local[key],[...path,key]);if(value!==undefined)out[key]=value}
        return out;
      }
      return clone(local!==undefined?local:remote);
    }
    if(Array.isArray(remote)&&Array.isArray(local)){
      if(isIdArray(remote)&&isIdArray(local)&&(base===undefined||isIdArray(base)))return mergeArrayById(Array.isArray(base)?base:[],remote,local,path);
      return mergePrimitiveArray(remote,local);
    }
    if(typeof remote==='string'&&typeof local==='string'&&shouldPreserveBothText(path)){
      if(!remote)return local;if(!local||remote.includes(local))return remote;if(local.includes(remote))return local;
      return `${remote}\n\n--- Concurrent Atlas edit ---\n\n${local}`;
    }
    // Scalar conflict. Local represents an actual edit since this device's acknowledged base.
    return clone(local!==undefined?local:remote);
  }

  function mergeRecord(base,remote,local){
    if(recordEqual(local,base))return clone(remote);
    if(recordEqual(remote,base))return clone(local);
    if(recordEqual(local,remote))return clone(local);
    if(local===undefined)return clone(remote);
    if(remote===undefined)return clone(local);
    if(local.deleted&&remote.deleted)return clone(local);
    if(local.deleted&&!remote.deleted)return clone(remote); // preserve a concurrent remote edit over deletion
    if(remote.deleted&&!local.deleted)return clone(local); // preserve a concurrent local edit over deletion
    const data=local.kind==='scratch'
      ?mergeValue(base?.deleted?undefined:base?.data,remote.data,local.data,['scratch'])
      :mergeValue(base?.deleted?undefined:base?.data,remote.data,local.data,[local.kind]);
    return makeRecord(local.kind,local.id,data,false);
  }

  // baseEntries/remoteEntries are keyed objects: { key: {record,revision?} }.
  // localRecords is keyed object: { key: record }. It never contains implicit deletions.
  function reconcile(baseEntries={},remoteEntries={},localRecords={},hasBase=true){
    const final={},mutations={};
    const keys=new Set([...Object.keys(baseEntries||{}),...Object.keys(remoteEntries||{}),...Object.keys(localRecords||{})]);
    for(const key of keys){
      const baseEntry=baseEntries?.[key],remoteEntry=remoteEntries?.[key],b=baseEntry?.record,rActual=remoteEntry?.record,lActual=localRecords?.[key];let chosen;
      if(!hasBase){
        if(rActual!==undefined){
          if(rActual.deleted)chosen=clone(rActual);
          else if(lActual!==undefined&&rActual.kind==='scratch'&&!recordEqual(rActual,lActual))chosen=makeRecord('scratch',rActual.id,mergeValue(undefined,rActual.data,lActual.data,['scratch']),false);
          else chosen=clone(rActual); // established v2 cloud record wins same-ID ambiguity on a new device
        }else if(lActual!==undefined){chosen=clone(lActual)}
      }else{
        const r=rActual!==undefined?rActual:b;
        let l=lActual;
        if(l===undefined&&b!==undefined)l=b.deleted?clone(b):tombstoneFor(b);
        chosen=mergeRecord(b,r,l);
      }
      if(chosen===undefined)continue;
      final[key]=clone(chosen);
      if(!recordEqual(chosen,rActual))mutations[key]=clone(chosen);
    }
    return{final,mutations};
  }

  function payloadFor(record,deviceId,mutationAt){
    return{schema:'atlas_entity_record',version:2,kind:record.kind,id:record.id,deleted:!!record.deleted,data:record.deleted?null:clone(record.data),deviceId:String(deviceId||''),clientMutationAt:Number(mutationAt||Date.now())};
  }
  function recordFromPayload(payload){
    if(!plain(payload)||payload.schema!=='atlas_entity_record'||payload.version!==2||typeof payload.kind!=='string'||typeof payload.id!=='string'||typeof payload.deleted!=='boolean')return null;
    if(payload.deleted)return makeRecord(payload.kind,payload.id,null,true);
    if(!Object.prototype.hasOwnProperty.call(payload,'data'))return null;
    return makeRecord(payload.kind,payload.id,payload.data,false);
  }

  return{COLLECTIONS,clone,plain,canonical,equal,keyFor,makeRecord,tombstoneFor,recordEqual,flattenState,mergeValue,mergeRecord,reconcile,payloadFor,recordFromPayload};
});
