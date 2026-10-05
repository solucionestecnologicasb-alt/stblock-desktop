#!/usr/bin/env node
/**
 * Comprueba que todos los md5ext referenciados por las bibliotecas de Scratch
 * existen en el build. Sirve para validar el espejo offline antes de publicar.
 *
 * Uso: node scripts/verify-scratch-assets.mjs [--dir <carpeta-de-assets>]
 */

import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LIBRARIES_DIR = path.join(REPO_ROOT, 'scratch-gui', 'src', 'lib', 'libraries');

const dirArg = process.argv.indexOf('--dir');
const ASSETS_DIR = dirArg === -1 ?
    path.join(REPO_ROOT, 'scratch-gui', 'build', 'static', 'scratch-assets') :
    path.resolve(process.argv[dirArg + 1]);

const LIBRARY_FILES = ['sprites.json', 'costumes.json', 'sounds.json', 'backdrops.json'];
const MD5EXT_PATTERN = /^[a-f0-9]{32}\.[a-z0-9]+$/;

const collect = async () => {
    const found = new Set();

    for (const file of LIBRARY_FILES) {
        const parsed = JSON.parse(await readFile(path.join(LIBRARIES_DIR, file), 'utf8'));

        const visit = node => {
            if (Array.isArray(node)) {
                node.forEach(visit);
                return;
            }
            if (node === null || typeof node !== 'object') return;

            if (typeof node.md5ext === 'string' && MD5EXT_PATTERN.test(node.md5ext)) {
                found.add(node.md5ext);
            }
            Object.values(node).forEach(visit);
        };

        visit(parsed);
    }

    return [...found];
};

const exists = async filePath => {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
};

const main = async () => {
    const referenced = await collect();
    const missing = [];

    for (const name of referenced) {
        if (!await exists(path.join(ASSETS_DIR, name))) {
            missing.push(name);
        }
    }

    console.log(`Carpeta verificada: ${path.relative(REPO_ROOT, ASSETS_DIR)}`);
    console.log(`Assets referenciados por la biblioteca: ${referenced.length}`);
    console.log(`Presentes: ${referenced.length - missing.length}`);
    console.log(`Faltantes: ${missing.length}`);

    if (missing.length > 0) {
        missing.slice(0, 20).forEach(name => console.log(`  FALTA ${name}`));
        if (missing.length > 20) console.log(`  ... y ${missing.length - 20} más`);
        console.log('\nLa biblioteca NO está completa. Ejecuta: node scripts/sync-scratch-assets.mjs');
        process.exitCode = 1;
        return;
    }

    console.log('\nBiblioteca completa: se resuelve sin internet.');
};

main().catch(error => {
    console.error('Error:', error);
    process.exitCode = 1;
});
