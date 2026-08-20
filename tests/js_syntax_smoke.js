const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const jsDir = path.join(root, 'js');
const files = fs.readdirSync(jsDir).filter(name => name.endsWith('.js')).sort();

let failures = 0;
for (const name of files) {
  const full = path.join(jsDir, name);
  const src = fs.readFileSync(full, 'utf8');
  try {
    new vm.Script(src, { filename: name });
  } catch (err) {
    failures += 1;
    console.error(`SYNTAX FAIL ${name}: ${err.message}`);
  }
}

if (failures) process.exit(1);
console.log(`JavaScript syntax: PASS (${files.length} files)`);
