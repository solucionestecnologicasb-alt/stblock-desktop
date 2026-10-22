// URL de SketchForge 3D embebido en la pestaña "Diseño 3D" de STBlock.
// Por defecto carga el static export empaquetado en /sketchforge/ (mismo origen que STBlock).
// Para desarrollo en caliente en el Next dev server (:3000), usar ?dev_sketchforge=1 o localStorage.setItem('stblock_use_dev_sketchforge', 'true').
function shouldUseDevServer() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev_sketchforge') === 'true' || params.get('dev_sketchforge') === '1') return true;
    if (window.localStorage && window.localStorage.getItem('stblock_use_dev_sketchforge') === 'true') return true;
  } catch (_) {}
  return false;
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
  return (typeof window !== 'undefined' && window.location.origin) ? (window.location.origin + '/') : './';
}

import {isMobileDevice} from './device-detector';

function getInitialSketchforgeUrl() {
  let base = shouldUseDevServer()
    ? 'http://localhost:3000/?theme=light'
    : getEditorBaseUrl() + 'sketchforge/index.html?theme=light';
  if (isMobileDevice()) {
    base += (base.includes('?') ? '&' : '?') + 'mobile=1';
  }
  return base;
}

export const STBLOCK_SKETCHFORGE_URL = getInitialSketchforgeUrl();

