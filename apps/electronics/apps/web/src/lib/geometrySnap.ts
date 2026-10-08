// 3D snapping for the direct-modeling interactions (translation gizmo, shape
// moves). Snap candidates are derived from edge topology: endpoints, midpoints
// and closest-points-on-edge. Pure and dependency-free so it is unit-testable.
//
// Edges are supplied as polylines (`points` is a flat [x, y, z, x, y, z, ...]
// array), the same shape `CadModifierEdge.points` uses from the CAD worker.

export type SnapCandidate = {
  point: [number, number, number];
  kind: "endpoint" | "midpoint" | "edge";
  edgeId?: number;
  // World-space distance from the query point to the candidate.
  distance: number;
};

export type SnapEdgeSource = {
  id: number;
  points: number[];
};

export type SnapResult = SnapCandidate | null;

export const SNAP_PIXEL_TOLERANCE = 14;

/**
 * Project a world point to screen and return the world point together with the
 * on-screen distance to the pointer. Used to decide which candidate is "closest"
 * in screen space rather than world space.
 */
function projectPoint(point: [number, number, number], projection: SnapProjection) {
  // Manual perspective projection without three.js.
  const [x, y, z] = point;
  const view = applyMatrix4([x, y, z, 1], projection.matrixWorldInverse);
  if (Math.abs(view[2]) < 1e-6) return null;
  const clip = applyMatrix4(view, projection.projectionMatrix);
  if (clip[3] === 0) return null;
  const nx = clip[0] / clip[3];
  const ny = clip[1] / clip[3];
  if (nx < -1 || nx > 1 || ny < -1 || ny > 1) return null;
  return {
    x: ((nx + 1) / 2) * projection.width,
    y: ((1 - ny) / 2) * projection.height,
    z: view[2],
  };
}

function applyMatrix4(v: number[], m: number[]) {
  const x = v[0], y = v[1], z = v[2], w = v[3];
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w,
    m[3] * x + m[7] * y + m[11] * z + m[15] * w,
  ];
}

function distanceToScreenSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-12) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function closestPointOnSegment(px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  if (lengthSq < 1e-12) return { x: ax, y: ay, z: az };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lengthSq));
  return { x: ax + dx * t, y: ay + dy * t, z: az + dz * t };
}

export type SnapProjection = {
  matrixWorldInverse: number[];
  projectionMatrix: number[];
  width: number;
  height: number;
};

/**
 * Collect snapping candidates near a pointer position. Each edge contributes
 * its endpoints, midpoint, and the closest point on every polyline segment.
 * Candidates are projected to screen space and compared against the pointer;
 * the best (smallest on-screen distance within the pixel tolerance) is
 * returned. `worldPoint` is the world-space point under the pointer, used only
 * for the closest-point-on-edge candidate.
 */
export function pickSnapCandidate(
  edges: SnapEdgeSource[],
  pointerScreen: { x: number; y: number },
  worldPoint: [number, number, number],
  projection: SnapProjection,
  pixelTolerance = SNAP_PIXEL_TOLERANCE,
): SnapResult {
  let best: SnapCandidate | null = null;
  for (const edge of edges) {
    const points = edge.points;
    const endpoints: Array<[number, number, number]> = [];
    if (points.length >= 3) endpoints.push([points[0], points[1], points[2]]);
    if (points.length >= 6) endpoints.push([points[points.length - 3], points[points.length - 2], points[points.length - 1]]);

    const candidates: Array<{ point: [number, number, number]; kind: SnapCandidate["kind"] }> = [];
    for (const endpoint of endpoints) candidates.push({ point: endpoint, kind: "endpoint" });

    const mid = midpointOfPolyline(points);
    if (mid) candidates.push({ point: mid, kind: "midpoint" });

    // Closest point on the polyline.
    if (points.length >= 6) {
      let closest: { x: number; y: number; z: number } | null = null;
      let closestDistance = Infinity;
      for (let index = 0; index + 5 < points.length; index += 3) {
        const candidate = closestPointOnSegment(
          worldPoint[0], worldPoint[1], worldPoint[2],
          points[index], points[index + 1], points[index + 2],
          points[index + 3], points[index + 4], points[index + 5],
        );
        const distance = Math.hypot(candidate.x - worldPoint[0], candidate.y - worldPoint[1], candidate.z - worldPoint[2]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = candidate;
        }
      }
      if (closest && closestDistance > 1e-6) {
        candidates.push({ point: [closest.x, closest.y, closest.z], kind: "edge" });
      }
    }

    for (const candidate of candidates) {
      const screen = projectPoint(candidate.point, projection);
      if (!screen) continue;
      const distance = Math.hypot(screen.x - pointerScreen.x, screen.y - pointerScreen.y);
      if (distance <= pixelTolerance && (!best || distance < best.distance)) {
        best = { point: candidate.point, kind: candidate.kind, edgeId: edge.id, distance };
      }
    }
  }
  return best;
}

