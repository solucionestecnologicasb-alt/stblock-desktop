#!/usr/bin/env node
/**
 * Inspect the diag-instrumented file around each insertion point.
 */
import fs from 'fs';

const orig = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');
const diag = fs.readFileSync('diag-instrumented.mjs', 'utf8');

// Positions of anchors in the ORIGINAL (before any insertions)
// From the diag run: each anchor's first occurrence position.
const anchorPositions = [
    {name: 'keydownBoard', orig: 1547769},
    {name: 'componentMousedown', orig: 1548608},
    {name: 'mouseMovePan', orig: 1549026},
    {name: 'mouseUpTop', orig: 1551015},
    {name: 'canvasMousedown', orig: 1552599},
    {name: 'wireKeydown', orig: 1554495}
];

// Insertions in order applied:
const insertLengths = [
    {name: 'keydownBoard', len: 210},
    {name: 'componentMousedown', len: 183},
    {name: 'mouseMovePan', len: 89},
    {name: 'mouseUpTop', len: 86},
    {name: 'canvasMousedown', len: 145},
    {name: 'wireKeydown', len: 137}
];

// Reconstruct diag positions by accumulating insertion lengths before each anchor.
let cumulative = 0;
for (let i = 0; i < anchorPositions.length; i++) {
    const a = anchorPositions[i];
    const diagPos = a.orig + cumulative;
    console.log('\n=== ' + a.name + ' ===');
    console.log('orig pos:', a.orig, 'diag pos:', diagPos);
    console.log('ORIG  context:', JSON.stringify(orig.slice(a.orig - 60, a.orig + 120)));
    console.log('DIAG  context:', JSON.stringify(diag.slice(diagPos - 60, diagPos + 120)));
    // Also check after the insertion end
    const insLen = insertLengths[i].len;
    console.log('DIAG  after insertion:', JSON.stringify(diag.slice(diagPos + insLen - 30, diagPos + insLen + 60)));
    cumulative += insLen;
}
