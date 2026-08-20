#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
let i = 0;
let n = 0;
while ((i = code.indexOf('components.map(', i)) !== -1 && n < 6) {
  console.log('=== @', i, '===');
  console.log(code.slice(Math.max(0, i - 150), i + 800).replace(/\n/g, '\\n'));
  console.log('\n');
  i += 'components.map('.length;
  n++;
}
