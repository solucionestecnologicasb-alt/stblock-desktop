// Copia el static export de SketchForge dentro del build de scratch-gui
// (scratch-gui/build/sketchforge/), para que Tauri lo empaquete en el .exe.
// Debe ejecutarse DESPUES de `pnpm --filter scratch-gui build`, porque ese build
// hace `clean` y borra scratch-gui/build/.
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "sketchforge", "apps", "web", ".next-export");
const destRoot = join(root, "scratch-gui", "build", "sketchforge");

if (!existsSync(srcRoot)) {
  console.error(`[copy-sketchforge-to-build] Export no encontrado en ${srcRoot}. Ejecuta \`pnpm run build:sketchforge\` primero.`);
  process.exit(1);
}

const srcIndexHtml = join(srcRoot, "index.html");
if (!existsSync(srcIndexHtml)) {
  console.error(`[copy-sketchforge-to-build] No existe index.html en ${srcRoot}. ¿Falló el export de SketchForge?`);
  process.exit(1);
}

await rm(destRoot, { recursive: true, force: true });
await mkdir(destRoot, { recursive: true });
await cp(srcRoot, destRoot, { recursive: true, force: true });

// Omitir de forma defensiva el subtree muerto assets/occt (22 MB, sin referencias).
await rm(join(destRoot, "assets", "occt"), { recursive: true, force: true });

const destIndexHtml = join(destRoot, "index.html");
if (!existsSync(destIndexHtml)) {
  console.error(`[copy-sketchforge-to-build] Falla al copiar index.html en ${destRoot}.`);
  process.exit(1);
}

console.log(`[copy-sketchforge-to-build] Export de SketchForge copiado en ${destRoot}.`);
