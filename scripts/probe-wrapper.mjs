#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
const i = code.indexOf('dynamic-component-wrapper');
console.log('at', i);
if (i !== -1) {
  console.log(code.slice(Math.max(0, i - 2500), i + 800).replace(/\n/g, '\\n'));
}
