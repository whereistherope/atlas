// Optional authenticated cloud connection. IndexedDB remains Atlas's source of truth.
(function(){
  'use strict';
  let client=null;
  let status={state:'LOCAL',message:'Cloud not initialised',email:'',authenticated:false,verified:false};
  const snapshot=()=>Object.freeze({...status});
  function emit(next){status={...status,...next};try{window.dispatchEvent(new CustomEvent('atlascloudstatus',{detail:snapshot()}))}catch(_){}return snapshot()}
  function offline(){return typeof navigator!=='undefined'&&navigator.onLine===false}
  function errorMessage(error,fallback){return String(error?.message||fallback||'Cloud request failed.').slice(0,160)}
  async function refreshSession(){
    if(!client)return null;
    try{const {data,error}=await client.auth.getSession();if(error)throw error;const session=data?.session||null;emit(session?{state:'CONNECTED',message:'Signed in',email:session.user?.email||'',authenticated:true,verified:false}:{state:'SIGNED OUT',message:'Sign in to connect',email:'',authenticated:false,verified:false});return session}catch(error){emit({state:offline()?'OFFLINE':'ERROR',message:errorMessage(error),email:'',authenticated:false,verified:false});return null}
  }
  async function init(){
    if(client)return snapshot();
    if(offline())return emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false});
    const config=window.ATLAS_CLOUD_CONFIG,library=window.supabase;
    if(!config?.url||!config?.publishableKey||typeof library?.createClient!=='function')return emit({state:'LOCAL',message:'Cloud client unavailable',authenticated:false,verified:false});
    try{
      client=library.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      client.auth.onAuthStateChange((_event,session)=>emit(session?{state:'CONNECTED',message:'Signed in',email:session.user?.email||'',authenticated:true,verified:false}:{state:'SIGNED OUT',message:'Sign in to connect',email:'',authenticated:false,verified:false}));
      return await refreshSession();
    }catch(error){client=null;return emit({state:'ERROR',message:errorMessage(error,'Cloud client unavailable'),authenticated:false,verified:false})}
  }
  async function signIn(email,password){
    if(offline()){emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false});return{ok:false,error:'Offline'}}
    if(!client)await init();if(!client)return{ok:false,error:status.message};
    emit({state:'CONNECTING',message:'Signing in',verified:false});
    try{const {data,error}=await client.auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});if(error)throw error;const session=data?.session||null;emit({state:'CONNECTED',message:'Signed in',email:session?.user?.email||'',authenticated:true,verified:false});return{ok:true,session}}catch(error){const message=errorMessage(error,'Sign in failed.');emit({state:'ERROR',message,email:'',authenticated:false,verified:false});return{ok:false,error:message}}
  }
  async function signOut(){
    if(!client)return{ok:true};try{const {error}=await client.auth.signOut();if(error)throw error;emit({state:'SIGNED OUT',message:'Signed out',email:'',authenticated:false,verified:false});return{ok:true}}catch(error){const message=errorMessage(error,'Sign out failed.');emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  async function testAccess(){
    if(offline()){emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false});return{ok:false,error:'Offline'}}if(!client)await init();if(!client)return{ok:false,error:status.message};
    try{
      const {data:userData,error:userError}=await client.auth.getUser();if(userError)throw userError;const user=userData?.user;if(!user)throw new Error('Sign in required.');
      const {data:vault,error:vaultError}=await client.from('atlas_vaults').select('id,name,created_by').eq('created_by',user.id).eq('name','Atlas').single();if(vaultError)throw vaultError;if(!vault)throw new Error('No accessible Atlas vault.');
      const {data:profile,error:profileError}=await client.from('atlas_profiles').select('vault_id,profile_key,name,kind,owner_user_id').eq('vault_id',vault.id).eq('profile_key','me').eq('kind','person').eq('owner_user_id',user.id).maybeSingle();if(profileError)throw profileError;if(!profile||profile.vault_id!==vault.id)throw new Error('Me cloud profile is unavailable.');
      emit({state:'CONNECTED',message:'Cloud access verified',email:user.email||status.email,authenticated:true,verified:true});
      return{ok:true,userId:user.id,vaultId:vault.id,vaultName:vault.name,profile:{profileKey:profile.profile_key,name:profile.name,kind:profile.kind}};
    }catch(error){const message=errorMessage(error,'Access test failed.');emit({state:offline()?'OFFLINE':'ERROR',message,verified:false});return{ok:false,error:message}}
  }
  window.addEventListener?.('offline',()=>emit({state:'OFFLINE',message:'Atlas is available locally',authenticated:false,verified:false}));
  window.addEventListener?.('online',()=>{if(client)refreshSession();else init()});
  window.AtlasCloud=Object.freeze({init,getStatus:snapshot,getSession:refreshSession,signIn,signOut,testAccess});
})();
