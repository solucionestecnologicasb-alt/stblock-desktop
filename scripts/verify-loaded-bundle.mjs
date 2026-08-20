#!/usr/bin/env node
/**
 * Verify whether the loaded bundle is the instrumented one by inspecting
 * the actual .canvas-content onMouseDown handler source.
 * Disables HTTP cache to force a fresh load.
 */
import {CdpClient, sleep, evaluate} from './cdp-client.mjs';

const APP_URL = 'http://127.0.0.1:8123/velxio/index.html#/editor';

async function getBrowserWs() {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    return data.webSocketDebuggerUrl;
}

async function main() {
    const BROWSER_WS = await getBrowserWs();
    const client = new CdpClient(BROWSER_WS);
    await client.connect();

    // Create target at about:blank
    const {targetId} = await client.send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await client.send('Target.attachToTarget', {targetId, flatten: true});
    client.sessionId = sessionId;
    client.targetId = targetId;
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');

    // Disable cache BEFORE navigation
    await client.send('Network.setCacheDisabled', {cacheDisabled: true});
    console.log('Cache disabled. Navigating...');

    // Clear existing cache too
    try { await client.send('Network.clearBrowserCache'); } catch (e) {}

    await client.send('Page.navigate', {url: APP_URL});

    for (let i = 0; i < 60; i++) {
        const r = await evaluate(client, `typeof window.__VELXIO_BOARD_STORE`).catch(() => '');
        if (r === 'function') break;
        await sleep(500);
    }
    await sleep(1200);

    const inspect = await evaluate(client, `
        (function() {
            const el = document.querySelector('.canvas-content');
            const propsKey = el ? Object.keys(el).find(k => k.startsWith('__reactProps')) : null;
            const props = propsKey ? el[propsKey] : null;
            return JSON.stringify({
                hasCanvas: !!el,
                hasMD: props ? typeof props.onMouseDown : 'no-props',
                mdSrc: props && typeof props.onMouseDown === 'function' ? String(props.onMouseDown).slice(0, 260) : null
            });
        })()
    `);
    console.log('Inspect:', inspect);

    // Also check network responses for the bundle
    const perf = await evaluate(client, `
        (function() {
            const entries = performance.getEntriesByType('resource').filter(e => e.name.includes('index-B_4T4h6s.js'));
            return JSON.stringify(entries.map(e => ({name: e.name, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, duration: Math.round(e.duration)})));
        })()
    `);
    console.log('Bundle perf entries:', perf);

    client.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Crashed:', err.message);
    process.exit(1);
});
