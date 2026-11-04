import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { patchSketchforgeDirectory } from "./patch-sketchforge-relative.mjs";
import { transpileChrome68 } from "./transpile-chrome68.mjs";

const rootDir = resolve(process.cwd());
const sourceDir = resolve(rootDir, "scratch-gui/build");
const targetDir = resolve(rootDir, "scratch-gui/build-android");
const androidRootDir = resolve(rootDir, "src-tauri/gen/android");
const assetPackModuleDir = resolve(androidRootDir, "models3d_pack");
const assetPackDir = resolve(assetPackModuleDir, "src/main/assets");
const androidAppDir = resolve(androidRootDir, "app");
const includeStaticInBaseForLocalApk = process.env.STBLOCK_ANDROID_TEST_APK === "1";
// El panel de diagnóstico es exclusivo de builds de prueba. En una compilación
// normal (Play) la variable no existe y no se inyecta nada.
const diagnosticsEnabled = process.env.STBLOCK_ANDROID_DIAG === "1";

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

// `src-tauri/gen` is not versioned: a clean checkout or CI regenerates it with
// `tauri android init`, which knows nothing about our Play Asset Delivery
// module. Recreate the module wiring every build so the AAB can never ship
// without the install-time pack.
async function ensureAssetPackModule() {
  const packGradlePath = join(assetPackModuleDir, "build.gradle.kts");
  const packGradle = `plugins {
    id("com.android.asset-pack")
}

assetPack {
    packName.set("models3d_pack")
    dynamicDelivery {
        deliveryType.set("install-time")
    }
}
`;
  const currentPackGradle = existsSync(packGradlePath) ? await readFile(packGradlePath, "utf8") : null;
  if (currentPackGradle !== packGradle) {
    await writeFile(packGradlePath, packGradle);
    console.log("[prepare-android-build] Creamos models3d_pack/build.gradle.kts (install-time).");
  }

  const settingsPath = [join(androidRootDir, "settings.gradle"), join(androidRootDir, "settings.gradle.kts")]
    .find(candidate => existsSync(candidate));
  if (!settingsPath) {
    throw new Error("No se encontró settings.gradle en el proyecto Android generado.");
  }
  const isKts = settingsPath.endsWith(".kts");
  const includeLine = isKts ? 'include(":models3d_pack")' : "include ':models3d_pack'";
  const includePattern = isKts
    ? /include\s*\(\s*":models3d_pack"\s*\)/
    : /include\s*\(?\s*':models3d_pack'\s*\)?/;
  let settings = await readFile(settingsPath, "utf8");
  if (!includePattern.test(settings)) {
    settings = `${settings.trimEnd()}\n${includeLine}\n`;
    await writeFile(settingsPath, settings);
    console.log(`[prepare-android-build] Añadimos ':models3d_pack' a ${settingsPath.endsWith('.kts') ? 'settings.gradle.kts' : 'settings.gradle'}.`);
  }

  const appGradlePath = join(androidAppDir, "build.gradle.kts");
  let appGradle = await readFile(appGradlePath, "utf8");
  const assetPacksLine = 'assetPacks += listOf(":models3d_pack")';
  if (!appGradle.includes(assetPacksLine)) {
    const anchor = 'namespace = "stblock.app"';
    if (!appGradle.includes(anchor)) {
      throw new Error("No se encontró el namespace de la app Android para declarar el asset pack.");
    }
    appGradle = appGradle.replace(anchor, `${anchor}\n    ${assetPacksLine}`);
    await writeFile(appGradlePath, appGradle);
    console.log("[prepare-android-build] Declaramos ':models3d_pack' en app/build.gradle.kts.");
  }
}

