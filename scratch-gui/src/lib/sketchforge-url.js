// URL de SketchForge 3D embebido en la pestaña "Diseño 3D" de STBlock.
// En el exe nativo (Tauri) se sirve el static export empaquetado en /sketchforge/.
// En dev se usa el Next dev server de SketchForge en :3000.
// Sin `?editor=1`: aterriza en el home (dashboard). `?theme=light` fuerza tema claro.
function isTauriBundled() {
  return typeof window !== 'undefined' && (
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost'
  );
}

function isLocalDev() {
  if (typeof window === 'undefined') return false;
  // Si estamos en el puerto de desarrollo de scratch-gui (8601) o en el puerto del Next dev server (3000)
  return (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  ) && (
    window.location.port === '8601' || 
    window.location.port === '3000'
  );
}

export const STBLOCK_SKETCHFORGE_URL = (isTauriBundled() || !isLocalDev())
  ? './sketchforge/?theme=light'        // exe nativo o despliegue web de producción (WordPress)
  : 'http://localhost:3000/?theme=light'; // dev (Next dev server)
