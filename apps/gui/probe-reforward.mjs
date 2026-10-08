const t0 = Date.now();
const log = (tag, msg) => console.log('[' + (Date.now() - t0) + 'ms] [' + tag + '] ' + msg);

// Cliente A: solo escucha
const A = new WebSocket('ws://127.0.0.1:8870');
A.onopen = () => {
    log('A', 'ABIERTO, enviando identify cliente...');
    A.send(JSON.stringify({type: 'identify', role: 'cliente', clientId: 'clienteA-probe', name: 'CLIENTE-A'}));
};
A.onmessage = e => log('A', 'MSG RECIBIDO: ' + e.data);
A.onclose = e => log('A', 'cerrado code=' + e.code);
A.onerror = e => log('A', 'error ' + (e.message || ''));

// Cliente B: envía un leave que el host debe reenviar y responder con roster-updated
const B = new WebSocket('ws://127.0.0.1:8870');
B.onopen = () => {
    log('B', 'ABIERTO, enviando identify cliente...');
    B.send(JSON.stringify({type: 'identify', role: 'cliente', clientId: 'clienteB-probe', name: 'CLIENTE-B'}));
    setTimeout(() => {
        log('B', 'enviando leave para clienteA-probe...');
        B.send(JSON.stringify({type: 'leave', clientId: 'clienteA-probe'}));
    }, 900);
};
B.onmessage = e => log('B', 'MSG RECIBIDO: ' + e.data);
B.onclose = e => log('B', 'cerrado code=' + e.code);
B.onerror = e => log('B', 'error ' + (e.message || ''));

setTimeout(() => {
    log('*', 'TIMEOUT 8s. Si NO se recibió roster-updated en A o B, el host no está reenviando/procesando.');
    process.exit(0);
}, 8000);
