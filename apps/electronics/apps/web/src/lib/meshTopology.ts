/**
 * Pure mesh-topology helpers (no OCCT / DOM / worker dependency) used as the
 * fallback for topology editing when the OCCT reconstruction of an imported
 * "triangle soup" mesh fails. Imported meshes (STL, library parts) are stored
 * non-indexed (one vertex per triangle corner), so every operation starts from
 * `canonicalizeMesh` to deduplicate vertices and recover shared edges.
 *
 * All functions work on flat `Float32Array` position buffers and `Uint32Array`
 * index buffers so they can be unit-tested in node.
 */

import type { CadTopologyEdge, CadTopologyFace, CadTopologyVertex } from "@/lib/cadModifierTypes";
import { buildMeshEdgeAdjacency, type MeshEdgeAdjacency } from "@/lib/meshTopologyEdit";

export type Point3 = { x: number; y: number; z: number };

type ArrayLikeNumber = Float32Array | number[];
type ArrayLikeIndex = Uint32Array | number[];

export type MeshFaceMesh = {
  /** Triangle indices (into the index buffer / 3) that form this face. */
  triangles: number[];
  /**
   * Directed boundary edges `a -> b` (canonical vertex indices), traced in
   * counter-clockwise loop order as seen from the face normal. Used by
   * `extrudeMeshFace` to build side walls with consistent winding.
   */
  boundary: Array<{ a: number; b: number }>;
};

export type MeshTopologyResult = {
  faces: CadTopologyFace[];
  vertices: CadTopologyVertex[];
  edges: CadTopologyEdge[];
  faceMesh: MeshFaceMesh[];
};

const VERTEX_QUANTIZATION = 1e-4;
const FACE_COUNT_CAP = 600;
const FACE_COPLANARITY_THRESHOLDS = [0.98, 0.95, 0.9];

/**
 * Deduplicates mesh vertices using a spatial hash (coordinates quantized to
 * 1e-4 mm) and remaps the index buffer to the canonical vertex set. Imported
 * meshes are "triangle soups" with duplicated vertices per triangle; without
 * this there are no shared edges, so faces and edge adjacency cannot be built.
 */
export function canonicalizeMesh(positions: ArrayLikeNumber, indices: ArrayLikeIndex): { positions: Float32Array; indices: Uint32Array } {
  const inputVertexCount = Math.floor(positions.length / 3);
  if (inputVertexCount === 0) {
    return { positions: new Float32Array(0), indices: new Uint32Array(indices.length) };
  }
  const remap = new Uint32Array(inputVertexCount);
  const canonicalPositions: number[] = [];
  const map = new Map<string, number>();
  for (let index = 0; index < inputVertexCount; index += 1) {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];
    const z = positions[index * 3 + 2];
    const key = `${Math.round(x / VERTEX_QUANTIZATION)}:${Math.round(y / VERTEX_QUANTIZATION)}:${Math.round(z / VERTEX_QUANTIZATION)}`;
    const existing = map.get(key);
    if (existing !== undefined) {
      remap[index] = existing;
    } else {
      const canonicalIndex = canonicalPositions.length / 3;
      map.set(key, canonicalIndex);
      remap[index] = canonicalIndex;
      canonicalPositions.push(x, y, z);
    }
  }
  const outIndices = new Uint32Array(indices.length);
  for (let index = 0; index < indices.length; index += 1) {
    const original = indices[index];
    outIndices[index] = original < remap.length ? remap[original] : 0;
  }
  return { positions: new Float32Array(canonicalPositions), indices: outIndices };
}

/**
 * Groups coplanar triangles into faces by region-growing over shared edges.
 * A neighbor joins the region when its normal is nearly parallel to the seed
 * normal (|dot| >= threshold, so flipped triangles still join) and its plane
 * offset is within `planeTolerance`. Returns a list of regions, each an array
 * of triangle indices.
 */
