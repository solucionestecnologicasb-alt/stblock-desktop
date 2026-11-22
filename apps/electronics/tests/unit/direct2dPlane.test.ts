import { describe, expect, it } from "vitest";
import { direct2dPlaneFromSurface } from "@/lib/direct2dPlane";
import { basisFromPlane } from "@/lib/planeBasis";

describe("direct2d surface planes", () => {
  it.each([
    ["horizontal", { x: 0, y: 1, z: 0 }],
    ["vertical-x", { x: 1, y: 0, z: 0 }],
    ["vertical-z", { x: 0, y: 0, z: -1 }],
    ["inclined", { x: 1, y: 1, z: 0 }],
  ])("keeps a profile tangent to a %s surface", (_label, normal) => {
    const plane = direct2dPlaneFromSurface("body-1", { x: 4, y: 8, z: 12 }, normal);
    expect(plane.kind).toBe("face");
    if (plane.kind !== "face") return;
    const basis = basisFromPlane({ origin: plane.center, normal: plane.normal, up: plane.up });
    const dotUpNormal = basis.zAxis.x * basis.yAxis.x + basis.zAxis.y * basis.yAxis.y + basis.zAxis.z * basis.yAxis.z;
    const dotXNormal = basis.xAxis.x * basis.yAxis.x + basis.xAxis.y * basis.yAxis.y + basis.xAxis.z * basis.yAxis.z;
    expect(Math.abs(dotUpNormal)).toBeLessThan(1e-8);
    expect(Math.abs(dotXNormal)).toBeLessThan(1e-8);
    expect(plane.center).toEqual([4, 8, 12]);
  });
});