/**
 * World-space snap candidates for a world point (no projection needed). Used
 * when dragging a gizmo and snapping the moved center to nearby geometry.
 */
export function snapWorldPointToEdges(
  edges: SnapEdgeSource[],
  worldPoint: [number, number, number],
  worldTolerance: number,
): { point: [number, number, number]; kind: SnapCandidate["kind"]; edgeId?: number } | null {
  let best: { point: [number, number, number]; kind: SnapCandidate["kind"]; edgeId?: number; distance: number } | null = null;
  for (const edge of edges) {
    const points = edge.points;
    const candidates: Array<{ point: [number, number, number]; kind: SnapCandidate["kind"] }> = [];
    if (points.length >= 3) candidates.push({ point: [points[0], points[1], points[2]], kind: "endpoint" });
    if (points.length >= 6) candidates.push({ point: [points[points.length - 3], points[points.length - 2], points[points.length - 1]], kind: "endpoint" });
    const mid = midpointOfPolyline(points);
    if (mid) candidates.push({ point: mid, kind: "midpoint" });
    if (points.length >= 6) {
      let closest: { x: number; y: number; z: number } | null = null;
      let closestDistance = Infinity;
      for (let index = 0; index + 5 < points.length; index += 3) {
        const candidate = closestPointOnSegment(
          worldPoint[0], worldPoint[1], worldPoint[2],
          points[index], points[index + 1], points[index + 2],
          points[index + 3], points[index + 4], points[index + 5],
        );
        const distance = Math.hypot(candidate.x - worldPoint[0], candidate.y - worldPoint[1], candidate.z - worldPoint[2]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = candidate;
        }
      }
      if (closest && closestDistance > 1e-6) candidates.push({ point: [closest.x, closest.y, closest.z], kind: "edge" });
    }
    for (const candidate of candidates) {
      const distance = Math.hypot(candidate.point[0] - worldPoint[0], candidate.point[1] - worldPoint[1], candidate.point[2] - worldPoint[2]);
      if (distance <= worldTolerance && (!best || distance < best.distance)) {
        best = { ...candidate, edgeId: edge.id, distance };
      }
    }
  }
  return best ? { point: best.point, kind: best.kind, edgeId: best.edgeId } : null;
}

function midpointOfPolyline(points: number[]): [number, number, number] | null {
  if (points.length < 6) return null;
  // Average the polyline vertices as an approximation of the curve midpoint.
  let x = 0;
  let y = 0;
  let z = 0;
  let count = 0;
  for (let index = 0; index + 2 < points.length; index += 3) {
    x += points[index];
    y += points[index + 1];
    z += points[index + 2];
    count += 1;
  }
  if (count === 0) return null;
  return [x / count, y / count, z / count];
}

/**
 * Filter edges so only those belonging to shapes other than `excludedShapeIds`
 * contribute snap candidates (you do not want to snap a shape onto itself).
 */
export function excludeEdgesFromShapes(edges: SnapEdgeSource[], edgeOwners: Map<number, string>, excludedShapeIds: Set<string>) {
  return edges.filter((edge) => {
    const owner = edgeOwners.get(edge.id);
    return !owner || !excludedShapeIds.has(owner);
  });
}
