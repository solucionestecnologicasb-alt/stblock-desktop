import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const webDist = resolve(repoRoot, 'vendor/scratchjr-reborn/dist-web');
const target = resolve(repoRoot, 'scratch-gui/static/scratchjr');
const kidsAssets = resolve(repoRoot, 'scratch-gui/static/kids');
const sqlDist = resolve(repoRoot, 'vendor/scratchjr-reborn/node_modules/sql.js/dist');
const sqlAsmSource = resolve(sqlDist, 'sql-asm.js');
const rootFiles = [
  'hostClient.js',
  'webav.js',
  'browserClient.js',
  'sql-wasm.js',
  'sql-wasm.wasm'
];

for (const file of [...rootFiles, 'app/index.html']) {
  const path = resolve(webDist, file);
  try {
    await readFile(path);
  } catch (_error) {
    throw new Error(`Falta ${path}. Ejecuta npm install en vendor/scratchjr-reborn y vuelve a compilar la edición web.`);
  }
}

try {
  await readFile(sqlAsmSource);
} catch (_error) {
  throw new Error(`Falta ${sqlAsmSource}. Ejecuta npm install en vendor/scratchjr-reborn.`);
}

await rm(target, {recursive: true, force: true});
await mkdir(target, {recursive: true});
for (const file of rootFiles) {
  await cp(resolve(webDist, file), resolve(target, file));
}
// Chrome 68 (WebView de las Chromebooks ARC++) no puede decodificar el WASM
// de SQLite: sql-wasm.wasm usa bulk memory (sección DataCount), que llegó en
// Chrome 75. El build asm.js de sql.js es JavaScript puro y expone la misma
// API (initSqlJs), así que lo usamos como motor de base de datos de Kids.
await cp(sqlAsmSource, resolve(target, 'sql-asm.js'));
await cp(resolve(webDist, 'app'), resolve(target, 'app'), {recursive: true});
for (const file of [
  'stblock-kids-bridge.js',
  'stblock-kids-workspace.css',
  'stblock-kids-character.svg',
  'stblock-kids-logo.jpg',
  'map-classroom.svg',
  'map-city.svg',
  'map-garden.svg'
]) {
  await cp(resolve(kidsAssets, file), resolve(target, 'app', file));
}

// STBlock ya provee Tauri APIs en la ventana principal. ScratchJr debe usar
// su host web aislado para conservar IndexedDB/sql.js dentro del iframe.
const hostClientPath = resolve(target, 'hostClient.js');
const hostClient = await readFile(hostClientPath, 'utf8');
const tauriMarker = 'var isTauri = Boolean(';
if (!hostClient.includes(tauriMarker)) {
  throw new Error('El selector del host Tauri de ScratchJr cambió; actualiza este adaptador antes de integrar la nueva versión.');
}
const sqlWasmLoader = "load('../sql-wasm.js');";
const sqlAsmLoader = "load('../sql-asm.js');";
if (!hostClient.includes(sqlWasmLoader)) {
  throw new Error('El cargador de sql.js de ScratchJr cambió; actualiza este adaptador antes de integrar la nueva versión.');
}
await writeFile(
  hostClientPath,
  hostClient
    .replace(/var isTauri = Boolean\([\s\S]*?\n    \);/, 'var isTauri = false;')
    .replace(sqlWasmLoader, sqlAsmLoader),
  'utf8'
);

// El service worker sólo se registra fuera de STBlock, pero debe precachear el
// motor que realmente se carga para que la PWA siga funcionando offline.
const swPath = resolve(target, 'app/sw.js');
let swSource = await readFile(swPath, 'utf8');
if (swSource.includes("'../sql-wasm.js',")) {
  swSource = swSource
    .replace("'../sql-wasm.js',", "'../sql-asm.js',")
    .replace(/^\s*'\.\.\/sql-wasm\.wasm',\s*$/m, '');
  await writeFile(swPath, swSource, 'utf8');
}

// La copia embebida siempre utiliza el backend web. La navegación de ScratchJr
// cambia de index.html a home.html/editor.html y no conserva query parameters.
const rendererFiles = (await readdir(resolve(target, 'app/dist'))).filter(file => file.endsWith('.js')).sort();
const rendererFingerprint = await Promise.all(rendererFiles.map(async file => {
  const content = await readFile(resolve(target, 'app/dist', file));
  return `${file}:${createHash('sha256').update(content).digest('hex')}`;
}));
const hostClientBytes = await readFile(resolve(target, 'hostClient.js'));
rendererFingerprint.push(`hostClient:${createHash('sha256').update(hostClientBytes).digest('hex')}`);
const rendererRevision = createHash('sha256').update(rendererFingerprint.join('\n')).digest('hex').slice(0, 12);
for (const page of ['index.html', 'home.html', 'editor.html', 'gettingstarted.html']) {
  const pagePath = resolve(target, 'app', page);
  let html = await readFile(pagePath, 'utf8');
  html = html.replace(/^\s*<link rel="preload" href="\.\.\/sql-wasm\.wasm"[^>]*>\s*$/m, '');
  // Chrome 68 (WebView de las Chromebooks ARC++) no conoce
  // 'wasm-unsafe-eval' (Chrome 97): en CSP2 el WebAssembly y el eval de
  // sql.js sólo se permiten con 'unsafe-eval'. Sin esto Kids se queda en
  // blanco al fallar initSqlJs. En navegadores modernos no cambia nada.
  if (!html.includes("'wasm-unsafe-eval' 'unsafe-eval'")) {
    html = html.replace(
      "script-src 'self' 'wasm-unsafe-eval'",
      "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'"
    );
  }
  html = html.replace(/src=(["'])\.\.\/hostClient\.js(?:\?[^"']*)?\1/, (_match, quote) => `src=${quote}../hostClient.js?v=${rendererRevision}${quote}`);
  html = html.replace(/src="(\.\/)?dist\/app\.bundle\.js(?:\?[^\"]*)?"/, (_match, relativePrefix = '') => `src="${relativePrefix}dist/app.bundle.js?v=${rendererRevision}"`);
  html = html.replace('</head>', '    <link rel="stylesheet" href="stblock-kids-workspace.css">\n    <script src="stblock-kids-bridge.js" defer></script>\n</head>');
  await writeFile(pagePath, html, 'utf8');
}

console.log(`ScratchJr Web preparado para STBlock en ${target}`);