function clusterCoplanarRegions(
  triangleCount: number,
  triNormal: Float32Array,
  triCentroid: Float32Array,
  indices: ArrayLikeIndex,
  adjacency: Map<string, MeshEdgeAdjacency>,
  threshold: number,
  planeTolerance: number,
): number[][] {
  const assigned = new Uint8Array(triangleCount);
  const regions: number[][] = [];
  const stack: number[] = [];
  for (let seed = 0; seed < triangleCount; seed += 1) {
    if (assigned[seed]) continue;
    let nX = triNormal[seed * 3];
    let nY = triNormal[seed * 3 + 1];
    let nZ = triNormal[seed * 3 + 2];
    const nLength = Math.hypot(nX, nY, nZ);
    if (nLength < 1e-12) {
      nX = 0;
      nY = 1;
      nZ = 0;
    } else {
      nX /= nLength;
      nY /= nLength;
      nZ /= nLength;
    }
    const offset = nX * triCentroid[seed * 3] + nY * triCentroid[seed * 3 + 1] + nZ * triCentroid[seed * 3 + 2];
    assigned[seed] = 1;
    stack.length = 0;
    stack.push(seed);
    const region: number[] = [];
    while (stack.length > 0) {
      const triangle = stack.pop() as number;
      region.push(triangle);
      const base = triangle * 3;
      const i0 = indices[base];
      const i1 = indices[base + 1];
      const i2 = indices[base + 2];
      const edgeKeys: Array<[number, number]> = [
        [i0, i1],
        [i1, i2],
        [i2, i0],
      ];
      for (const [a, b] of edgeKeys) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const entry = adjacency.get(key);
        if (!entry) continue;
        for (const neighbor of entry.triangles) {
          if (assigned[neighbor]) continue;
          const dot = Math.abs(nX * triNormal[neighbor * 3] + nY * triNormal[neighbor * 3 + 1] + nZ * triNormal[neighbor * 3 + 2]);
          if (dot < threshold) continue;
          const distance = nX * triCentroid[neighbor * 3] + nY * triCentroid[neighbor * 3 + 1] + nZ * triCentroid[neighbor * 3 + 2];
          if (Math.abs(distance - offset) > planeTolerance) continue;
          assigned[neighbor] = 1;
          stack.push(neighbor);
        }
      }
    }
    regions.push(region);
  }
  return regions;
}

/**
 * Traces the directed boundary half-edges of a coplanar triangle region and
 * chains them into closed loops. Triangles whose winding opposes the face
 * normal have their half-edges reversed so the traced loops are consistently
 * counter-clockwise as seen from the face normal. Returns the flat boundary
 * polyline (`points`) and the directed boundary edges (`boundary`).
 */
function traceFaceBoundary(
  region: number[],
  positions: ArrayLikeNumber,
  indices: ArrayLikeIndex,
  faceNormal: { x: number; y: number; z: number },
): { points: number[]; boundary: Array<{ a: number; b: number }> } {
  const halfEdges = new Set<string>();
  for (const triangle of region) {
    const base = triangle * 3;
    const i0 = indices[base];
    const i1 = indices[base + 1];
    const i2 = indices[base + 2];
    const ax = positions[i0 * 3];
    const ay = positions[i0 * 3 + 1];
    const az = positions[i0 * 3 + 2];
    const bx = positions[i1 * 3];
    const by = positions[i1 * 3 + 1];
    const bz = positions[i1 * 3 + 2];
    const cx = positions[i2 * 3];
    const cy = positions[i2 * 3 + 1];
    const cz = positions[i2 * 3 + 2];
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const flip = nx * faceNormal.x + ny * faceNormal.y + nz * faceNormal.z < 0;
    if (flip) {
      halfEdges.add(`${i2}:${i1}`);
      halfEdges.add(`${i1}:${i0}`);
      halfEdges.add(`${i0}:${i2}`);
    } else {
      halfEdges.add(`${i0}:${i1}`);
      halfEdges.add(`${i1}:${i2}`);
      halfEdges.add(`${i2}:${i0}`);
    }
  }

  const boundaryStart = new Map<number, number[]>();
  for (const halfEdge of halfEdges) {
    const separator = halfEdge.indexOf(":");
    const a = Number(halfEdge.slice(0, separator));
    const b = Number(halfEdge.slice(separator + 1));
    const reverse = `${b}:${a}`;
    if (!halfEdges.has(reverse)) {
      const outgoing = boundaryStart.get(a) ?? [];
      outgoing.push(b);
      boundaryStart.set(a, outgoing);
    }
  }

  const boundary: Array<{ a: number; b: number }> = [];
  const points: number[] = [];
  const visited = new Set<string>();
  const startVertices = [...boundaryStart.keys()];
  for (const start of startVertices) {
    let a = start;
    let guard = 0;
    while (guard <= boundaryStart.size) {
      guard += 1;
      const outgoing = boundaryStart.get(a);
      let b = -1;
      if (outgoing) {
        for (const candidate of outgoing) {
          if (!visited.has(`${a}:${candidate}`)) {
            b = candidate;
            break;
          }
        }
      }
      if (b < 0) break;
      visited.add(`${a}:${b}`);
      boundary.push({ a, b });
      points.push(positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]);
      a = b;
      if (a === start) break;
    }
  }
  return { points, boundary };
}

