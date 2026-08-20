#!/usr/bin/env node
/**
 * Apply insertions one-by-one and check syntax with node --check to find the culprit.
 */
import fs from 'fs';
import {execFileSync} from 'child_process';

const bundlePath = 'scratch-gui/static/velxio/assets/index-B_4T4h6s.js';
const orig = fs.readFileSync(bundlePath, 'utf8');

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

function checkSyntax(code) {
    const tmp = 'isolate-check.mjs';
    fs.writeFileSync(tmp, code);
    try {
        execFileSync(process.execPath, ['--check', tmp], {stdio: 'pipe'});
        return {ok: true};
    } catch (e) {
        const errOut = String(e.stderr || e.stdout || e.message);
        return {ok: false, err: errOut.slice(0, 300)};
    } finally {
        try { fs.unlinkSync(tmp); } catch (e) {}
    }
}

// Test each insertion individually on the original
for (const ins of INSERTS) {
    const idx = orig.indexOf(ins.anchor);
    const testCode = orig.slice(0, idx) + ins.insertion + orig.slice(idx);
    const res = checkSyntax(testCode);
    console.log(ins.name + ':', res.ok ? 'OK' : 'FAIL -> ' + res.err);
}

// Test all insertions together (apply in array order)
let combined = orig;
for (const ins of INSERTS) {
    const idx = combined.indexOf(ins.anchor);
    combined = combined.slice(0, idx) + ins.insertion + combined.slice(idx);
}
const combinedRes = checkSyntax(combined);
console.log('\nAll combined:', combinedRes.ok ? 'OK' : 'FAIL -> ' + combinedRes.err);
