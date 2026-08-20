#!/usr/bin/env node
/**
 * Verify that CDP mouse events are delivered to the page DOM and trigger handlers.
 */
import {createPage, evaluate, sleep} from './cdp-client.mjs';

const APP_URL = 'http://127.0.0.1:8123/velxio/index.html#/editor';

async function getBrowserWs() {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    return data.webSocketDebuggerUrl;
}

async function main() {
    const BROWSER_WS = await getBrowserWs();
    const page = await createPage(BROWSER_WS, APP_URL);
    await sleep(2500);

    await evaluate(page, `
        (function() {
            window.__evts = [];
            document.addEventListener('mousedown', (e) => window.__evts.push('md:' + e.button + ':' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ':' + String(e.target.className||e.target.tagName).slice(0,40)), true);
            document.addEventListener('mousemove', (e) => { if (window.__evts[window.__evts.length-1] && window.__evts[window.__evts.length-1].indexOf('mm:') !== 0) window.__evts.push('mm:' + Math.round(e.clientX) + ',' + Math.round(e.clientY)); }, true);
            document.addEventListener('mouseup', (e) => window.__evts.push('mu:' + e.button + ':' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true);
            document.addEventListener('keydown', (e) => window.__evts.push('kd:' + e.key), true);
            return 'listeners installed';
        })()
    `);
    console.log('Listeners installed');

    // Get component rect
    const compRect = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper') || document.querySelector('.web-component-container');
            if (!el) return 'null';
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: r.left + r.width/2, y: r.top + r.height/2, tag: el.tagName, cls: el.className});
        })()
    `);
    console.log('Component rect:', compRect);

    // Get canvas rect
    const canvasRect = await evaluate(page, `
        (function() {
            const el = document.querySelector('.canvas-content');
            const r = el.getBoundingClientRect();
            return JSON.stringify({left: r.left, top: r.top, width: r.width, height: r.height});
        })()
    `);
    console.log('Canvas rect:', canvasRect);

    // Dispatch mousedown/move/up at component center
    const c = JSON.parse(compRect);
    await page.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: c.x, y: c.y, button: 'none', buttons: 0});
    await page.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: c.x, y: c.y, button: 'left', buttons: 1, clickCount: 1});
    await sleep(50);
    await page.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: c.x + 60, y: c.y + 40, button: 'left', buttons: 1});
    await sleep(50);
    await page.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: c.x + 60, y: c.y + 40, button: 'left', buttons: 0, clickCount: 1});
    await sleep(300);

    // Press Delete key
    await page.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await page.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await sleep(300);

    const evts = await evaluate(page, 'JSON.stringify(window.__evts)');
    console.log('\nEvents captured:');
    console.log(JSON.stringify(JSON.parse(evts), null, 2));

    // Check store state after
    const state = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            return JSON.stringify({components: st.components.map(c=>({id:c.id,x:c.x,y:c.y})), wires: st.wires.length, selectedWireId: st.selectedWireId});
        })()
    `);
    console.log('\nStore state after:', state);

    // Check if a modal appeared
    const modal = await evaluate(page, `
        (function() {
            const fixedEls = document.querySelectorAll('body > div[style*="position: fixed"], div[style*="position: fixed"]');
            let texts = [];
            fixedEls.forEach(el => { const t = (el.textContent||'').trim(); if (t) texts.push(t.slice(0,80)); });
            return JSON.stringify(texts.slice(0,5));
        })()
    `);
    console.log('\nFixed/modals:', modal);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
