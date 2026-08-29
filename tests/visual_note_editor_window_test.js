const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('styles/editor-ux.css','utf8');

for(const token of [
  '.atlas-vnote-overlay{position:fixed;inset:0;z-index:100060;display:none;pointer-events:none}',
  '.atlas-vnote-overlay.open{display:block;pointer-events:auto}',
  '.atlas-vnote-sheet{position:absolute;top:24px;left:50%;transform:translateX(-50%)',
  'height:min(720px,calc(100dvh - 48px))',
  '.atlas-note-editor-sheet,.atlas-vnote-sheet{resize:both}',
  '.atlas-vnote-scroll{min-height:0;flex:1;overflow:auto',
  '.atlas-locked .atlas-vnote-overlay'
]){
  if(token.includes('.atlas-locked')){
    const lock=fs.readFileSync('styles/lock-terrain.css','utf8');
    assert(lock.includes(token),`missing lock/editor boundary: ${token}`);
  }else assert(css.includes(token),`missing visual-note window contract: ${token}`);
}

const widgets=fs.readFileSync('styles/widgets.css','utf8');
assert(widgets.includes('z-index:120'),'widget stacking baseline changed unexpectedly');
assert(css.includes('z-index:100060'),'editor must stack above floating widgets');
console.log('Atlas visual note editor window contract: PASS');
