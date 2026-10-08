import http from 'http';
import fs from 'fs';

const LOG_PATH = 'C:/Users/bello/Downloads/NewSkeleton-master/NewSkeleton-master/scratch-gui/classroom-diag.log';

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    if (req.method === 'POST') {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', () => {
            const line = '[' + new Date().toISOString() + '] ' + body + '\n';
            try {
                fs.appendFileSync(LOG_PATH, line);
            } catch (e) {
                // ignorar
            }
            res.writeHead(200);
            res.end('ok');
        });
    } else {
        res.writeHead(200);
        res.end('ok');
    }
});

server.listen(7777, '127.0.0.1', () => {
    console.log('log-server escuchando en 127.0.0.1:7777 -> ' + LOG_PATH);
});