/**
 * Builds faces, vertices, edges and per-face editing data directly from a
 * canonical (deduplicated) triangle mesh. Faces are coplanar regions grown
 * from shared edges; if more than `FACE_COUNT_CAP` faces result, the regions
 * are re-clustered with progressively coarser coplanarity thresholds.
 */
export function buildMeshTopology(positions: ArrayLikeNumber, indices: ArrayLikeIndex): MeshTopologyResult {
  const triangleCount = Math.floor(indices.length / 3);
  const vertexCount = Math.floor(positions.length / 3);
  if (triangleCount === 0 || vertexCount === 0) {
    return { faces: [], vertices: [], edges: [], faceMesh: [] };
  }

  const vertices: CadTopologyVertex[] = [];
  for (let index = 0; index < vertexCount; index += 1) {
    vertices.push({ id: index, x: positions[index * 3], y: positions[index * 3 + 1], z: positions[index * 3 + 2] });
  }

  const triNormal = new Float32Array(triangleCount * 3);
  const triCentroid = new Float32Array(triangleCount * 3);
  const triArea = new Float32Array(triangleCount);
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const base = triangle * 3;
    const i0 = indices[base];
    const i1 = indices[base + 1];
    const i2 = indices[base + 2];
    const ax = positions[i0 * 3];
    const ay = positions[i0 * 3 + 1];
    const az = positions[i0 * 3 + 2];
    const bx = positions[i1 * 3];
    const by = positions[i1 * 3 + 1];
    const bz = positions[i1 * 3 + 2];
    const cx = positions[i2 * 3];
    const cy = positions[i2 * 3 + 1];
    const cz = positions[i2 * 3 + 2];
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const area = Math.hypot(nx, ny, nz) * 0.5;
    triArea[triangle] = area;
    const length = area * 2 || 1;
    triNormal[base] = nx / length;
    triNormal[base + 1] = ny / length;
    triNormal[base + 2] = nz / length;
    triCentroid[base] = (ax + bx + cx) / 3;
    triCentroid[base + 1] = (ay + by + cy) / 3;
    triCentroid[base + 2] = (az + bz + cz) / 3;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < vertexCount; index += 1) {
    minX = Math.min(minX, positions[index * 3]);
    minY = Math.min(minY, positions[index * 3 + 1]);
    minZ = Math.min(minZ, positions[index * 3 + 2]);
    maxX = Math.max(maxX, positions[index * 3]);
    maxY = Math.max(maxY, positions[index * 3 + 1]);
    maxZ = Math.max(maxZ, positions[index * 3 + 2]);
  }
  const bboxDiagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const planeTolerance = bboxDiagonal * 1e-3;

  const adjacency = buildMeshEdgeAdjacency(indices);
  const regions = clusterWithFaceCap(triangleCount, triNormal, triCentroid, indices, adjacency, planeTolerance);

  const faces: CadTopologyFace[] = [];
  const faceMesh: MeshFaceMesh[] = [];
  for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
    const region = regions[regionIndex];
    let referenceX = 0;
    let referenceY = 0;
    let referenceZ = 0;
    let largestArea = -1;
    for (const triangle of region) {
      if (triArea[triangle] > largestArea) {
        largestArea = triArea[triangle];
        referenceX = triNormal[triangle * 3];
        referenceY = triNormal[triangle * 3 + 1];
        referenceZ = triNormal[triangle * 3 + 2];
      }
    }
    const referenceLength = Math.hypot(referenceX, referenceY, referenceZ);
    if (referenceLength > 1e-12) {
      referenceX /= referenceLength;
      referenceY /= referenceLength;
      referenceZ /= referenceLength;
    } else {
      referenceX = 0;
      referenceY = 1;
      referenceZ = 0;
    }
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let areaSum = 0;
    let centerX = 0;
    let centerY = 0;
    let centerZ = 0;
    for (const triangle of region) {
      let tnx = triNormal[triangle * 3];
      let tny = triNormal[triangle * 3 + 1];
      let tnz = triNormal[triangle * 3 + 2];
      const length = Math.hypot(tnx, tny, tnz);
      if (length > 1e-12 && tnx * referenceX + tny * referenceY + tnz * referenceZ < 0) {
        tnx = -tnx;
        tny = -tny;
        tnz = -tnz;
      }
      const area = triArea[triangle];
      areaSum += area;
      nx += tnx * area;
      ny += tny * area;
      nz += tnz * area;
      centerX += triCentroid[triangle * 3] * area;
      centerY += triCentroid[triangle * 3 + 1] * area;
      centerZ += triCentroid[triangle * 3 + 2] * area;
    }
    const normalLength = Math.hypot(nx, ny, nz);
    const faceNormal = normalLength > 1e-12
      ? { x: nx / normalLength, y: ny / normalLength, z: nz / normalLength }
      : { x: referenceX, y: referenceY, z: referenceZ };
    const center = areaSum > 1e-12
      ? { x: centerX / areaSum, y: centerY / areaSum, z: centerZ / areaSum }
      : (() => {
          let x = 0;
          let y = 0;
          let z = 0;
          for (const triangle of region) {
            x += triCentroid[triangle * 3];
            y += triCentroid[triangle * 3 + 1];
            z += triCentroid[triangle * 3 + 2];
          }
          return { x: x / region.length, y: y / region.length, z: z / region.length };
        })();
    const { points, boundary } = traceFaceBoundary(region, positions, indices, faceNormal);
    faces.push({ id: regionIndex, center, normal: faceNormal, area: areaSum, points });
    faceMesh.push({ triangles: region, boundary });
  }

  const edges: CadTopologyEdge[] = [];
  let edgeId = 0;
  for (const entry of adjacency.values()) {
    if (entry.a >= vertexCount || entry.b >= vertexCount) continue;
    const ax = positions[entry.a * 3];
    const ay = positions[entry.a * 3 + 1];
    const az = positions[entry.a * 3 + 2];
    const bx = positions[entry.b * 3];
    const by = positions[entry.b * 3 + 1];
    const bz = positions[entry.b * 3 + 2];
    edges.push({
      id: edgeId,
      center: { x: (ax + bx) / 2, y: (ay + by) / 2, z: (az + bz) / 2 },
      points: [ax, ay, az, bx, by, bz],
      endpoints: [
        { x: ax, y: ay, z: az },
        { x: bx, y: by, z: bz },
      ],
    });
    edgeId += 1;
  }

  return { faces, vertices, edges, faceMesh };
}