// Los modelos .glb ya están comprimidos internamente; si Gradle los vuelve a
// comprimir en el APK, assets.openFd() no puede dar offset/length y el WebView
// tiene que descomprimir 28 MB en memoria antes de entregarlos al canvas 3D.
async function ensureUncompressedAssets() {
  const gradlePath = join(androidAppDir, "build.gradle.kts");
  let gradle = await readFile(gradlePath, "utf8");
  const extensions = 'listOf("glb", "gltf", "bin", "wasm", "html")';
  const block = `    androidResources {\n        noCompress += ${extensions}\n    }`;
  if (gradle.includes(`noCompress += ${extensions}`)) return;
  const existing = gradle.match(/\n    androidResources \{\n        noCompress \+= listOf\([^)]*\)\n    \}/);
  if (existing) {
    gradle = gradle.replace(existing[0], `\n${block}`);
  } else {
    const anchor = '    namespace = "stblock.app"';
    if (!gradle.includes(anchor)) {
      throw new Error("No se encontró el namespace de la app Android para configurar noCompress.");
    }
    gradle = gradle.replace(anchor, `${anchor}\n${block}`);
  }
  await writeFile(gradlePath, gradle);
  console.log("[prepare-android-build] Configuramos noCompress para modelos, WASM y HTML (assets del APK).");
}

await ensureAssetPackModule();
await ensureUncompressedAssets();

// 2. Compatibilidad de los iframes con el WebView Chrome 68. `build:gui` y
// `build:sketchforge` ya lo ejecutan, pero `tauri android build` puede correr
// sin ellos; la marca `/*stblock-chrome68*/` hace que sea idempotente.
console.log("[prepare-android-build] [1/5] Aplicando compatibilidad Chrome 68 a los iframes...");
await transpileChrome68(sourceDir);

// 3. Copiar todo el build base
console.log("[prepare-android-build] Copiando archivos base a build-android...");
await cp(sourceDir, targetDir, { recursive: true, force: true });

// 3b. Panel de diagnóstico (exclusivo de builds de prueba). Se inyecta antes
// de mover static/ al asset pack para que también viaje dentro del pack.
async function listHtmlFiles(directory, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await listHtmlFiles(fullPath, result);
    } else if (extname(entry.name).toLowerCase() === ".html") {
      result.push(fullPath);
    }
  }
  return result;
}

async function injectDiagnostics() {
  const version = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8")).version;
  const scriptSource = (await readFile(join(rootDir, "scripts", "stblock-diag.js"), "utf8"))
    .split("__STBLOCK_DIAG_VERSION__").join(version);

  const pages = new Set();
  const addPage = page => { if (existsSync(page)) pages.add(page); };

  addPage(join(targetDir, "index.html"));
  addPage(join(targetDir, "sketchforge", "index.html"));
  addPage(join(targetDir, "sketchforge", "404.html"));
  addPage(join(targetDir, "sketchforge", "404", "index.html"));
  for (const dirRel of ["static/electronics-lab", "static/gears", "static/scratchjr"]) {
    for (const page of await listHtmlFiles(join(targetDir, dirRel))) addPage(page);
  }

  const writtenDirs = new Set();
  for (const page of pages) {
    const directory = dirname(page);
    if (!writtenDirs.has(directory)) {
      await writeFile(join(directory, "stblock-diag.js"), scriptSource);
      writtenDirs.add(directory);
    }
    let html = await readFile(page, "utf8");
    if (html.includes("data-stblock-diag")) continue;
    const tag = '<script data-stblock-diag charset="utf-8" src="stblock-diag.js"></script>';
    const headMatch = html.match(/<head[^>]*>/i);
    html = headMatch ? html.replace(headMatch[0], headMatch[0] + tag) : tag + html;
    await writeFile(page, html);
  }
  console.log(`[prepare-android-build] [DIAG] Panel de diagnóstico inyectado en ${pages.size} páginas (${writtenDirs.size} copias).`);
}

if (diagnosticsEnabled) {
  await injectDiagnostics();
}

