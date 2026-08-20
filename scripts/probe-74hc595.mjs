#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
for (const needle of ['74hc595', '74HC595', 'velxio-74hc595', 'pi-pico-w', 'attiny85']) {
  let count = 0, i = 0;
  while ((i = code.indexOf(needle, i)) !== -1) { count++; i += needle.length; }
  console.log(needle, '->', count);
}
// Show first 74hc595 context
const i = code.indexOf('74hc595');
console.log('\n=== first 74hc595 ===');
console.log(code.slice(Math.max(0, i - 250), i + 250).replace(/\n/g, '\\n'));
