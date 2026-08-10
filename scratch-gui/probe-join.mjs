const t0 = Date.now();
const ws = new WebSocket('ws://127.0.0.1:8870');
ws.onopen = () => {
    console.log('[' + (Date.now() - t0) + 'ms] ABIERTO');
    ws.send(JSON.stringify({type: 'identify', role: 'cliente', clientId: 'probe-client-1', name: 'PROBE-CLIENT'}));
    console.log('  -> identify cliente enviado');
    setTimeout(() => {
        console.log('[' + (Date.now() - t0) + 'ms] Enviando join-request code=35616...');
        ws.send(JSON.stringify({type: 'join-request', clientId: 'probe-client-1', code: '35616', name: 'PROBE-CLIENT'}));
    }, 400);
};
ws.onmessage = (e) => {
    console.log('[' + (Date.now() - t0) + 'ms] MSG RECIBIDO:', e.data);
};
ws.onclose = (e) => {
    console.log('[' + (Date.now() - t0) + 'ms] CERRADO code=' + e.code);
    process.exit(0);
};
ws.onerror = (e) => {
    console.log('[' + (Date.now() - t0) + 'ms] ERROR:', e.message || 'desconocido');
};
setTimeout(() => {
    console.log('[' + (Date.now() - t0) + 'ms] TIMEOUT 8s sin respuesta del host');
    process.exit(0);
}, 8000);
