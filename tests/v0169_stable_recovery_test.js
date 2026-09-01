const fs=require('fs');
const assert=require('assert');

const read=file=>fs.readFileSync(file,'utf8');
const tokens=read('styles/tokens.css');
const index=read('index.html');
const bootstrap=read('js/bootstrap.js');
const sw=read('sw.js');
const recovery=read('js/sync-v2-recovery.js');
const sync3=read('js/sync-v3.js');
const recoveryUi=read('js/sync-recovery-ui.js');

const unique=list=>[...new Set(list)];
const local=file=>file.replace(/^\.\//,'').split('?')[0];

function loadedStyles(){
  const staticStyles=[...index.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]).filter(x=>x.startsWith('./'));
  const dynamic=[...bootstrap.matchAll(/loadStyle\(["']([^"']+)["']\)/g)].map(m=>m[1]);
  return unique([...staticStyles,...dynamic]);
}

function loadedScripts(){
  const staticScripts=[...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)].map(m=>m[1]).filter(x=>x.startsWith('./'));
  const dynamic=[...bootstrap.matchAll(/loadScript\(["']([^"']+)["']/g)].map(m=>m[1]);
  return unique([...staticScripts,...dynamic]);
}

const styleFiles=loadedStyles();
const scriptFiles=loadedScripts();
const productionCss=styleFiles.map(file=>read(local(file))).join('\n');
const productionJs=scriptFiles.map(file=>read(local(file))).join('\n');