function clusterWithFaceCap(
  triangleCount: number,
  triNormal: Float32Array,
  triCentroid: Float32Array,
  indices: ArrayLikeIndex,
  adjacency: Map<string, MeshEdgeAdjacency>,
  planeTolerance: number,
): number[][] {
  let regions: number[][] = [];
  for (let attempt = 0; attempt < FACE_COPLANARITY_THRESHOLDS.length; attempt += 1) {
    regions = clusterCoplanarRegions(triangleCount, triNormal, triCentroid, indices, adjacency, FACE_COPLANARITY_THRESHOLDS[attempt], planeTolerance);
    if (regions.length <= FACE_COUNT_CAP || attempt === FACE_COPLANARITY_THRESHOLDS.length - 1) {
      return regions;
    }
  }
  return regions;
}

/**
 * Extrudes a mesh face along its normal by `distance`. Translates every vertex
 * of the face's triangles, removes the original face triangles, adds a cap
 * (same winding when `distance >= 0`, inverted when negative) and closes the
 * boundary with one quad (two triangles) per directed boundary edge. Returns
 * `null` when the face or the distance is unusable. Faces with interior holes
 * are approximated: the through-hole side walls are closed but the annulus at
 * the original level is left open.
 */
export function extrudeMeshFace(
  positions: ArrayLikeNumber,
  indices: ArrayLikeIndex,
  face: MeshFaceMesh,
  normal: Point3,
  distance: number,
): { positions: Float32Array; indices: Uint32Array } | null {
  if (face.triangles.length === 0 || face.boundary.length === 0) return null;
  if (!Number.isFinite(distance) || Math.abs(distance) < 1e-4) return null;
  const normalLength = Math.hypot(normal.x, normal.y, normal.z);
  if (normalLength < 1e-12) return null;
  const nx = normal.x / normalLength;
  const ny = normal.y / normalLength;
  const nz = normal.z / normalLength;

  const vertexCount = Math.floor(positions.length / 3);
  const vertexSet = new Set<number>();
  for (const triangle of face.triangles) {
    const base = triangle * 3;
    if (base + 2 >= indices.length) return null;
    vertexSet.add(indices[base]);
    vertexSet.add(indices[base + 1]);
    vertexSet.add(indices[base + 2]);
  }
  const faceVertices = [...vertexSet].sort((a, b) => a - b);
  for (const vertex of faceVertices) {
    if (vertex < 0 || vertex >= vertexCount) return null;
  }

  const outPositions = new Float32Array(positions.length + faceVertices.length * 3);
  if (positions instanceof Float32Array) {
    outPositions.set(positions);
  } else {
    for (let index = 0; index < positions.length; index += 1) outPositions[index] = positions[index];
  }
  const translatedByOriginal = new Map<number, number>();
  let nextVertex = vertexCount;
  for (const vertex of faceVertices) {
    translatedByOriginal.set(vertex, nextVertex);
    outPositions[nextVertex * 3] = positions[vertex * 3] + nx * distance;
    outPositions[nextVertex * 3 + 1] = positions[vertex * 3 + 1] + ny * distance;
    outPositions[nextVertex * 3 + 2] = positions[vertex * 3 + 2] + nz * distance;
    nextVertex += 1;
  }

  const oldTriangleCount = Math.floor(indices.length / 3);
  const faceTriangleSet = new Set(face.triangles);
  const keptTriangleCount = oldTriangleCount - face.triangles.length;
  const outIndices = new Uint32Array((keptTriangleCount + face.triangles.length + face.boundary.length * 2) * 3);
  let writeIndex = 0;
  for (let triangle = 0; triangle < oldTriangleCount; triangle += 1) {
    if (faceTriangleSet.has(triangle)) continue;
    const base = triangle * 3;
    outIndices[writeIndex] = indices[base];
    outIndices[writeIndex + 1] = indices[base + 1];
    outIndices[writeIndex + 2] = indices[base + 2];
    writeIndex += 3;
  }
  const invertCap = distance < 0;
  for (const triangle of face.triangles) {
    const base = triangle * 3;
    const n0 = translatedByOriginal.get(indices[base]);
    const n1 = translatedByOriginal.get(indices[base + 1]);
    const n2 = translatedByOriginal.get(indices[base + 2]);
    if (n0 === undefined || n1 === undefined || n2 === undefined) return null;
    if (invertCap) {
      outIndices[writeIndex] = n0;
      outIndices[writeIndex + 1] = n2;
      outIndices[writeIndex + 2] = n1;
    } else {
      outIndices[writeIndex] = n0;
      outIndices[writeIndex + 1] = n1;
      outIndices[writeIndex + 2] = n2;
    }
    writeIndex += 3;
  }
  for (const edge of face.boundary) {
    const a2 = translatedByOriginal.get(edge.a);
    const b2 = translatedByOriginal.get(edge.b);
    if (a2 === undefined || b2 === undefined) return null;
    if (distance >= 0) {
      outIndices[writeIndex] = edge.a;
      outIndices[writeIndex + 1] = edge.b;
      outIndices[writeIndex + 2] = b2;
      outIndices[writeIndex + 3] = edge.a;
      outIndices[writeIndex + 4] = b2;
      outIndices[writeIndex + 5] = a2;
    } else {
      outIndices[writeIndex] = edge.a;
      outIndices[writeIndex + 1] = a2;
      outIndices[writeIndex + 2] = b2;
      outIndices[writeIndex + 3] = a2;
      outIndices[writeIndex + 4] = b2;
      outIndices[writeIndex + 5] = edge.b;
    }
    writeIndex += 6;
  }
  return { positions: outPositions, indices: outIndices };
}

