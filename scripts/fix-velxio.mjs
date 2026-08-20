#!/usr/bin/env node
/**
 * Apply the three bug fixes to the Velxio bundle (start from ORIGINAL backup).
 * Fixes:
 *  1. Component drag blocked after selection (Fe properties-panel flag).
 *     - Replace `if(Fe)return;` with `Fe&&Pe(!1);` so mousedown closes the
 *       panel and lets the drag proceed.
 *  2. Left-button canvas pan.
 *     - Allow button 0 (left) in the pan-enabling mousedown handler.
 *  3. Delete key with a wire selected also asks to remove the board.
 *     - Guard the board-delete branch with a live check of selectedWireId so
 *       the board-delete modal is NOT opened while a wire is selected (the
 *       wire-delete handler handles that).
 *
 * Validates with acorn + node --check and writes to the real bundle.
 * A backup of the current bundle is always created first.
 */
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const bundlePath = path.resolve('scratch-gui/static/velxio/assets/index-B_4T4h6s.js');
const originalPath = bundlePath + '.instrument-backup';

// acorn installed in a temp dir (outside the C:\stb npm workspace)
const ACORN = 'C:/Users/bello/AppData/Local/Temp/acorn-parse/node_modules/acorn';
const acorn = require(ACORN);

// Each fix: {name, anchor, replacement}
const FIXES = [
    {
        name: 'componentDragAfterSelection',
        anchor: '_o=(te,de)=>{if(Fe)return;de.stopPropagation();',
        replacement: '_o=(te,de)=>{Fe&&Pe(!1);de.stopPropagation();'
    },
    {
        name: 'leftButtonPan',
        anchor: 'fm=te=>{(te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,',
        replacement: 'fm=te=>{(te.button===0||te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,'
    },
    {
        name: 'deleteWireNoBoardModal',
        anchor: 'const te=de=>{(de.key==="Delete"||de.key==="Backspace")&&(ie?(h(ie),le(null)):n&&ke(n))}',
        replacement: 'const te=de=>{(de.key==="Delete"||de.key==="Backspace")&&(ie?(h(ie),le(null)):(!$e.getState().selectedWireId&&n&&ke(n)))}'
    }
];

function acornParse(code) {
    try {
        acorn.parse(code, {ecmaVersion: 'latest', sourceType: 'module'});
        return {ok: true};
    } catch (e) {
        return {ok: false, err: e.message + ' @ ' + (e.loc ? JSON.stringify(e.loc) : '?')};
    }
}

function nodeCheck(code) {
    const tmp = 'scripts/.fix-check.mjs';
    fs.writeFileSync(tmp, code);
    try {
        execFileSync(process.execPath, ['--check', tmp], {stdio: 'pipe'});
        return {ok: true};
    } catch (e) {
        return {ok: false, err: String(e.stderr).split('\n').slice(-4).join('\n')};
    } finally {
        try { fs.unlinkSync(tmp); } catch (e) {}
    }
}

if (!fs.existsSync(originalPath)) {
    console.error('Original backup not found at', originalPath);
    process.exit(1);
}

// Start from the ORIGINAL (pre-instrumentation) bundle
const orig = fs.readFileSync(originalPath, 'utf8');
console.log('Original length:', orig.length);

// Verify each anchor exists exactly once
for (const fix of FIXES) {
    let count = 0;
    let idx = -1;
    while ((idx = orig.indexOf(fix.anchor, idx + 1)) !== -1) count++;
    console.log('Anchor', fix.name, 'occurs', count, 'times');
    if (count !== 1) {
        console.error('ABORT: anchor not unique for', fix.name);
        process.exit(1);
    }
}

// Apply fixes
let code = orig;
for (const fix of FIXES) {
    const idx = code.indexOf(fix.anchor);
    if (code.indexOf('FIXED:' + fix.name) === -1) {
        code = code.slice(0, idx) + fix.replacement + code.slice(idx + fix.anchor.length);
        console.log('Applied fix:', fix.name);
    } else {
        console.log('Already fixed:', fix.name);
    }
}

// Validate
const a = acornParse(code);
const n = nodeCheck(code);
console.log('\nacorn=' + (a.ok ? 'OK' : 'FAIL ' + a.err));
console.log('nodeCheck=' + (n.ok ? 'OK' : 'FAIL ' + n.err));

if (!a.ok || !n.ok) {
    console.error('Validation FAILED — not writing bundle.');
    process.exit(1);
}

// Backup current bundle before overwriting
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupOfCurrent = bundlePath + '.pre-fix-' + stamp;
fs.copyFileSync(bundlePath, backupOfCurrent);
console.log('Backup of current bundle saved to', backupOfCurrent);

fs.writeFileSync(bundlePath, code, 'utf8');
console.log('Bundle fixed and written. New length:', code.length);

// Sanity: md5 of fixed vs original
const crypto = await import('crypto');
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
console.log('Original md5:', md5(fs.readFileSync(originalPath)));
console.log('Fixed   md5:', md5(fs.readFileSync(bundlePath)));
