#!/usr/bin/env node
/**
 * Debug: does the CDP console capture work on the Velxio page?
 * 1. Inject a console.log marker and verify it's captured.
 * 2. Manually dispatch a mousedown on a component via JS and see if [DBG-*] fires.
 */
import {createPage, captureConsole, sleep, evaluate} from './cdp-client.mjs';

const APP_URL = 'http://127.0.0.1:8123/velxio/index.html#/editor';

async function getBrowserWs() {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    return data.webSocketDebuggerUrl;
}

async function main() {
    const BROWSER_WS = await getBrowserWs();
    const page = await createPage(BROWSER_WS, APP_URL);
    const logs = [];
    captureConsole(page, (entry) => {
        logs.push(entry);
        console.log('[CAPTURED]', entry.type, '|', entry.text.slice(0, 300));
    });

    // Wait for editor
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

    // Test 1: does console.log get captured?
    console.log('\n--- Test 1: console.log capture ---');
    await evaluate(page, `console.log('MARKER-123-test'); 'ok'`).catch(e => console.log('eval err', e.message));
    await sleep(300);
    console.log('Marker captured:', logs.some(l => l.text.includes('MARKER-123')));

    // Test 2: manually dispatch mousedown on component via JS
    console.log('\n--- Test 2: JS-dispatched mousedown on component ---');
    await evaluate(page, `
        (function() {
            const el = document.querySelector('.dynamic-component-wrapper') || document.querySelector('.web-component-container');
            if (!el) {
                console.log('NO component element found');
                return 'no-el';
            }
            const r = el.getBoundingClientRect();
            const opts = {bubbles: true, cancelable: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2, button: 0, buttons: 1};
            el.dispatchEvent(new MouseEvent('mousedown', opts));
            return 'dispatched on ' + el.className;
        })()
    `).then(v => console.log('Dispatch result:', v)).catch(e => console.log('Dispatch err:', e.message));
    await sleep(500);
    const dbgAfter = logs.filter(l => l.text.includes('[DBG-'));
    console.log('DBG logs after JS dispatch:', dbgAfter.length);
    dbgAfter.forEach(l => console.log('  ', l.text.slice(0, 250)));

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
