// URL de SketchForge 3D embebido en la pestaña "Diseño 3D" de STBlock.
// En tauri dev usa Next (:3000), iniciado por dev:servers, para mostrar los cambios del editor.
// Las aplicaciones empaquetadas y la web usan el static export del mismo origen.
function shouldUseDevServer() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('dev_sketchforge');
    if (requested === 'true' || requested === '1') return true;
    if (requested === 'false' || requested === '0') return false;
    const stored = window.localStorage && window.localStorage.getItem('stblock_use_dev_sketchforge');
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch (_) {}
  return process.env.NODE_ENV === 'development' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) &&
    window.location.port === '8601';
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