// 4. Excluir directorios y archivos no aplicables en Android
console.log("[prepare-android-build] [2/5] Poda de archivos desktop y residuales...");
// blockly-9.0.0 NO se puede podar: js/blockly.js del simulador lo usa como
// ruta de media y carga dinámicamente blockly-9.0.0/msg/js/<idioma>.js; si ese
// script falta, la cadena loadCustomBlocks -> loadToolBox -> Blockly.inject
// nunca corre y el simulador se queda sin bloques ni categorías.
const directoriesToRemove = [
  join("static", "drivers"),
  join("static", "electronics-lab", "temp_inspect"),
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

// eecircuit-engine-Cgw6G0Yl.js NO se elimina: ngspice.worker lo importa
// dinámicamente para la simulación SPICE. Sin él el circuito 3D abre pero la
// simulación del worker falla.
const specificFilesToRemove = [
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
  ? "[prepare-android-build] [3/5] Copiando static/ a los assets del APK local de QA..."
  : "[prepare-android-build] [3/5] Trasladando static/ completo al pack install-time...");
const staticDir = join(targetDir, "static");
const apkAssetsDir = join(androidAppDir, "src", "main", "assets");
const apkStaticDir = join(apkAssetsDir, "static");
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
    // El APK de QA no instala el asset pack, pero debe servir static/ igual que
    // producción: desde assets del APK con PadAssetDelivery.intercept. Si se
    // deja dentro del binario Rust, el asset resolver interno de Tauri sirve
    // los /static/* y en Chrome 68 los modelos GLB grandes fallan con
    // "Failed to fetch" y el iframe de Kids se queda en about:blank.
    await rm(apkStaticDir, { recursive: true, force: true });
    await mkdir(apkAssetsDir, { recursive: true });
    await cp(staticDir, apkStaticDir, { recursive: true, force: true });
    await rm(staticDir, { recursive: true, force: true });
  } else {
    // Un APK de QA anterior copió static/ (con el panel de diagnóstico) a
    // app/src/main/assets. Si no se borra, Gradle lo mete en el módulo base
    // del AAB y este acabaría duplicando cientos de MB y llevando el
    // diagnóstico a producción. En AAB los estáticos sólo van por PAD.
    if (existsSync(apkStaticDir)) {
      await rm(apkStaticDir, { recursive: true, force: true });
      console.log("[prepare-android-build] Eliminados los assets/static de pruebas anteriores del módulo base.");
    }
    await cp(staticDir, join(assetPackDir, "static"), { recursive: true, force: true });
    await rm(staticDir, { recursive: true, force: true });
  }
}
console.log(includeStaticInBaseForLocalApk
  ? `[prepare-android-build] -> ${movedStaticFiles} archivos (${(movedStaticBytes / 1024 / 1024).toFixed(2)} MB) copiados a assets del APK local (servidos por PadAssetDelivery).`
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
      `${bridgeAnchor}\n\n  @JavascriptInterface\n  fun setOrientation(value: String) {\n    activity.runOnUiThread {\n      // ChromeOS letterboxes (phone-shaped window) any ARC++ activity that\n      // pins an orientation, so Chromebooks keep UNSPECIFIED and stay freely\n      // resizable.\n      if (activity.isChromebook()) {\n        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED\n        return@runOnUiThread\n      }\n      activity.requestedOrientation = if (value.equals("landscape", ignoreCase = true)) {\n        ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE\n      } else {\n        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT\n      }\n    }\n  }`
    );
    await writeFile(mainActivityPath, mainActivity);
  }

  if (!mainActivity.includes("fun writeDebugLog(message: String)")) {
    const bridgeAnchor = "  fun isAndroid(): Boolean = true";
    if (!mainActivity.includes(bridgeAnchor)) throw new Error("No se encontró AndroidBridge.isAndroid para instalar el registro de diagnóstico.");
    mainActivity = mainActivity.replace(
      bridgeAnchor,
      `${bridgeAnchor}\n\n  @JavascriptInterface\n  fun writeDebugLog(message: String) {\n    PadAssetDelivery.record("js", message)\n  }`
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

  // Canonicalize this generated Gradle tail on every run. Tauri invokes the
  // preparation command once per ABI, so appending conditionally can still
  // leave duplicate task declarations in the generated project.
  const tauriApplyAnchor = 'apply(from = "tauri.build.gradle.kts")';
  const tauriApplyIndex = gradle.indexOf(tauriApplyAnchor);
  if (tauriApplyIndex < 0) throw new Error("No se encontró la inclusión de tauri.build.gradle.kts.");
  const gradleHook = `

// Install-time Play Asset Delivery interception for /static/* resources.
fun registerPadWebViewPatch(taskName: String, buildType: String) {
  tasks.register(taskName) {
    doLast {
        val client = file("src/main/java/stblock/app/generated/RustWebViewClient.kt")
        if (!client.exists()) throw GradleException("RustWebViewClient.kt was not generated")
        val anchor = "        lastInterceptedUrl = request.url\\n"
        val injection = "        PadAssetDelivery.intercept(request)?.let { return it }\\n"
        val source = client.readText()
        if (!source.contains("PadAssetDelivery.intercept(request)")) {
            if (!source.contains(anchor)) throw GradleException("RustWebViewClient interception anchor not found")
            var patched = source.replace(anchor, injection + anchor)
            patched = patched.replace("        currentUrl = url\\n", "        currentUrl = url\\n        PadAssetDelivery.record(\\"page-start\\", url)\\n")
            patched = patched.replace("    override fun onPageFinished(view: WebView, url: String) {\\n", "    override fun onPageFinished(view: WebView, url: String) {\\n        PadAssetDelivery.record(\\"page-finished\\", url)\\n        PadAssetDelivery.installDiagnostics(view)\\n")
            patched = patched.replace("    override fun onReceivedError(\\n", "    override fun onReceivedError(\\n")
            patched = patched.replace("        // we get a net::ERR_CONNECTION_REFUSED", "        PadAssetDelivery.record(\\"web-error\\", \\"url=\\" + request.url + \\" code=\\" + error.errorCode + \\" description=\\" + error.description + \\" mainFrame=\\" + request.isForMainFrame)\\n        // we get a net::ERR_CONNECTION_REFUSED")
            client.writeText(patched)
        }
    }
    dependsOn(tasks.matching { it.name.startsWith("rustBuild") && it.name.endsWith(buildType) })
  }
}
registerPadWebViewPatch("patchPadWebViewClientDebug", "Debug")
registerPadWebViewPatch("patchPadWebViewClientRelease", "Release")
tasks.matching { it.name.startsWith("compile") && it.name.endsWith("Kotlin") }.configureEach {
    val buildType = if (name.endsWith("DebugKotlin")) "Debug" else "Release"
    dependsOn("patchPadWebViewClient$buildType")
    mustRunAfter(tasks.matching { rustTask -> rustTask.name.startsWith("rustBuild") && rustTask.name.endsWith(buildType) })
}
`;
  gradle = `${gradle.slice(0, tauriApplyIndex + tauriApplyAnchor.length)}${gradleHook}`;
  await writeFile(gradlePath, gradle);

  const rustClientPath = join(androidAppDir, "src", "main", "java", "stblock", "app", "generated", "RustWebViewClient.kt");
  if (existsSync(rustClientPath)) {
    let rustClient = await readFile(rustClientPath, "utf8");
    const injection = "        PadAssetDelivery.intercept(request)?.let { return it }\n";
    const anchor = "        lastInterceptedUrl = request.url\n";
    if (!rustClient.includes("PadAssetDelivery.intercept(request)")) {
      if (!rustClient.includes(anchor)) throw new Error("No se encontró el punto de interceptación de recursos en RustWebViewClient.");
      rustClient = rustClient.replace(anchor, injection + anchor);
    }
    rustClient = rustClient.replace("        currentUrl = url\n", "        currentUrl = url\n        PadAssetDelivery.record(\"page-start\", url)\n");
    rustClient = rustClient.replace("    override fun onPageFinished(view: WebView, url: String) {\n", "    override fun onPageFinished(view: WebView, url: String) {\n        PadAssetDelivery.record(\"page-finished\", url)\n        PadAssetDelivery.installDiagnostics(view)\n");
    rustClient = rustClient.replace("        // we get a net::ERR_CONNECTION_REFUSED", "        PadAssetDelivery.record(\"web-error\", \"url=\" + request.url + \" code=\" + error.errorCode + \" description=\" + error.description + \" mainFrame=\" + request.isForMainFrame)\n        // we get a net::ERR_CONNECTION_REFUSED");
    if (!rustClient.includes("PadAssetDelivery.record(\"web-error\"")) {
      throw new Error("No se encontró el punto para registrar errores de recursos en RustWebViewClient.");
    }
    await writeFile(rustClientPath, rustClient);
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
console.log(`[prepare-android-build] Módulo Base (Rust/UI): ${(baseBundleSize / 1024 / 1024).toFixed(2)} MB (Límite Google Play: 200 MB de descarga comprimida del módulo base)`);
console.log(`[prepare-android-build] Asset Pack (PAD):       ${(assetPackSize / 1024 / 1024).toFixed(2)} MB (Límite Google Play: 1.5 GB por pack install-time; 4 GB en total)`);
console.log("[prepare-android-build] Play Asset Delivery preparado con éxito.");
console.log("[prepare-android-build] ===============================================");
