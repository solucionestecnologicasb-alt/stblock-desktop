// Placement math for sketch shapes on arbitrary work planes (CAP "face" planes).
//
// Sketch shapes are tessellated in a local frame where the extrusion runs along
// +Y and the profile lies in the X/Z plane. The renderer positions the object
// with `position = (x, elevation + height / 2, z)` and `rotation` as a
// Three.js Euler with order "XYZ" (i.e. R = RX(rotationX) * RY(rotation) *
// RZ(rotationZ)). This module computes the placement (x / z / elevation and the
// three Euler angles) that maps the local +Y axis onto a face normal and the
// local X/Z plane onto the face tangent plane. Pure and dependency-free so it
// is directly unit-testable.

export type PlaneBasis = {
  normal: [number, number, number];
  up: [number, number, number];
  origin: [number, number, number];
};

export type PlanePlacement = {
  x: number;
  z: number;
  elevation: number;
  rotationX: number;
  rotation: number;
  rotationZ: number;
};

type Vec3 = { x: number; y: number; z: number };

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length < 1e-12) return { x: 0, y: 1, z: 0 };
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function degrees(radians: number) {
  return (radians * 180) / Math.PI;
}

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Build the orthonormal basis for a face work plane.
 *
 * Returns the three basis vectors as world-space columns of the rotation matrix
 * that maps local coordinates to world coordinates:
 *   col0 = image of local +X
 *   col1 = image of local +Y (the face normal)
 *   col2 = image of local +Z (projected `up`)
 */
export function basisFromPlane(plane: PlaneBasis): {
  xAxis: Vec3;
  yAxis: Vec3;
  zAxis: Vec3;
} {
  const normal = normalize({ x: plane.normal[0], y: plane.normal[1], z: plane.normal[2] });
  const up = normalize({ x: plane.up[0], y: plane.up[1], z: plane.up[2] });
  // Project `up` onto the plane perpendicular to `normal`.
  const upComponent = up.x * normal.x + up.y * normal.y + up.z * normal.z;
  let zAxis = {
    x: up.x - upComponent * normal.x,
    y: up.y - upComponent * normal.y,
    z: up.z - upComponent * normal.z,
  };
  const zLength = Math.hypot(zAxis.x, zAxis.y, zAxis.z);
  if (zLength < 1e-6) {
    // `up` is parallel to the normal; pick a stable default tangent.
    const fallback = Math.abs(normal.y) < 0.9
      ? { x: 0, y: 1, z: 0 }
      : { x: 1, y: 0, z: 0 };
    zAxis = normalize(cross(fallback, normal));
  } else {
    zAxis = normalize(zAxis);
  }
  // localX = normal × localZ gives a right-handed basis (localX × localY = localZ).
  const xAxis = normalize(cross(normal, zAxis));
  return { xAxis, yAxis: normal, zAxis };
}

/**
 * Decompose a rotation matrix (rows = images of local +X/+Y/+Z, matching
 * Three.js's row-vector convention) into the three Euler angles used by the
 * renderer (Three.js Euler order "XYZ"): R = RX(rotationX) * RY(rotation) *
 * RZ(rotationZ).
 *
 * With R = RX(x)*RY(y)*RZ(z):
 *   row0 (image of local +X) = (cos y cos z, -cos y sin z, sin y)
 *   row1 (image of local +Y) = (sin x sin y cos z + cos x sin z,
 *                               -sin x sin y sin z + cos x cos z,
 *                               -sin x cos y)
 *   row2 (image of local +Z) = (-cos x sin y cos z + sin x sin z,
 *                               cos x sin y sin z + sin x cos z,
 *                               cos x cos y)
 */
export function eulerFromBasis(xAxis: Vec3, yAxis: Vec3, zAxis: Vec3): { rotationX: number; rotation: number; rotationZ: number } {
  // sin y = row0.z (the z-component of the image of local +X).
  const sinY = Math.max(-1, Math.min(1, xAxis.z));
  const y = Math.asin(sinY);
  const cosY = Math.cos(y);
  if (Math.abs(cosY) > 1e-7) {
    const x = Math.atan2(-yAxis.z, zAxis.z);
    const z = Math.atan2(-xAxis.y, xAxis.x);
    return {
      rotationX: x * RAD_TO_DEG,
      rotation: y * RAD_TO_DEG,
      rotationZ: z * RAD_TO_DEG,
    };
  }
  // Gimbal lock: local +X is along ±Z. Fix rotationX = 0 and solve rotationZ
  // from the image of local +Y: row1 = (sin z, cos z, 0).
  const x = 0;
  const z = Math.atan2(yAxis.x, yAxis.y);
  return {
    rotationX: x * RAD_TO_DEG,
    rotation: y * RAD_TO_DEG,
    rotationZ: z * RAD_TO_DEG,
  };
}

/**
 * Compute the renderer placement for a shape of `height` whose base must lie on
 * the face plane. The origin is the point of the face the sketch starts from;
 * the shape's base center lands on `origin` after the local mesh center is
 * compensated (the mesh is centered in X/Z and spans [0, height] in Y).
 */
export function placementFromPlane(plane: PlaneBasis, height: number): PlanePlacement {
  const { xAxis, yAxis, zAxis } = basisFromPlane(plane);
  const euler = eulerFromBasis(xAxis, yAxis, zAxis);
  return {
    x: plane.origin[0],
    z: plane.origin[2],
    elevation: plane.origin[1] - Math.max(0.01, height) / 2,
    rotationX: cleanNearZero(euler.rotationX),
    rotation: cleanNearZero(euler.rotation),
    rotationZ: cleanNearZero(euler.rotationZ),
  };
}

function cleanNearZero(value: number, epsilon = 1e-7) {
  return Math.abs(value) < epsilon ? 0 : value;
}

/**
 * Invert a placement back into a plane basis (used to reconstruct the face
 * plane after a shape was regenerated). Returns the normal and up as seen by a
 * fresh shape built with that placement.
 */
export function planeFromPlacement(placement: {
  x: number;
  z: number;
  elevation: number;
  rotationX?: number;
  rotation?: number;
  rotationZ?: number;
  height: number;
}): PlaneBasis {
  const x = placement.rotationX ?? 0;
  const y = placement.rotation ?? 0;
  const z = placement.rotationZ ?? 0;
  const a = Math.cos((x * Math.PI) / 180);
  const b = Math.sin((x * Math.PI) / 180);
  const c = Math.cos((y * Math.PI) / 180);
  const d = Math.sin((y * Math.PI) / 180);
  const e = Math.cos((z * Math.PI) / 180);
  const f = Math.sin((z * Math.PI) / 180);
  // Rows of R = RX(x)*RY(y)*RZ(z) (Three.js row-vector convention): each row is
  // the world-space image of a local axis.
  const xAxis = {
    x: c * e,
    y: -c * f,
    z: d,
  };
  const yAxis = {
    x: b * d * e + a * f,
    y: -b * d * f + a * e,
    z: -b * c,
  };
  const zAxis = {
    x: -a * d * e + b * f,
    y: a * d * f + b * e,
    z: a * c,
  };
  const normalizeVec = (v: Vec3): Vec3 => {
    const length = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  };
  const n = normalizeVec(yAxis);
  const up = normalizeVec(zAxis);
  return {
    normal: [n.x, n.y, n.z],
    up: [up.x, up.y, up.z],
    origin: [placement.x, placement.elevation + Math.max(0.01, placement.height) / 2, placement.z],
  };
}

export { degrees };
