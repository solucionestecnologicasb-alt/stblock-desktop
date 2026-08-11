// URL de SketchForge 3D embebido en la pestaña "Diseño 3D" de STBlock.
// En el exe nativo (Tauri) se sirve el static export empaquetado en /sketchforge/.
// En dev se usa el Next dev server de SketchForge en :3000.
// Sin `?editor=1`: aterriza en el home (dashboard). `?theme=light` fuerza tema claro.
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

function getEditorBaseUrl() {
  if (typeof document === 'undefined') return './';
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].src;
    if (src && src.indexOf('gui.js') !== -1) {
      return src.substring(0, src.lastIndexOf('/') + 1);
    }
  }
  return './';
}

export const STBLOCK_SKETCHFORGE_URL = isLocalDev()
  ? 'http://localhost:3000/?theme=light'
  : getEditorBaseUrl() + 'sketchforge/?theme=light';
