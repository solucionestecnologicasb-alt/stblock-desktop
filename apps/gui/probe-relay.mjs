const ws = new WebSocket('ws://127.0.0.1:8870');
const t0 = Date.now();
ws.onopen = () => {
    console.log('[' + (Date.now() - t0) + 'ms] WS ABIERTO al relay');
    ws.send(JSON.stringify({type: 'identify', role: 'servidor', clientId: 'probe-host-1', name: 'PROBE-HOST'}));
    console.log('  -> enviado identify role=servidor');
};
ws.onmessage = (e) => {
    console.log('[' + (Date.now() - t0) + 'ms] MSG RECIBIDO:', e.data);
};
ws.onclose = (e) => {
    console.log('[' + (Date.now() - t0) + 'ms] CERRADO code=' + e.code + ' reason=' + e.reason + '  => HOST_ID OCUPADO (host real registrado)');
    process.exit(0);
};
ws.onerror = (e) => {
    console.log('[' + (Date.now() - t0) + 'ms] ERROR:', e.message || 'desconocido');
};
setTimeout(() => {
    console.log('[' + (Date.now() - t0) + 'ms] TIMEOUT 6s sin cierre => HOST_ID LIBRE (host real NO registrado en el relay)');
    process.exit(0);
}, 6000);
