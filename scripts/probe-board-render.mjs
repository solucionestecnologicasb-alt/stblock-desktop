#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

for (const needle of ['document.createElement(', 'createElement(', 'customElements.get(', '.pinInfo', 'metadataId']) {
  let count = 0, i = 0;
  while ((i = code.indexOf(needle, i)) !== -1) { count++; i += needle.length; }
  console.log(needle, '->', count);
}

// Find where on-board components are instantiated. Look for a render map / component factory.
// The board likely iterates components and creates elements. Search for 'tagName' near 'component'.
let i = code.indexOf('.pinInfo');
let shown = 0;
while (i !== -1 && shown < 3) {
  console.log('\n=== .pinInfo @', i, '===');
  console.log(code.slice(Math.max(0, i - 250), i + 150).replace(/\n/g, '\\n'));
  i = code.indexOf('.pinInfo', i + 1);
  shown++;
}
