#!/usr/bin/env node
/**
 * Diagnose: apply insertions to a copy, write locally, inspect.
 */
import fs from 'fs';

const bundlePath = 'scratch-gui/static/velxio/assets/index-B_4T4h6s.js';
let code = fs.readFileSync(bundlePath, 'utf8');

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

for (const ins of INSERTS) {
    let count = 0;
    let idx = -1;
    while ((idx = code.indexOf(ins.anchor, idx + 1)) !== -1) count++;
    const firstIdx = code.indexOf(ins.anchor);
    console.log('Anchor', ins.name, 'occurs', count, 'first at', firstIdx);
    code = code.slice(0, firstIdx) + ins.insertion + code.slice(firstIdx);
}

fs.writeFileSync('diag-instrumented.mjs', code);
console.log('Written diag-instrumented.mjs, length', code.length);
