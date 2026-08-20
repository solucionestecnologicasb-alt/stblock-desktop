#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
const i = code.indexOf('define("velxio-74hc595"');
console.log(code.slice(Math.max(0, i - 3000), i + 200).replace(/\n/g, '\\n'));
