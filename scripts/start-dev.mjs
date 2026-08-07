// Lanza los servidores de desarrollo de STBlock como procesos hijos:
//   - scratch-gui (webpack dev server) en http://localhost:8601
//   - sketchforge (Next dev server) en http://localhost:3000
// Reemplaza el beforeDevCommand de un solo server en tauri.conf.json.
import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

// Comandos completos: con `shell: true` se evita pasar un array de args (Node
// emite DEP0190 con args+shell). Los comandos son constantes, sin input del
// usuario, por lo que no hay riesgo de inyección.
const servers = [
  { name: "scratch-gui", command: "pnpm --filter scratch-gui start", port: 8601 },
  { name: "sketchforge", command: "pnpm --filter sketchforge dev", port: 3000 },
];

const children = [];

// Detiene backends STBlock que quedaron vivos de una sesión anterior.
// Al cerrar tauri dev con Ctrl+C o taskkill, `kill_all_backends` (Rust) no
// siempre corre, y los procesos `compile-proxy.exe` / `stblock-backend-server.exe`
// sobreviven apuntando a `src-tauri/backends/`. Si un build posterior intenta leer
// esos archivos (tauri_build los lee como recursos) falla con "os error 32":
//   El proceso no tiene acceso al archivo porque está siendo utilizado por otro proceso.
// Estos nombres de proceso son exclusivos de STBlock, así que no hay riesgo de
// matar procesos ajenos.
function killStBlockBackends() {
  if (isWindows) {
    try {
      spawnSync("taskkill", ["/F", "/T", "/IM", "compile-proxy.exe"], { stdio: "ignore" });
      spawnSync("taskkill", ["/F", "/T", "/IM", "stblock-backend-server.exe"], { stdio: "ignore" });
      console.log("[start-dev] Backends STBlock anteriores detenidos (evita lock de archivos).");
    } catch {
      // si ya no existen, no pasa nada
    }
  } else {
    try { spawnSync("pkill", ["-f", "compile-proxy"]); } catch {}
    try { spawnSync("pkill", ["-f", "stblock-backend-server"]); } catch {}
  }
}

// Libera el puerto antes de arrancar cada server. Previene el escenario en que
// un dev server colgado de una sesión anterior deja el puerto ocupado y el
// nuevo no puede bindearlo (el iframe de SketchForge apunta fijo a :3000).
function freePort(port) {
  let pids = [];
  if (isWindows) {
    try {
      const out = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
      const re = new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`);
      for (const line of out.stdout.split("\n")) {
        const m = line.match(re);
        if (m) pids.push(m[1]);
      }
    } catch {
      return;
    }
  } else {
    try {
      const out = spawnSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" });
      pids = out.stdout.split("\n").filter(Boolean);
    } catch {
      return;
    }
  }
  for (const pid of new Set(pids)) {
    console.log(`[start-dev] Puerto ${port} ocupado por PID ${pid}; liberando.`);
    try {
      if (isWindows) {
        spawnSync("taskkill", ["/pid", pid, "/T", "/F"], { stdio: "ignore" });
      } else {
        process.kill(Number(pid), "SIGTERM");
      }
    } catch {
      // si ya no existe, no pasa nada
    }
  }
}

function killTree(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  if (isWindows) {
    try {
      // taskkill /T /F derriba también el árbol de procesos (webpack/next hijos).
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      child.kill();
    }
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill();
    }
  }
}

function shutdown(code) {
  for (const child of children) killTree(child);
  process.exit(code);
}

// Limpia backends huérfanos ANTES de que cargo/tauri_build intente leer los
// recursos `src-tauri/backends/*` (os error 32 si un proxy viejo los mantiene).
killStBlockBackends();

for (const { name, command, port } of servers) {
  if (port) freePort(port);
  const child = spawn(command, { stdio: "inherit", shell: true });
  children.push(child);
  child.on("error", (err) => {
    console.error(`[start-dev] ${name} no pudo iniciar: ${err.message}`);
    shutdown(1);
  });
  child.on("exit", (code) => {
    console.error(`[start-dev] ${name} terminó (code ${code}). Deteniendo los demás servidores.`);
    shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[start-dev] Lanzando servidores de desarrollo:");
console.log("  - STBlock GUI  -> http://localhost:8601");
console.log("  - SketchForge  -> http://localhost:3000");
