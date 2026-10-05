// Copia el build de Electronics Lab (dist/) a scratch-gui/static/electronics-lab/
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = "C:\\Users\\bello\\OneDrive\\Desktop\\prueba\\electronics-lab\\dist";
const destRoot = join(root, "scratch-gui", "static", "electronics-lab");

if (!existsSync(srcRoot)) {
  console.error(`[copy-electronics-lab] Build no encontrado en ${srcRoot}. Ejecuta 'npm run build' en electronics-lab.`);
  process.exit(1);
}

await rm(destRoot, { recursive: true, force: true });
await mkdir(destRoot, { recursive: true });
await cp(srcRoot, destRoot, { recursive: true, force: true });

console.log(`[copy-electronics-lab] Electronics Lab copiado exitosamente en ${destRoot}`);
