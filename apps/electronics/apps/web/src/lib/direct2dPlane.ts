import type { WorkplanePlane } from "@/types/sketchforge";

type Vec3 = { x: number; y: number; z: number };

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return length > 1e-9
    ? { x: vector.x / length, y: vector.y / length, z: vector.z / length }
    : { x: 0, y: 1, z: 0 };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Creates a stable drawing plane from a raycast surface hit in world space. */
export function direct2dPlaneFromSurface(shapeId: string, point: Vec3, surfaceNormal: Vec3): Extract<WorkplanePlane, { kind: "face" }> {
  const normal = normalize(surfaceNormal);
  const reference = Math.abs(normal.y) < 0.92 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
  const projection = dot(reference, normal);
  const up = normalize({
    x: reference.x - normal.x * projection,
    y: reference.y - normal.y * projection,
    z: reference.z - normal.z * projection,
  });
  return {
    kind: "face",
    shapeId,
    center: [point.x, point.y, point.z],
    normal: [normal.x, normal.y, normal.z],
    up: [up.x, up.y, up.z],
  };
}
