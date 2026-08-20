#!/usr/bin/env node
import fs from 'fs';

const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
const cat = JSON.parse(fs.readFileSync('scratch-gui/static/velxio/components-metadata.json', 'utf8'));

// 1. All custom element registrations in the bundle
const re = /customElements\.define\(\s*"([^"]+)"/g;
const registered = new Set();
let m;
while ((m = re.exec(code))) registered.add(m[1]);
// also customElements.define(var) patterns? Search 'cl("' patterns
const clRe = /cl\("([^"]+)"/g;
while ((m = clRe.exec(code))) registered.add(m[1]);

// 2. All catalog tagNames
const catalogTags = new Set();
for (const id of Object.keys(cat.components)) catalogTags.add(cat.components[id].tagName);

// 3. Also collect tagNames mentioned in Iw and $Se maps
const iwTags = new Set();
const iwRe = /"(wokwi-[a-z0-9-]+|velxio-[a-z0-9-]+)"\s*:\s*\{svg:/g;
while ((m = iwRe.exec(code))) iwTags.add(m[1]);

console.log('Registered custom elements:', registered.size);
console.log('Catalog tagNames:', catalogTags.size);
console.log('Iw svg tags:', iwTags.size);

const registeredSorted = [...registered].sort();
console.log('\n--- ALL registered ---');
for (const t of registeredSorted) {
  const inCat = catalogTags.has(t) ? 'IN-CATALOG' : 'NOT-IN-CATALOG';
  console.log(' ', t, '->', inCat);
}

console.log('\n--- Registered but NOT in catalog (hidden components) ---');
for (const t of registeredSorted) {
  if (!catalogTags.has(t)) console.log('  ', t);
}

console.log('\n--- Catalog entries whose tagName is NOT registered (potential broken?) ---');
for (const id of Object.keys(cat.components)) {
  const tag = cat.components[id].tagName;
  if (!registered.has(tag)) console.log('  ', id, '->', tag);
}
