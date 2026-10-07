import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sketchforgeRoot = path.join(__dirname, '..');

// 1. copy:occt
console.log('[export-stblock] Ejecutando copy-occt-wasm...');
const copyRes = spawnSync('node', ['scripts/copy-occt-wasm.mjs'], {
    cwd: sketchforgeRoot,
    stdio: 'inherit',
    shell: true
});
if (copyRes.status !== 0) process.exit(copyRes.status || 1);

// 2. next build apps/web with environment variables set cross-platform
console.log('[export-stblock] Compilando Next.js con STATIC_EXPORT=true...');
const buildRes = spawnSync('npx', ['next', 'build', 'apps/web'], {
    cwd: sketchforgeRoot,
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        STATIC_EXPORT: 'true',
        SKETCHFORGE_BASE_PATH: '/sketchforge'
    }
});
if (buildRes.status !== 0) process.exit(buildRes.status || 1);

// 3. verify-static-worker-assets
console.log('[export-stblock] Verificando static worker assets...');
const verifyRes = spawnSync('node', ['scripts/verify-static-worker-assets.mjs', '--prefix', '/sketchforge'], {
    cwd: sketchforgeRoot,
    stdio: 'inherit',
    shell: true
});
if (verifyRes.status !== 0) process.exit(verifyRes.status || 1);

console.log('[export-stblock] OK: Exportacion estatica completada.');
