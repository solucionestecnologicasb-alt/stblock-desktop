#!/usr/bin/env node
/**
 * Validate the three bug fixes in the browser:
 * 1. Component drag AFTER selection works (Fe no longer blocks).
 * 2. Left-button canvas pan works.
 * 3. Delete with a wire selected removes ONLY the wire (no board modal).
 * Also checks the page loads without exceptions.
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
        if (entry.type === 'exception' || entry.type === 'error') errors.push(entry.text.slice(0, 300));
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
    await sleep(1200);

    console.log('Page errors during load:', errors.length ? errors.slice(0, 5) : 'NONE');

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

    const results = {};

    // ============ TEST 1: Drag after selection ============
    const compCenter = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height * 0.35)});
        })()
    `);
    const cc = JSON.parse(compCenter);
    console.log('\n=== TEST 1: Drag AFTER selection ===');
    // 1. Click component to select (opens panel)
    await mouse(page, 'mouseMoved', cc.x, cc.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', cc.x, cc.y, 'left', 1, 1);
    await mouse(page, 'mouseReleased', cc.x, cc.y, 'left', 1, 0);
    await sleep(500);

    // 2. Now drag at the SAME position
    const before1 = await evaluate(page, `(function(){const c=window.__VELXIO_BOARD_STORE.getState().components[0];return JSON.stringify({x:c.x,y:c.y})})()`);
    const cur1 = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height * 0.35)});
        })()
    `);
    const c1 = JSON.parse(cur1);
    await mouse(page, 'mouseMoved', c1.x, c1.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', c1.x, c1.y, 'left', 1, 1);
    await sleep(60);
    for (let i = 1; i <= 5; i++) {
        await mouse(page, 'mouseMoved', c1.x + 50 * i / 5, c1.y + 30 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', c1.x + 50, c1.y + 30, 'left', 1, 0);
    await sleep(400);
    const after1 = await evaluate(page, `(function(){const c=window.__VELXIO_BOARD_STORE.getState().components[0];return JSON.stringify({x:c.x,y:c.y})})()`);
    const moved1 = JSON.parse(before1).x !== JSON.parse(after1).x || JSON.parse(before1).y !== JSON.parse(after1).y;
    console.log('Pos before:', before1, 'after:', after1, 'MOVED:', moved1);
    results.dragAfterSelect = moved1;

    // ============ TEST 2: Left-button pan ============
    console.log('\n=== TEST 2: Left-button pan ===');
    const canvasRect = await evaluate(page, `
        (function() {
            const el = document.querySelector('.canvas-content');
            const r = el.getBoundingClientRect();
            return JSON.stringify({left: r.left, top: r.top, width: r.width, height: r.height});
        })()
    `);
    const cr = JSON.parse(canvasRect);
    const lx = cr.left + 60, ly = cr.top + 120;
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
        await mouse(page, 'mouseMoved', lx - 40 * i / 5, ly - 30 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', lx - 40, ly - 30, 'left', 1, 0);
    await sleep(400);
    const panAfter = await evaluate(page, `
        (function() {
            const world = document.querySelector('.canvas-world');
            return JSON.stringify(world ? getComputedStyle(world).transform : null);
        })()
    `);
    const panned = panBefore !== panAfter;
    console.log('Pan before:', panBefore);
    console.log('Pan after:', panAfter);
    console.log('PANNED:', panned);
    results.leftPan = panned;

    // ============ TEST 3: Delete wire -> no board modal ============
    console.log('\n=== TEST 3: Delete with wire selected ===');
    await evaluate(page, `window.__VELXIO_BOARD_STORE.getState().setSelectedWire('wire-builtin-anode'); 'ok'`);
    const wiresBefore = await evaluate(page, `JSON.stringify(window.__VELXIO_BOARD_STORE.getState().wires.map(w => w.id))`);
    const compsBefore = await evaluate(page, `JSON.stringify(window.__VELXIO_BOARD_STORE.getState().components.map(c => c.id))`);
    console.log('Wires before:', wiresBefore, 'Components before:', compsBefore);

    await page.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await page.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await sleep(600);

    const stateAfter = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            // Any modal with "Remove"?
            const modalTexts = [];
            document.querySelectorAll('body *').forEach(el => {
                const st2 = getComputedStyle(el);
                if ((st2.position === 'fixed' || st2.position === 'absolute') && el.offsetHeight > 50 && (el.textContent || '').includes('Remove')) {
                    modalTexts.push(el.textContent.trim().slice(0, 80));
                }
            });
            return JSON.stringify({
                wires: st.wires.map(w => w.id),
                components: st.components.map(c => c.id),
                selectedWireId: st.selectedWireId,
                modalTexts: modalTexts.slice(0, 3)
            });
        })()
    `);
    console.log('State after delete:', stateAfter);
    const sa = JSON.parse(stateAfter);
    const wireRemoved = !sa.wires.includes('wire-builtin-anode') && sa.wires.includes('wire-builtin-cathode');
    const boardModalShown = sa.modalTexts.length > 0;
    const componentIntact = sa.components.includes('led-builtin');
    console.log('Wire removed:', wireRemoved, '| Board modal shown:', boardModalShown, '| Component intact:', componentIntact);
    results.wireDelete = wireRemoved && !boardModalShown && componentIntact;

    // Also verify board modal still appears when NO wire selected and NO component selected
    console.log('\n=== TEST 4 (control): Delete with nothing selected -> board modal should appear ===');
    // Reset: make sure no wire selected, no component selected
    await evaluate(page, `window.__VELXIO_BOARD_STORE.getState().setSelectedWire(null); 'ok'`);
    // Deselect component by clicking empty canvas
    await mouse(page, 'mouseMoved', lx, ly, 'none', 0, 0);
    await mouse(page, 'mousePressed', lx, ly, 'left', 1, 1);
    await mouse(page, 'mouseReleased', lx, ly, 'left', 1, 0);
    await sleep(300);
    await page.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await page.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46});
    await sleep(600);
    const controlModal = await evaluate(page, `
        (function() {
            let found = [];
            document.querySelectorAll('body *').forEach(el => {
                const st2 = getComputedStyle(el);
                if ((st2.position === 'fixed' || st2.position === 'absolute') && el.offsetHeight > 50 && (el.textContent || '').includes('Remove')) {
                    found.push(el.textContent.trim().slice(0, 60));
                }
            });
            return JSON.stringify(found.slice(0, 3));
        })()
    `);
    console.log('Control modal (expect Remove...):', controlModal);
    results.boardDeleteControl = controlModal.includes('Remove') || JSON.parse(controlModal).length > 0;

    console.log('\n=========== RESULTS ===========');
    console.log(JSON.stringify(results, null, 2));
    console.log('\nPage errors total:', errors.length);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
