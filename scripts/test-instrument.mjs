#!/usr/bin/env node
/**
 * Re-apply instrumentation to a temp copy and check syntax.
 */
import fs from 'fs';

const bundlePath = 'scratch-gui/static/velxio/assets/index-B_4T4h6s.js';
const backupPath = bundlePath + '.instrument-backup';
let code = fs.readFileSync(backupPath, 'utf8');

const ANCHORS = {
    keydownBoard: '(de.key==="Delete"||de.key==="Backspace")&&(ie?(h(ie),le(null)):n&&ke(n))',
    componentMousedown: '_o=(te,de)=>{if(Fe)return;de.stopPropagation();',
    mouseMove: 'yx=te=>{if(pr.current){const de=te.clientX-De.current.mouseX,',
    mouseUp: 'pm=te=>{if(pr.current){pr.current=!1,dn({...Me.current});return}',
    canvasMousedown: 'fm=te=>{(te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,'
};
const REPLACEMENTS = {
    keydownBoard: () => '(de.key==="Delete"||de.key==="Backspace")&&(console.log("[DBG-Key][Board] Delete pressed. component=",ie,"activeBoard=",n,"wireSel=",U,"panel=",Fe),ie?(h(ie),le(null)):n&&ke(n))',
    componentMousedown: () => '_o=(te,de)=>{if(Fe)return console.log("[DBG-Drag][Comp] BLOCKED by Fe(panel open) comp=",te),void 0;console.log("[DBG-Drag][Comp] mousedown comp=",te,"clientX=",de.clientX,"clientY=",de.clientY,"Fe=",Fe);de.stopPropagation();',
    mouseMove: () => 'yx=te=>{if(pr.current){console.log("[DBG-Move][Pan] panning mouseX=",te.clientX,"mouseY=",te.clientY,"panX=",Me.current.x,"panY=",Me.current.y);const de=te.clientX-De.current.mouseX,',
    mouseUp: () => 'pm=te=>{if(pr.current){console.log("[DBG-Up][Pan] pan end");pr.current=!1,dn({...Me.current});return}if(et)console.log("[DBG-Up][Drag] mouseup et=",et,"movement=",te.clientX-He.x,te.clientY-He.y,"dt=",Date.now()-ve);if(Nn.current){const de=Nn.current;if(de.isDragging){vo.current=!0;const Ee=on(te.clientX,te.clientY),Ce=Ig/Ge.current,Be=Eg(Pr.current,de.wireId);let Ve=de',
    canvasMousedown: () => 'fm=te=>{console.log("[DBG-CanvasMD] button=",te.button,"target=",String(te.target&&te.target.className), "Fe=",Fe,"B=",B,"U=",U);(te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,'
};

for (const [name, anchor] of Object.entries(ANCHORS)) {
    // Count all occurrences
    let count = 0;
    let idx = -1;
    while ((idx = code.indexOf(anchor, idx + 1)) !== -1) count++;
    console.log('Anchor', name, 'occurs', count, 'times');

    const firstIdx = code.indexOf(anchor);
    if (firstIdx === -1) { console.error('Anchor not found for', name); continue; }
    if (code.indexOf('[DBG-' + name + ']') !== -1) { console.log('Already instrumented:', name); continue; }
    const replacement = REPLACEMENTS[name]();
    code = code.slice(0, firstIdx) + replacement + code.slice(firstIdx + anchor.length);
    console.log('  instrumented first occurrence at', firstIdx);
}

fs.writeFileSync('check-instrumented-tmp.mjs', code);
console.log('Written check-instrumented-tmp.mjs, length', code.length);
