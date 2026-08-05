/**
 * Compile Proxy — Proxy de compilación Arduino para Velxio
 *
 * Traduce las peticiones POST /api/compile/ de Velxio a llamadas
 * a arduino-cli instalado en el sistema.
 *
 * Uso:
 *   node compile-proxy.mjs
 *   (se inicia en http://127.0.0.1:8000)
 */
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os, { tmpdir } from 'node:os';
import crypto from 'node:crypto';

// ============================================================
// Configuración
// ============================================================

const PUBLIC_BASE_PATH = (process.env.PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const DEFAULT_PORT = PUBLIC_BASE_PATH ? 3000 : 8000;
const PORT = Number(process.env.PORT || DEFAULT_PORT);
const HOST = process.env.HOST || '0.0.0.0';
const EFFECTIVE_PUBLIC_BASE_PATH = PUBLIC_BASE_PATH || '/stblock-compiler';

function cleanPath(p) {
    if (typeof p === 'string' && p.startsWith('\\\\?\\')) {
        return p.slice(4);
    }
    return p;
}

// ── Arduino CLI path resolution ──
// Priority:
//   1. ARDUINO_CLI_PATH env var (set by Tauri launcher or user)
//   2. BUNDLE_RESOURCES_DIR env var + tools/Arduino/arduino-cli.exe (Tauri bundled)
//   3. Common Linux/cPanel install locations
//   4. System PATH via where/which
//   5. Hardcoded fallback for legacy dev setups
function resolveArduinoCli() {
    // 1. Env var override
    if (process.env.ARDUINO_CLI_PATH) {
        const resolved = path.resolve(process.env.ARDUINO_CLI_PATH);
        if (fs.existsSync(resolved)) return resolved;
        console.warn(`[compile-proxy] ARDUINO_CLI_PATH apunta a un archivo que no existe: ${resolved}`);
    }

    // 2. Tauri bundled resources
    if (process.env.BUNDLE_RESOURCES_DIR) {
        const cleanedDir = cleanPath(process.env.BUNDLE_RESOURCES_DIR);
        const bundled = path.join(cleanedDir, 'tools', 'Arduino', 'arduino-cli.exe');
        if (fs.existsSync(bundled)) return bundled;
    }

    // 3. Common Linux/cPanel install locations
    const linuxCandidates = [
        path.join(os.homedir(), 'bin', 'arduino-cli'),
        '/usr/local/bin/arduino-cli',
        '/usr/bin/arduino-cli',
    ];
    for (const candidate of linuxCandidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    // 4. System PATH via where/which
    try {
        const finder = process.platform === 'win32' ? 'where' : 'which';
        const executable = process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
        const whichResult = spawnSync(finder, [executable], {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 5000,
        });
        if (whichResult.status === 0 && whichResult.stdout) {
            const candidate = whichResult.stdout.trim().split('\n')[0].trim();
            if (fs.existsSync(candidate)) return candidate;
        }
    } catch { /* fall through */ }

    // 5. Fallback for legacy dev
    return 'C:/Program Files/Arduino IDE/resources/app/lib/backend/resources/arduino-cli.exe';
}

const ARDUINO_CLI = resolveArduinoCli();

function resolveLibrariesDir() {
    // 1. Env var BUNDLE_RESOURCES_DIR
    if (process.env.BUNDLE_RESOURCES_DIR) {
        const cleanedDir = cleanPath(process.env.BUNDLE_RESOURCES_DIR);
        const p = path.join(cleanedDir, 'tools', 'Arduino', 'libraries');
        if (fs.existsSync(p)) return p;
    }

    // 2. Relative to process.execPath (works for SEA compile-proxy.exe in dev/prod)
    if (process.execPath) {
        const p = cleanPath(path.join(path.dirname(process.execPath), '..', 'tools', 'Arduino', 'libraries'));
        if (fs.existsSync(p)) return p;
    }

    // 3. Relative to current working directory
    const cwd = cleanPath(process.cwd());
    const candidates = [
        path.join(cwd, 'src-tauri', 'tools', 'Arduino', 'libraries'),
        path.join(cwd, '..', 'src-tauri', 'tools', 'Arduino', 'libraries'),
        path.join(cwd, 'tools', 'Arduino', 'libraries'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return null;
}

// Mapa de FQBNs conocidos por Velxio → su directorio de sketch base
const FQBN_MAP = {
    'arduino:avr:uno':               { mcu: 'atmega328p' },
    'arduino:avr:nano:cpu=atmega328old': { mcu: 'atmega328p' },
    'arduino:avr:mega:cpu=atmega2560':   { mcu: 'atmega2560' },
    'arduino:avr:leonardo':              { mcu: 'atmega32u4' },
};

// ============================================================
// Utilidades
// ============================================================

function uuid() {
    return crypto.randomBytes(4).toString('hex');
}

function readFileSafe(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return null;
    }
}

// ============================================================
// Compilación
// ============================================================

/**
 * Compila un sketch Arduino usando arduino-cli.
 *
 * @param {Array<{name: string, content: string}>} files
 * @param {string} fqbn  — ej: "arduino:avr:uno"
 * @returns {{ success: boolean, hex_content: string|null, stdout: string, stderr: string, error?: string }}
 */
function compileSketch(files, fqbn) {
    const sketchName = `sketch_${uuid()}`;
    const sketchDir = path.join(tmpdir(), sketchName);
    const buildDir = path.join(sketchDir, 'build');
    fs.mkdirSync(buildDir, { recursive: true });

    try {
        // arduino-cli requiere que el .ino principal tenga el mismo nombre
        // que el directorio del sketch. Renombramos el primer .ino encontrado.
        let mainIno = null;
        const inoFiles = files.filter(f => f.name.endsWith('.ino'));
        const otherFiles = files.filter(f => !f.name.endsWith('.ino'));

        if (inoFiles.length > 0) {
            // Usar el primer .ino como principal, renombrarlo a <sketchName>.ino
            const mainContent = inoFiles[0].content;
            mainIno = `${sketchName}.ino`;
            fs.writeFileSync(path.join(sketchDir, mainIno), mainContent);

            // Escribir .inos adicionales con sus nombres originales
            for (let i = 1; i < inoFiles.length; i++) {
                fs.writeFileSync(path.join(sketchDir, inoFiles[i].name), inoFiles[i].content);
            }
        } else {
            // No hay .ino — crear uno
            const cppFile = files.find(f => f.name.endsWith('.cpp'));
            if (cppFile) {
                mainIno = `${sketchName}.ino`;
                const inoContent = `#include "${cppFile.name}"\nvoid setup() {}\nvoid loop() {}\n`;
                fs.writeFileSync(path.join(sketchDir, mainIno), inoContent);
            } else {
                mainIno = `${sketchName}.ino`;
                fs.writeFileSync(path.join(sketchDir, mainIno), 'void setup() {}\nvoid loop() {}\n');
            }
        }

        // Escribir archivos adicionales (.h, .cpp, etc.)
        for (const file of otherFiles) {
            fs.writeFileSync(path.join(sketchDir, file.name), file.content);
        }

        // Ejecutar arduino-cli compile
        console.log(`[compile-proxy] Compilando: fqbn=${fqbn}, sketchDir=${sketchDir}`);
        const compileArgs = [
            'compile',
            '--fqbn', fqbn,
            '--output-dir', buildDir
        ];
        
        const libsDir = resolveLibrariesDir();
        if (libsDir) {
            console.log(`[compile-proxy] Usando librerías en: ${libsDir}`);
            compileArgs.push('--libraries', libsDir);
        } else {
            console.warn('[compile-proxy] Directorio de librerías no encontrado');
        }
        
        compileArgs.push(sketchDir);

        const result = spawnSync(ARDUINO_CLI, compileArgs, {
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024,
            encoding: 'utf8',
            windowsHide: true,
        });

        const stdout = result.stdout || '';
        const stderr = result.stderr || '';

        if (result.status === 0) {
            // Buscar el archivo .hex generado
            const hexFiles = fs.readdirSync(buildDir).filter(f => f.endsWith('.hex'));
            const hexFile = hexFiles.find(f => !f.includes('with_bootloader')) || hexFiles[0];

            if (hexFile) {
                const hexContent = fs.readFileSync(path.join(buildDir, hexFile), 'utf8');
                console.log(`[compile-proxy] Compilación exitosa: ${hexFile}, ${hexContent.length} bytes`);
                return { success: true, hex_content: hexContent, stdout, stderr };
            } else {
                // El .elf se generó pero no .hex — convertir usando objcopy
                const elfFiles = fs.readdirSync(buildDir).filter(f => f.endsWith('.elf'));
                if (elfFiles.length > 0) {
                    const elfPath = path.join(buildDir, elfFiles[0]);
                    const hexPath = path.join(buildDir, 'output.hex');
                    const avrObjcopy = path.join(
                        path.dirname(ARDUINO_CLI),
                        '..', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7', 'bin', 'avr-objcopy.exe'
                    );
                    const objResult = spawnSync(avrObjcopy, [
                        '-O', 'ihex',
                        '-R', '.eeprom',
                        elfPath, hexPath
                    ], { timeout: 30000, windowsHide: true });

                    if (objResult.status === 0) {
                        const hexContent = readFileSafe(hexPath);
                        return { success: true, hex_content: hexContent, stdout, stderr };
                    }
                }
                return { success: false, hex_content: null, stdout, stderr, error: 'No se generó archivo .hex' };
            }
        } else {
            const errorMsg = result.error ? result.error.message : `arduino-cli exit code: ${result.status}`;
            console.error(`[compile-proxy] Error de compilación: ${errorMsg}`);
            return { success: false, hex_content: null, stdout, stderr, error: errorMsg };
        }
    } catch (err) {
        console.error(`[compile-proxy] Excepción: ${err.message}`);
        return { success: false, hex_content: null, stdout: '', stderr: '', error: err.message };
    } finally {
        // Limpiar archivos temporales
        try { fs.rmSync(sketchDir, { recursive: true, force: true }); } catch {}
    }
}

// ============================================================
// Servidor HTTP
// ============================================================

const server = http.createServer((req, res) => {
    // CORS: el bundle usa withCredentials=true, NO podemos usar '*'
    const origin = req.headers.origin || 'http://localhost:8601';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    let requestPath = parsedUrl.pathname;
    if (EFFECTIVE_PUBLIC_BASE_PATH && requestPath.startsWith(`${EFFECTIVE_PUBLIC_BASE_PATH}/`)) {
        requestPath = requestPath.slice(EFFECTIVE_PUBLIC_BASE_PATH.length) || '/';
    } else if (EFFECTIVE_PUBLIC_BASE_PATH && requestPath === EFFECTIVE_PUBLIC_BASE_PATH) {
        requestPath = '/';
    }
    if (requestPath !== '/' && requestPath.endsWith('/')) {
        requestPath = requestPath.slice(0, -1);
    }
    const isCompileRoute = requestPath === '/' || requestPath === '' || requestPath === '/compile' || requestPath === '/api/compile' || requestPath.endsWith('/compile') || requestPath.endsWith('/api/compile');
    const isHealthRoute = requestPath === '/health' || requestPath === '/api/health' || requestPath.endsWith('/health') || requestPath.endsWith('/api/health');

 // Ruta: POST /api/compile/
    if (req.method !== 'GET' && req.method !== 'HEAD' && isCompileRoute) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { files, board_fqbn, project_id } = JSON.parse(body);
                console.log(`[compile-proxy] Solicitud: fqbn=${board_fqbn}, archivos=${files?.length ?? 0}`);

                if (!files || !board_fqbn) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Faltan parámetros: files, board_fqbn'
                    }));
                    return;
                }

                const result = compileSketch(files, board_fqbn);

                if (result.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        hex_content: result.hex_content,
                        binary_content: null,
                        stdout: result.stdout,
                        stderr: result.stderr,
                        core_install_log: null,
                        has_wifi: false,
                        board_fqbn: board_fqbn,
                    }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        hex_content: null,
                        binary_content: null,
                        stdout: result.stdout,
                        stderr: result.stderr,
                        error: result.error,
                    }));
                }
            } catch (err) {
                console.error(`[compile-proxy] Error parseando body: ${err.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Health check
    if (req.method === 'GET' && (isHealthRoute || requestPath === '/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', arduino_cli: ARDUINO_CLI, url: req.url, path: requestPath, base: EFFECTIVE_PUBLIC_BASE_PATH, proxyVersion: 'stblock-cpanel-root-compile-v2' }));
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', method: req.method, url: req.url, path: requestPath, base: EFFECTIVE_PUBLIC_BASE_PATH, isHealthRoute, isCompileRoute, proxyVersion: 'stblock-cpanel-root-compile-v2' }));
});

server.listen(PORT, HOST, () => {
    console.log(`[compile-proxy] Servidor de compilación iniciado en http://${HOST}:${PORT}`);
    console.log(`[compile-proxy] arduino-cli: ${ARDUINO_CLI}`);
    console.log(`[compile-proxy] Endpoint: POST /api/compile/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[compile-proxy] Cerrando servidor...');
    server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
















