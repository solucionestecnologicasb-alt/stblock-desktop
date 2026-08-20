#!/usr/bin/env node
/**
 * Apply debug insertions to the Velxio bundle using REPLACE semantics
 * (each insertion fully replaces its anchor text). Writes to a temp file
 * and validates with acorn + node --check BEFORE any real bundle is touched.
 */
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const bundlePath = path.resolve('scratch-gui/static/velxio/assets/index-B_4T4h6s.js');
const outPath = path.resolve('scripts/out-instrumented.mjs');

// acorn installed in a temp dir (outside the C:\stb npm workspace)
const ACORN = 'C:/Users/bello/AppData/Local/Temp/acorn-parse/node_modules/acorn';
const acorn = require(ACORN);

// Each entry: {name, anchor, insertion}
// The anchor text is REPLACED by insertion (anchor is fully consumed).
const INSERTS = [
    {
        name: 'keydownBoard',
        anchor: 'const te=de=>{(de.key==="Delete"||de.key==="Backspace")&&(ie?(h(ie),le(null)):n&&ke(n))}',
        insertion: 'const te=de=>{if(de.key==="Delete"||de.key==="Backspace")console.log("[DBG-Key][Board] Delete. component=",ie,"activeBoard=",n,"wireSel=",U,"panel=",Fe);(de.key==="Delete"||de.key==="Backspace")&&(ie?(h(ie),le(null)):n&&ke(n))}'
    },
    {
        name: 'componentMousedown',
        anchor: '_o=(te,de)=>{if(Fe)return;de.stopPropagation();',
        insertion: '_o=(te,de)=>{console.log("[DBG-Drag][Comp] mousedown comp=",te,"clientX=",de.clientX,"clientY=",de.clientY,"Fe=",Fe);if(Fe){console.log("[DBG-Drag][Comp] BLOCKED by Fe");return}de.stopPropagation();'
    },
    {
        name: 'mouseMovePan',
        anchor: 'yx=te=>{if(pr.current){',
        insertion: 'yx=te=>{console.log("[DBG-Move] mousemove et=",et,"pr=",pr.current,"button=",te.buttons);if(pr.current){'
    },
    {
        name: 'canvasMousedown',
        anchor: 'fm=te=>{(te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,',
        insertion: 'fm=te=>{console.log("[DBG-CanvasMD] button=",te.button,"target=",String(te.target&&te.target.className),"Fe=",Fe,"B=",B,"U=",U);(te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,'
    },
    {
        name: 'wireKeydown',
        anchor: 'const te=de=>{if(de.key==="Escape"&&B){k();return}',
        insertion: 'const te=de=>{if(de.key==="Delete"||de.key==="Backspace")console.log("[DBG-Key][Wire] Delete. selectedWire(U)=",U,"wireInProgress(B)=",B);if(de.key==="Escape"&&B){k();return}'
    },
    {
        name: 'mouseUpTop',
        anchor: 'pm=te=>{if(pr.current){',
        insertion: 'pm=te=>{console.log("[DBG-Up] mouseup et=",et,"clientX=",te.clientX,"clientY=",te.clientY);if(pr.current){'
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
    const tmp = 'scripts/.node-check.mjs';
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

// Validate each insertion individually against the original
const orig = fs.readFileSync(bundlePath, 'utf8');
console.log('=== Individual validation ===');
for (const ins of INSERTS) {
    const idx = orig.indexOf(ins.anchor);
    const single = orig.slice(0, idx) + ins.insertion + orig.slice(idx + ins.anchor.length);
    const a = acornParse(single);
    const n = nodeCheck(single);
    console.log(ins.name + ':', 'acorn=' + (a.ok ? 'OK' : 'FAIL ' + a.err), '| nodeCheck=' + (n.ok ? 'OK' : 'FAIL ' + n.err));
}

// Apply all to a fresh copy
let code = orig;
for (const ins of INSERTS) {
    const idx = code.indexOf(ins.anchor);
    code = code.slice(0, idx) + ins.insertion + code.slice(idx + ins.anchor.length);
}
const aAll = acornParse(code);
const nAll = nodeCheck(code);
console.log('\n=== All combined ===');
console.log('acorn=' + (aAll.ok ? 'OK' : 'FAIL ' + aAll.err));
console.log('nodeCheck=' + (nAll.ok ? 'OK' : 'FAIL ' + nAll.err));

if (aAll.ok && nAll.ok) {
    fs.writeFileSync(outPath, code);
    console.log('\nWrote instrumented copy to', outPath, '(' + code.length + ' bytes)');
} else {
    console.error('\nValidation FAILED — NOT writing to', outPath);
}
