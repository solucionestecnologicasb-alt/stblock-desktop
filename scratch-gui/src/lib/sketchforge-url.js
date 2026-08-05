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
export const STBLOCK_SKETCHFORGE_URL = isTauriBundled()
  ? './sketchforge/?theme=light'        // exe nativo (static export empaquetado)
  : 'http://localhost:3000/?theme=light'; // dev (Next dev server)
