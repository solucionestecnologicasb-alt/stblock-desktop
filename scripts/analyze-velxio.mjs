#!/usr/bin/env node
/**
 * Analyze the Velxio bundle to find component definitions and extract context.
 * Usage: node scripts/analyze-velxio.mjs <position>
 */
import fs from 'fs';

const bundlePath = 'scratch-gui/static/velxio/assets/index-B_4T4h6s.js';
const bundle = fs.readFileSync(bundlePath, 'utf8');

// Find the start of the component definition containing a position
function findComponentStart(pos) {
    const searchStart = Math.max(0, pos - 20000);
    const segment = bundle.slice(searchStart, pos);
    const re = /(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*\(\s*\{[^}]*\}\s*\)\s*=>|const\s+(\w+)\s*=\s*\(\)\s*=>|=>\s*\{)/g;
    const matches = [];
    let m;
    while ((m = re.exec(segment)) !== null) {
        const name = m[1] || m[2] || m[3] || '(arrow)';
        matches.push({pos: searchStart + m.index, text: m[0], name});
    }
    return matches;
}

const pos = parseInt(process.argv[2], 10) || 1547794;
const beforeLen = process.argv[3] ? parseInt(process.argv[3], 10) : 8000;
const afterLen = process.argv[4] ? parseInt(process.argv[4], 10) : 4000;

console.log('=== Component start candidates before', pos, '===');
const candidates = findComponentStart(pos);
candidates.slice(-15).forEach(x => console.log(x.pos, JSON.stringify(x.name), JSON.stringify(x.text.slice(0, 40))));

console.log('\n=== EXCERPT ===');
const start = Math.max(0, pos - beforeLen);
const end = Math.min(bundle.length, pos + afterLen);
console.log(bundle.slice(start, end));
