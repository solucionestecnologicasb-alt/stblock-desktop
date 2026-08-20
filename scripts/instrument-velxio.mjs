#!/usr/bin/env node
/**
 * Instrument the Velxio bundle with console.log debug statements.
 * Uses MINIMAL insertions (never duplicates surrounding code) and
 * verifies syntax before writing to the real bundle.
 *
 * Usage:
 *   node scripts/instrument-velxio.mjs on|off
 */
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';

const bundlePath = path.resolve('scratch-gui/static/velxio/assets/index-B_4T4h6s.js');
const backupPath = bundlePath + '.instrument-backup';

// Each entry: { anchor, insertion, where: 'after' | 'replace-start' }
// We only INSERT text, never re-emit following code, to avoid duplication bugs.
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

function verifySyntax(code) {
    const tmp = path.join(path.dirname(bundlePath), '.velxio-bundle-check.mjs');
    fs.writeFileSync(tmp, code, 'utf8');
    try {
        execFileSync(process.execPath, ['--check', tmp], {stdio: 'pipe'});
        return {ok: true};
    } catch (e) {
        const errOut = String(e.stderr || e.stdout || e.message);
        const m = errOut.match(/\.velxio-bundle-check\.mjs:(\d+):(\d+)/);
        const loc = m ? ' at ' + m[1] + ':' + m[2] : '';
        return {ok: false, stderr: errOut.slice(0, 2000) + loc};
    } finally {
        try { fs.unlinkSync(tmp); } catch (e) {}
    }
}

function instrument() {
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(bundlePath, backupPath);
        console.log('Backup created at', backupPath);
    }

    let code = fs.readFileSync(bundlePath, 'utf8');

    for (const ins of INSERTS) {
        const idx = code.indexOf(ins.anchor);
        if (idx === -1) {
            console.error('Anchor not found for', ins.name);
            process.exit(1);
        }
        if (code.indexOf('[DBG-' + ins.name + ']') !== -1) {
            console.log('Already instrumented:', ins.name);
            continue;
        }
        // REPLACE semantics: the insertion fully replaces the anchor text.
        // (Using prepend caused duplicated statements and broke the bundle.)
        code = code.slice(0, idx) + ins.insertion + code.slice(idx + ins.anchor.length);
        console.log('Instrumented:', ins.name, '@', idx);
    }

    const check = verifySyntax(code);
    if (!check.ok) {
        console.error('SYNTAX CHECK FAILED — NOT WRITING TO BUNDLE.');
        console.error(check.stderr);
        process.exit(1);
    }

    fs.writeFileSync(bundlePath, code, 'utf8');
    console.log('Bundle written and syntax verified.');
}

function restore() {
    if (!fs.existsSync(backupPath)) {
        console.error('No backup found at', backupPath);
        process.exit(1);
    }
    fs.copyFileSync(backupPath, bundlePath);
    console.log('Bundle restored from backup.');
}

const cmd = process.argv[2] || 'on';
if (cmd === 'off') {
    restore();
} else {
    instrument();
}