/**
 * Computes per-vertex normals by accumulating the normalized face normals of
 * every incident triangle and normalizing the sum. The result is indexed by
 * vertex (same layout as `positions`).
 */
export function recomputeTriangleNormals(positions: ArrayLikeNumber, indices: ArrayLikeIndex): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let triangle = 0; triangle + 2 < indices.length; triangle += 3) {
    const i0 = indices[triangle];
    const i1 = indices[triangle + 1];
    const i2 = indices[triangle + 2];
    const ax = positions[i0 * 3];
    const ay = positions[i0 * 3 + 1];
    const az = positions[i0 * 3 + 2];
    const bx = positions[i1 * 3];
    const by = positions[i1 * 3 + 1];
    const bz = positions[i1 * 3 + 2];
    const cx = positions[i2 * 3];
    const cy = positions[i2 * 3 + 1];
    const cz = positions[i2 * 3 + 2];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    normals[i0 * 3] += nx;
    normals[i0 * 3 + 1] += ny;
    normals[i0 * 3 + 2] += nz;
    normals[i1 * 3] += nx;
    normals[i1 * 3 + 1] += ny;
    normals[i1 * 3 + 2] += nz;
    normals[i2 * 3] += nx;
    normals[i2 * 3 + 1] += ny;
    normals[i2 * 3 + 2] += nz;
  }
  for (let index = 0; index < normals.length; index += 3) {
    const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1;
    normals[index] /= length;
    normals[index + 1] /= length;
    normals[index + 2] /= length;
  }
  return normals;
}
