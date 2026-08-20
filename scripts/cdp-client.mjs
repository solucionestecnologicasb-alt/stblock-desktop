#!/usr/bin/env node
/**
 * Minimal CDP (Chrome DevTools Protocol) client using Node's built-in WebSocket.
 * Used to drive the Velxio simulator in headless Chrome for debugging.
 */
export class CdpClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.id = 0;
        this.pending = new Map();
        this.listeners = new Map();
        this.sessionId = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve(this);
            this.ws.onerror = (e) => reject(new Error('WebSocket error: ' + (e.message || 'unknown')));
            this.ws.onmessage = (event) => {
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                if (msg.id !== undefined && this.pending.has(msg.id)) {
                    const {resolve, reject} = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
                    else resolve(msg.result);
                } else if (msg.method) {
                    const cbs = this.listeners.get(msg.method);
                    if (cbs) cbs.forEach(cb => cb(msg.params));
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.id;
            this.pending.set(id, {resolve, reject});
            const msg = {id, method, params};
            if (this.sessionId) msg.sessionId = this.sessionId;
            this.ws.send(JSON.stringify(msg));
        });
    }

    on(method, cb) {
        if (!this.listeners.has(method)) this.listeners.set(method, []);
        this.listeners.get(method).push(cb);
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

/**
 * Create a new page target and return {client, targetId}.
 */
export async function createPage(browserWsUrl, url) {
    const client = new CdpClient(browserWsUrl);
    await client.connect();
    const {targetId} = await client.send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await client.send('Target.attachToTarget', {targetId, flatten: true});
    client.sessionId = sessionId;
    client.targetId = targetId;
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Log.enable');
    // Always load fresh (the bundle file changes during instrumentation)
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', {cacheDisabled: true});
    try { await client.send('Network.clearBrowserCache'); } catch (e) {}
    if (url) await client.send('Page.navigate', {url});
    return client;
}

export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Evaluate JS in the page and return the result value (or throw on exception).
 */
export async function evaluate(client, expression) {
    const res = await client.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
    });
    if (res.exceptionDetails) {
        throw new Error('Eval exception: ' + JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails.text));
    }
    return res.result?.value;
}

/**
 * Capture console messages into an array.
 */
export function captureConsole(client, onMessage) {
    const logs = [];
    client.on('Runtime.consoleAPICalled', (params) => {
        const text = (params.args || []).map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
        const entry = {type: params.type, text};
        logs.push(entry);
        if (onMessage) onMessage(entry);
    });
    client.on('Runtime.exceptionThrown', (params) => {
        const entry = {
            type: 'exception',
            text: params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'exception'
        };
        logs.push(entry);
        if (onMessage) onMessage(entry);
    });
    return logs;
}