function finalCustomProperty(selector,property){
  let found=null;
  for(const file of styleFiles){
    const css=read(local(file)).replace(/\/\*[\s\S]*?\*\//g,'');
    const blocks=css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
    for(const block of blocks){
      const selectors=block[1].split(',').map(x=>x.trim());
      if(!selectors.includes(selector))continue;
      const escaped=property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const declarations=[...block[2].matchAll(new RegExp(`${escaped}\\s*:\\s*([^;}]*)`,'g'))];
      if(declarations.length){
        found=declarations.at(-1)[1].replace(/\s*!important\s*$/,'').trim();
      }
    }
  }
  return found;
}

const buildMatch=bootstrap.match(/const\s+BUILD=['"]([^'"]+)['"]/);
const cacheMatch=sw.match(/const\s+CACHE_NAME\s*=\s*['"]atlas-shell-([^'"]+)['"]/);
assert(buildMatch,'bootstrap build identifier missing');
assert(cacheMatch,'service worker cache identifier missing');
const buildParts=buildMatch[1].match(/^0?(\d{2})(\d)r(\d+)$/);
assert(buildParts,'bootstrap build identifier format changed unexpectedly');
const expectedCacheVersion=`0.${Number(buildParts[1])}.${Number(buildParts[2])}-r${buildParts[3]}`;
assert.strictEqual(cacheMatch[1],expectedCacheVersion,'bootstrap and service-worker build versions must advance together');

assert(tokens.includes('--bg:#070b10'),'Atlas night palette must remain');
assert(tokens.includes('html:not(.atlas-ready)'),'minimal no-flash boot guard must remain');

assert(scriptFiles.includes('./js/sync-v2-recovery.js'),'Shared Atlas recovery runtime must load');
assert(scriptFiles.includes('./js/sync-v3.js'),'Shared Atlas sync runtime must load');
assert(scriptFiles.includes('./js/sync-recovery-ui.js'),'Shared Atlas recovery controls must load');
assert(!bootstrap.includes('SYNC_V2_ENABLED=false'),'emergency global sync pause must remain retired');
assert(!scriptFiles.includes('./js/sync-v2.js'),'old v2 sync runtime must not boot');
assert(!scriptFiles.includes('./js/window-drag.js'),'rejected global movable-window runtime must remain disabled');
assert(!scriptFiles.includes('./js/network-overview.js'),'retired network minimap runtime must remain disabled');

assert(productionJs.includes('[data-atlas-aligned-capture]'),'capture launcher handoff behaviour missing');
assert(productionJs.includes('AtlasRuntimeTelemetry'),'runtime telemetry contract missing');
assert(productionCss.includes('.atlas-runtime-telemetry'),'runtime telemetry presentation missing');
assert(productionCss.includes('#atlasCaptureLauncher'),'production theme must style Capture material');
assert(productionCss.includes('backdrop-filter:blur(3px)!important'),'approved restrained 3px frost must remain');
assert(productionCss.includes('box-shadow:none!important'),'decorative pane shadows must remain removed');

assert.strictEqual(finalCustomProperty('body[data-theme="night"]','--atlas-pane'),'rgba(8,12,15,.47)','night pane material changed');
assert.strictEqual(finalCustomProperty('body[data-theme="night"]','--atlas-pane-raised'),'rgba(8,13,17,.55)','night raised pane material changed');
assert.strictEqual(finalCustomProperty('body[data-theme="night"]','--atlas-float-glass'),'rgba(7,11,15,.51)','night floating material changed');
assert.strictEqual(finalCustomProperty('body[data-theme="night"]','--atlas-editor-field-fill'),'#11171c','night editor field material changed');
assert.strictEqual(finalCustomProperty('body:not([data-theme="night"])','--atlas-pane'),'rgba(224,228,230,.53)','day pane material changed');
assert.strictEqual(finalCustomProperty('body:not([data-theme="night"])','--atlas-pane-raised'),'rgba(232,235,237,.59)','day raised pane material changed');
assert.strictEqual(finalCustomProperty('body:not([data-theme="night"])','--atlas-float-glass'),'rgba(229,233,235,.55)','day floating material changed');
assert.strictEqual(finalCustomProperty('body:not([data-theme="night"])','--atlas-editor-field-fill'),'#d9dddf','day editor field material changed');

for(const selector of ['.atlas-vnote-fields input','.atlas-vnote-fields select','.atlas-vnote-body']){
  assert(productionCss.includes(selector),`${selector} must remain covered by shared editor material`);
}
assert(productionCss.includes('background:var(--atlas-editor-field-fill)!important'),'editor controls must use the shared field fill token');
assert(productionJs.includes('scrollIntoView'),'widget opening must keep the visibility guarantee');
assert(productionJs.includes("handle.addEventListener('pointerdown'"),'movable windows must remain handle-scoped');

assert(recovery.includes("RECOVERY_TYPE='entity_recovery_snapshot_v1'"),'recovery snapshots must remain append-only records');
assert(recovery.includes("idbBackup(Core.clone(state),'before Shared Atlas recovery')"),'local recovery copy must be backed up before restore');
assert(recovery.includes("appendRecoverySnapshot('old-shared-atlas-before-recovery'"),'existing Shared Atlas must be preserved before restore');
assert(recovery.includes("appendRecoverySnapshot('local-recovery-copy-before-restore'"),'local recovery copy must be preserved before restore');
assert(recovery.includes('canonicalEpoch:newEpoch'),'Shared Atlas restore must establish a fresh revision epoch');
assert(sync3.includes('version:3,canonicalEpoch'),'client cache base must persist acknowledged Shared Atlas epoch');
assert(sync3.includes('Core.reconcile({},remote,local,false)'),'unknown epoch must refresh from Shared Atlas without uploading stale local state');
assert(sync3.includes('before Shared Atlas pull / stale-client quarantine'),'stale-client refresh must create a local recovery backup');
assert(recoveryUi.includes('Restore Shared Atlas from this copy'),'recovery must remain framed as a one-time Shared Atlas restore');
assert(!recoveryUi.includes('Make this Atlas canonical'),'device-promotion wording must remain removed');

for(const asset of ['./js/sync-v2-recovery.js','./js/sync-v3.js','./js/sync-recovery-ui.js'])assert(sw.includes(`'${asset}'`),`${asset} must be cached`);
assert(!sw.includes("'./assets/lock-terrain.gif'"),'retired lock artwork must not remain offline-critical');

console.log('Atlas stable behaviour + Shared Atlas compatibility contract: PASS');
