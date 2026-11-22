import type { ManifoldToplevel } from "manifold-3d";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/sketchforge";

export type SketchSweepSettings = {
  radius: number;
  thickness: number; // 0 means solid rod, > 0 means hollow pipe
  quality: number;
};

export const DEFAULT_SKETCH_SWEEP_SETTINGS: SketchSweepSettings = {
  radius: 2,
  thickness: 0,
  quality: 16,
};

export type SketchSweepMesh = {
  positions: number[];
  width: number;
  depth: number;
  height: number;
  triangleCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeSketchSweepSettings(settings?: Partial<SketchSweepSettings>): SketchSweepSettings {
  const radius = clamp(finiteOr(settings?.radius, DEFAULT_SKETCH_SWEEP_SETTINGS.radius), 0.1, 50);
  const thickness = clamp(finiteOr(settings?.thickness, DEFAULT_SKETCH_SWEEP_SETTINGS.thickness), 0, radius - 0.1);
  return {
    radius,
    thickness,
    quality: Math.round(clamp(finiteOr(settings?.quality, DEFAULT_SKETCH_SWEEP_SETTINGS.quality), 8, 64)),
  };
}

// Re-use ordering logic to get continuous paths of points
type OrderedStep = { segment: SketchSegment; from: SketchPoint; to: SketchPoint };
type OrderedPath = { steps: OrderedStep[]; closed: boolean };
type SampledPoint = { x: number; z: number };

function orderedPaths(profile: SketchProfile): OrderedPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchSegment }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  
  const validSegments = profile.segments.filter((segment) => {
    if (segment.construction) return false;
    if (!pointById.has(segment.startId) || !pointById.has(segment.endId)) return false;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });

  const unvisited = new Set(validSegments.map((segment) => segment.id));
  const paths: OrderedPath[] = [];

  while (unvisited.size > 0) {
    const seed = validSegments.find((segment) => unvisited.has(segment.id));
    if (!seed) break;
    const componentIds = new Set<string>();
    const queue = [seed.startId, seed.endId];
    while (queue.length > 0) {
      const id = queue.pop();
      if (!id || componentIds.has(id)) continue;
      componentIds.add(id);
      adjacency.get(id)?.forEach((entry) => queue.push(entry.pointId));
    }
    const startId = [...componentIds].find((id) => (adjacency.get(id)?.filter((entry) => unvisited.has(entry.segment.id)).length ?? 0) === 1) ?? seed.startId;
    const steps: OrderedStep[] = [];
    let currentId = startId;
    for (let guard = 0; guard <= validSegments.length; guard += 1) {
      const edge = adjacency.get(currentId)?.find((entry) => unvisited.has(entry.segment.id));
      if (!edge) break;
      const from = pointById.get(currentId);
      const to = pointById.get(edge.pointId);
      if (!from || !to) break;
      unvisited.delete(edge.segment.id);
      steps.push({ segment: edge.segment, from, to });
      currentId = to.id;
      if (currentId === startId) break;
    }
    if (steps.length > 0) paths.push({ steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

function cubicPoint(start: SketchPoint, first: { x: number; z: number }, second: { x: number; z: number }, end: SketchPoint, amount: number) {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * end.x,
    z: inverse ** 3 * start.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * end.z,
  };
}

function samplePath(path: OrderedPath, quality: number): SampledPoint[] {
  const first = path.steps[0]?.from;
  if (!first) return [];
  const sampled = [{ x: first.x, z: first.z }];
  const curveSamples = 8 + quality;
  path.steps.forEach(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const firstControl = forward ? from.handleOut : from.handleIn;
    const secondControl = forward ? to.handleIn : to.handleOut;
    if (segment.kind !== "line" && firstControl && secondControl) {
      for (let index = 1; index <= curveSamples; index += 1) {
        sampled.push(cubicPoint(from, firstControl, secondControl, to, index / curveSamples));
      }
    } else {
      sampled.push({ x: to.x, z: to.z });
    }
  });
  return sampled;
}

function manifoldMeshPositions(mesh: InstanceType<ManifoldToplevel["Mesh"]>) {
  const positions: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const offset = mesh.triVerts[index] * mesh.numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

function buildSingleSolidPipe(runtime: ManifoldToplevel, points: SampledPoint[], radius: number, quality: number, disposable: unknown[]) {
  if (points.length < 2) return null;
  const solids: InstanceType<ManifoldToplevel["Manifold"]>[] = [];

  // Create cylinders along the segments
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) continue;

    // Create cylinder (default axis along Z, Z starts at 0 and goes to length)
    const cylinder = runtime.Manifold.cylinder(length, radius, radius, quality, false);
    disposable.push(cylinder);

    // Rotate the cylinder around the Y-axis to match the angle of the segment in the XZ plane
    const angle = Math.atan2(dx, dz);
    const rotated = cylinder.rotate([0, angle * 180 / Math.PI, 0]);
    disposable.push(rotated);

    // Translate to the start point
    const translated = rotated.translate([p1.x, 0, p1.z]);
    disposable.push(translated);
    solids.push(translated);
  }

  // Create spheres at the joint points to make them perfectly smooth elbows
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const sphere = runtime.Manifold.sphere(radius, quality);
    disposable.push(sphere);
    const translated = sphere.translate([p.x, 0, p.z]);
    disposable.push(translated);
    solids.push(translated);
  }

  if (solids.length === 0) return null;

  // Union all segments and elbows
  const union = runtime.Manifold.union(solids);
  disposable.push(union);
  return union;
}

