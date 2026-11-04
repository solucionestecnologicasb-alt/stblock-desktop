import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { patchSketchforgeDirectory } from "./patch-sketchforge-relative.mjs";


const [sourceArg, destinationArg, versionArg = "dev"] = process.argv.slice(2);

if (!sourceArg || !destinationArg) {
  console.error("Uso: node scripts/prepare-wordpress-editor.mjs <build> <assets/editor> [version]");
  process.exit(1);
}

const source = resolve(sourceArg);
const destination = resolve(destinationArg);
const normalizedDestination = destination.toLowerCase();
const expectedSuffix = `${sep}assets${sep}editor`.toLowerCase();

if (basename(destination).toLowerCase() !== "editor" || !normalizedDestination.endsWith(expectedSuffix)) {
  throw new Error(`Destino inseguro: ${destination}. Debe terminar exactamente en assets${sep}editor.`);
}

if (source === destination || destination.startsWith(`${source}${sep}`)) {
  throw new Error("El destino no puede ser el build fuente ni estar dentro de el.");
}

await stat(join(source, "index.html"));

// El editor es un artefacto generado. Recrearlo evita conservar chunks obsoletos
// de despliegues anteriores, que aumentaban silenciosamente el espacio del hosting.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

// The WordPress host does not expose the development-only /api/circuit-state
// disk-sync endpoint. Keep Electronics Lab persistence in localStorage and the
// existing parent-frame bridge, and avoid its repeated 404 polling requests.
const electronicsAssets = join(destination, "static", "electronics-lab", "assets");
try {
  await stat(electronicsAssets);
  const entries = await readdir(electronicsAssets, { withFileTypes: true });
  const bundles = entries.filter((entry) => entry.isFile() && /^index-.*\.js$/i.test(entry.name));
  if (bundles.length === 0) throw new Error(`No se encontró el bundle de Electronics Lab en ${electronicsAssets}.`);

  let patchedBundles = 0;
  for (const bundle of bundles) {
    const bundlePath = join(electronicsAssets, bundle.name);
    const original = await readFile(bundlePath, "utf8");
    const signature = /async function Rb\(c\)\{[\s\S]*?\}function sW\(c\)\{[\s\S]*?\}function dh\(c\)/;
    if (!signature.test(original)) {
      throw new Error(`El bundle ${bundle.name} cambió; no se aplicó el ajuste de circuit-state. Revisa la lógica antes de desplegar.`);
    }
    const replacement = `async function Rb(c){if(_b)return!1;try{const e=JSON.stringify(c);localStorage.setItem("electronics_lab_circuit_state_file",e);typeof window<"u"&&window.parent&&window.parent.postMessage({type:"STBLOCK_SAVE_CIRCUIT_FILE",filename:"circuit-state.json",payload:c},"*");return!0}catch{return!1}}function sW(c){return()=>{}}function dh(c)`;
    await writeFile(bundlePath, original.replace(signature, replacement), "utf8");
    patchedBundles += 1;
  }
  console.log(`[wordpress-editor] Electronics Lab preparado: guardado local/bridge habilitado, polling /api/circuit-state desactivado (${patchedBundles} bundle${patchedBundles === 1 ? "" : "s"}).`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const rootOnlyArtifacts = new Set([
  "blocks-only.html",
  "blocksonly.js",
  "compatibility-testing.html",
  "compatibilitytesting.js",
  "player.html",
  "player.js",
]);

let removedFiles = 0;
let removedBytes = 0;

async function prune(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prune(fullPath);
      continue;
    }

    const relativePath = relative(destination, fullPath);
    const isRootOnlyArtifact = !relativePath.includes(sep) && rootOnlyArtifacts.has(entry.name);
    const extension = extname(entry.name).toLowerCase();
    const isDevelopmentArtifact = extension === ".map" || extension === ".backup" || extension === ".bak";
    if (!isRootOnlyArtifact && !isDevelopmentArtifact) continue;

    const fileStats = await stat(fullPath);
    await rm(fullPath, { force: true });
    removedFiles += 1;
    removedBytes += fileStats.size;
  }
}

