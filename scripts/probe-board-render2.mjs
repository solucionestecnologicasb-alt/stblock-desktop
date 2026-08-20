#!/usr/bin/env node
import fs from 'fs';
const code = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

// Find where the editor renders placed components (with x/y positioning).
// Look for patterns like `.map(` over components producing positioned elements.
// Common patterns: "components.map(" or `comp.map(` with style left/top.
const candidates = [];
for (const needle of ['components.map(', 'component.map(', 'c.map(comp', 'board.components']) {
  let i = 0, count = 0;
  while ((i = code.indexOf(needle, i)) !== -1) { count++; i += needle.length; }
  if (count) candidates.push({needle, count});
  console.log(needle, '->', count);
}

// Search for the render that positions components: style={{left
let i = code.indexOf('{left:');
console.log('\n{left: count:', (code.match(/\{left:/g) || []).length);

// Search for a component render component. Look for 'transform: `translate'
let j = code.indexOf('translate(');
console.log('translate( count:', (code.match(/translate\(/g) || []).length);
