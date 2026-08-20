#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

// Find where the editor renders each component. Look for `_o` handler usage (component mousedown).
// Search for 'onMouseDown:_o' or 'onMouseDown:_o,' pattern
let i = 0;
const needles = ['onMouseDown:_o', 'onMouseDown:_o,', 'onMouseDown:_o}', 'onMouseDown:_o '];
for (const n of needles) {
  let j = 0, c = 0;
  while ((j = code.indexOf(n, j)) !== -1) { c++; j += n.length; }
  console.log(n, '->', c);
}
// Find the component render loop with _o. Search for the render where components array is iterated
let k = code.indexOf('onMouseDown:_o');
if (k === -1) k = code.indexOf('onMouseDown:_o');
if (k !== -1) {
  console.log('\n=== @', k, '===');
  console.log(code.slice(Math.max(0, k - 3000), k + 500).replace(/\n/g, '\\n'));
}
