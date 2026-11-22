// Local browser QA transport. Uses a dedicated Chrome debugging profile.
import fs from 'node:fs';
export async function connect() {
  const pages = await (await fetch('http://127.0.0.1:9317/json/list')).json();
  const page = pages.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', event => { const data = JSON.parse(event.data); if (pending.has(data.id)) { const { resolve, reject } = pending.get(data.id); pending.delete(data.id); data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result?.value; };
  const screenshot = async path => { const r = await send('Page.captureScreenshot'); fs.writeFileSync(path, Buffer.from(r.data, 'base64')); };
  return { send, evaluate, screenshot, close: () => ws.close() };
}
