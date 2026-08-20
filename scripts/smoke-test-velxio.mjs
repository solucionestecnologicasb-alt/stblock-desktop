#!/usr/bin/env node
/**
 * Smoke test: load the Velxio circuit page and check for exceptions / errors.
 * Verifies the instrumented bundle parses and runs in the browser.
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
    });

    // Wait up to 30s for editor + store
    let ready = null;
    for (let i = 0; i < 60; i++) {
        try {
            const r = await evaluate(page, `JSON.stringify({
                canvas: !!document.querySelector('.canvas-content'),
                world: !!document.querySelector('.canvas-world'),
                boardStore: typeof window.__VELXIO_BOARD_STORE,
                bodyChildren: document.body ? document.body.children.length : 0
            })`);
            ready = JSON.parse(r);
            if (ready.canvas && ready.boardStore === 'function') break;
        } catch (e) {
            // page still loading / context destroyed
        }
        await sleep(500);
    }

    console.log('Ready state:', JSON.stringify(ready));
    await sleep(1500);

    // Filter for errors/exceptions + DBG logs
    const errors = logs.filter(l => l.type === 'exception' || l.type === 'error');
    const dbg = logs.filter(l => l.text.includes('[DBG-'));
    console.log('\nTotal console entries:', logs.length);
    console.log('DBG entries:', dbg.length);
    console.log('Error/exception entries:', errors.length);
    if (errors.length > 0) {
        console.log('\n=== ERRORS ===');
        errors.slice(0, 20).forEach(e => console.log('[' + e.type + ']', e.text.slice(0, 400)));
    }
    if (dbg.length > 0) {
        console.log('\n=== DBG LOGS (from load) ===');
        dbg.slice(0, 30).forEach(e => console.log(e.text.slice(0, 300)));
    }

    // Final verdict
    const bodyText = await evaluate(page, `document.body ? document.body.innerText.slice(0, 200) : '(no body)'`).catch(e => '(eval failed: ' + e.message + ')');
    console.log('\nBody preview:', JSON.stringify(bodyText));

    page.close();
    const hadErrors = errors.length > 0;
    console.log('\nSMOKE TEST:', hadErrors ? 'FAILED' : 'PASSED');
    process.exit(hadErrors ? 1 : 0);
}

main().catch(err => {
    console.error('Smoke test crashed:', err.message);
    process.exit(1);
});
