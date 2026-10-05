#!/usr/bin/env node
/**
 * Descarga la biblioteca de Scratch (sprites, disfraces, fondos y sonidos)
 * desde cdn.assets.scratch.mit.edu hacia scratch-gui/static/scratch-assets/.
 *
 * Una vez ejecutado, STBlock resuelve la biblioteca sin internet: webpack copia
 * `static/` a `build/static/` (webpack.config.js) y storage.js registra este
 * directorio como primer web store.
 *
 * Uso:
 *   node scripts/sync-scratch-assets.mjs
 *   node scripts/sync-scratch-assets.mjs --verify    # solo verifica, no descarga
 *   node scripts/sync-scratch-assets.mjs --prune     # borra assets que ya no se usan
 *   node scripts/sync-scratch-assets.mjs --concurrency 12
 *
 * Solo necesita internet la primera vez. Es reanudable: los archivos ya
 * presentes y con md5 correcto se saltan.
 */

import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LIBRARIES_DIR = path.join(REPO_ROOT, 'scratch-gui', 'src', 'lib', 'libraries');
const OUTPUT_DIR = path.join(REPO_ROOT, 'scratch-gui', 'static', 'scratch-assets');

const ASSET_HOST = 'https://cdn.assets.scratch.mit.edu';
const LIBRARY_FILES = ['sprites.json', 'costumes.json', 'sounds.json', 'backdrops.json'];

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

const args = process.argv.slice(2);
const VERIFY_ONLY = args.includes('--verify');
const PRUNE = args.includes('--prune');
const concurrencyArg = args.indexOf('--concurrency');
const CONCURRENCY = concurrencyArg !== -1 ?
    Math.max(1, Number(args[concurrencyArg + 1]) || 8) :
    8;

const md5 = buffer => createHash('md5').update(buffer).digest('hex');

/**
 * Un nombre de asset es `<md5>.<extension>`; el md5 del contenido debe
 * coincidir con el nombre. Eso da verificación de integridad gratis.
 */
const expectedMd5 = fileName => fileName.slice(0, fileName.lastIndexOf('.'));

const walk = dir => readdir(dir, {withFileTypes: true}).then(entries => Promise.all(
    entries.map(entry => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
    })
)).then(lists => lists.flat());

const MD5EXT_PATTERN = /^[a-f0-9]{32}\.[a-z0-9]+$/;

/**
 * Extrae los md5ext únicos referenciados por las bibliotecas.
 *
 * `md5ext` es el campo autoritativo: en sounds.json los sonidos declaran
 * `dataFormat: "adpcm"` pero el asset real en el CDN es un `.wav`, por lo que
 * reconstruir el nombre desde `assetId` + `dataFormat` produce 404.
 */
async function collectManifest() {
    const manifest = new Set();
    const fallbacks = [];

    for (const file of LIBRARY_FILES) {
        const filePath = path.join(LIBRARIES_DIR, file);
        const raw = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);

        const visit = node => {
            if (Array.isArray(node)) {
                node.forEach(visit);
                return;
            }
            if (!node || typeof node !== 'object') return;

            if (typeof node.md5ext === 'string' && MD5EXT_PATTERN.test(node.md5ext)) {
                manifest.add(node.md5ext);
            } else if (typeof node.assetId === 'string' &&
                       typeof node.dataFormat === 'string' &&
                       node.dataFormat.length > 0) {
                // Solo si no hay md5ext utilizable; nunca con dataFormat vacío.
                fallbacks.push(`${node.assetId}.${node.dataFormat.toLowerCase()}`);
            }
            Object.values(node).forEach(visit);
        };

        visit(parsed);
    }

    fallbacks.forEach(name => manifest.add(name));
    return manifest;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAsset(fileName) {
    const url = `${ASSET_HOST}/internalapi/asset/${fileName}/get/`;
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
            if (response.status === 404) {
                return {status: 'missing', fileName};
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const actual = md5(buffer);
            const expected = expectedMd5(fileName);

            if (actual !== expected) {
                return {
                    status: 'corrupt',
                    fileName,
                    detail: `md5 ${actual} != ${expected}`
                };
            }

            await writeFile(path.join(OUTPUT_DIR, fileName), buffer);
            return {status: 'downloaded', fileName, bytes: buffer.length};
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS) {
                await sleep(RETRY_BASE_MS * attempt);
            }
        }
    }

    return {status: 'failed', fileName, detail: lastError?.message ?? 'error desconocido'};
}

