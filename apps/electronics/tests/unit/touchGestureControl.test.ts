import { afterEach, describe, expect, it, vi } from "vitest";
import { disableBrowserPinchZoom } from "@/lib/touchGestureControl";

type FakeWindow = {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function installFakeWindow() {
  const listeners = new Map<string, EventListener>();
  const fakeWindow: FakeWindow = {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, listener);
    }),
    removeEventListener: vi.fn((type: string) => {
      listeners.delete(type);
    }),
  };
  vi.stubGlobal("window", fakeWindow);
  return { fakeWindow, listeners };
}

function touchEvent(touchCount: number) {
  return {
    touches: Array.from({ length: touchCount }, () => ({})),
    cancelable: true,
    preventDefault: vi.fn(),
  } as unknown as TouchEvent;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("disableBrowserPinchZoom", () => {
  it("cancels multi-touch gestures but leaves single-finger input alone", () => {
    const { listeners } = installFakeWindow();
    disableBrowserPinchZoom();

    const touchStart = listeners.get("touchstart");
    const touchMove = listeners.get("touchmove");
    expect(touchStart).toBeTypeOf("function");
    expect(touchMove).toBeTypeOf("function");

    const singleTouch = touchEvent(1);
    touchStart?.(singleTouch);
    touchMove?.(singleTouch);
    expect(singleTouch.preventDefault).not.toHaveBeenCalled();

    const pinchStart = touchEvent(2);
    const pinchMove = touchEvent(2);
    touchStart?.(pinchStart);
    touchMove?.(pinchMove);
    expect(pinchStart.preventDefault).toHaveBeenCalledTimes(1);
    expect(pinchMove.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("cancels WebKit gesture events and trackpad pinch zoom", () => {
    const { listeners } = installFakeWindow();
    disableBrowserPinchZoom();

    const gesture = { cancelable: true, preventDefault: vi.fn() } as unknown as Event;
    listeners.get("gesturestart")?.(gesture);
    listeners.get("gesturechange")?.(gesture);
    expect(gesture.preventDefault).toHaveBeenCalledTimes(2);

    const trackpadPinch = { ctrlKey: true, cancelable: true, preventDefault: vi.fn() } as unknown as WheelEvent;
    listeners.get("wheel")?.(trackpadPinch);
    expect(trackpadPinch.preventDefault).toHaveBeenCalledTimes(1);

    const regularWheel = { ctrlKey: false, cancelable: true, preventDefault: vi.fn() } as unknown as WheelEvent;
    listeners.get("wheel")?.(regularWheel);
    expect(regularWheel.preventDefault).not.toHaveBeenCalled();
  });

  it("removes every listener on cleanup", () => {
    const { fakeWindow } = installFakeWindow();
    const cleanup = disableBrowserPinchZoom();

    cleanup();

    expect(fakeWindow.removeEventListener).toHaveBeenCalledTimes(7);
  });
});
