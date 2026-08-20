#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

// Extract all bt("...") decorator registrations
const tags = new Set();
const re = /bt\("([^"]+)"\)/g;
let m;
while ((m = re.exec(code))) tags.add(m[1]);
console.log('bt() decorator registrations:', tags.size);
const sorted = [...tags].sort();
console.log('sample:', sorted.slice(0, 30).join(', '));

// Check candidates
const cands = ['wokwi-bjt-2n3904','wokwi-mosfet-irf540n','wokwi-mosfet-bs170','wokwi-raspberry-pi-pico','wokwi-bmp280','velxio-bmp280','wokwi-bjt-2n2222','wokwi-mosfet-2n7000','wokwi-dht22'];
console.log('\nCandidates:');
for (const c of cands) console.log(' ', c, tags.has(c) ? 'REGISTERED (bt)' : 'not found via bt');

// Also check the helper-based registrations for these candidates
for (const c of ['wokwi-bjt-2n3904','wokwi-mosfet-irf540n','wokwi-mosfet-bs170','wokwi-raspberry-pi-pico']) {
  let cnt = 0, i = 0;
  while ((i = code.indexOf(c, i)) !== -1) { cnt++; i += c.length; }
  console.log(c, 'total bundle occurrences:', cnt);
}
