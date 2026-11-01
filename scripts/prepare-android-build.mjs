import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { patchSketchforgeDirectory } from "./patch-sketchforge-relative.mjs";

const rootDir = resolve(process.cwd());
const sourceDir = resolve(rootDir, "scratch-gui/build");
const targetDir = resolve(rootDir, "scratch-gui/build-android");
const assetPackDir = resolve(rootDir, "src-tauri/gen/android/models3d_pack/src/main/assets");
const androidAppDir = resolve(rootDir, "src-tauri/gen/android/app");
const includeStaticInBaseForLocalApk = process.env.STBLOCK_ANDROID_TEST_APK === "1";

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

// 5. En AAB los estáticos van por PAD. En el APK local de QA se dejan en
// el módulo base, porque assemble APK no instala los asset packs del AAB.
console.log(includeStaticInBaseForLocalApk
  ? "[prepare-android-build] [3/5] Conservando static/ en el APK local de QA..."
  : "[prepare-android-build] [3/5] Trasladando static/ completo al pack install-time...");
const staticDir = join(targetDir, "static");
let movedStaticBytes = 0;
let movedStaticFiles = 0;
if (existsSync(staticDir)) {
  async function countFiles(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) await countFiles(fullPath);
      else {
        movedStaticFiles += 1;
        movedStaticBytes += (await stat(fullPath)).size;
      }
    }
  }
  await countFiles(staticDir);
  if (includeStaticInBaseForLocalApk) {
    // Keep the install-time asset pack empty; the WebView loads these files
    // from the APK's regular assets during local QA.
  } else {
    await cp(staticDir, join(assetPackDir, "static"), { recursive: true, force: true });
    await rm(staticDir, { recursive: true, force: true });
  }
}
console.log(includeStaticInBaseForLocalApk
  ? `[prepare-android-build] -> ${movedStaticFiles} archivos (${(movedStaticBytes / 1024 / 1024).toFixed(2)} MB) incluidos en el APK local.`
  : `[prepare-android-build] -> ${movedStaticFiles} archivos (${(movedStaticBytes / 1024 / 1024).toFixed(2)} MB) entregados por PAD.`);

// Preparar el puente PAD y parchear las clases Android generadas por Tauri.
const mainActivityPath = join(androidAppDir, "src", "main", "java", "stblock", "app", "MainActivity.kt");
const gradlePath = join(androidAppDir, "build.gradle.kts");
const padHelperTemplate = join(rootDir, "scripts", "PadAssetDelivery.kt.template");
if (existsSync(mainActivityPath) && existsSync(gradlePath) && existsSync(padHelperTemplate)) {
  const helperPath = join(androidAppDir, "src", "main", "java", "stblock", "app", "PadAssetDelivery.kt");
  await mkdir(resolve(helperPath, ".."), { recursive: true });
  await writeFile(helperPath, await readFile(padHelperTemplate, "utf8"));

  let mainActivity = await readFile(mainActivityPath, "utf8");
  if (!mainActivity.includes("PadAssetDelivery.initialize(this)")) {
    const anchor = "    this.appWebView = webView";
    if (!mainActivity.includes(anchor)) throw new Error("No se encontró el punto de integración MainActivity.onWebViewCreate.");
    mainActivity = mainActivity.replace(anchor, `${anchor}\n    PadAssetDelivery.initialize(this)`);
    await writeFile(mainActivityPath, mainActivity);
  }

  // Tauri may regenerate these Android sources before every build. Keep the
  // native orientation bridge in this preparation step so the patch survives.
  if (!mainActivity.includes("fun setOrientation(value: String)")) {
    mainActivity = mainActivity.replace(
      "import android.content.Intent",
      "import android.content.Intent\nimport android.content.pm.ActivityInfo"
    );
    const bridgeAnchor = "  fun isAndroid(): Boolean = true";
    if (!mainActivity.includes(bridgeAnchor)) throw new Error("No se encontró AndroidBridge.isAndroid.");
    mainActivity = mainActivity.replace(
      bridgeAnchor,
      `${bridgeAnchor}\n\n  @JavascriptInterface\n  fun setOrientation(value: String) {\n    activity.runOnUiThread {\n      activity.requestedOrientation = if (value.equals("landscape", ignoreCase = true)) {\n        ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE\n      } else {\n        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT\n      }\n    }\n  }`
    );
    await writeFile(mainActivityPath, mainActivity);
  }

  let gradle = await readFile(gradlePath, "utf8");
  if (!gradle.includes("com.google.android.play:asset-delivery:")) {
    const anchor = 'dependencies {';
    if (!gradle.includes(anchor)) throw new Error("No se encontró el bloque dependencies de Android.");
    gradle = gradle.replace(anchor, `${anchor}\n    implementation("com.google.android.play:asset-delivery:2.3.0")`);
    await writeFile(gradlePath, gradle);
  }

  const rustClientPath = join(androidAppDir, "src", "main", "java", "stblock", "app", "generated", "RustWebViewClient.kt");
  if (existsSync(rustClientPath)) {
    let rustClient = await readFile(rustClientPath, "utf8");
    const injection = "        PadAssetDelivery.intercept(request)?.let { return it }\n";
    const anchor = "        lastInterceptedUrl = request.url\n";
    if (!rustClient.includes("PadAssetDelivery.intercept(request)")) {
      if (!rustClient.includes(anchor)) throw new Error("No se encontró el punto de interceptación de recursos en RustWebViewClient.");
      rustClient = rustClient.replace(anchor, injection + anchor);
      await writeFile(rustClientPath, rustClient);
    }
  } else {
    throw new Error(`No se encontró el cliente WebView de Tauri: ${rustClientPath}`);
  }
} else {
  throw new Error("No se pudo preparar PAD: faltan archivos del proyecto Android generado o el template PadAssetDelivery.kt.template.");
}

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
console.log(`[prepare-android-build] Módulo Base (Rust/UI): ${(baseBundleSize / 1024 / 1024).toFixed(2)} MB (Límite Google Play: 500 MB comprimidos)`);
console.log(`[prepare-android-build] Asset Pack (PAD):       ${(assetPackSize / 1024 / 1024).toFixed(2)} MB (Límite Google Play: 1536 MB comprimidos por pack)`);
console.log("[prepare-android-build] Play Asset Delivery preparado con éxito.");
console.log("[prepare-android-build] ===============================================");
