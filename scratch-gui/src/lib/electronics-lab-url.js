/**
 * URL de Electronics Lab 3D embebido en la pestaña "Circuito 3D" de STBlock.
 * Por defecto carga la versión sincronizada en static/electronics-lab/index.html (mismo origen que STBlock).
 * Para desarrollo con HMR en caliente en Vite (:5173), usar ?dev3d=1 en la URL o localStorage.setItem('stblock_use_dev_3d', 'true').
 */

/**
 * Determina si se debe usar el servidor de desarrollo Vite (:5173).
 * @returns {boolean}
 */
const shouldUseDevServer = () => {
    if (typeof window === 'undefined') return false;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('dev3d') === 'true' || params.get('dev3d') === '1') return true;
        if (params.get('static3d') === 'true' || params.get('static3d') === '1') return false;
        if (window.localStorage && window.localStorage.getItem('stblock_use_dev_3d') === 'true') return true;
    } catch (_) {}
    return false;
};

/**
 * Determina si el entorno actual es de desarrollo local.
 * @returns {boolean} true si se ejecuta en localhost
 */
const isLocalDev = () => {
    if (typeof window === 'undefined') return false;
    return (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    ) && (
        window.location.port === '8601' ||
        window.location.port === '3000' ||
        window.location.port === '5173'
    );
};

/**
 * Obtiene la URL base del editor detectando el script gui.js.
 * @returns {string} Ruta base relativa
 */
const getEditorBaseUrl = () => {
    if (typeof document === 'undefined') return './';
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.indexOf('gui.js') !== -1) {
            return src.substring(0, src.lastIndexOf('/') + 1);
        }
    }
    return './';
};

/**
 * URL del servidor Vite en desarrollo.
 * @returns {string} URL dev
 */
const getElectronicsLabDevUrl = () => 'http://localhost:5173/';

/**
 * URL de los archivos estáticos empaquetados y sincronizados.
 * @returns {string} URL estática
 */
const getElectronicsLabStaticUrl = () => `${getEditorBaseUrl()}static/electronics-lab/index.html`;

const STBLOCK_ELECTRONICS_LAB_URL = shouldUseDevServer() ?
    getElectronicsLabDevUrl() :
    getElectronicsLabStaticUrl();

export {
    isLocalDev,
    shouldUseDevServer,
    getEditorBaseUrl,
    getElectronicsLabDevUrl,
    getElectronicsLabStaticUrl,
    STBLOCK_ELECTRONICS_LAB_URL
};