async function verifyLocal(fileName) {
    const filePath = path.join(OUTPUT_DIR, fileName);
    try {
        const info = await stat(filePath);
        if (info.size === 0) return {status: 'empty', fileName};
        const buffer = await readFile(filePath);
        const actual = md5(buffer);
        if (actual !== expectedMd5(fileName)) {
            return {status: 'corrupt', fileName, detail: `md5 ${actual} != ${expectedMd5(fileName)}`};
        }
        return {status: 'ok', fileName, bytes: info.size};
    } catch {
        return {status: 'absent', fileName};
    }
}

/**
 * Ejecuta `worker` sobre `items` manteniendo `limit` promesas en vuelo.
 */
async function runPool(items, limit, worker, onProgress) {
    const results = [];
    let cursor = 0;
    let done = 0;

    const runners = Array.from({length: Math.min(limit, items.length)}, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            const result = await worker(items[index]);
            results.push(result);
            done++;
            onProgress(done, items.length);
        }
    });

    await Promise.all(runners);
    return results;
}

async function main() {
    console.log('STBlock — sincronización de la biblioteca de Scratch\n');

    const manifest = await collectManifest();
    const files = [...manifest].sort();
    console.log(`Assets referenciados por la biblioteca: ${files.length}`);
    console.log(`Destino: ${path.relative(REPO_ROOT, OUTPUT_DIR)}\n`);

    await mkdir(OUTPUT_DIR, {recursive: true});

    if (VERIFY_ONLY) {
        const results = await runPool(files, CONCURRENCY, verifyLocal, (done, total) => {
            if (done % 100 === 0 || done === total) {
                process.stdout.write(`\r  verificando ${done}/${total}`);
            }
        });
        process.stdout.write('\n\n');

        const ok = results.filter(r => r.status === 'ok');
        const bad = results.filter(r => r.status !== 'ok');
        const bytes = ok.reduce((sum, r) => sum + r.bytes, 0);

        console.log(`Correctos: ${ok.length}/${files.length} (${(bytes / 1048576).toFixed(1)} MB)`);
        if (bad.length > 0) {
            console.log(`\nCon problemas (${bad.length}):`);
            bad.slice(0, 20).forEach(r => {
                console.log(`  [${r.status}] ${r.fileName}${r.detail ? ` — ${r.detail}` : ''}`);
            });
            if (bad.length > 20) console.log(`  ... y ${bad.length - 20} más`);
            process.exitCode = 1;
        }
        return;
    }

    // Reanudable: se saltan los que ya están completos y correctos.
    const pending = [];
    let alreadyLocal = 0;
    let localBytes = 0;

    for (const fileName of files) {
        const check = await verifyLocal(fileName);
        if (check.status === 'ok') {
            alreadyLocal++;
            localBytes += check.bytes;
        } else {
            pending.push(fileName);
        }
    }

    console.log(`Ya presentes y verificados: ${alreadyLocal}`);
    console.log(`Pendientes de descarga: ${pending.length}\n`);

    let downloadedBytes = 0;

    const results = pending.length === 0 ? [] : await runPool(
        pending,
        CONCURRENCY,
        async fileName => {
            const result = await fetchAsset(fileName);
            if (result.bytes) downloadedBytes += result.bytes;
            return result;
        },
        (done, total) => {
            if (done % 25 === 0 || done === total) {
                process.stdout.write(`\r  descargando ${done}/${total}`);
            }
        }
    );

    if (pending.length > 0) process.stdout.write('\n\n');

    const ok = results.filter(r => r.status === 'downloaded');
    const problems = results.filter(r => r.status !== 'downloaded');

    const totalBytes = localBytes + downloadedBytes;
    console.log(`Descargados: ${ok.length}`);
    console.log(`Total en disco: ${(totalBytes / 1048576).toFixed(1)} MB`);

    if (problems.length > 0) {
        console.log(`\nCon problemas (${problems.length}):`);
        problems.slice(0, 20).forEach(r => {
            console.log(`  [${r.status}] ${r.fileName}${r.detail ? ` — ${r.detail}` : ''}`);
        });
        if (problems.length > 20) console.log(`  ... y ${problems.length - 20} más`);
        process.exitCode = 1;
    }

    if (PRUNE) {
        const keep = new Set(files);
        const onDisk = await walk(OUTPUT_DIR);
        const stale = onDisk.filter(p => !keep.has(path.basename(p)));

        for (const stalePath of stale) {
            await rm(stalePath);
        }
        console.log(`\nPurgados ${stale.length} assets que ya no usa la biblioteca.`);
    }

    if (process.exitCode !== 1) {
        console.log('\nListo. La biblioteca ya puede resolverse sin internet.');
    }
}

main().catch(error => {
    console.error('\nError inesperado:', error);
    process.exitCode = 1;
});
