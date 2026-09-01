const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('styles/atlas-document.css','utf8');
const js=fs.readFileSync('js/visual-table-controls.js','utf8');
const bootstrap=fs.readFileSync('js/bootstrap.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of [
  '.atlas-table-wrap{display:block;width:100%;max-width:100%;overflow-x:auto',
  '.atlas-vnote-body .atlas-table-wrap table,.atlas-project-rich-body .atlas-table-wrap table{width:100%;border-collapse:collapse',
  '.atlas-vnote-body .atlas-table-wrap th,.atlas-vnote-body .atlas-table-wrap td,.atlas-project-rich-body .atlas-table-wrap th,.atlas-project-rich-body .atlas-table-wrap td{',
  'border:1px solid color-mix(in srgb,var(--atlas-border) 46%,transparent)',
  'min-width:110px',
  'min-height:38px'
]) assert(css.includes(token),`table visual contract missing: ${token}`);

for(const token of [
  "wrap.className='atlas-table-wrap'",
  "const table=document.createElement('table')",
  "['Column 1','Column 2']",
  "table.append(thead,tbody);wrap.append(table);insertNode(wrap)"
]) assert(js.includes(token),`table insertion contract missing: ${token}`);

assert(bootstrap.includes("const BUILD='0169r36'"),'r36 bootstrap expected');
assert(sw.includes("atlas-shell-0.16.9-r36"),'r36 shell expected');
console.log('Atlas visual table contract: PASS');
