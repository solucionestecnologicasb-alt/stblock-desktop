#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
// Find velxio-bmp280 registration and pinInfo
let i = code.indexOf('velxio-bmp280');
// print around registration
const regIdx = code.indexOf('define("velxio-bmp280"');
console.log('=== registration ===');
console.log(code.slice(Math.max(0, regIdx - 2500), regIdx + 300).replace(/\n/g, '\\n'));
