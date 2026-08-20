#!/usr/bin/env node
/**
 * Investigate the gh-star-banner overlay: size, position, and whether it blocks
 * mouse events from reaching the canvas/component handlers.
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
            console.log('[PAGE]', entry.type, '|', entry.text.slice(0, 300));
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

    // Inspect the banner
    const banner = await evaluate(page, `
        (function() {
            const b = document.querySelector('.gh-star-banner');
            if (!b) return JSON.stringify({found: false});
            const r = b.getBoundingClientRect();
            const cs = getComputedStyle(b);
            const closeBtn = b.querySelector('[class*="close"], [class*="Close"], button');
            const cb = closeBtn ? (function(){ const cr = closeBtn.getBoundingClientRect(); return {x: Math.round(cr.left+cr.width/2), y: Math.round(cr.top+cr.height/2), txt: (closeBtn.textContent||'').slice(0,20)}; })() : null;
            return JSON.stringify({
                found: true,
                rect: {left: r.left, top: r.top, width: r.width, height: r.height},
                zIndex: cs.zIndex,
                position: cs.position,
                display: cs.display,
                pointerEvents: cs.pointerEvents,
                text: (b.textContent||'').slice(0, 120),
                closeBtn: cb
            });
        })()
    `);
    console.log('=== Banner ===');
    console.log(JSON.stringify(JSON.parse(banner), null, 2));

    // Which elements are on top at the component location?
    const topAt = await evaluate(page, `
        (function() {
            const x = 557, y = 342;
            const el = document.elementFromPoint(x, y);
            let chain = [];
            let n = el;
            while (n && chain.length < 8) {
                chain.push((n.tagName||'?') + '.' + String(n.className||'').slice(0,40));
                n = n.parentElement;
            }
            return JSON.stringify({element: el ? (el.tagName + '.' + String(el.className||'')) : null, chain});
        })()
    `);
    console.log('\nElement at component (557,342):');
    console.log(JSON.stringify(JSON.parse(topAt), null, 2));

    // Test events on LEFT side of canvas (away from banner)
    const canvasRect = await evaluate(page, `
        (function() {
            const el = document.querySelector('.canvas-content');
            const r = el.getBoundingClientRect();
            return JSON.stringify({left: r.left, top: r.top, width: r.width, height: r.height});
        })()
    `);
    const cr = JSON.parse(canvasRect);
    console.log('\nCanvas rect:', JSON.stringify(cr));

    // Install capture on document
    await evaluate(page, `
        (function() {
            window.__evts2 = [];
            const log = (type, e) => {
                let n = e.target;
                let chain = [];
                while (n && chain.length < 5) { chain.push((n.tagName||'?') + '.' + String(n.className||'').slice(0,30)); n = n.parentElement; }
                window.__evts2.push(type + ':' + e.button + ':' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' => ' + chain.join(' < '));
            };
            ['mousedown','mousemove','mouseup'].forEach(t => document.addEventListener(t, e => log(t, e), true));
            return 'ok';
        })()
    `);

    // Left-drag at far left of canvas (x=40, y=200) — likely away from banner
    const lx = cr.left + 40, ly = cr.top + 120;
    console.log('\n--- Left-drag at left area', lx + ',' + ly, '---');
    await mouse(page, 'mouseMoved', lx, ly, 'none', 0, 0);
    await mouse(page, 'mousePressed', lx, ly, 'left', 1, 1);
    await sleep(50);
    for (let i = 1; i <= 4; i++) {
        await mouse(page, 'mouseMoved', lx + 60 * i / 4, ly + 40 * i / 4, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', lx + 60, ly + 40, 'left', 1, 0);
    await sleep(400);

    const evts = await evaluate(page, 'JSON.stringify(window.__evts2)');
    console.log('Events at left area:');
    console.log(JSON.stringify(JSON.parse(evts), null, 2));

    console.log('\nDBG logs:', logs.filter(l => l.text.includes('[DBG-')).length);

    // Check if banner has a close button and try closing it
    const b = JSON.parse(banner);
    if (b.found && b.closeBtn) {
        console.log('\n--- Clicking close button at', b.closeBtn.x + ',' + b.closeBtn.y, '---');
        await mouse(page, 'mouseMoved', b.closeBtn.x, b.closeBtn.y, 'none', 0, 0);
        await mouse(page, 'mousePressed', b.closeBtn.x, b.closeBtn.y, 'left', 1, 1);
        await mouse(page, 'mouseReleased', b.closeBtn.x, b.closeBtn.y, 'left', 1, 0);
        await sleep(400);
        const afterClose = await evaluate(page, `
            (function() {
                const b = document.querySelector('.gh-star-banner');
                return JSON.stringify({stillPresent: !!b, rect: b ? (function(){ const r = b.getBoundingClientRect(); return {left: r.left, top: r.top, w: r.width, h: r.height}; })() : null});
            })()
        `);
        console.log('After close:', afterClose);
    }

    // Re-test component drag after closing banner
    const after = await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper');
            const r = el.getBoundingClientRect();
            return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2)});
        })()
    `);
    console.log('\nComponent center now:', after);
    const c = JSON.parse(after);
    const beforePos = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    await mouse(page, 'mouseMoved', c.x, c.y, 'none', 0, 0);
    await mouse(page, 'mousePressed', c.x, c.y, 'left', 1, 1);
    await sleep(50);
    for (let i = 1; i <= 4; i++) {
        await mouse(page, 'mouseMoved', c.x + 50 * i / 4, c.y + 30 * i / 4, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', c.x + 50, c.y + 30, 'left', 1, 0);
    await sleep(400);
    const afterPos = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            const c = st.components[0];
            return JSON.stringify({x: c.x, y: c.y});
        })()
    `);
    console.log('Component pos before:', beforePos, 'after:', afterPos);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
