#!/usr/bin/env node
/**
 * Analyze the structure of bundle line 8555 (template literal + editor code).
 */
import fs from 'fs';

const orig = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
const start = 1490612;
const line = orig.slice(start, start + 70000);

let inTemplate = true;
let escape = false;
let closeOffset = -1;
for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inTemplate) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '`') {
            closeOffset = i;
            console.log('Closing backtick at offset', i, 'absolute', start + i);
            console.log('Context around close:', JSON.stringify(line.slice(i - 20, i + 40)));
            inTemplate = false;
            break;
        }
    }
}
if (inTemplate) console.log('No closing backtick found in first 70k chars');
if (closeOffset !== -1) {
    console.log('\nAfter close, first 300 chars:');
    console.log(JSON.stringify(line.slice(closeOffset + 1, closeOffset + 301)));
}

// Find where the editor code anchors are relative to line start
const anchors = ['pm=te=>{', 'yx=te=>{', '_o=(te,de)=>{if(Fe)return', 'fm=te=>{', 'const te=de=>{(de.key==="Delete"'];
for (const a of anchors) {
    const idx = line.indexOf(a);
    console.log('\nAnchor', JSON.stringify(a), 'at offset', idx, '(absolute', start + idx + ')', idx === -1 ? '' : (idx < closeOffset ? '=> INSIDE TEMPLATE LITERAL' : '=> after close (real code)'));
}
