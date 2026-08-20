#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

// All customElements.define occurrences with any arg pattern
let i = 0;
const found = [];
while ((i = code.indexOf('customElements.define', i)) !== -1) {
  found.push(code.slice(i, i + 90).replace(/\n/g, '\\n'));
  i += 'customElements.define'.length;
}
console.log('customElements.define count:', found.length);
for (const f of found.slice(0, 60)) console.log('  ', f);

// Also find any 'wokwi-led' custom element class definition / registration
console.log('\n--- wokwi-led contexts (first 6) ---');
let j = 0, n = 0;
while ((j = code.indexOf('wokwi-led', j)) !== -1 && n < 6) {
  console.log('@', j, ':', code.slice(Math.max(0, j - 100), j + 80).replace(/\n/g, '\\n'));
  j += 'wokwi-led'.length;
  n++;
}
