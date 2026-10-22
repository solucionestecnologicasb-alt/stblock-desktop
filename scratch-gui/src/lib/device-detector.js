/**
 * Device and Platform Detection Utility for STBlock
 * Ensures complete, strict isolation between Desktop (Windows/Mac/Linux/Chromebook) and Mobile (Android).
 */

export const isAndroid = () => {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
};

export const isDesktopOS = () => {
    if (typeof window === 'undefined') return true;
    const ua = navigator.userAgent || '';
    // Si contiene Android, iPhone, iPod, Windows Phone, no es desktop
    if (/Android|iPhone|iPod|Windows Phone/i.test(ua)) return false;
    // Si contiene Windows NT, Macintosh, Linux (escritorio), CrOS (Chromebook), es Desktop
    return /Windows NT|Macintosh|Mac OS X|CrOS|Linux/i.test(ua);
};

export const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;

    // 1. Switch explícito para desarrollo y pruebas:
    if (window.location) {
        const search = window.location.search || '';
        // Si se fuerza modo PC expresamente:
        if (search.includes('platform=pc') || search.includes('desktop=1')) {
            return false;
        }
        // Si se fuerza modo móvil expresamente para pruebas en el navegador:
        if (search.includes('simulate_mobile=true') || search.includes('platform=mobile')) {
            return true;
        }
    }

    // 2. Si es un sistema operativo de PC (Windows, Mac, Linux, Chromebook),
    // NUNCA es móvil. En PC siempre se mantiene la versión original de escritorio intacta,
    // independientemente de que la pantalla de la PC sea táctil o de que se redimensione la ventana.
    if (isDesktopOS()) {
        return false;
    }

    // 3. Dispositivos móviles reales (Android / iOS)
    return isAndroid() || /iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};
