import { describe, expect, it } from "vitest";
import { basisFromPlane, eulerFromBasis, placementFromPlane, planeFromPlacement } from "@/lib/planeBasis";

// Tolerance in model units for round-trip basis checks.
const TOL = 1e-6;

function applyRotation(point: [number, number, number], xDeg: number, yDeg: number, zDeg: number): [number, number, number] {
  // Three.js Euler order "XYZ": R = RX(x) * RY(y) * RZ(z).
  const x = (xDeg * Math.PI) / 180;
  const y = (yDeg * Math.PI) / 180;
  const z = (zDeg * Math.PI) / 180;
  const a = Math.cos(x), b = Math.sin(x);
  const c = Math.cos(y), d = Math.sin(y);
  const e = Math.cos(z), f = Math.sin(z);
  const m = [
    c * e, -c * f, d,
    b * d * e + a * f, -b * d * f + a * e, -b * c,
    -a * d * e + b * f, a * d * f + b * e, a * c,
  ];
  return [
    m[0] * point[0] + m[3] * point[1] + m[6] * point[2],
    m[1] * point[0] + m[4] * point[1] + m[7] * point[2],
    m[2] * point[0] + m[5] * point[1] + m[8] * point[2],
  ];
}

function rotatedNormal(xDeg: number, yDeg: number, zDeg: number): [number, number, number] {
  return applyRotation([0, 1, 0], xDeg, yDeg, zDeg);
}

describe("planeBasis", () => {
  it("maps the local +Y axis onto the face normal for cardinal normals", () => {
    const cases: Array<[number, number, number]> = [
      [0, 0, 0],      // +Y
      [90, 0, 0],     // +Z
      [0, 0, -90],    // +X
      [180, 0, 0],    // -Y
      [-90, 0, 0],    // -Z
      [0, 0, 90],     // -X
    ];
    for (const [rx, ry, rz] of cases) {
      const normal = rotatedNormal(rx, ry, rz);
      const placement = placementFromPlane(
        { normal, up: [0, 1, 0], origin: [2, 3, 4] },
        2,
      );
      const computed = rotatedNormal(placement.rotationX, placement.rotation, placement.rotationZ);
      for (let i = 0; i < 3; i += 1) {
        expect(computed[i]).toBeCloseTo(normal[i], 5);
      }
      expect(placement.x).toBe(2);
      expect(placement.z).toBe(4);
      expect(placement.elevation).toBeCloseTo(3 - 1, 5);
    }
  });

  it("maps the local +Y axis onto inclined normals", () => {
    const normals: Array<[number, number, number]> = [
      [0.5, 0.70710678, 0.5],
      [-0.5, 0.5, 0.70710678],
      [0.70710678, -0.5, 0.5],
      [0.3, 0.8, 0.51961524],
    ];
    for (const normal of normals) {
      const magnitude = Math.hypot(...normal);
      const unit = normal.map((value) => value / magnitude) as [number, number, number];
      const placement = placementFromPlane({ normal: unit, up: [0, 0, 1], origin: [0, 0, 0] }, 1);
      const computed = rotatedNormal(placement.rotationX, placement.rotation, placement.rotationZ);
      for (let i = 0; i < 3; i += 1) {
        expect(computed[i]).toBeCloseTo(unit[i], 4);
      }
    }
  });

  it("round-trips a placement back into a matching plane", () => {
    // Orthogonal normal/up pair so the projected up equals the input up.
    const normal: [number, number, number] = [0.5, 0.70710678, 0.5];
    const upLength = Math.hypot(normal[2], -normal[0]);
    const up: [number, number, number] = [normal[2] / upLength, 0, -normal[0] / upLength];
    const plane = {
      normal,
      up,
      origin: [1.5, 2.5, -3.25] as [number, number, number],
    };
    const placement = placementFromPlane(plane, 1.75);
    const restored = planeFromPlacement({ ...placement, height: 1.75 });
    for (let i = 0; i < 3; i += 1) {
      expect(restored.normal[i]).toBeCloseTo(plane.normal[i], 4);
      expect(restored.origin[i]).toBeCloseTo(plane.origin[i], 4);
    }
  });

  it("handles a normal pointing along ±X without gimbal-lock artifacts", () => {
    const normal: [number, number, number] = [1, 0, 0];
    const placement = placementFromPlane({ normal, up: [0, 0, 1], origin: [5, 5, 5] }, 1);
    const computed = rotatedNormal(placement.rotationX, placement.rotation, placement.rotationZ);
    expect(computed[0]).toBeCloseTo(1, 5);
    expect(Math.abs(computed[1])).toBeLessThan(1e-5);
    expect(Math.abs(computed[2])).toBeLessThan(1e-5);
  });

  it("derives an orthonormal right-handed basis", () => {
    const normal: [number, number, number] = [0.57735027, 0.57735027, 0.57735027];
    const up: [number, number, number] = [0, 1, 0];
    const basis = basisFromPlane({ normal, up, origin: [0, 0, 0] });
    const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
      a.x * b.x + a.y * b.y + a.z * b.z;
    expect(Math.hypot(basis.xAxis.x, basis.xAxis.y, basis.xAxis.z)).toBeCloseTo(1, 5);
    expect(Math.hypot(basis.yAxis.x, basis.yAxis.y, basis.yAxis.z)).toBeCloseTo(1, 5);
    expect(Math.hypot(basis.zAxis.x, basis.zAxis.y, basis.zAxis.z)).toBeCloseTo(1, 5);
    expect(dot(basis.xAxis, basis.yAxis)).toBeCloseTo(0, 5);
    expect(dot(basis.yAxis, basis.zAxis)).toBeCloseTo(0, 5);
    expect(dot(basis.xAxis, basis.zAxis)).toBeCloseTo(0, 5);
    // Right-handed (row-vector convention): xAxis × yAxis = zAxis.
    const crossXY = {
      x: basis.xAxis.y * basis.yAxis.z - basis.xAxis.z * basis.yAxis.y,
      y: basis.xAxis.z * basis.yAxis.x - basis.xAxis.x * basis.yAxis.z,
      z: basis.xAxis.x * basis.yAxis.y - basis.xAxis.y * basis.yAxis.x,
    };
    expect(crossXY.x).toBeCloseTo(basis.zAxis.x, 5);
    expect(crossXY.y).toBeCloseTo(basis.zAxis.y, 5);
    expect(crossXY.z).toBeCloseTo(basis.zAxis.z, 5);
  });

  it("is pure: eulerFromBasis returns the expected angles", () => {
    const euler = eulerFromBasis(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    );
    expect(euler.rotationX).toBeCloseTo(0, 5);
    expect(euler.rotation).toBeCloseTo(0, 5);
    expect(euler.rotationZ).toBeCloseTo(0, 5);
  });
});
