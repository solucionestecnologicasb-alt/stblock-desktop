/**
 * Disables pinch-to-zoom gestures on touchscreens, trackpads, and keyboards.
 * Specifically handles multi-touch gestures on Linux WebKitGTK, Windows WebView2,
 * and browsers without affecting single-finger touch interactions like dragging blocks.
 */
export const disablePinchZoom = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Prevent multi-touch gesture events (Safari / WebKitGTK)
    const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'];
    gestureEvents.forEach(eventType => {
        window.addEventListener(
            eventType,
            e => {
                if (e.cancelable) {
                    e.preventDefault();
                }
            },
            { passive: false, capture: true }
        );
    });

    // Prevent multi-touch touchstart (2 or more fingers initiating pinch)
    window.addEventListener(
        'touchstart',
        e => {
            if (e.touches && e.touches.length > 1) {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        },
        { passive: false, capture: true }
    );

    // Prevent multi-touch touchmove (2 or more fingers moving to zoom)
    window.addEventListener(
        'touchmove',
        e => {
            if (e.touches && e.touches.length > 1) {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        },
        { passive: false, capture: true }
    );

    // Prevent trackpad pinch-to-zoom (emitted as Ctrl + Wheel)
    window.addEventListener(
        'wheel',
        e => {
            if (e.ctrlKey) {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        },
        { passive: false, capture: true }
    );

    // Prevent keyboard zoom shortcuts (Ctrl + '+', '-', '=', '0')
    window.addEventListener(
        'keydown',
        e => {
            if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
                e.preventDefault();
            }
        },
        { capture: true }
    );
};

export default disablePinchZoom;
