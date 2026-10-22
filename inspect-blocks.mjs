import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debuggingPort = 9222;

const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debuggingPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\bello\\AppData\\Local\\Temp\\chrome-inspect-' + Date.now(),
    'http://localhost:8601/?simulate_mobile=true'
]);

try {
    await setTimeout(3500);

    const listRes = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url.includes('localhost:8601'));

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();
    const warnings = [];

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled') {
            if (data.params.type === 'warning') {
                const text = data.params.args.map(a => a.value).join(' ');
                warnings.push(text);
            }
        }
        if (data.id && pending.has(data.id)) {
            pending.get(data.id)(data);
            pending.delete(data.id);
        }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    const send = (method, params = {}) => {
        return new Promise((resolve) => {
            const id = msgId++;
            pending.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });
    };

    await send('Runtime.enable');
    await setTimeout(3000);

    // Switch to Electrónica
    await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Electrónica'));
            if (btn) btn.click();
        })()`
    });

    await setTimeout(3000);

    console.log('Total console warnings caught:', warnings.length);
    const relevant = warnings.filter(w => w.includes('Ignoring non-existent input'));
    console.log('Relevant warnings:', relevant);

    // Inspect Blockly block definition
    const blockInspect = await send('Runtime.evaluate', {
        expression: `(() => {
            const sb = window.Blockly || (window.ScratchBlocks);
            if (!sb) return 'No Blockly on window';
            const blkDef = sb.Blocks['arduino_arrays_arraySet'];
            if (!blkDef) return 'Block not found';
            // Create a dummy workspace and block to inspect its inputs
            try {
                const ws = new sb.Workspace();
                const b = ws.newBlock('arduino_arrays_arraySet');
                const inputNames = b.inputList ? b.inputList.map(i => i.name) : [];
                return {
                    initString: blkDef.init ? blkDef.init.toString() : 'no-init',
                    inputNames
                };
            } catch (e) {
                return 'Error creating block: ' + e.message;
            }
        })()`,
        returnByValue: true
    });
    console.log('Block inspection:', JSON.stringify(blockInspect.result.value, null, 2));

    ws.close();
} finally {
    chrome.kill();
}
