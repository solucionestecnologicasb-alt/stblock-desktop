import { describe, expect, it } from "vitest";
import { interactionViewportPixelRatio, preferredViewportPixelRatio } from "../../apps/web/src/lib/viewportPerformance";

describe("viewport performance policy", () => {
  it("caps low-tier machines at one physical pixel per CSS pixel", () => {
    expect(preferredViewportPixelRatio({ devicePixelRatio: 2, hardwareConcurrency: 2, deviceMemory: 2, width: 1366, height: 768 })).toBe(1);
  });

  it("caps balanced machines at 1.25", () => {
    expect(preferredViewportPixelRatio({ devicePixelRatio: 2, hardwareConcurrency: 4, deviceMemory: 4, width: 1920, height: 1080 })).toBe(1.25);
  });

  it("allows capable desktops up to 1.5", () => {
    expect(preferredViewportPixelRatio({ devicePixelRatio: 2, hardwareConcurrency: 12, deviceMemory: 16, width: 1920, height: 900 })).toBe(1.5);
  });

  it("drops interaction rendering to DPR 1", () => {
    expect(interactionViewportPixelRatio(1.5)).toBe(1);
    expect(interactionViewportPixelRatio(0.8)).toBe(0.8);
  });
});
