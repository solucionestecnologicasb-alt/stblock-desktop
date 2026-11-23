/**
 * Blocks the browser's native pinch-to-zoom / page-zoom gestures.
 *
 * The 3D viewport relies on pointer events for OrbitControls (two-finger
 * pinch + pan). Embedded browsers (WebKitGTK, WebView2, mobile WebViews) can
 * still start their own page zoom from the same touch sequence even when the
 * viewport uses `touch-action: none`, so we cancel the native gesture events.
 *
 * Only multi-touch sequences are cancelled; single-finger interactions such
 * as orbiting, dragging shapes, and tapping keep working. The listener is
 * installed in the capture phase so it also runs when a child element stops
 * propagation. Returns a cleanup function.
 */
export function disableBrowserPinchZoom(): () => void {
  if (typeof window === "undefined") return () => {};

  const preventDefault = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };

  const preventMultiTouch = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      preventDefault(event);
    }
  };

  const preventTrackpadZoom = (event: WheelEvent) => {
    // Trackpad pinch gestures are reported as Ctrl + Wheel.
    if (event.ctrlKey) {
      preventDefault(event);
    }
  };

  const preventKeyboardZoom = (event: KeyboardEvent) => {
    if (event.ctrlKey && (event.key === "+" || event.key === "-" || event.key === "=" || event.key === "0")) {
      event.preventDefault();
    }
  };

  // Safari / WebKitGTK emit dedicated gesture events for pinches.
  const gestureEvents = ["gesturestart", "gesturechange", "gestureend"];

  gestureEvents.forEach((eventType) => {
    window.addEventListener(eventType, preventDefault, { passive: false, capture: true });
  });
  window.addEventListener("touchstart", preventMultiTouch, { passive: false, capture: true });
  window.addEventListener("touchmove", preventMultiTouch, { passive: false, capture: true });
  window.addEventListener("wheel", preventTrackpadZoom, { passive: false, capture: true });
  window.addEventListener("keydown", preventKeyboardZoom, { capture: true });

  return () => {
    gestureEvents.forEach((eventType) => {
      window.removeEventListener(eventType, preventDefault, { capture: true });
    });
    window.removeEventListener("touchstart", preventMultiTouch, { capture: true });
    window.removeEventListener("touchmove", preventMultiTouch, { capture: true });
    window.removeEventListener("wheel", preventTrackpadZoom, { capture: true });
    window.removeEventListener("keydown", preventKeyboardZoom, { capture: true });
  };
}
