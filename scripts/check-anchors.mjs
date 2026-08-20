#!/usr/bin/env node
import fs from 'fs';

const orig = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

const anchors = [
    'const te=de=>{(de.key==="Delete"||de.key==="Backspace")&&(ie?(h(ie),le(null)):n&&ke(n))}',
    '_o=(te,de)=>{if(Fe)return;de.stopPropagation();',
    'yx=te=>{if(pr.current){',
    'fm=te=>{(te.button===1||te.button===2)&&(te.preventDefault(),pr.current=!0,',
    'const te=de=>{if(de.key==="Escape"&&B){k();return}',
    'pm=te=>{if(pr.current){'
];

for (const a of anchors) {
    let count = 0;
    let idx = -1;
    while ((idx = orig.indexOf(a, idx + 1)) !== -1) count++;
    console.log(JSON.stringify(a.slice(0, 55)) + '... occurs ' + count + ' times, first at ' + orig.indexOf(a));
}
