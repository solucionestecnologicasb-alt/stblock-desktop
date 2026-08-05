/// <reference lib="webworker" />

import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierComponentMesh, CadModifierDisplayEdge, CadModifierEdge, CadModifierMeshPart, CadModifierPrimitivePart, CadModifierQuality, CadModifierWorkerRequest, CadModifierWorkerResponse, CadTopologyEdge, CadTopologyFace, CadTopologyVertex } from "@/lib/cadModifierTypes";
import { CAD_MODIFIER_RUNTIME_BASE, cadModifierTopologyEdgeIsSelectable, cadTransformRequiresGeneralTransform, isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import { moveMeshVerticesNear, splitMeshEdgeAtPoint, type MeshVertexUpdate } from "@/lib/meshTopologyEdit";
import { buildMeshTopology, canonicalizeMesh, extrudeMeshFace, recomputeTriangleNormals } from "@/lib/meshTopology";

const HASH_UPPER_BOUND = 2_147_483_647;
const CAD_EDGE_WIREFRAME_DEFLECTION = 0.035;
const CAD_DISPLAY_EDGE_MIN_ANGLE = 0.75;
const CURVED_SURFACE_TYPES = new Set(["cylinder", "cone", "sphere", "torus", "bspline", "bezier", "offset", "revolution", "extrusion"]);
let kernelPromise: Promise<OcctKernel> | null = null;
let baseShape: ShapeHandle | null = null;
let baseSolids: ShapeHandle[] = [];
let edgeHandles: ShapeHandle[] = [];
let edgeOwners: number[] = [];

type CollectedCadEdgeGeometry = Omit<CadModifierEdge, "display" | "selectable"> & {
  curveType: string;
  surfaceTypes: string[];
  faceAreas: number[];
};
type CollectedCadEdge = CollectedCadEdgeGeometry & Pick<CadModifierEdge, "display" | "selectable">;

function post(message: CadModifierWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

function kernel() {
  const moduleUrl = `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.js`;
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl).then((imported: { default: (options?: { locateFile?: (path: string) => string }) => Promise<unknown> }) => imported.default({
    locateFile: (path) => path.endsWith(".wasm") ? `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.wasm` : path,
  })).then((module) => {
    const KernelConstructor = OcctKernel as unknown as new (rawModule: unknown) => OcctKernel;
    return new KernelConstructor(module);
  });
  return kernelPromise;
}

function releaseSession(cad: OcctKernel) {
  try {
    cad.releaseAll();
  } catch {
    // The arena may already be empty after an operation failure.
  }
  baseShape = null;
  baseSolids = [];
  edgeHandles = [];
  edgeOwners = [];
}

function cadShapeIsValid(cad: OcctKernel, shape: ShapeHandle) {
  const validator = (cad as { isValid?: unknown }).isValid;
  if (typeof validator !== "function") throw new Error("isValid is not a function");
  try {
    return Boolean(validator.call(cad, shape));
  } catch {
    return false;
  }
}

function orientedFaceNormal(cad: OcctKernel, face: ShapeHandle, point: { x: number; y: number; z: number }) {
  const uv = cad.uvFromPoint(face, point);
  const normal = cad.surfaceNormal(face, uv.u, uv.v);
  if (cad.shapeOrientation(face) === "reversed") {
    normal.x *= -1;
    normal.y *= -1;
    normal.z *= -1;
  }
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return { x: normal.x / length, y: normal.y / length, z: normal.z / length };
}

function parseEdgeFaceMap(values: number[]) {
  const map = new Map<number, number[]>();
  for (let index = 0; index + 1 < values.length; ) {
    const edgeHash = values[index++];
    const count = values[index++];
    const faces = values.slice(index, index + count);
    index += count;
    const current = map.get(edgeHash) ?? [];
    faces.forEach((hash) => {
      if (!current.includes(hash)) current.push(hash);
    });
    map.set(edgeHash, current);
  }
  return map;
}

function edgeAngle(cad: OcctKernel, points: number[], faceHashes: number[], faceByHash: Map<number, ShapeHandle>) {
  if (faceHashes.length !== 2 || points.length < 6) return { angle: 0, boundary: faceHashes.length < 2, manifold: false };
  const offset = Math.max(0, Math.floor(points.length / 6) * 3);
  const point = { x: points[offset], y: points[offset + 1], z: points[offset + 2] };
  const faceA = faceByHash.get(faceHashes[0]);
  const faceB = faceByHash.get(faceHashes[1]);
  if (faceA === undefined || faceB === undefined) return { angle: 0, boundary: false, manifold: false };
  try {
    const a = orientedFaceNormal(cad, faceA, point);
    const b = orientedFaceNormal(cad, faceB, point);
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
    const rawAngle = (Math.acos(dot) * 180) / Math.PI;
    return { angle: Math.min(rawAngle, 180 - rawAngle), boundary: false, manifold: true };
  } catch {
    return { angle: 0, boundary: false, manifold: false };
  }
}

function meshPartToAsciiStl(part: CadModifierMeshPart) {
  if (!part.positions || !part.indices) throw new Error("The selected object has no mesh data");
  const lines = new Array<string>(part.indices.length / 3 + 2);
  lines[0] = "solid sketchforge";
  const { positions, indices } = part;
  for (let offset = 0, face = 1; offset + 2 < indices.length; offset += 3, face += 1) {
    const ai = indices[offset] * 3;
    const bi = indices[offset + 1] * 3;
    const ci = indices[offset + 2] * 3;
    const ax = positions[ai];
    const ay = positions[ai + 1];
    const az = positions[ai + 2];
    const bx = positions[bi];
    const by = positions[bi + 1];
    const bz = positions[bi + 2];
    const cx = positions[ci];
    const cy = positions[ci + 1];
    const cz = positions[ci + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    lines[face] = `facet normal ${nx} ${ny} ${nz}\n outer loop\n  vertex ${ax} ${ay} ${az}\n  vertex ${bx} ${by} ${bz}\n  vertex ${cx} ${cy} ${cz}\n endloop\nendfacet`;
  }
  lines[lines.length - 1] = "endsolid sketchforge";
  return lines.join("\n");
}

function isCadTransform(transform: number[] | undefined): transform is number[] {
  return Boolean(transform?.length === 12 && transform.every(Number.isFinite));
}

function isIdentityCadTransform(transform: number[]) {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  return transform.every((value, index) => Math.abs(value - identity[index]) < 1e-9);
}

function applyCadTransform(cad: OcctKernel, shape: ShapeHandle, transform: number[] | undefined) {
  if (!isCadTransform(transform) || isIdentityCadTransform(transform)) return shape;
  if (cadTransformRequiresGeneralTransform(transform)) {
    return cad.generalTransform(shape, transform);
  }
  try {
    return cad.transform(shape, transform);
  } catch {
    return cad.generalTransform(shape, transform);
  }
}

function reconstructPrimitiveSolid(cad: OcctKernel, primitive: CadModifierPrimitivePart) {
  if (primitive.kind !== "box") {
    throw new Error(`Unsupported CAD primitive: ${primitive.kind}`);
  }
  const width = primitive.width;
  const depth = primitive.depth;
  const height = primitive.height;
  if (![width, depth, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("The selected primitive has invalid dimensions");
  }
  const arena = new ShapeArena(cad);
  try {
    const solid = arena.track(cad.makeBoxFromCorners(
      { x: -width / 2, y: 0, z: -depth / 2 },
      { x: width / 2, y: height, z: depth / 2 },
    ));
    const transformed = arena.track(applyCadTransform(cad, solid, primitive.transform));
    if (!cad.isSolid(transformed) || !cadShapeIsValid(cad, transformed)) {
      throw new Error("The selected primitive could not be prepared as a valid CAD solid");
    }
    return arena.keep(transformed);
  } finally {
    arena.releaseAll();
  }
}

function reconstructSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  if (part.primitive) {
    return reconstructPrimitiveSolid(cad, part.primitive);
  }
  const arena = new ShapeArena(cad);
  try {
    if (part.brep) {
      let exact = arena.track(cad.fromBREP(part.brep));
      if (part.brepTransform?.length === 12) exact = arena.track(cad.generalTransform(exact, part.brepTransform));
      const restoredSolids = arena.trackAll(cad.getSubShapes(exact, "solid"));
      if (cadShapeIsValid(cad, exact) && (cad.isSolid(exact) || restoredSolids.length > 0)) {
        return arena.keep(restoredSolids.length === 1 ? restoredSolids[0] : exact);
      }
      exact = arena.track(cad.fixShape(exact));
      exact = arena.track(cad.fixFaceOrientations(exact));
      if (cad.isSolid(exact)) exact = arena.track(cad.healSolid(exact, 1e-5));
      const healedSolids = arena.trackAll(cad.getSubShapes(exact, "solid"));
      if (cadShapeIsValid(cad, exact) && (cad.isSolid(exact) || healedSolids.length > 0)) {
        return arena.keep(healedSolids.length === 1 ? healedSolids[0] : exact);
      }
      throw new Error("The stored CAD feature could not be restored as a valid solid");
    }
    const imported = arena.track(cad.importStl(meshPartToAsciiStl(part)));
    let shape = arena.track(cad.fixShape(imported));
    if (cad.isSolid(shape)) {
      try {
        shape = arena.track(cad.healSolid(shape, 1e-4));
        shape = arena.track(cad.fixFaceOrientations(shape));
        shape = arena.track(cad.removeDegenerateEdges(shape));
        shape = arena.track(cad.unifySameDomain(shape));
      } catch {
        // Fall through to face sewing when the imported solid cannot be healed directly.
      }
      if (cad.isSolid(shape) && cadShapeIsValid(cad, shape)) return arena.keep(shape);
    }

    const faces = arena.trackAll(cad.getSubShapes(imported, "face"));
    if (faces.length === 0) throw new Error("The selected object has no closed faces");
    for (const tolerance of [1e-5, 1e-4, 1e-3, 1e-2]) {
      try {
        let candidate = arena.track(cad.sewAndSolidify(faces, tolerance));
        candidate = arena.track(cad.fixShape(candidate));
        if (cad.isSolid(candidate)) candidate = arena.track(cad.healSolid(candidate, tolerance));
        candidate = arena.track(cad.fixFaceOrientations(candidate));
        candidate = arena.track(cad.removeDegenerateEdges(candidate));
        candidate = arena.track(cad.unifySameDomain(candidate));
        if (cad.isSolid(candidate) && cadShapeIsValid(cad, candidate)) return arena.keep(candidate);
      } catch {
        // Try the next tolerance. Curved tessellations can need looser vertex sewing.
      }
    }
    throw new Error("The selected mesh is open or non-manifold. Repair it before adding edge treatments.");
  } finally {
    arena.releaseAll();
  }
}

function reconstructParts(cad: OcctKernel, parts: CadModifierMeshPart[]) {
  const arena = new ShapeArena(cad);
  try {
    const solids = parts.filter((part) => !part.hole).map((part) => arena.track(reconstructSolid(cad, part)));
    const holes = parts.filter((part) => part.hole).map((part) => arena.track(reconstructSolid(cad, part)));
    if (solids.length === 0) throw new Error("The group has no solid body to modify");
    let result = solids[0];
    for (let index = 1; index < solids.length; index += 1) {
      result = arena.track(cad.fuse(result, solids[index]));
      result = arena.track(cad.simplify(result));
      result = arena.track(cad.unifySameDomain(result));
    }
    for (const hole of holes) {
      result = arena.track(cad.cut(result, hole));
      result = arena.track(cad.simplify(result));
      result = arena.track(cad.unifySameDomain(result));
    }
    result = arena.track(cad.fixShape(result));
    result = arena.track(cad.simplify(result));
    result = arena.track(cad.unifySameDomain(result));
    if (!cadShapeIsValid(cad, result)) throw new Error("The grouped solid could not be repaired into valid topology");
    return arena.keep(result);
  } finally {
    arena.releaseAll();
  }
}

/**
 * Reconstructs the group of parts into a CAD solid when possible. Imported
 * "triangle soup" meshes (non-manifold, open) cannot be healed into a closed
 * solid and `reconstructParts` throws. The topology editing pipeline catches
 * that and falls back to pure mesh topology; the edge-treatment handlers
 * (`prepare`/`preview`/`boolean`) keep calling `reconstructParts` directly so
 * they still surface the error to the user.
 */
function tryReconstructParts(cad: OcctKernel, parts: CadModifierMeshPart[]): ShapeHandle | null {
  try {
    return reconstructParts(cad, parts);
  } catch (error) {
    console.warn(`[TopoEdit] OCCT reconstruction failed, falling back to mesh topology: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Concatenates the positions of every part and remaps indices so the group is
 * one flat triangle mesh. Holes are included (their triangles are merged); the
 * mesh fallback cannot perform a real boolean cut.
 */
function mergedMeshFromParts(parts: CadModifierMeshPart[]): { positions: Float32Array; indices: Uint32Array } {
  const validParts = parts.filter((part): part is CadModifierMeshPart & { positions: Float32Array; indices: Uint32Array } => Boolean(part.positions && part.indices));
  let vertexCount = 0;
  let triangleCount = 0;
  for (const part of validParts) {
    vertexCount += part.positions.length / 3;
    triangleCount += part.indices.length / 3;
  }
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(triangleCount * 3);
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const part of validParts) {
    positions.set(part.positions, vertexOffset * 3);
    for (let index = 0; index < part.indices.length; index += 1) {
      indices[indexOffset + index] = part.indices[index] + vertexOffset;
    }
    vertexOffset += part.positions.length / 3;
    indexOffset += part.indices.length;
  }
  return { positions, indices };
}

function canonicalMeshFromParts(parts: CadModifierMeshPart[]) {
  const merged = mergedMeshFromParts(parts);
  return canonicalizeMesh(merged.positions, merged.indices);
}

function meshEditTolerance(positions: Float32Array) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxX = Math.max(maxX, positions[index]);
    maxY = Math.max(maxY, positions[index + 1]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  const diagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
  return Math.max(0.01, diagonal * 1e-4);
}

function findFaceByCenter(faces: CadTopologyFace[], center: { x: number; y: number; z: number }, tolerance: number) {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < faces.length; index += 1) {
    const distance = Math.hypot(faces[index].center.x - center.x, faces[index].center.y - center.y, faces[index].center.z - center.z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best >= 0 && bestDistance <= tolerance ? best : -1;
}

function faceVertexUpdatesForMesh(
  canonicalPositions: Float32Array,
  canonicalIndices: Uint32Array,
  triangles: number[],
  offset: { x: number; y: number; z: number },
): MeshVertexUpdate[] {
  const updates: MeshVertexUpdate[] = [];
  const vertexSet = new Set<number>();
  for (const triangle of triangles) {
    const base = triangle * 3;
    vertexSet.add(canonicalIndices[base]);
    vertexSet.add(canonicalIndices[base + 1]);
    vertexSet.add(canonicalIndices[base + 2]);
  }
  for (const vertex of vertexSet) {
    const from = { x: canonicalPositions[vertex * 3], y: canonicalPositions[vertex * 3 + 1], z: canonicalPositions[vertex * 3 + 2] };
    updates.push({ from, to: { x: from.x + offset.x, y: from.y + offset.y, z: from.z + offset.z } });
  }
  return updates;
}

/**
 * Posts a `preview` response computed purely from mesh positions/indices
 * (mesh fallback mode). `brep` is empty, so the frontend treats the result as
 * a non-CAD mesh edit and keeps it in mesh mode.
 */
function postMeshPreview(requestId: number, positions: Float32Array, indices: Uint32Array) {
  const normals = recomputeTriangleNormals(positions, indices);
  post(
    { type: "preview", requestId, positions, normals, indices, triangleCount: Math.floor(indices.length / 3), brep: "", displayEdges: [] },
    [positions.buffer, normals.buffer, indices.buffer],
  );
}

function isDisplayCadEdge(edge: CollectedCadEdgeGeometry) {
  if (!edge.manifold || edge.boundary || edge.points.length < 6) return false;
  const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
  const touchesCurvedSurface = edge.surfaceTypes.some((surfaceType) => CURVED_SURFACE_TYPES.has(surfaceType));
  const isCurvedEdge = edge.curveType !== "line";
  return effectiveAngle + 1e-3 >= CAD_DISPLAY_EDGE_MIN_ANGLE || touchesCurvedSurface || isCurvedEdge;
}

function treatmentDetailFaceAreaLimit(faceAreas: number[]) {
  const finiteAreas = faceAreas.filter((area) => Number.isFinite(area) && area > 1e-8);
  if (finiteAreas.length === 0) return 0;
  return Math.max(1e-8, Math.max(...finiteAreas) * 0.3);
}

function touchesTreatmentDetailFace(edge: CollectedCadEdgeGeometry, areaLimit: number) {
  return areaLimit > 0 && edge.faceAreas.some((area) => area > 0 && area <= areaLimit);
}

function isModifierDisplayCadEdge(edge: CollectedCadEdgeGeometry, treatmentAreaLimit: number) {
  return isDisplayCadEdge(edge) && !touchesTreatmentDetailFace(edge, treatmentAreaLimit);
}

function releaseHandles(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // A failed topology operation can invalidate temporary handles.
    }
  });
}

/**
 * Tracks OCCT shape handles created during a reconstruction so they are all
 * released exactly once when the operation finishes (success or failure). The
 * `Set` guarantees each handle is released at most once, so a handle produced by
 * an in-place operation (e.g. `fixShape`/`transform` returning its input) and a
 * freshly-created handle are both safe. Callers `keep` the handle they return so
 * ownership transfers out of the arena.
 */
class ShapeArena {
  private owned = new Set<ShapeHandle>();

  constructor(private cad: OcctKernel) {}

  track(handle: ShapeHandle | null | undefined): ShapeHandle {
    if (handle != null) this.owned.add(handle);
    return handle as ShapeHandle;
  }

  trackAll(handles: ShapeHandle[]): ShapeHandle[] {
    handles.forEach((handle) => this.owned.add(handle));
    return handles;
  }

  keep(handle: ShapeHandle): ShapeHandle {
    this.owned.delete(handle);
    return handle;
  }

  releaseAll() {
    for (const handle of this.owned) {
      try {
        this.cad.release(handle);
      } catch {
        // A failed topology operation can invalidate temporary handles.
      }
    }
    this.owned.clear();
  }
}

function collectEdges(cad: OcctKernel, shape: ShapeHandle, sharpAngle: number, suppressTreatmentDetailEdges = false, retainEdgeHandles = false) {
  const handles = cad.getSubShapes(shape, "edge");
  const faces = cad.getSubShapes(shape, "face");
  let keepEdgeHandles = false;
  try {
    const faceByHash = new Map(faces.map((face) => [cad.hashCode(face, HASH_UPPER_BOUND), face]));
    const faceAreaByHash = new Map<number, number>();
    faces.forEach((face) => {
      const hash = cad.hashCode(face, HASH_UPPER_BOUND);
      let area = 0;
      try {
        area = Math.abs(cad.getSurfaceArea(face));
      } catch {
        area = 0;
      }
      faceAreaByHash.set(hash, area);
    });
    const treatmentAreaLimit = suppressTreatmentDetailEdges ? treatmentDetailFaceAreaLimit([...faceAreaByHash.values()]) : 0;
    const adjacentFaces = parseEdgeFaceMap(cad.edgeToFaceMap(shape, HASH_UPPER_BOUND));
    const wire = cad.wireframe(shape, CAD_EDGE_WIREFRAME_DEFLECTION);
    const pointsByHash = new Map<number, number[]>();
    for (let index = 0; index + 2 < wire.edgeGroups.length; index += 3) {
      const start = wire.edgeGroups[index];
      const count = wire.edgeGroups[index + 1];
      const hash = wire.edgeGroups[index + 2];
      if (!pointsByHash.has(hash)) pointsByHash.set(hash, Array.from(wire.points.slice(start, start + count)));
    }

    const collectedEdges = handles.map((handle, id) => {
      const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
      const faceHashes = adjacentFaces.get(hash) ?? [];
      const points = pointsByHash.get(hash) ?? [];
      const classification = edgeAngle(cad, points, faceHashes, faceByHash);
      const faceAreas = faceHashes.map((faceHash) => faceAreaByHash.get(faceHash) ?? 0);
      const surfaceTypes = faceHashes
        .map((faceHash) => faceByHash.get(faceHash))
        .filter((face): face is ShapeHandle => face !== undefined)
        .map((face) => {
          try {
            return cad.surfaceType(face);
          } catch {
            return "unknown";
          }
        });
      let curveType = "line";
      try {
        curveType = cad.curveType(handle);
      } catch {
        curveType = "unknown";
      }
      return { id, points, ...classification, curveType, surfaceTypes, faceAreas };
    }).filter((edge) => edge.points.length >= 6);
    const edges: CollectedCadEdge[] = collectedEdges.map((edge) => {
      const display = treatmentAreaLimit > 0 ? isModifierDisplayCadEdge(edge, treatmentAreaLimit) : isDisplayCadEdge(edge);
      return {
        ...edge,
        display,
        selectable: cadModifierTopologyEdgeIsSelectable(edge),
      };
    });
    const selectableEdgeIds = edges.filter((edge) => edge.selectable && edge.angle + 1e-3 >= sharpAngle).map((edge) => edge.id);
    const displayEdges = cadDisplayEdgesFromCollected(edges);
    keepEdgeHandles = retainEdgeHandles;
    return { handles, edges: edges.map(({ curveType: _curveType, surfaceTypes: _surfaceTypes, faceAreas: _faceAreas, ...edge }) => edge), selectableEdgeIds, displayEdges };
  } finally {
    releaseHandles(cad, faces);
    if (!keepEdgeHandles) releaseHandles(cad, handles);
  }
}

function cadDisplayEdgesFromCollected(edges: CollectedCadEdge[]): CadModifierDisplayEdge[] {
  return edges
    .filter((edge) => edge.display)
    .map((edge) => ({ points: edge.points }));
}

function collectTopology(cad: OcctKernel, shape: ShapeHandle) {
  const faceHandles = cad.getSubShapes(shape, "face");
  const faces: CadTopologyFace[] = [];
  try {
    faceHandles.forEach((face) => {
      const id = cad.hashCode(face, HASH_UPPER_BOUND);
      let center = { x: 0, y: 0, z: 0 };
      let area = 0;
      try {
        center = cad.getSurfaceCenterOfMass(face);
        area = Math.abs(cad.getSurfaceArea(face));
      } catch {
        // A degenerate face can fail center-of-mass; keep safe defaults.
      }
      let normal = { x: 0, y: 1, z: 0 };
      try {
        normal = orientedFaceNormal(cad, face, center);
      } catch {
        // Fall back to world-up when the surface cannot be evaluated.
      }
      const points: number[] = [];
      const edgeHandles = cad.getSubShapes(face, "edge");
      try {
        edgeHandles.forEach((edge) => {
          const { first, last } = cad.curveParameters(edge);
          const samples = 10;
          for (let index = 0; index <= samples; index += 1) {
            const p = cad.curvePointAtParam(edge, first + ((last - first) * index) / samples);
            points.push(p.x, p.y, p.z);
          }
        });
      } catch {
        // Boundary sampling is best-effort; an empty polyline disables hover fill.
      } finally {
        releaseHandles(cad, edgeHandles);
      }
      faces.push({ id, center, normal, area, points });
    });
  } finally {
    releaseHandles(cad, faceHandles);
  }
  const vertexHandles = cad.getSubShapes(shape, "vertex");
  const vertices: CadTopologyVertex[] = [];
  try {
    vertexHandles.forEach((vertex) => {
      const position = cad.vertexPosition(vertex);
      vertices.push({ id: cad.hashCode(vertex, HASH_UPPER_BOUND), x: position.x, y: position.y, z: position.z });
    });
  } finally {
    releaseHandles(cad, vertexHandles);
  }
  const edgeHandles = cad.getSubShapes(shape, "edge");
  const edges: CadTopologyEdge[] = [];
  try {
    edgeHandles.forEach((edge) => {
      const id = cad.hashCode(edge, HASH_UPPER_BOUND);
      const points: number[] = [];
      try {
        const { first, last } = cad.curveParameters(edge);
        const samples = 10;
        for (let index = 0; index <= samples; index += 1) {
          const p = cad.curvePointAtParam(edge, first + ((last - first) * index) / samples);
          points.push(p.x, p.y, p.z);
        }
      } catch {
        // Curve sampling is best-effort; an empty polyline disables edge picking.
      }
      let endpoints: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }] = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ];
      try {
        const endpointHandles = cad.getSubShapes(edge, "vertex");
        try {
          let index = 0;
          for (const endpoint of endpointHandles) {
            if (index >= 2) break;
            const position = cad.vertexPosition(endpoint);
            endpoints[index] = { x: position.x, y: position.y, z: position.z };
            index += 1;
          }
        } finally {
          releaseHandles(cad, endpointHandles);
        }
      } catch {
        // Fall back to the polyline endpoints when vertex sub-shapes are unavailable.
        if (points.length >= 6) {
          endpoints[0] = { x: points[0], y: points[1], z: points[2] };
          endpoints[1] = { x: points[points.length - 3], y: points[points.length - 2], z: points[points.length - 1] };
        }
      }
      const center = { x: (endpoints[0].x + endpoints[1].x) / 2, y: (endpoints[0].y + endpoints[1].y) / 2, z: (endpoints[0].z + endpoints[1].z) / 2 };
      edges.push({ id, center, points, endpoints });
    });
  } finally {
    releaseHandles(cad, edgeHandles);
  }
  return { faces, vertices, edges };
}

function tessellationOptions(quality: CadModifierQuality, amount: number) {
  if (quality === "draft") return { linearDeflection: Math.max(0.12, amount / 3), angularDeflection: 0.42 };
  if (quality === "fine") return { linearDeflection: Math.max(0.025, amount / 12), angularDeflection: 0.1 };
  return { linearDeflection: Math.max(0.055, amount / 7), angularDeflection: 0.2 };
}

function copyCadMesh(mesh: { positions: Float32Array; normals: Float32Array; indices: Uint32Array; triangleCount: number }) {
  return {
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.indices),
    triangleCount: mesh.triangleCount,
  };
}

type TopologyEditUpdate = { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } };

function topologyEditTolerance(cad: OcctKernel, solid: ShapeHandle) {
  const bounds = cad.getBoundingBox(solid);
  const diagonal = Math.hypot(bounds.xmax - bounds.xmin, bounds.ymax - bounds.ymin, bounds.zmax - bounds.zmin);
  return Math.max(0.01, diagonal * 1e-4);
}

/**
 * Applies a set of mesh-vertex displacements to a solid: tessellates the
 * solid finely, moves the matching vertices, re-solidifies from the deformed
 * mesh, and returns a preview tessellation of the result.
 */
function deformSolidWithMeshUpdates(cad: OcctKernel, solid: ShapeHandle, updates: TopologyEditUpdate[]) {
  const mesh = copyCadMesh(cad.tessellate(solid, { linearDeflection: 0.03, angularDeflection: 0.15 }));
  const tolerance = topologyEditTolerance(cad, solid);
  const positions = moveMeshVerticesNear(mesh.positions, updates, tolerance);
  let movedVerts = 0;
  for (let index = 0; index < mesh.positions.length; index += 3) {
    if (positions[index] !== mesh.positions[index] || positions[index + 1] !== mesh.positions[index + 1] || positions[index + 2] !== mesh.positions[index + 2]) movedVerts += 1;
  }
  console.log(`[TopoEdit] deform: in=${mesh.positions.length / 3} verts / ${mesh.indices.length / 3} tris, tol=${tolerance.toFixed(4)}, updates=${updates.length}, movedVerts=${movedVerts}`);
  const newSolid = reconstructSolid(cad, { positions, indices: mesh.indices, hole: false });
  try {
    const options = { linearDeflection: 0.1, angularDeflection: 0.25 };
    const preview = copyCadMesh(cad.tessellate(newSolid, options));
    const displayEdges = collectEdges(cad, newSolid, 0).displayEdges;
    const brep = cad.toBREP(newSolid);
    console.log(`[TopoEdit] deform -> solid: ${preview.triangleCount} tris, brep=${(brep.length / 1024).toFixed(1)}KB`);
    return {
      positions: preview.positions,
      normals: preview.normals,
      indices: preview.indices,
      triangleCount: preview.triangleCount,
      brep,
      displayEdges,
    };
  } finally {
    cad.release(newSolid);
  }
}

function isImportStlWasmFault(message: string) {
  return /importStl:.*WebAssembly\.Exception/i.test(message);
}

function isMissingValidatorFault(message: string) {
  return /isValid/i.test(message) && /null|not a function|undefined/i.test(message);
}

self.onmessage = async (event: MessageEvent<CadModifierWorkerRequest>) => {
  const request = event.data;
  console.log(`[TopoEdit] worker onmessage: type=${request.type} reqId=${request.requestId}`);
  let cad: OcctKernel | null = null;
  try {
    cad = await kernel();
    const activeCad = cad;
    if (request.type === "dispose") {
      releaseSession(activeCad);
      post({ type: "disposed", requestId: request.requestId });
      return;
    }
    if (request.type === "prepare") {
      releaseSession(activeCad);
      baseShape = reconstructParts(activeCad, request.parts);
      const collected = collectEdges(activeCad, baseShape, request.sharpAngle, Boolean(request.suppressTreatmentDetailEdges), true);
      edgeHandles = collected.handles;
      baseSolids = activeCad.isSolid(baseShape) ? [baseShape] : activeCad.getSubShapes(baseShape, "solid");
      if (baseSolids.length === 0) throw new Error("The selected group contains no closed solid components");
      const ownerEdgeHandles = baseSolids.map((solid) => activeCad.getSubShapes(solid, "edge"));
      try {
        const ownerCandidates = new Map<number, Array<{ owner: number; edge: ShapeHandle }>>();
        ownerEdgeHandles.forEach((componentEdges, owner) => {
          componentEdges.forEach((edge) => {
            const hash = activeCad.hashCode(edge, HASH_UPPER_BOUND);
            const candidates = ownerCandidates.get(hash) ?? [];
            candidates.push({ owner, edge });
            ownerCandidates.set(hash, candidates);
          });
        });
        edgeOwners = edgeHandles.map((edge) => {
          const hash = activeCad.hashCode(edge, HASH_UPPER_BOUND);
          const candidates = ownerCandidates.get(hash) ?? [];
          const exact = candidates.find((candidate) => activeCad.isSame(edge, candidate.edge));
          if (!exact) throw new Error("A CAD edge could not be mapped to its solid component; restart the edge tool");
          return exact.owner;
        });
      } finally {
        ownerEdgeHandles.forEach((componentEdges) => releaseHandles(activeCad, componentEdges));
      }
      post({
        type: "ready",
        requestId: request.requestId,
        edges: collected.edges.map((edge) => ({ ...edge, owner: edgeOwners[edge.id] ?? 0 })),
        selectableEdgeIds: collected.selectableEdgeIds,
        sourceType: activeCad.getShapeType(baseShape),
      });
      return;
    }
    if (request.type === "collectTopology") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid) {
        try {
          const topology = collectTopology(activeCad, solid);
          post({ type: "topology", requestId: request.requestId, mode: "occt", faces: topology.faces, vertices: topology.vertices, edges: topology.edges });
        } finally {
          activeCad.release(solid);
        }
      } else {
        const canonical = canonicalMeshFromParts(request.parts);
        const topology = buildMeshTopology(canonical.positions, canonical.indices);
        post({ type: "topology", requestId: request.requestId, mode: "mesh", faces: topology.faces, vertices: topology.vertices, edges: topology.edges });
      }
      return;
    }
    if (request.type === "boolean") {
      releaseSession(activeCad);
      const baseSolid = reconstructParts(activeCad, request.base);
      try {
        const toolSolid = reconstructParts(activeCad, request.tool);
        try {
          let result: ShapeHandle = request.operation === "cut" ? activeCad.cut(baseSolid, toolSolid) : activeCad.fuse(baseSolid, toolSolid);
          result = activeCad.simplify(result);
          result = activeCad.unifySameDomain(result);
          result = activeCad.fixShape(result);
          if (!cadShapeIsValid(activeCad, result)) throw new Error("The combined shape is invalid; adjust the sketch or the depth");
          const options = { linearDeflection: 0.1, angularDeflection: 0.25 };
          const mesh = copyCadMesh(activeCad.tessellate(result, options));
          const displayEdges = collectEdges(activeCad, result, 0).displayEdges;
          const brep = activeCad.toBREP(result);
          post(
            { type: "preview", requestId: request.requestId, positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, triangleCount: mesh.triangleCount, brep, displayEdges },
            [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer],
          );
        } finally {
          activeCad.release(toolSolid);
        }
      } finally {
        activeCad.release(baseSolid);
      }
      return;
    }
    if (request.type === "extrudeFace") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const topology = buildMeshTopology(canonical.positions, canonical.indices);
        const faceIndex = findFaceByCenter(topology.faces, request.faceCenter, tolerance);
        if (faceIndex < 0) throw new Error("The selected face no longer exists; pick it again");
        const result = extrudeMeshFace(canonical.positions, canonical.indices, topology.faceMesh[faceIndex], topology.faces[faceIndex].normal, request.distance);
        if (result === null) throw new Error("No se pudo empujar o estirar la cara; prueba con otra cara");
        postMeshPreview(request.requestId, result.positions, result.indices);
        return;
      }
      try {
        const faceHandles = activeCad.getSubShapes(solid, "face");
        let face: ShapeHandle | null = null;
        try {
          const tolerance = topologyEditTolerance(activeCad, solid);
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const candidate of faceHandles) {
            let candidateCenter: { x: number; y: number; z: number };
            try {
              candidateCenter = activeCad.getSurfaceCenterOfMass(candidate);
            } catch {
              // A degenerate face can fail center-of-mass; skip it.
              continue;
            }
            const distance = Math.hypot(
              candidateCenter.x - request.faceCenter.x,
              candidateCenter.y - request.faceCenter.y,
              candidateCenter.z - request.faceCenter.z,
            );
            if (distance < bestDistance) {
              bestDistance = distance;
              face = candidate;
            }
          }
          if (face === null || bestDistance > tolerance) throw new Error("The selected face no longer exists; pick it again");
          console.log(`[TopoEdit] extrudeFace: reqId=${request.requestId} center=(${request.faceCenter.x.toFixed(3)},${request.faceCenter.y.toFixed(3)},${request.faceCenter.z.toFixed(3)}) dist=${Math.abs(request.distance).toFixed(3)} bestFaceDist=${bestDistance.toExponential(2)}`);
          const center = activeCad.getSurfaceCenterOfMass(face);
          const normal = orientedFaceNormal(activeCad, face, center);
          const magnitude = Math.abs(request.distance);
          if (magnitude < 1e-4) throw new Error("Drag the face by more than 0.01 mm");
          const outward = request.distance >= 0;
          const dx = normal.x * magnitude;
          const dy = normal.y * magnitude;
          const dz = normal.z * magnitude;
          // Positive distance extrudes the face outward (boss). Negative extrudes
          // inward; the prism is then nudged outward so the pocket opens cleanly.
          let prism = outward
            ? activeCad.extrude(face, dx, dy, dz)
            : activeCad.extrude(face, -dx, -dy, -dz);
          try {
            if (!outward) {
              const overhang = Math.min(0.25, magnitude * 0.5);
              const translated = activeCad.translate(prism, normal.x * overhang, normal.y * overhang, normal.z * overhang);
              activeCad.release(prism);
              prism = translated;
            }
            let result: ShapeHandle = outward ? activeCad.fuse(solid, prism) : activeCad.cut(solid, prism);
            result = activeCad.simplify(result);
            result = activeCad.unifySameDomain(result);
            result = activeCad.fixShape(result);
            if (!cadShapeIsValid(activeCad, result)) throw new Error("Push/pull produced an invalid solid; try a smaller distance");
            const options = { linearDeflection: 0.1, angularDeflection: 0.25 };
            const mesh = copyCadMesh(activeCad.tessellate(result, options));
            const displayEdges = collectEdges(activeCad, result, 0).displayEdges;
            const brep = activeCad.toBREP(result);
            post(
              { type: "preview", requestId: request.requestId, positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, triangleCount: mesh.triangleCount, brep, displayEdges },
              [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer],
            );
          } finally {
            activeCad.release(prism);
          }
        } finally {
          releaseHandles(activeCad, faceHandles);
        }
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (request.type === "moveTopologyVertex") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const moved = moveMeshVerticesNear(canonical.positions, [{ from: request.from, to: request.position }], tolerance);
        postMeshPreview(request.requestId, moved, canonical.indices);
        return;
      }
      try {
        console.log(`[TopoEdit] moveVertex: reqId=${request.requestId} from=(${request.from.x.toFixed(3)},${request.from.y.toFixed(3)},${request.from.z.toFixed(3)}) to=(${request.position.x.toFixed(3)},${request.position.y.toFixed(3)},${request.position.z.toFixed(3)})`);
        const result = deformSolidWithMeshUpdates(activeCad, solid, [{ from: request.from, to: request.position }]);
        post(
          { type: "preview", requestId: request.requestId, positions: result.positions, normals: result.normals, indices: result.indices, triangleCount: result.triangleCount, brep: result.brep, displayEdges: result.displayEdges },
          [result.positions.buffer, result.normals.buffer, result.indices.buffer],
        );
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (request.type === "moveTopologyFace") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const topology = buildMeshTopology(canonical.positions, canonical.indices);
        const faceIndex = findFaceByCenter(topology.faces, request.faceCenter, tolerance);
        if (faceIndex < 0) throw new Error("The selected face no longer exists; pick it again");
        const updates = faceVertexUpdatesForMesh(canonical.positions, canonical.indices, topology.faceMesh[faceIndex].triangles, request.offset);
        const moved = moveMeshVerticesNear(canonical.positions, updates, tolerance);
        postMeshPreview(request.requestId, moved, canonical.indices);
        return;
      }
      try {
        const faceHandles = activeCad.getSubShapes(solid, "face");
        let face: ShapeHandle | null = null;
        try {
          const tolerance = topologyEditTolerance(activeCad, solid);
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const candidate of faceHandles) {
            let candidateCenter: { x: number; y: number; z: number };
            try {
              candidateCenter = activeCad.getSurfaceCenterOfMass(candidate);
            } catch {
              // A degenerate face can fail center-of-mass; skip it.
              continue;
            }
            const distance = Math.hypot(
              candidateCenter.x - request.faceCenter.x,
              candidateCenter.y - request.faceCenter.y,
              candidateCenter.z - request.faceCenter.z,
            );
            if (distance < bestDistance) {
              bestDistance = distance;
              face = candidate;
            }
          }
          if (face === null || bestDistance > tolerance) throw new Error("The selected face no longer exists; pick it again");
          const vertexHandles = activeCad.getSubShapes(face, "vertex");
          const updates: TopologyEditUpdate[] = [];
          try {
            for (const vertex of vertexHandles) {
              const from = activeCad.vertexPosition(vertex);
              updates.push({ from, to: { x: from.x + request.offset.x, y: from.y + request.offset.y, z: from.z + request.offset.z } });
            }
          } finally {
            releaseHandles(activeCad, vertexHandles);
          }
          console.log(`[TopoEdit] moveFace: reqId=${request.requestId} center=(${request.faceCenter.x.toFixed(3)},${request.faceCenter.y.toFixed(3)},${request.faceCenter.z.toFixed(3)}) faceVerts=${updates.length} offset=(${request.offset.x.toFixed(3)},${request.offset.y.toFixed(3)},${request.offset.z.toFixed(3)}) bestFaceDist=${bestDistance.toExponential(2)}`);
          const result = deformSolidWithMeshUpdates(activeCad, solid, updates);
          post(
            { type: "preview", requestId: request.requestId, positions: result.positions, normals: result.normals, indices: result.indices, triangleCount: result.triangleCount, brep: result.brep, displayEdges: result.displayEdges },
            [result.positions.buffer, result.normals.buffer, result.indices.buffer],
          );
        } finally {
          releaseHandles(activeCad, faceHandles);
        }
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (request.type === "addVertexOnEdge") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const split = splitMeshEdgeAtPoint(canonical.positions, canonical.indices, request.position, tolerance);
        if (split === null) throw new Error("Click closer to an edge to insert a vertex");
        postMeshPreview(request.requestId, split.positions, split.indices);
        return;
      }
      try {
        const tolerance = topologyEditTolerance(activeCad, solid);
        const edgeHandles = activeCad.getSubShapes(solid, "edge");
        let projection: { x: number; y: number; z: number } | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        try {
          for (const edge of edgeHandles) {
            try {
              const projected = activeCad.projectPointOnEdge(edge, request.position);
              const distance = Math.hypot(
                projected.point.x - request.position.x,
                projected.point.y - request.position.y,
                projected.point.z - request.position.z,
              );
              if (distance < nearestDistance) {
                nearestDistance = distance;
                projection = projected.point;
              }
            } catch {
              // A degenerate edge can fail projection; skip it.
            }
          }
          if (projection === null) throw new Error("No edge found near the click point");
          if (nearestDistance > tolerance) throw new Error("Click closer to an edge to insert a vertex");
        } finally {
          releaseHandles(activeCad, edgeHandles);
        }
        console.log(`[TopoEdit] addVertex: reqId=${request.requestId} point=(${request.position.x.toFixed(3)},${request.position.y.toFixed(3)},${request.position.z.toFixed(3)}) nearestDist=${nearestDistance.toFixed(4)} tol=${tolerance.toFixed(4)}`);
        const mesh = copyCadMesh(activeCad.tessellate(solid, { linearDeflection: 0.03, angularDeflection: 0.15 }));
        const split = splitMeshEdgeAtPoint(mesh.positions, mesh.indices, projection, tolerance);
        if (split === null) throw new Error("Could not insert a vertex on the nearest edge");
        console.log(`[TopoEdit] addVertex: split newVertex=${split.newVertexIndex}, out=${split.positions.length / 3} verts / ${split.indices.length / 3} tris`);
        const newSolid = reconstructSolid(activeCad, { positions: split.positions, indices: split.indices, hole: false });
        try {
          const options = { linearDeflection: 0.1, angularDeflection: 0.25 };
          const preview = copyCadMesh(activeCad.tessellate(newSolid, options));
          const displayEdges = collectEdges(activeCad, newSolid, 0).displayEdges;
          const brep = activeCad.toBREP(newSolid);
          post(
            { type: "preview", requestId: request.requestId, positions: preview.positions, normals: preview.normals, indices: preview.indices, triangleCount: preview.triangleCount, brep, displayEdges },
            [preview.positions.buffer, preview.normals.buffer, preview.indices.buffer],
          );
        } finally {
          activeCad.release(newSolid);
        }
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (request.type === "moveTopologyEdge") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const moved = moveMeshVerticesNear(canonical.positions, request.endpoints, tolerance);
        postMeshPreview(request.requestId, moved, canonical.indices);
        return;
      }
      try {
        console.log(`[TopoEdit] moveEdge: reqId=${request.requestId} endpoints=${request.endpoints.length}`);
        const result = deformSolidWithMeshUpdates(activeCad, solid, request.endpoints);
        post(
          { type: "preview", requestId: request.requestId, positions: result.positions, normals: result.normals, indices: result.indices, triangleCount: result.triangleCount, brep: result.brep, displayEdges: result.displayEdges },
          [result.positions.buffer, result.normals.buffer, result.indices.buffer],
        );
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (request.type === "moveTopologyVertices") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const moved = moveMeshVerticesNear(canonical.positions, request.updates, tolerance);
        postMeshPreview(request.requestId, moved, canonical.indices);
        return;
      }
      try {
        console.log(`[TopoEdit] moveVertices: reqId=${request.requestId} updates=${request.updates.length}`);
        const result = deformSolidWithMeshUpdates(activeCad, solid, request.updates);
        post(
          { type: "preview", requestId: request.requestId, positions: result.positions, normals: result.normals, indices: result.indices, triangleCount: result.triangleCount, brep: result.brep, displayEdges: result.displayEdges },
          [result.positions.buffer, result.normals.buffer, result.indices.buffer],
        );
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (request.type === "moveTopologyFaces") {
      releaseSession(activeCad);
      const solid = tryReconstructParts(activeCad, request.parts);
      if (solid === null) {
        const canonical = canonicalMeshFromParts(request.parts);
        const tolerance = meshEditTolerance(canonical.positions);
        const topology = buildMeshTopology(canonical.positions, canonical.indices);
        const updates: MeshVertexUpdate[] = [];
        for (const spec of request.faces) {
          const faceIndex = findFaceByCenter(topology.faces, spec.center, tolerance);
          if (faceIndex < 0) {
            throw new Error("Una cara seleccionada ya no existe; vuelve a seleccionarla");
          }
          updates.push(...faceVertexUpdatesForMesh(canonical.positions, canonical.indices, topology.faceMesh[faceIndex].triangles, spec.offset));
        }
        const moved = moveMeshVerticesNear(canonical.positions, updates, tolerance);
        postMeshPreview(request.requestId, moved, canonical.indices);
        return;
      }
      try {
        const faceHandles = activeCad.getSubShapes(solid, "face");
        const updates: TopologyEditUpdate[] = [];
        let locatedFaces = 0;
        try {
          const tolerance = topologyEditTolerance(activeCad, solid);
          for (const spec of request.faces) {
            let face: ShapeHandle | null = null;
            let bestDistance = Number.POSITIVE_INFINITY;
            for (const candidate of faceHandles) {
              let candidateCenter: { x: number; y: number; z: number };
              try {
                candidateCenter = activeCad.getSurfaceCenterOfMass(candidate);
              } catch {
                // A degenerate face can fail center-of-mass; skip it.
                continue;
              }
              const distance = Math.hypot(
                candidateCenter.x - spec.center.x,
                candidateCenter.y - spec.center.y,
                candidateCenter.z - spec.center.z,
              );
              if (distance < bestDistance) {
                bestDistance = distance;
                face = candidate;
              }
            }
            if (face === null || bestDistance > tolerance) {
              throw new Error("Una cara seleccionada ya no existe; vuelve a seleccionarla");
            }
            locatedFaces += 1;
            const vertexHandles = activeCad.getSubShapes(face, "vertex");
            try {
              for (const vertex of vertexHandles) {
                const from = activeCad.vertexPosition(vertex);
                updates.push({ from, to: { x: from.x + spec.offset.x, y: from.y + spec.offset.y, z: from.z + spec.offset.z } });
              }
            } finally {
              releaseHandles(activeCad, vertexHandles);
            }
          }
          console.log(`[TopoEdit] moveFaces: reqId=${request.requestId} faces=${request.faces.length} located=${locatedFaces} updates=${updates.length} tol=${tolerance.toExponential(2)}`);
          const result = deformSolidWithMeshUpdates(activeCad, solid, updates);
          post(
            { type: "preview", requestId: request.requestId, positions: result.positions, normals: result.normals, indices: result.indices, triangleCount: result.triangleCount, brep: result.brep, displayEdges: result.displayEdges },
            [result.positions.buffer, result.normals.buffer, result.indices.buffer],
          );
        } finally {
          releaseHandles(activeCad, faceHandles);
        }
      } finally {
        activeCad.release(solid);
      }
      return;
    }
    if (baseShape === null) throw new Error("Prepare an object before previewing the modifier");
    const selected = request.edgeIds.map((id) => ({ edge: edgeHandles[id], owner: edgeOwners[id] })).filter((entry): entry is { edge: ShapeHandle; owner: number } => entry.edge !== undefined);
    if (selected.length === 0) throw new Error("Select at least one highlighted edge");
    const componentResults: ShapeHandle[] = [];
    let result: ShapeHandle | null = null;
    try {
      for (let owner = 0; owner < baseSolids.length; owner += 1) {
        const solid = baseSolids[owner];
        const componentEdges = selected.filter((entry) => entry.owner === owner).map((entry) => entry.edge);
        const component = componentEdges.length === 0
          ? activeCad.copy(solid)
          : request.kind === "fillet"
            ? activeCad.fillet(solid, componentEdges, request.amount)
            : Math.abs(request.chamferAngle - 45) < 0.001
              ? activeCad.chamfer(solid, componentEdges, request.amount)
              : activeCad.chamferDistAngle(solid, componentEdges, request.amount, request.chamferAngle);
        componentResults.push(component);
      }
      result = componentResults.length === 1 ? componentResults[0] : activeCad.makeCompound(componentResults);
      if (!cadShapeIsValid(activeCad, result)) throw new Error("The chosen size creates invalid or overlapping edge geometry");
      const options = tessellationOptions(request.quality, request.amount);
      const mesh = copyCadMesh(activeCad.tessellate(result, options));
      const displayEdges = collectEdges(activeCad, result, 0).displayEdges;
      const brep = activeCad.toBREP(result);
      const components: CadModifierComponentMesh[] = componentResults.map((component, owner) => {
        const componentMesh = copyCadMesh(activeCad.tessellate(component, options));
        return {
          owner,
          positions: componentMesh.positions,
          normals: componentMesh.normals,
          indices: componentMesh.indices,
          triangleCount: componentMesh.triangleCount,
          brep: activeCad.toBREP(component),
          displayEdges: collectEdges(activeCad, component, 0).displayEdges,
        };
      });
      post(
        { type: "preview", requestId: request.requestId, positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, triangleCount: mesh.triangleCount, brep, displayEdges, components },
        [
          mesh.positions.buffer,
          mesh.normals.buffer,
          mesh.indices.buffer,
          ...components.flatMap((component) => [component.positions.buffer, component.normals.buffer, component.indices.buffer]),
        ],
      );
    } finally {
      componentResults.forEach((component) => activeCad.release(component));
      if (result !== null && componentResults.length > 1) activeCad.release(result);
    }
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? "");
    const errorName = error instanceof Error ? error.name : "";
    if (isCadModifierWasmMemoryFault(rawMessage, errorName) || isImportStlWasmFault(rawMessage) || isMissingValidatorFault(rawMessage)) {
      if (cad) releaseSession(cad);
      kernelPromise = null;
      const message = isImportStlWasmFault(rawMessage)
        ? "The selected mesh could not be converted into a closed CAD solid. The CAD kernel reset; try Separate Parts, ungrouping, or simplifying the object before adding edge features."
        : isMissingValidatorFault(rawMessage)
          ? "The CAD kernel exposed an incomplete validation function and reset. Start the edge tool again; no page refresh is needed."
        : "The CAD kernel hit a memory fault and reset. Start the edge tool again; no page refresh is needed.";
      post({
        type: "error",
        requestId: request.requestId,
        message,
        resetSession: true,
      });
      return;
    }
    const message = request.type === "preview" && (rawMessage.includes("WebAssembly.Exception") || rawMessage.includes("fillet:") || rawMessage.includes("chamfer:"))
      ? `The selected edges cannot be ${request.kind === "fillet" ? "filleted" : "chamfered"} together at this size. Reduce the size or select fewer connected edges.`
      : rawMessage || "The CAD kernel could not complete this edge treatment";
    if (request.type === "prepare" && cad) releaseSession(cad);
    post({ type: "error", requestId: request.requestId, message });
  }
};

export {};
