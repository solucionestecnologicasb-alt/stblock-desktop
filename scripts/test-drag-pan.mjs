#!/usr/bin/env node
/**
 * Test component drag and canvas pan in the Velxio simulator.
 */
import {createPage, captureConsole, sleep, evaluate} from './cdp-client.mjs';

const APP_URL = 'http://127.0.0.1:8123/velxio/index.html#/editor';

async function getBrowserWs() {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    return data.webSocketDebuggerUrl;
}

// Dispatch a mouse event via CDP Input domain
async function mouse(page, type, x, y, button = 'left', clickCount = 1, buttons = 1) {
    const params = {
        type,
        x,
        y,
        button,
        clickCount
    };
    if (type === 'mousePressed' || type === 'mouseMoved' || type === 'mouseReleased') {
        params.buttons = buttons;
    }
    await page.send('Input.dispatchMouseEvent', params);
}

async function main() {
    const BROWSER_WS = await getBrowserWs();
    const page = await createPage(BROWSER_WS, APP_URL);
    const logs = captureConsole(page, (entry) => {
        if (entry.text.includes('[DBG-') || entry.type === 'error' || entry.type === 'exception') {
            console.log('[PAGE]', entry.text.slice(0, 500));
        }
    });

    // Wait for editor + store
    for (let i = 0; i < 40; i++) {
        const ready = await evaluate(page, `JSON.stringify({
            canvas: !!document.querySelector('.canvas-content'),
            boardStore: typeof window.__VELXIO_BOARD_STORE
        })`);
        const parsed = JSON.parse(ready || '{}');
        if (parsed.canvas && parsed.boardStore === 'function') break;
        await sleep(500);
    }
    await sleep(1500);

    // Inspect existing components
    const components = await evaluate(page, `
        (function() {
            const st = window.__VELXIO_BOARD_STORE.getState();
            return JSON.stringify({
                components: (st.components||[]).map(c => ({id:c.id, metadataId:c.metadataId, x:c.x, y:c.y, properties:c.properties})),
                wires: (st.wires||[]).map(w => ({id:w.id, start:w.start, end:w.end}))
            });
        })()
    `);
    console.log('\n=== Existing components/wires ===');
    console.log(JSON.stringify(JSON.parse(components), null, 2));

    // Get component DOM rects
    const domComps = await evaluate(page, `
        (function() {
            const result = [];
            document.querySelectorAll('.web-component-container, .dynamic-component-wrapper').forEach((el, i) => {
                const r = el.getBoundingClientRect();
                result.push({i, id: el.id || el.parentElement?.id || '?', cls: el.className, rect: {left: r.left, top: r.top, width: r.width, height: r.height}, center: {x: r.left + r.width/2, y: r.top + r.height/2}});
            });
            return JSON.stringify(result);
        })()
    `);
    console.log('\n=== Component DOM rects ===');
    console.log(JSON.stringify(JSON.parse(domComps), null, 2));

    // Test drag on the first component (if any)
    const comps = JSON.parse(domComps);
    if (comps.length > 0) {
        const comp = comps[0];
        const cid = await evaluate(page, `
            (function() {
                const st = window.__VELXIO_BOARD_STORE.getState();
                return (st.components||[])[0] ? st.components[0].id : null;
            })()
        `);
        const before = await evaluate(page, `
            (function() {
                const st = window.__VELXIO_BOARD_STORE.getState();
                const c = (st.components||[])[0];
                return JSON.stringify({x: c.x, y: c.y});
            })()
        `);
        console.log('\n=== DRAG TEST on component', cid, 'at', comp.center, '===');
        console.log('Position before:', before);

        // Drag from component center to +60,+40 (screen coords)
        const startX = comp.center.x, startY = comp.center.y;
        const endX = startX + 60, endY = startY + 40;

        await mouse(page, 'mouseMoved', startX, startY, 'none', 0, 0);
        await mouse(page, 'mousePressed', startX, startY, 'left', 1, 1);
        await sleep(50);
        for (let i = 1; i <= 5; i++) {
            await mouse(page, 'mouseMoved', startX + (endX - startX) * i / 5, startY + (endY - startY) * i / 5, 'left', 1, 1);
            await sleep(30);
        }
        await mouse(page, 'mouseReleased', endX, endY, 'left', 1, 0);
        await sleep(300);

        const after = await evaluate(page, `
            (function() {
                const st = window.__VELXIO_BOARD_STORE.getState();
                const c = (st.components||[])[0];
                return JSON.stringify({x: c.x, y: c.y});
            })()
        `);
        console.log('Position after:', after);
        console.log('Moved:', JSON.parse(after).x !== JSON.parse(before).x || JSON.parse(after).y !== JSON.parse(before).y);
    } else {
        console.log('No components in DOM to test drag');
    }

    // Test canvas pan with left button on empty canvas
    console.log('\n=== PAN TEST (left-drag on empty canvas) ===');
    const panBefore = await evaluate(page, `
        (function() {
            const world = document.querySelector('.canvas-world');
            const worldStyle = world ? getComputedStyle(world).transform : null;
            const st = window.__VELXIO_BOARD_STORE.getState();
            return JSON.stringify({worldTransform: worldStyle});
        })()
    `);
    console.log('Pan before:', panBefore);

    // Find an empty area of the canvas (bottom-right corner)
    const canvasRect = await evaluate(page, `
        (function() {
            const canvas = document.querySelector('.canvas-content');
            const r = canvas.getBoundingClientRect();
            return JSON.stringify({left: r.left, top: r.top, width: r.width, height: r.height});
        })()
    `);
    const cr = JSON.parse(canvasRect);
    const emptyX = cr.left + cr.width - 60;
    const emptyY = cr.top + cr.height - 40;

    await mouse(page, 'mouseMoved', emptyX, emptyY, 'none', 0, 0);
    await mouse(page, 'mousePressed', emptyX, emptyY, 'left', 1, 1);
    await sleep(50);
    for (let i = 1; i <= 5; i++) {
        await mouse(page, 'mouseMoved', emptyX - 40 * i / 5, emptyY - 30 * i / 5, 'left', 1, 1);
        await sleep(30);
    }
    await mouse(page, 'mouseReleased', emptyX - 40, emptyY - 30, 'left', 1, 0);
    await sleep(300);

    const panAfter = await evaluate(page, `
        (function() {
            const world = document.querySelector('.canvas-world');
            const worldStyle = world ? getComputedStyle(world).transform : null;
            return JSON.stringify({worldTransform: worldStyle});
        })()
    `);
    console.log('Pan after:', panAfter);

    page.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
