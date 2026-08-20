#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

let i = 0;
let n = 0;
while ((i = code.indexOf('document.createElement(', i)) !== -1 && n < 21) {
  console.log('=== @', i, '===');
  console.log(code.slice(Math.max(0, i - 200), i + 140).replace(/\n/g, '\\n'));
  console.log();
  i += 'document.createElement('.length;
  n++;
}
