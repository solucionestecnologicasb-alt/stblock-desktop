#!/usr/bin/env node
/**
 * Comprehensive interaction test on the instrumented Velxio bundle.
 * 1. Dismiss the gh-star-banner overlay.
 * 2. Component drag: does mousedown reach the component? does it move?
 * 3. Component drag after selection (Fe flag): is it blocked?
 * 4. Canvas left-drag pan.
 * 5. Delete key with a wire selected: which handlers fire?
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
    const logs = [];
    captureConsole(page, (entry) => {
        logs.push(entry);
    });

    for (let i = 0; i < 40; i++) {
        const r = await evaluate(page, `JSON.stringify({
            canvas: !!document.querySelector('.canvas-content'),
            boardStore: typeof window.__VELXIO_BOARD_STORE
        })`).catch(() => '{}');
        const parsed = JSON.parse(r);
        if (parsed.canvas && parsed.boardStore === 'function') break;
        await sleep(500);
    }
    await sleep(1000);

    const dbg = () => logs.filter(l => l.text.includes('[DBG-')).map(l => l.text);

    // --- Dismiss banner ---
    const banner = await evaluate(page, `
        (function() {
            const b = document.querySelector('.gh-star-banner');
            if (!b) return JSON.stringify({found: false});
            const btn = b.querySelector('[class*="close"], [class*="Close"], button');
            const cr = btn ? btn.getBoundingClientRect() : null;
            return JSON.stringify({found: true, closeX: cr ? Math.round(cr.left + cr.width/2) : null, closeY: cr ? Math.round(cr.top + cr.height/2) : null});
        })()
    `);
    const bn = JSON.parse(banner);
    if (bn.found) {
        await mouse(page, 'mouseMoved', bn.closeX, bn.closeY, 'none', 0, 0);
        await mouse(page, 'mousePressed', bn.closeX, bn.closeY, 'left', 1, 1);
        await mouse(page, 'mouseReleased', bn.closeX, bn.closeY, 'left', 1, 0);
        await sleep(400);
        const still = await evaluate(page, `!!document.querySelector('.gh-star-banner')`);
        console.log('Banner dismissed:', !still);
    } else {
        console.log('No banner found');
    }

    // Get component DOM center
    const compCenter = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            // Aim at upper 2/3 of the wrapper (body, not label)
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height * 0.35)});
        })()
    `);
    console.log('\nComponent body click point:', compCenter);
    const cc = JSON.parse(compCenter);

    // --- TEST 1: Component drag (no prior selection) ---
    console.log('\n=== TEST 1: Component drag (first attempt) ===');
    const before1 = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    await mouse(page, 'mouseMoved', cc.x, cc.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', cc.x, cc.y, 'left', 1, 1);
    await sleep(60);
    for (let i = 1; i <= 5; i++) {
        await mouse(page, 'mouseMoved', cc.x + 60 * i / 5, cc.y + 40 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', cc.x + 60, cc.y + 40, 'left', 1, 0);
    await sleep(400);
    const after1 = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    console.log('Pos before:', before1, 'after:', after1);
    const moved1 = JSON.parse(before1).x !== JSON.parse(after1).x || JSON.parse(before1).y !== JSON.parse(after1).y;
    console.log('MOVED:', moved1);

    // --- TEST 2: Click component to select (opens panel) then drag ---
    console.log('\n=== TEST 2: Click-select component, then drag ===');
    // Click on component body (select it, opens panel)
    await mouse(page, 'mouseMoved', cc.x, cc.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', cc.x, cc.y, 'left', 1, 1);
    await mouse(page, 'mouseReleased', cc.x, cc.y, 'left', 1, 0);
    await sleep(500);

    const afterClick = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            return JSON.stringify({selectedComponentId: st.selectedComponentId, panelVisible: !!document.querySelector('[class*="properties"], [class*="panel"], [class*="inspector"]')});
        })()
    `);
    console.log('After click select:', afterClick);

    const before2 = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    await mouse(page, 'mouseMoved', cc.x, cc.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', cc.x, cc.y, 'left', 1, 1);
    await sleep(60);
    for (let i = 1; i <= 5; i++) {
        await mouse(page, 'mouseMoved', cc.x + 60 * i / 5, cc.y + 40 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', cc.x + 60, cc.y + 40, 'left', 1, 0);
    await sleep(400);
    const after2 = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    console.log('Pos before:', before2, 'after:', after2);
    console.log('MOVED:', JSON.parse(before2).x !== JSON.parse(after2).x || JSON.parse(before2).y !== JSON.parse(after2).y);

    // --- TEST 3: Canvas left-drag pan (after banner dismissed) ---
    console.log('\n=== TEST 3: Canvas left-drag pan ===');
    const canvasRect = await evaluate(page, `
        (function() {
            const el = document.querySelector('.canvas-content');
            const r = el.getBoundingClientRect();
            return JSON.stringify({left: r.left, top: r.top, width: r.width, height: r.height});
        })()
    `);
    const cr = JSON.parse(canvasRect);
    const lx = cr.left + 40, ly = cr.top + 100;
    const panBefore = await evaluate(page, `
        (function() {
            const world = document.querySelector('.canvas-world');
            return JSON.stringify(world ? getComputedStyle(world).transform : null);
        })()
    `);
    await mouse(page, 'mouseMoved', lx, ly, 'none', 0, 0);
    await mouse(page, 'mousePressed', lx, ly, 'left', 1, 1);
    await sleep(50);
    for (let i = 1; i <= 5; i++) {
        await mouse(page, 'mouseMoved', lx + 60 * i / 5, ly + 40 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', lx + 60, ly + 40, 'left', 1, 0);
    await sleep(400);
    const panAfter = await evaluate(page, `
        (function() {
            const world = document.querySelector('.canvas-world');
            return JSON.stringify(world ? getComputedStyle(world).transform : null);
        })()
    `);
    console.log('Pan before:', panBefore);
    console.log('Pan after:', panAfter);

    // --- TEST 4: Delete key with wire selected ---
    console.log('\n=== TEST 4: Delete with wire selected ===');
    await evaluate(page, `window.__VELXIO_BOARD_STORE.getState().setSelectedWire('wire-builtin-anode'); 'set'`);
    const wireSel = await evaluate(page, `JSON.stringify(window.__VELXIO_BOARD_STORE.getState().selectedWireId)`);
    console.log('Selected wire:', wireSel);
    await page.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await page.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await sleep(500);

    const modal = await evaluate(page, `
        (function() {
            const b = document.querySelector('.gh-star-banner');
            // find any modal-like overlay
            const els = document.querySelectorAll('body > div');
            let texts = [];
            els.forEach(el => {
                const st = getComputedStyle(el);
                if ((st.position === 'fixed' || st.position === 'absolute') && el.offsetHeight > 50 && el.textContent && el.textContent.includes('Remove')) {
                    texts.push(el.textContent.slice(0, 120));
                }
            });
            return JSON.stringify(texts.slice(0, 5));
        })()
    `);
    console.log('Modals present:', modal);
    const storeAfter = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            return JSON.stringify({selectedWireId: st.selectedWireId, wires: st.wires.map(w => w.id), components: st.components.map(c => c.id)});
        })()
    `);
    console.log('Store after delete:', storeAfter);

    // Dump DBG logs in order
    console.log('\n=== ALL DBG LOGS ===');
    const dbgLogs = dbg();
    dbgLogs.forEach(l => console.log('  ', l.slice(0, 300)));

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
