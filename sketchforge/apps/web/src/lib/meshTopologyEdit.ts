/**
 * Pure mesh-topology editing helpers (no OCCT dependency) used by the
 * topology editing pipeline. All functions work on flat `Float32Array`
 * position buffers and `Uint32Array` index buffers, so they are unit-testable
 * in isolation.
 */

export type Point3 = { x: number; y: number; z: number };

export type MeshVertexUpdate = {
  from: Point3;
  to: Point3;
};

export type MeshEdgeAdjacency = {
  /** Lower vertex index of the undirected edge. */
  a: number;
  /** Higher vertex index of the undirected edge. */
  b: number;
  /** Triangle indices (into the index buffer / 3) adjacent to this edge. */
  triangles: number[];
};

type ArrayLikeNumber = Float32Array | number[];
type ArrayLikeIndex = Uint32Array | number[];

/**
 * Returns a copy of `positions` where every vertex whose distance to any
 * `update.from` is within `tolerance` is snapped to `update.to`. Vertices that
 * are not near any update target are left untouched.
 */
export function moveMeshVerticesNear(positions: ArrayLikeNumber, updates: MeshVertexUpdate[], tolerance: number): Float32Array {
  const result = new Float32Array(positions);
  if (updates.length === 0) return result;
  const toleranceSquared = tolerance * tolerance;
  for (let index = 0; index + 2 < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const z = positions[index + 2];
    for (let updateIndex = 0; updateIndex < updates.length; updateIndex += 1) {
      const update = updates[updateIndex];
      const dx = x - update.from.x;
      const dy = y - update.from.y;
      const dz = z - update.from.z;
      if (dx * dx + dy * dy + dz * dz <= toleranceSquared) {
        result[index] = update.to.x;
        result[index + 1] = update.to.y;
        result[index + 2] = update.to.z;
        break;
      }
    }
  }
  return result;
}

/**
 * Builds a map of undirected edges to the triangles that share them. Each key
 * is the canonical `"minIndex:maxIndex"` pair of the edge.
 */
export function buildMeshEdgeAdjacency(indices: ArrayLikeIndex): Map<string, MeshEdgeAdjacency> {
  const adjacency = new Map<string, MeshEdgeAdjacency>();
  const triangleCount = Math.floor(indices.length / 3);
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const i0 = indices[triangle * 3];
    const i1 = indices[triangle * 3 + 1];
    const i2 = indices[triangle * 3 + 2];
    const edges: Array<[number, number]> = [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ];
    for (const [a, b] of edges) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const entry = adjacency.get(key) ?? { a: Math.min(a, b), b: Math.max(a, b), triangles: [] };
      entry.triangles.push(triangle);
      adjacency.set(key, entry);
    }
  }
  return adjacency;
}

/**
 * Closest point on segment `[a, b]` to `p`, with the parametric coordinate `t`
 * along the segment (clamped to `[0, 1]`).
 */
function closestPointOnSegment(a: Point3, b: Point3, p: Point3): { point: Point3; t: number; distance: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const apz = p.z - a.z;
  const lengthSquared = abx * abx + aby * aby + abz * abz;
  let t = lengthSquared > 0 ? (apx * abx + apy * aby + apz * abz) / lengthSquared : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  const cz = a.z + t * abz;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const dz = p.z - cz;
  return { point: { x: cx, y: cy, z: cz }, t, distance: Math.hypot(dx, dy, dz) };
}

/**
 * Finds the closest point on the polyline described by `flatPoints`
 * (`[x, y, z, ...]`). Used for click-on-edge detection: a click that falls
 * near the sampled boundary of a face can be snapped to an edge.
 */
export function nearestPointOnSegments(flatPoints: ArrayLikeNumber, point: Point3): { point: Point3; distance: number } {
  let best: Point3 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index + 5 < flatPoints.length; index += 3) {
    const a: Point3 = { x: flatPoints[index], y: flatPoints[index + 1], z: flatPoints[index + 2] };
    const b: Point3 = { x: flatPoints[index + 3], y: flatPoints[index + 4], z: flatPoints[index + 5] };
    const result = closestPointOnSegment(a, b, point);
    if (result.distance < bestDistance) {
      bestDistance = result.distance;
      best = result.point;
    }
  }
  return best ? { point: best, distance: bestDistance } : { point: { ...point }, distance: Number.POSITIVE_INFINITY };
}

