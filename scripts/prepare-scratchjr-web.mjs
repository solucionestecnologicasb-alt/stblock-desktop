import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const webDist = resolve(repoRoot, 'vendor/scratchjr-reborn/dist-web');
const target = resolve(repoRoot, 'scratch-gui/static/scratchjr');
const kidsAssets = resolve(repoRoot, 'scratch-gui/static/kids');
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

await rm(target, {recursive: true, force: true});
await mkdir(target, {recursive: true});
for (const file of rootFiles) {
  await cp(resolve(webDist, file), resolve(target, file));
}
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
await writeFile(
  hostClientPath,
  hostClient.replace(/var isTauri = Boolean\([\s\S]*?\n    \);/, 'var isTauri = false;'),
  'utf8'
);

// La copia embebida siempre utiliza el backend web. La navegación de ScratchJr
// cambia de index.html a home.html/editor.html y no conserva query parameters.
for (const page of ['index.html', 'home.html', 'editor.html', 'gettingstarted.html']) {
  const pagePath = resolve(target, 'app', page);
  let html = await readFile(pagePath, 'utf8');
  html = html.replace(/^\s*<link rel="preload" href="\.\.\/sql-wasm\.wasm"[^>]*>\s*$/m, '');
  html = html.replace('</head>', '    <link rel="stylesheet" href="stblock-kids-workspace.css">\n    <script src="stblock-kids-bridge.js" defer></script>\n</head>');
  await writeFile(pagePath, html, 'utf8');
}

console.log(`ScratchJr Web preparado para STBlock en ${target}`);
