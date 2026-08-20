#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
const i = 1507797;
console.log(code.slice(Math.max(0, i - 100), i + 2000).replace(/\n/g, '\\n'));
