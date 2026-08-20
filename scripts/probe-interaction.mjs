#!/usr/bin/env node
/**
 * Probe: dispatch CDP mouse events at various points and capture:
 *  - document-level event capture (target + ancestors)
 *  - console logs (especially [DBG-*])
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
        if (entry.text.includes('[DBG-') || entry.type === 'error' || entry.type === 'exception') {
            console.log('[PAGE-CONSOLE]', entry.type, '|', entry.text.slice(0, 300));
        }
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

    // Install detailed event capture on document
    await evaluate(page, `
        (function() {
            window.__evts = [];
            const log = (type, e) => {
                let node = e.target;
                let chain = [];
                while (node && chain.length < 6) {
                    chain.push((node.tagName||'?') + '.' + String(node.className||'').slice(0,30));
                    node = node.parentElement;
                }
                window.__evts.push(type + ':' + e.button + ':' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' => ' + chain.join(' < '));
            };
            ['mousedown','mousemove','mouseup','click','contextmenu'].forEach(t =>
                document.addEventListener(t, (e) => log(t, e), true));
            return 'capture installed';
        })()
    `);

    // Enumerate DOM structure of component and canvas
    const dom = await evaluate(page, `
        (function() {
            const out = {};
            const cw = document.querySelector('.canvas-world');
            out.canvasWorld = cw ? cw.className : null;
            // component wrapper subtree
            const comp = document.querySelector('.dynamic-component-wrapper');
            if (comp) {
                out.comp = [];
                let walk = (el, depth) => {
                    if (depth > 3) return;
                    const r = el.getBoundingClientRect();
                    out.comp.push({depth, tag: el.tagName, cls: String(el.className).slice(0,60), x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height)});
                    for (const c of el.children) walk(c, depth + 1);
                };
                walk(comp, 0);
            }
            // find any elements whose className contains 'pin' or 'pad'
            out.pins = [];
            document.querySelectorAll('[class*="pin"], [class*="pad"]').forEach((el, i) => {
                if (i > 20) return;
                const r = el.getBoundingClientRect();
                out.pins.push({tag: el.tagName, cls: String(el.className).slice(0,50), x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height)});
            });
            return JSON.stringify(out);
        })()
    `);
    console.log('=== DOM structure ===');
    console.log(JSON.stringify(JSON.parse(dom), null, 2));

    // The component body point: center of .web-component-container (the LED SVG)
    const compBody = await evaluate(page, `
        (function() {
            const el = document.querySelector('.web-component-container');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2)});
        })()
    `);
    console.log('\nComponent body center:', compBody);

    const canvasRect = await evaluate(page, `
        (function() {
            const el = document.querySelector('.canvas-content');
            const r = el.getBoundingClientRect();
            return JSON.stringify({left: r.left, top: r.top, width: r.width, height: r.height});
        })()
    `);
    const cr = JSON.parse(canvasRect);
    console.log('Canvas rect:', JSON.stringify(cr));

    // --- Test A: click & drag on component body ---
    if (compBody) {
        const b = JSON.parse(compBody);
        console.log('\n--- Test A: drag component body from', b.x + ',' + b.y, '---');
        await mouse(page, 'mouseMoved', b.x, b.y, 'none', 0, 0);
        await mouse(page, 'mousePressed', b.x, b.y, 'left', 1, 1);
        await sleep(50);
        await mouse(page, 'mouseMoved', b.x + 50, b.y + 30, 'left', 1, 1);
        await sleep(50);
        await mouse(page, 'mouseReleased', b.x + 50, b.y + 30, 'left', 1, 0);
        await sleep(400);
    }

    // --- Test B: left-drag on empty canvas ---
    console.log('\n--- Test B: left-drag empty canvas at', (cr.left + cr.width - 60) + ',' + (cr.top + cr.height - 40), '---');
    const ex = cr.left + cr.width - 60;
    const ey = cr.top + cr.height - 40;
    await mouse(page, 'mouseMoved', ex, ey, 'none', 0, 0);
    await mouse(page, 'mousePressed', ex, ey, 'left', 1, 1);
    await sleep(50);
    for (let i = 1; i <= 4; i++) {
        await mouse(page, 'mouseMoved', ex - 40 * i / 4, ey - 30 * i / 4, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', ex - 40, ey - 30, 'left', 1, 0);
    await sleep(400);

    // --- Test C: middle-button drag on empty canvas ---
    console.log('\n--- Test C: middle-button drag empty canvas ---');
    await mouse(page, 'mouseMoved', ex, ey, 'none', 0, 0);
    await mouse(page, 'mousePressed', ex, ey, 'middle', 1, 4);
    await sleep(50);
    await mouse(page, 'mouseMoved', ex - 50, ey - 40, 'middle', 1, 4);
    await sleep(50);
    await mouse(page, 'mouseReleased', ex - 50, ey - 40, 'middle', 1, 0);
    await sleep(400);

    // Dump events
    const evts = await evaluate(page, 'JSON.stringify(window.__evts)');
    console.log('\n=== Document events captured ===');
    console.log(JSON.stringify(JSON.parse(evts), null, 2));

    // Dump DBG logs
    console.log('\n=== DBG console logs ===');
    const dbg = logs.filter(l => l.text.includes('[DBG-'));
    console.log('Count:', dbg.length);
    dbg.forEach(l => console.log(l.text.slice(0, 300)));

    // Dump pan transform state
    const pan = await evaluate(page, `
        (function() {
            const world = document.querySelector('.canvas-world');
            return JSON.stringify({worldTransform: world ? getComputedStyle(world).transform : null});
        })()
    `);
    console.log('\nPan transform after tests:', pan);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
