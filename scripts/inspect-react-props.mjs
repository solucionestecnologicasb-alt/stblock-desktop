#!/usr/bin/env node
/**
 * Inspect React internal props on key DOM elements to confirm handlers are attached.
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

    // Inspect React props on .canvas-content
    const inspect = await evaluate(page, `
        (function() {
            const out = {};
            const selectors = ['.canvas-content', '.dynamic-component-wrapper', '.web-component-container'];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (!el) { out[sel] = 'not found'; continue; }
                const keys = Object.keys(el).filter(k => k.startsWith('__react'));
                const props = keys.length ? el[keys[0]] : null;
                const names = props ? Object.keys(props) : [];
                out[sel] = {
                    reactKeys: keys,
                    propNames: names.slice(0, 40),
                    onMouseDown: props && typeof props.onMouseDown,
                    hasOnMouseDown: props ? !!props.onMouseDown : false,
                    onMouseUp: props ? typeof props.onMouseUp : '?',
                    onMouseMove: props ? typeof props.onMouseMove : '?',
                    // the source text of the handler
                    onMouseDownSrc: props && typeof props.onMouseDown === 'function' ? String(props.onMouseDown).slice(0, 200) : null
                };
            }
            return JSON.stringify(out);
        })()
    `);
    console.log('=== React props ===');
    console.log(JSON.stringify(JSON.parse(inspect), null, 2));

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
