#!/usr/bin/env node
/**
 * Test Velxio simulator interactions in headless Chrome.
 * Loads editor, adds board/component, simulates drag/pan/delete, captures console.
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
    const logs = captureConsole(page, (entry) => {
        if (entry.text.includes('[DBG-') || entry.type === 'error' || entry.type === 'exception') {
            console.log('[PAGE]', entry.text.slice(0, 400));
        }
    });

    // Wait for editor + store
    for (let i = 0; i < 40; i++) {
        const ready = await evaluate(page, `JSON.stringify({
            canvas: !!document.querySelector('.canvas-content'),
            boardStore: typeof window.__VELXIO_BOARD_STORE,
            fileStore: typeof window.__VELXIO_FILE_STORE
        })`);
        const parsed = JSON.parse(ready || '{}');
        if (parsed.canvas && parsed.boardStore === 'function' && parsed.fileStore === 'function') {
            console.log('Editor + stores ready after', i * 500, 'ms');
            break;
        }
        if (i === 39) {
            console.log('Timed out. Last state:', ready);
            page.close();
            process.exit(1);
        }
        await sleep(500);
    }

    // Inspect store API
    const storeApi = await evaluate(page, `
        (function() {
            const s = window.__VELXIO_BOARD_STORE;
            const st = typeof s.getState === 'function' ? s.getState() : s;
            const methods = [];
            for (const k of Object.keys(s)) {
                if (typeof s[k] === 'function') methods.push(k);
            }
            return JSON.stringify({
                methodNames: methods,
                stateKeys: Object.keys(st),
                boards: (st.boards||[]).map(b => ({id:b.id, boardKind:b.boardKind, x:b.x, y:b.y})),
                components: (st.components||[]).length,
                wires: (st.wires||[]).length,
                activeBoardId: st.activeBoardId
            });
        })()
    `);
    console.log('\n=== Store API ===');
    console.log(JSON.stringify(JSON.parse(storeApi), null, 2));

    // Add a board if none
    const addResult = await evaluate(page, `
        (function() {
            const s = window.__VELXIO_BOARD_STORE;
            const st = typeof s.getState === 'function' ? s.getState() : s;
            if (!st.boards || st.boards.length === 0) {
                const id = st.addBoard('arduino-uno', 200, 200);
                if (st.setActiveBoardId) st.setActiveBoardId(id);
                return JSON.stringify({action: 'added', id});
            }
            return JSON.stringify({action: 'existing', id: st.boards[0].id});
        })()
    `);
    console.log('\nAdd board result:', addResult);

    await sleep(1000);

    // Inspect DOM layout: canvas-content bounding rect, canvas-world transform
    const layout = await evaluate(page, `
        (function() {
            const canvas = document.querySelector('.canvas-content');
            const world = document.querySelector('.canvas-world');
            const cc = canvas ? canvas.getBoundingClientRect() : null;
            const wStyle = world ? getComputedStyle(world).transform : null;
            return JSON.stringify({
                canvasRect: cc ? {left: cc.left, top: cc.top, width: cc.width, height: cc.height} : null,
                worldTransform: wStyle,
                boardsInDom: document.querySelectorAll('[data-board-id]').length,
                componentsInDom: document.querySelectorAll('.web-component-container, .dynamic-component-wrapper').length
            });
        })()
    `);
    console.log('\n=== Layout ===');
    console.log(layout);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
