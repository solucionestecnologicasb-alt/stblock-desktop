#!/usr/bin/env node
/**
 * Inspect the board store: available actions/state to understand selection.
 */
import {createPage, sleep, evaluate} from './cdp-client.mjs';

const APP_URL = 'http://127.0.0.1:8123/velxio/index.html#/editor';

async function getBrowserWs() {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    return data.webSocketDebuggerUrl;
}

async function main() {
    const BROWSER_WS = await getBrowserWs();
    const page = await createPage(BROWSER_WS, APP_URL);
    for (let i = 0; i < 40; i++) {
        const r = await evaluate(page, `typeof window.__VELXIO_BOARD_STORE`).catch(() => '');
        if (r === 'function') break;
        await sleep(500);
    }
    await sleep(1000);

    const info = await evaluate(page, `
        (function() {
            const store = window.__VELXIO_BOARD_STORE;
            const st = store.getState();
            const out = {};
            out.stateKeys = Object.keys(st);
            out.selectedWireId = st.selectedWireId;
            out.selectedComponentId = st.selectedComponentId || st.selectedComponent || null;
            out.components = (st.components||[]).map(c => ({id: c.id, x: c.x, y: c.y, metadataId: c.metadataId}));
            out.wires = (st.wires||[]).map(w => ({id: w.id, start: w.start && w.start.componentId, end: w.end && w.end.componentId}));
            // Try to enumerate dispatch/actions via the store's injected API
            out.storeKeys = Object.keys(store);
            out.api = {};
            // window.__VELXIO_* helpers
            for (const k of Object.keys(window)) {
                if (k.startsWith('__VELXIO')) out.api[k] = typeof window[k];
            }
            return JSON.stringify(out, null, 1);
        })()
    `);
    console.log(info);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
