#!/usr/bin/env node
/**
 * Probe the Velxio simulator in headless Chrome.
 * Loads the editor, captures console, and inspects the DOM.
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
    console.log('Creating page...');
    const page = await createPage(BROWSER_WS, APP_URL);
    const logs = captureConsole(page, (entry) => {
        if (entry.type === 'error' || entry.type === 'exception') {
            console.log('[PAGE ERROR]', entry.text.slice(0, 500));
        }
    });

    // Wait for the app to boot
    for (let i = 0; i < 30; i++) {
        const state = await evaluate(page, `JSON.stringify({
            ready: !!document.querySelector('.canvas-content'),
            hasEditor: window.location.hash,
            bodyChildren: document.body ? document.body.children.length : 0,
            title: document.title
        })`);
        try {
            const parsed = JSON.parse(state);
            if (parsed.ready) {
                console.log('Editor appears loaded after', i * 500, 'ms:', parsed);
                break;
            }
            if (i === 29) {
                console.log('Did not detect editor. State:', parsed);
            }
        } catch (e) {
            // ignore
        }
        await sleep(500);
    }

    // Dump top-level DOM classes
    const dom = await evaluate(page, `
        (function() {
            const result = [];
            document.querySelectorAll('body *').forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    result.push(el.tagName.toLowerCase() + '.' + el.className.split(' ').slice(0, 3).join('.'));
                }
            });
            return JSON.stringify(result.slice(0, 80));
        })()
    `);
    console.log('Top DOM classes:');
    const domArr = JSON.parse(dom || '[]');
    for (const cls of domArr) console.log('  ', cls);

    // Check for store exposure
    const stores = await evaluate(page, `JSON.stringify({
        boardStore: typeof window.__VELXIO_BOARD_STORE,
        fileStore: typeof window.__VELXIO_FILE_STORE,
        addBoard: typeof window.__VELXIO_ADD_BOARD,
        getBoards: typeof window.__VELXIO_GET_BOARDS
    })`);
    console.log('Velxio stores exposed:', stores);

    // Dump some console logs
    const interestingLogs = logs.filter(l =>
        !l.text.includes('[spice]') &&
        !l.text.includes('[CPU] Frame') &&
        !l.text.includes('Loaded 150 components')
    ).slice(-30);
    console.log('\n=== Recent console logs (filtered) ===');
    for (const log of interestingLogs) {
        console.log('[' + log.type + ']', log.text.slice(0, 300));
    }

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Probe failed:', err.message);
    process.exit(1);
});