/**
 * Inserts `point` as a new mesh vertex on the edge segment nearest to it
 * (within `tolerance`), splitting every triangle adjacent to that edge into
 * two triangles with correct winding. Returns the new position/index buffers
 * and the index of the inserted vertex, or `null` when no edge is near enough.
 */
export function splitMeshEdgeAtPoint(
  positions: ArrayLikeNumber,
  indices: ArrayLikeIndex,
  point: Point3,
  tolerance: number,
): { positions: Float32Array; indices: Uint32Array; newVertexIndex: number } | null {
  const adjacency = buildMeshEdgeAdjacency(indices);
  let bestKey: string | null = null;
  let bestPoint: Point3 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [key, edge] of adjacency) {
    const a: Point3 = { x: positions[edge.a * 3], y: positions[edge.a * 3 + 1], z: positions[edge.a * 3 + 2] };
    const b: Point3 = { x: positions[edge.b * 3], y: positions[edge.b * 3 + 1], z: positions[edge.b * 3 + 2] };
    const result = closestPointOnSegment(a, b, point);
    if (result.distance < bestDistance) {
      bestDistance = result.distance;
      bestKey = key;
      bestPoint = result.point;
    }
  }
  if (bestKey === null || bestPoint === null || bestDistance > tolerance) {
    return null;
  }
  const edge = adjacency.get(bestKey);
  if (!edge) return null;

  const oldTriangleCount = Math.floor(indices.length / 3);
  const trianglesToSplit = edge.triangles;
  // Each split triangle produces two triangles, so the output index buffer
  // grows by `trianglesToSplit.length * 3` indices.
  const outPositions = new Float32Array(positions.length + 3);
  outPositions.set(positions as Float32Array);
  const newVertexIndex = outPositions.length / 3 - 1;
  outPositions[newVertexIndex * 3] = bestPoint.x;
  outPositions[newVertexIndex * 3 + 1] = bestPoint.y;
  outPositions[newVertexIndex * 3 + 2] = bestPoint.z;

  const outIndices = new Uint32Array(indices.length + trianglesToSplit.length * 3);
  let writeIndex = 0;
  for (let triangle = 0; triangle < oldTriangleCount; triangle += 1) {
    const base = triangle * 3;
    const i0 = indices[base];
    const i1 = indices[base + 1];
    const i2 = indices[base + 2];
    if (!trianglesToSplit.includes(triangle)) {
      outIndices[writeIndex] = i0;
      outIndices[writeIndex + 1] = i1;
      outIndices[writeIndex + 2] = i2;
      writeIndex += 3;
      continue;
    }
    // The triangle contains the edge (edge.a, edge.b). Replace it with two
    // triangles that share the inserted vertex, preserving the original
    // winding order (edge-vertex → other-edge-vertex → opposite).
    const a = edge.a;
    const b = edge.b;
    const opposite = i0 !== a && i0 !== b ? i0 : i1 !== a && i1 !== b ? i1 : i2;
    const cycle = [i0, i1, i2, i0];
    const indexOfA = cycle.indexOf(a);
    // The edge vertices are adjacent in the triangle's cyclic order; decide
    // which comes first so the split keeps the original winding direction.
    const first = cycle[indexOfA + 1] === b ? a : b;
    const second = first === a ? b : a;
    outIndices[writeIndex] = first;
    outIndices[writeIndex + 1] = newVertexIndex;
    outIndices[writeIndex + 2] = opposite;
    outIndices[writeIndex + 3] = newVertexIndex;
    outIndices[writeIndex + 4] = second;
    outIndices[writeIndex + 5] = opposite;
    writeIndex += 6;
  }
  return { positions: outPositions, indices: outIndices, newVertexIndex };
}

/**
 * Computes the target coordinate for an align operation over a set of values:
 * - `"min"` → the minimum value,
 * - `"max"` → the maximum value,
 * - `"center"` → the mean (arithmetic average) of the values.
 */
export function alignTargetValue(values: number[], target: "min" | "center" | "max"): number {
  if (target === "min") {
    return Math.min(...values);
  }
  if (target === "max") {
    return Math.max(...values);
  }
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Snaps a coordinate to the nearest grid line laid out from `origin` in
 * increments of `step`. The result is the grid line closest to `value`.
 */
export function snapToGridValue(value: number, origin: number, step: number): number {
  if (step <= 0 || !Number.isFinite(step)) {
    return value;
  }
  return origin + Math.round((value - origin) / step) * step;
}
