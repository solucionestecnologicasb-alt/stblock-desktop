#!/usr/bin/env node
/**
 * Test whether opening the component properties panel (Fe=true) blocks dragging.
 * Fresh load, click-select the component, then attempt a drag at its CURRENT position.
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
    captureConsole(page, (entry) => { logs.push(entry); });

    for (let i = 0; i < 40; i++) {
        const r = await evaluate(page, `typeof window.__VELXIO_BOARD_STORE`).catch(() => '');
        if (r === 'function') break;
        await sleep(500);
    }
    await sleep(1000);

    const dbg = () => logs.filter(l => l.text.includes('[DBG-')).map(l => l.text);

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

    const compCenter = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height * 0.35)});
        })()
    `);
    const cc = JSON.parse(compCenter);
    console.log('Component click point:', cc);

    // Step 1: simple click (select) — press + release, no move
    console.log('\n--- Click component to select ---');
    await mouse(page, 'mouseMoved', cc.x, cc.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', cc.x, cc.y, 'left', 1, 1);
    await mouse(page, 'mouseReleased', cc.x, cc.y, 'left', 1, 0);
    await sleep(600);

    const state1 = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            // Check if a properties panel appeared (Fe)
            const panel = document.querySelector('.properties-panel, [class*="component-properties"], [class*="PropertiesPanel"], [class*="edit-panel"], [class*="EditPanel"]');
            const p = document.querySelector('[class*="panel"]');
            return JSON.stringify({
                selectedComponentId: st.selectedComponentId,
                foundSpecificPanel: !!panel,
                foundAnyPanel: !!p,
                panelClasses: p ? String(p.className).slice(0, 60) : null
            });
        })()
    `);
    console.log('After click:', state1);

    // Step 2: attempt to drag the component at its current position
    console.log('\n--- Attempt drag after selection ---');
    const before = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    const curCenter = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height * 0.35)});
        })()
    `);
    const cur = JSON.parse(curCenter);
    console.log('Current component center:', cur, 'pos before:', before);

    await mouse(page, 'mouseMoved', cur.x, cur.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', cur.x, cur.y, 'left', 1, 1);
    await sleep(60);
    for (let i = 1; i <= 5; i++) {
        await mouse(page, 'mouseMoved', cur.x + 50 * i / 5, cur.y + 30 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', cur.x + 50, cur.y + 30, 'left', 1, 0);
    await sleep(400);
    const after = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    console.log('Pos before:', before, 'after:', after);
    console.log('MOVED:', JSON.parse(before).x !== JSON.parse(after).x || JSON.parse(before).y !== JSON.parse(after).y);

    // Dump relevant DBG logs
    console.log('\n=== Relevant DBG logs ===');
    const relevant = dbg().filter(l => l.includes('[DBG-Drag]') || l.includes('[DBG-CanvasMD]') || l.includes('BLOCKED'));
    relevant.forEach(l => console.log('  ', l.slice(0, 250)));

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