export function buildSketchSweepMesh(runtime: ManifoldToplevel, profile: SketchProfile, requestedSettings?: Partial<SketchSweepSettings>): SketchSweepMesh {
  const settings = normalizeSketchSweepSettings(requestedSettings);
  const paths = orderedPaths(profile);
  if (paths.length === 0) throw new Error("Dibuja al menos una línea o curva para definir el trayecto de la tubería");

  const disposable: unknown[] = [];
  try {
    const outerPipes: InstanceType<ManifoldToplevel["Manifold"]>[] = [];
    const innerPipes: InstanceType<ManifoldToplevel["Manifold"]>[] = [];

    paths.forEach((path) => {
      const sampled = samplePath(path, settings.quality);
      const outerPipe = buildSingleSolidPipe(runtime, sampled, settings.radius, settings.quality, disposable);
      if (outerPipe) outerPipes.push(outerPipe);

      if (settings.thickness > 0) {
        const innerPipe = buildSingleSolidPipe(runtime, sampled, settings.radius - settings.thickness, settings.quality, disposable);
        if (innerPipe) innerPipes.push(innerPipe);
      }
    });

    if (outerPipes.length === 0) throw new Error("No se pudo construir la tubería a partir de los trazos de boceto");

    // Union all outer pipes
    const finalOuter = runtime.Manifold.union(outerPipes);
    disposable.push(finalOuter);

    let finalSolid = finalOuter;

    // Subtract inner pipes if hollow
    if (innerPipes.length > 0) {
      const finalInner = runtime.Manifold.union(innerPipes);
      disposable.push(finalInner);
      const diff = finalOuter.subtract(finalInner);
      disposable.push(diff);
      finalSolid = diff;
    }

    if (finalSolid.status() !== "NoError" || finalSolid.numTri() < 1) {
      throw new Error("El perfil no se pudo barrer en un sólido válido");
    }

    // Get positions and compute bounding box
    const manifoldPositions = manifoldMeshPositions(finalSolid.getMesh());
    const positions = new Array<number>(manifoldPositions.length);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    
    // SketchForge uses Y-up in 3D, and sketch is in XZ plane.
    for (let index = 0; index + 2 < manifoldPositions.length; index += 3) {
      const x = manifoldPositions[index];
      const y = manifoldPositions[index + 1];
      const z = manifoldPositions[index + 2];
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    return {
      positions,
      width: Math.max(0.01, maxX - minX),
      depth: Math.max(0.01, maxZ - minZ),
      height: Math.max(0.01, maxY - minY),
      triangleCount: Math.floor(positions.length / 9),
    };
  } finally {
    const unique = [...new Set(disposable)];
    unique.reverse().forEach((val) => {
      (val as { delete?: () => void } | null)?.delete?.();
    });
  }
}
