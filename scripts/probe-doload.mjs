#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
// Find _doLoad definition
const i = code.indexOf('_doLoad()');
console.log('_doLoad at', i);
console.log(code.slice(Math.max(0, i - 200), i + 2500).replace(/\n/g, '\\n'));
