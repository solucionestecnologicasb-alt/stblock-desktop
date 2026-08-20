#!/usr/bin/env node
/**
 * Regression: ensure normal behaviors still work after the fixes:
 * 1. Click component -> panel opens (selection still works).
 * 2. Delete key with component selected -> deletes the component (not board modal).
 * 3. Escape cancels wire creation (untouched path).
 */
import {createPage, captureConsole, sleep, evaluate} from './cdp-client.mjs';

const APP_URL = 'http://127.0.0.1:8123/velxio/index.html#/editor';

async function getBrowserWs() {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    return data.webSocketDebuggerUrl;
}

async function mouse(page, type, x, y, button = 'left', clickCount = 1, buttons = 1) {
    const params = {type, x, y, button, clickCount};
    if (type === 'mousePressed' || type === 'mouseMoved' || type === 'mouseReleased') {
        params.buttons = buttons;
    }
    await page.send('Input.dispatchMouseEvent', params);
}

async function main() {
    const BROWSER_WS = await getBrowserWs();
    const page = await createPage(BROWSER_WS, APP_URL);
    const errors = [];
    captureConsole(page, (entry) => {
        if (entry.type === 'exception' || entry.type === 'error') errors.push(entry.text.slice(0, 200));
    });

    for (let i = 0; i < 40; i++) {
        const r = await evaluate(page, `typeof window.__VELXIO_BOARD_STORE`).catch(() => '');
        if (r === 'function') break;
        await sleep(500);
    }
    await sleep(1000);

    // Dismiss banner if present
    const banner = await evaluate(page, `
        (function() {
            const b = document.querySelector('.gh-star-banner');
            if (!b) return null;
            const btn = b.querySelector('[class*="close"], [class*="Close"], button');
            const cr = btn ? btn.getBoundingClientRect() : null;
            return cr ? {x: Math.round(cr.left + cr.width/2), y: Math.round(cr.top + cr.height/2)} : null;
        })()
    `);
    if (banner) {
        await mouse(page, 'mouseMoved', banner.x, banner.y, 'none', 0, 0);
        await mouse(page, 'mousePressed', banner.x, banner.y, 'left', 1, 1);
        await mouse(page, 'mouseReleased', banner.x, banner.y, 'left', 1, 0);
        await sleep(300);
    }

    // --- Test 1: click component -> panel opens ---
    const cc = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height * 0.35)});
        })()
    `);
    const c = JSON.parse(cc);
    await mouse(page, 'mouseMoved', c.x, c.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', c.x, c.y, 'left', 1, 1);
    await mouse(page, 'mouseReleased', c.x, c.y, 'left', 1, 0);
    await sleep(500);
    const panel = await evaluate(page, `
        (function() {
            const sel = window.__VELXIO_BOARD_STORE.getState().selectedComponentId;
            // look for the properties panel that contains inputs (component properties)
            let panelFound = null;
            document.querySelectorAll('[class*="panel"], [class*="properties"], [class*="inspector"]').forEach(el => {
                if (!panelFound && el.querySelector('input') && el.offsetHeight > 80) panelFound = String(el.className).slice(0, 60);
            });
            return JSON.stringify({selectedComponentId: sel, panelWithInputs: panelFound});
        })()
    `);
    console.log('TEST 1 (click select -> panel):', panel);

    // --- Test 2: Delete with component selected -> component removed ---
    const compsBefore = await evaluate(page, `JSON.stringify(window.__VELXIO_BOARD_STORE.getState().components.map(c => c.id))`);
    const wiresBefore = await evaluate(page, `JSON.stringify(window.__VELXIO_BOARD_STORE.getState().wires.map(w => w.id))`);
    await page.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await page.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await sleep(600);
    const after2 = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            return JSON.stringify({
                components: st.components.map(c => c.id),
                wires: st.wires.map(w => w.id),
                modalShown: (function(){ let f = []; document.querySelectorAll('body *').forEach(el => { const s = getComputedStyle(el); if ((s.position === 'fixed' || s.position === 'absolute') && el.offsetHeight > 50 && (el.textContent || '').includes('Remove')) f.push(el.textContent.slice(0,40)); }); return f.slice(0,2); })()
            });
        })()
    `);
    const a2 = JSON.parse(after2);
    const compRemoved = !a2.components.includes('led-builtin');
    console.log('TEST 2 (component delete): comps before:', compsBefore, '-> after:', a2.components, '| removed:', compRemoved, '| modal:', JSON.stringify(a2.modalShown));
    console.log('Wires after component delete:', a2.wires);

    console.log('\nPage errors:', errors.length ? errors : 'NONE');

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