await prune(destination);

const safeVersion = String(versionArg).replace(/[^a-zA-Z0-9._-]/g, "-");
const serviceWorker = `/* Generado por prepare-wordpress-editor.mjs. */
const CACHE_PREFIX = "stblock-editor-static-";
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(safeVersion)};
const CACHEABLE = /\\.(?:js|mjs|css|wasm|worker|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|glb|gltf|bin|stl|step|stp|hex|json)$/i;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath) || !CACHEABLE.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      // Revalidar una vez por despliegue evita reutilizar un asset no versionado
      // del cache HTTP anterior; despues se sirve completamente desde el cliente.
      const response = await fetch(new Request(request, { cache: "no-cache" }));
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const fallback = await cache.match(request);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
`;

await writeFile(join(destination, "stblock-sw.js"), serviceWorker, "utf8");

const htaccess = `# Generado por STBlock. Apache ignora de forma segura los modulos no disponibles.
<IfModule mod_mime.c>
  AddType application/wasm .wasm
  AddType model/gltf-binary .glb
  AddType model/gltf+json .gltf
  AddType model/stl .stl
  AddType model/step .step .stp
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"

  <FilesMatch "\\.html$|^stblock-sw\\.js$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>

  <FilesMatch "\\.(?:js|mjs|css|wasm|worker|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|glb|gltf|bin|stl|step|stp|hex|json)$">
    Header set Cache-Control "public, max-age=86400, stale-while-revalidate=604800"
  </FilesMatch>

  <FilesMatch "[._-][0-9a-f]{8,}\\.(?:js|mjs|css|wasm|worker|png|jpe?g|gif|webp|avif|svg|woff2?|glb|gltf|bin)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/css text/javascript application/javascript application/json application/wasm image/svg+xml model/gltf+json model/stl model/step
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json application/wasm image/svg+xml model/gltf+json model/stl model/step
</IfModule>
`;

await writeFile(join(destination, ".htaccess"), htaccess, "utf8");

const indexPath = join(destination, "index.html");
let html = await readFile(indexPath, "utf8");
html = html.replace(/gui\.js(?:\?v=[^"']*)?/g, `gui.js?v=${safeVersion}`);

const registrationMarker = "data-stblock-client-cache";
if (!html.includes(registrationMarker)) {
  const registration = `<script ${registrationMarker}>(function(){if(!("serviceWorker" in navigator)||!(location.protocol==="https:"||location.hostname==="localhost"))return;window.addEventListener("load",function(){var base=new URL(".",location.href);navigator.serviceWorker.register(new URL("stblock-sw.js",base).href,{scope:base.pathname,updateViaCache:"none"}).catch(function(error){console.warn("[STBlock] Cache local no disponible:",error);});});})();</script>`;
  html = html.replace("</head>", `${registration}</head>`);
}
await writeFile(indexPath, html, "utf8");

const destSketchforge = join(destination, "sketchforge");
try {
  await stat(destSketchforge);
  await patchSketchforgeDirectory(destSketchforge);
} catch {}

const deployedFiles = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await collect(fullPath);
    else deployedFiles.push(await stat(fullPath));
  }
}
await collect(destination);
const deployedBytes = deployedFiles.reduce((sum, item) => sum + item.size, 0);

console.log(`[wordpress-editor] ${deployedFiles.length} archivos, ${(deployedBytes / 1024 / 1024).toFixed(2)} MB.`);
console.log(`[wordpress-editor] Eliminados ${removedFiles} artefactos de desarrollo/prueba (${(removedBytes / 1024 / 1024).toFixed(2)} MB).`);
console.log("[wordpress-editor] Cache local bajo demanda y cabeceras Apache instaladas.");
