import { describe, expect, it } from "vitest";
import { direct2dProfileFromGesture } from "@/lib/direct2dDrawing";

describe("direct2d drawing gestures", () => {
  it.each([["triangle", 3], ["hexagon", 6]] as const)("creates a closed %s", (tool, sides) => {
    const profile = direct2dProfileFromGesture(tool, { x: 0, z: 0 }, { x: 10, z: 0 });
    expect(profile.points).toHaveLength(sides);
    expect(profile.segments).toHaveLength(sides);
    expect(profile.segments.at(-1)?.endId).toBe(profile.points[0].id);
  });

  it("keeps an open pencil stroke open", () => {
    const profile = direct2dProfileFromGesture("pencil", { x: 0, z: 0 }, { x: 8, z: 3 }, [{ x: 0, z: 0 }, { x: 3, z: 1 }, { x: 8, z: 3 }]);
    expect(profile.points).toHaveLength(3);
    expect(profile.segments).toHaveLength(2);
  });

  it("closes a pencil stroke finished near its start", () => {
    const trail = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }, { x: 0.2, z: 0.1 }];
    const profile = direct2dProfileFromGesture("pencil", trail[0], trail.at(-1)!, trail);
    expect(profile.points).toHaveLength(4);
    expect(profile.segments).toHaveLength(4);
    expect(profile.segments.at(-1)?.endId).toBe(profile.points[0].id);
  });

  it.each(["circle", "semicircle", "arc", "rectangle"] as const)("keeps %s parametric", (tool) => {
    const profile = direct2dProfileFromGesture(tool, { x: 2, z: 3 }, { x: 8, z: 3 });
    expect(profile.entities?.[0].kind).toBe(tool);
    expect(profile.points.length).toBeGreaterThan(1);
  });
});
