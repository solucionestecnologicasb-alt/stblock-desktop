import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { existsSync } from "node:fs";
import { patchSketchforgeDirectory } from "./patch-sketchforge-relative.mjs";

const rootDir = resolve(process.cwd());
const sourceDir = resolve(rootDir, "scratch-gui/build");
const targetDir = resolve(rootDir, "scratch-gui/build-android");
const assetPackDir = resolve(rootDir, "src-tauri/gen/android/models3d_pack/src/main/assets");

console.log("[prepare-android-build] ===============================================");
console.log("[prepare-android-build] Configurando Play Asset Delivery para STBlock...");
console.log(`[prepare-android-build] Fuente: ${sourceDir}`);
console.log(`[prepare-android-build] Destino Base: ${targetDir}`);
console.log(`[prepare-android-build] Destino Asset Pack (PAD): ${assetPackDir}`);
console.log("[prepare-android-build] ===============================================");

if (!existsSync(join(sourceDir, "index.html"))) {
  throw new Error(`No se encontró el build en ${sourceDir}. Asegúrate de compilar el frontend primero.`);
}

// 1. Limpiar y recrear destinos
await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

await rm(assetPackDir, { recursive: true, force: true });
await mkdir(assetPackDir, { recursive: true });

// 2. Copiar todo el build base
console.log("[prepare-android-build] [1/5] Copiando archivos base a build-android...");
await cp(sourceDir, targetDir, { recursive: true, force: true });

// 3. Excluir directorios y archivos no aplicables en Android
console.log("[prepare-android-build] [2/5] Poda de archivos desktop y residuales...");
const directoriesToRemove = [
  join("static", "drivers"),
  join("static", "electronics-lab", "temp_inspect"),
  join("static", "gears", "blockly-9.0.0"),
  join("static", "gears", "blockly-12.3.0"),
  join("static", "gears", "ace-1.4.10"),
  join("static", "gears", "babylon", "4.1.0"),
];

for (const dirRel of directoriesToRemove) {
  const fullPath = join(targetDir, dirRel);
  if (existsSync(fullPath)) {
    await rm(fullPath, { recursive: true, force: true });
  }
}

const specificFilesToRemove = [
  join("static", "electronics-lab", "assets", "eecircuit-engine-Cgw6G0Yl.js"),
  "blocks-only.html",
  "blocksonly.js",
  "compatibility-testing.html",
  "compatibilitytesting.js",
  "player.html",
  "player.js"
];

for (const fileRel of specificFilesToRemove) {
  const fullPath = join(targetDir, fileRel);
  if (existsSync(fullPath)) {
    await rm(fullPath, { force: true });
  }
}

// 4. Podar archivos .map y backups
let removedCount = 0;
let removedBytes = 0;

async function pruneFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await pruneFiles(fullPath);
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (extension === ".map" || extension === ".bak" || extension === ".backup") {
      const s = await stat(fullPath);
      removedBytes += s.size;
      removedCount += 1;
      await rm(fullPath, { force: true });
    }
  }
}

await pruneFiles(targetDir);
console.log(`[prepare-android-build] Eliminados ${removedCount} mapas de depuración / backups (${(removedBytes / 1024 / 1024).toFixed(2)} MB).`);

// 5. Trasladar exclusivamente modelos 3D pesados (.glb, .gltf) hacia el Asset Pack de Google Play
// NOTA IMPORTANTE: static/assets y static/scratch-assets deben permanecer en el paquete base
// para que el WebView de Tauri cargue correctamente logos, tarjetas de placas, disfraces e iconos.
console.log("[prepare-android-build] [3/5] Extrayendo modelos 3D pesados hacia models3d_pack (Play Asset Delivery)...");

// Trasladar modelos 3D (.glb, .gltf)
let movedModelsCount = 0;
let movedModelsBytes = 0;

async function extract3dModels(directory) {
  if (!existsSync(directory)) return;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await extract3dModels(fullPath);
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (ext === ".glb" || ext === ".gltf") {
      const relPath = relative(targetDir, fullPath);
      // IMPORTANTE: Los modelos de electronics-lab DEBEN permanecer en build-android
      // para que el simulador 3D de circuitos los cargue en el WebView de Android.
      if (relPath.startsWith("static" + sep + "electronics-lab") || relPath.startsWith("static/electronics-lab")) {
        continue;
      }

      const destPath = join(assetPackDir, relPath);
      const destParent = resolve(destPath, "..");
      await mkdir(destParent, { recursive: true });

      const s = await stat(fullPath);
      movedModelsBytes += s.size;
      movedModelsCount += 1;

      // Copiar al Asset Pack de Android y eliminar del bundle de Rust
      await cp(fullPath, destPath);
      await rm(fullPath, { force: true });
    }
  }
}

await extract3dModels(targetDir);
console.log(`[prepare-android-build] -> ${movedModelsCount} modelos 3D (.glb/.gltf) trasladados al Asset Pack (${(movedModelsBytes / 1024 / 1024).toFixed(2)} MB).`);

// 6. Aplicar parche de rutas relativas a SketchForge
console.log("[prepare-android-build] [4/5] Parcheando SketchForge con rutas relativas...");
const sketchforgeDir = join(targetDir, "sketchforge");
if (existsSync(sketchforgeDir)) {
  await patchSketchforgeDirectory(sketchforgeDir);
}

// 7. Calcular y reportar tamaños finales
console.log("[prepare-android-build] [5/5] Calculando métricas de tamaño...");
async function computeTotalSize(directory) {
  if (!existsSync(directory)) return 0;
  let total = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await computeTotalSize(fullPath);
    } else {
      const s = await stat(fullPath);
      total += s.size;
    }
  }
  return total;
}

const baseBundleSize = await computeTotalSize(targetDir);
const assetPackSize = await computeTotalSize(assetPackDir);

console.log("[prepare-android-build] ===============================================");
console.log(`[prepare-android-build] Módulo Base (Rust/UI): ${(baseBundleSize / 1024 / 1024).toFixed(2)} MB (Límite Google Play: 150 MB)`);
console.log(`[prepare-android-build] Asset Pack (PAD):       ${(assetPackSize / 1024 / 1024).toFixed(2)} MB (Límite Google Play: 1024 MB)`);
console.log("[prepare-android-build] Play Asset Delivery preparado con éxito.");
console.log("[prepare-android-build] ===============================================");
