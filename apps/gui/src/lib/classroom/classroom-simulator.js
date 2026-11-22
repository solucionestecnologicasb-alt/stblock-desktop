/**
 * STBlock - Modo Aula
 * Simulador de doble PC (solo para desarrollo/pruebas).
 *
 * Abre, desde la ventana del servidor, una segunda ventana Tauri que se une a
 * la misma sesión como un cliente real: mismo relay Rust, mismo protocolo,
 * mismo WebSocket. Cada ventana es un renderer separado con su propio VM y su
 * propio ClassroomController, por lo que el flujo es idéntico a un segundo PC
 * físico conectándose a la red.
 *
 * ADVERTENCIA: poner CLASSROOM_SIMULATOR_ENABLED a false antes de lanzar la
 * versión definitiva. Esta herramienta solo debe existir en builds de prueba.
 */

// Bandera de activación del simulador.
export const CLASSROOM_SIMULATOR_ENABLED = process.env.NODE_ENV === 'development';

// Parámetro de URL que indica a la ventana hija que debe unirse a una sesión.
export const SIMULATOR_PARAM = 'classroomClient';

// Nombre con el que se presenta la ventana simulada en el directorio.
export const SIMULATOR_DEFAULT_NAME = 'PC-2 (simulada)';

/**
 * Determina si el simulador puede usarse en este entorno.
 * Requiere escritorio (Tauri) y la bandera activa.
 * @returns {boolean} true si se puede abrir una ventana simulada
 */
export const isClassroomSimulatorAvailable = function () {
    return CLASSROOM_SIMULATOR_ENABLED &&
        typeof window !== 'undefined' &&
        typeof window.__TAURI__ !== 'undefined' &&
        !!window.__TAURI__.webviewWindow;
};

/**
 * Abre una segunda ventana Tauri simulando un segundo PC que se une a la
 * sesión activa. La ventana hija arranca el mismo bundle con el parámetro
 * classroomClient=1 y se conecta por WebSocket real al relay.
 *
 * @param {object} opts Opciones de la sesión {port, code}
 * @returns {boolean} true si se abrió la ventana
 */
export const openClassroomSimulator = function ({port, code}) {
    if (!isClassroomSimulatorAvailable()) return false;

    // Guardar los datos de unión en localStorage para que la ventana hija los lea
    const joinData = {
        host: '127.0.0.1',
        port: port || 8870,
        code: code,
        name: SIMULATOR_DEFAULT_NAME
    };
    try {
        localStorage.setItem('stblock_classroom_sim_join', JSON.stringify(joinData));
    } catch (e) {
        console.warn('[Classroom] Error guardando joinData en localStorage:', e);
    }

    const query = `${SIMULATOR_PARAM}=1`;
    const label = `classroom-sim-${Date.now()}`;
    try {
        const targetUrl = `${window.location.origin}${window.location.pathname}?${query}`;
        const win = new window.__TAURI__.webviewWindow.WebviewWindow(label, {
            url: targetUrl,
            title: 'PC-2 simulada — Modo Aula',
            width: 1280,
            height: 800,
            center: true,
            resizable: true
        });
        return typeof win === 'object';
    } catch (e) {
        console.warn('[Classroom] Error abriendo simulador:', e);
        return false;
    }
};
