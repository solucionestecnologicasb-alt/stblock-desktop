#!/usr/bin/env node
/**
 * Find where the editor handlers (_o, yx, pm, fm, te, etc.) are referenced
 * in the bundle to determine which elements they attach to.
 */
import fs from 'fs';

const orig = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

// Handler definitions (after instrumentation the bundle is still original here,
// but we search the ORIGINAL bundle text).
const defs = [
    {name: '_o', pos: 1548381, regex: /\b_o\b/g},
    {name: 'yx', pos: 1548601, regex: /\byx\b/g},
    {name: 'pm', pos: 1550486, regex: /\bpm\b/g},
    {name: 'fm', pos: 1552070, regex: /\bfm\b/g}
];

// We'll scan a region after the editor component starts (say 1536000) to the end of the component.
const start = 1536000;

for (const d of defs) {
    console.log('\n=== Handler', d.name, 'defined at', d.pos, '===');
    d.regex.lastIndex = 0;
    let m;
    let count = 0;
    while ((m = d.regex.exec(orig)) !== null && m.index < d.pos + 100000) {
        // Only report occurrences after the definition
        if (m.index < d.pos) continue;
        if (m.index > d.pos + 80000) break;
        count++;
        if (count > 25) { console.log('...more...'); break; }
        const ctx = orig.slice(m.index - 30, m.index + 30);
        // highlight the match
        const idx = ctx.indexOf(d.name);
        console.log('  @', m.index, '...' + JSON.stringify(ctx.slice(0, idx)) + '>>' + d.name + '<<' + JSON.stringify(ctx.slice(idx + d.name.length)) + '...');
    }
    if (count === 0) console.log('  (no usages found after definition)');
}
