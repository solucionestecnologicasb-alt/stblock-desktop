// Helpers for the CAP document model. Pure and dependency-free.
import { createLocalId } from "@/lib/localIds";
import type {
  CapDocument,
  CapSection,
  CapTimelineEntry,
  SketchEntity,
  SketchPoint,
  SketchProfile,
  SketchSegment,
  WorkplanePlane,
  WorkplaneShape,
} from "@/types/sketchforge";

export function emptyCapDocument(): CapDocument {
  return { sections: [], timeline: [], activeSectionId: undefined };
}

type CapSectionLike = Partial<CapSection> & { id?: unknown; name?: unknown };
type CapTimelineEntryLike = Partial<CapTimelineEntry> & { id?: unknown; kind?: unknown; label?: unknown };
type CapDocumentLike = {
  sections?: unknown;
  timeline?: unknown;
  activeSectionId?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePlane(value: unknown): WorkplanePlane | null {
  if (!isRecord(value)) return null;
  if (value.kind === "base") return { kind: "base" };
  if (value.kind === "offset") {
    const elevation = typeof value.elevation === "number" && Number.isFinite(value.elevation) ? value.elevation : 0;
    return { kind: "offset", elevation };
  }
  if (value.kind === "face") {
    const center = Array.isArray(value.center) && value.center.length === 3 ? value.center.map(Number) : [0, 0, 0];
    const normal = Array.isArray(value.normal) && value.normal.length === 3 ? value.normal.map(Number) : [0, 1, 0];
    const up = Array.isArray(value.up) && value.up.length === 3 ? value.up.map(Number) : [0, 0, 1];
    const shapeId = typeof value.shapeId === "string" ? value.shapeId : "";
    return { kind: "face", shapeId, center: center as [number, number, number], normal: normal as [number, number, number], up: up as [number, number, number] };
  }
  return null;
}

function normalizeSketchProfile(value: unknown): SketchProfile {
  if (!isRecord(value)) return { points: [], segments: [], images: [] };
  const points = Array.isArray(value.points)
    ? (value.points as unknown[]).filter(isRecord).map((point) => {
        const id = typeof point.id === "string" ? point.id : createLocalId("skpt");
        return {
          id,
          x: typeof point.x === "number" && Number.isFinite(point.x) ? point.x : 0,
          z: typeof point.z === "number" && Number.isFinite(point.z) ? point.z : 0,
          mode: point.mode === "corner" || point.mode === "smooth" || point.mode === "split" ? point.mode : undefined,
          sourceEntityId: typeof point.sourceEntityId === "string" ? point.sourceEntityId : undefined,
          handleIn: point.handleIn && isRecord(point.handleIn)
            ? { x: Number(point.handleIn.x) || 0, z: Number(point.handleIn.z) || 0 }
            : undefined,
          handleOut: point.handleOut && isRecord(point.handleOut)
            ? { x: Number(point.handleOut.x) || 0, z: Number(point.handleOut.z) || 0 }
            : undefined,
        } as SketchPoint;
      })
    : [];
  const segments: SketchSegment[] = Array.isArray(value.segments)
    ? (value.segments as unknown[]).filter(isRecord).map((segment) => {
        const id = typeof segment.id === "string" ? segment.id : createLocalId("skseg");
        return {
          id,
          startId: typeof segment.startId === "string" ? segment.startId : "",
          endId: typeof segment.endId === "string" ? segment.endId : "",
          kind: segment.kind === "line" || segment.kind === "bezier" || segment.kind === "smooth" ? segment.kind : "line",
          sourceEntityId: typeof segment.sourceEntityId === "string" ? segment.sourceEntityId : undefined,
        };
      })
    : [];
  const pointIds = new Set(points.map((point) => point.id));
  const keptSegments = segments.filter((segment) => pointIds.has(segment.startId) && pointIds.has(segment.endId));
  const profile: SketchProfile = { points, segments: keptSegments };
  if (Array.isArray(value.images)) {
    profile.images = (value.images as unknown[]).filter(isRecord).map((image) => ({
      id: typeof image.id === "string" ? image.id : createLocalId("skimg"),
      name: typeof image.name === "string" ? image.name : "",
      dataUrl: typeof image.dataUrl === "string" ? image.dataUrl : "",
      mimeType: typeof image.mimeType === "string" ? image.mimeType : "",
      pixelWidth: typeof image.pixelWidth === "number" ? image.pixelWidth : 0,
      pixelHeight: typeof image.pixelHeight === "number" ? image.pixelHeight : 0,
      x: typeof image.x === "number" ? image.x : 0,
      z: typeof image.z === "number" ? image.z : 0,
      width: typeof image.width === "number" ? image.width : 0,
      depth: typeof image.depth === "number" ? image.depth : 0,
    }));
  }
  if (Array.isArray(value.entities)) {
    profile.entities = (value.entities as unknown[]).filter(isRecord).flatMap((entity): SketchEntity[] => {
      const id = typeof entity.id === "string" ? entity.id : createLocalId("entity");
      if (entity.kind === "circle" && typeof entity.radius === "number") {
        return [{ id, kind: "circle" as const, cx: Number(entity.cx) || 0, cz: Number(entity.cz) || 0, radius: entity.radius }];
      }
      if (entity.kind === "rectangle" && typeof entity.width === "number" && typeof entity.depth === "number") {
        return [{ id, kind: "rectangle" as const, cx: Number(entity.cx) || 0, cz: Number(entity.cz) || 0, width: entity.width, depth: entity.depth }];
      }
      if (entity.kind === "semicircle" && typeof entity.radius === "number") {
        return [{ id, kind: "semicircle" as const, cx: Number(entity.cx) || 0, cz: Number(entity.cz) || 0, radius: entity.radius, startAngle: Number(entity.startAngle) || 0 }];
      }
      if (entity.kind === "arc" && typeof entity.radius === "number") {
        return [{ id, kind: "arc" as const, cx: Number(entity.cx) || 0, cz: Number(entity.cz) || 0, radius: entity.radius, startAngle: Number(entity.startAngle) || 0, endAngle: Number(entity.endAngle) || 0 }];
      }
      return [];
    });
  }
  return profile;
}

/**
 * Robustly normalizes a possibly-corrupt CAP document. Missing or invalid input
 * degrades to an empty document — never throws.
 */
export function normalizeCapDocument(raw?: unknown): CapDocument {
  const empty = emptyCapDocument();
  if (!isRecord(raw)) return empty;
  if (!Array.isArray(raw.sections) && !Array.isArray(raw.timeline)) return empty;

  const sections: CapSection[] = Array.isArray(raw.sections)
    ? (raw.sections as unknown[])
        .filter(isRecord)
        .flatMap((section) => {
          const id = typeof section.id === "string" ? section.id : "";
          if (!id) return [];
          const plane = normalizePlane(section.plane);
          if (!plane) return [];
          const operation = section.operation === "revolve" ? "revolve" : "extrude";
          const name = typeof section.name === "string" && section.name.trim() ? section.name.trim() : "Sección";
          const extrusionDepth = typeof section.extrusionDepth === "number" && Number.isFinite(section.extrusionDepth) ? section.extrusionDepth : 10;
          const createdAt = typeof section.createdAt === "number" && Number.isFinite(section.createdAt) ? section.createdAt : Date.now();
          const resultShapeId = typeof section.resultShapeId === "string" ? section.resultShapeId : undefined;
          const unionMode = section.unionMode === "add" || section.unionMode === "cut" ? section.unionMode : undefined;
          const revolveSettings = isRecord(section.revolveSettings)
            ? {
                startAngle: Number(section.revolveSettings.startAngle) || 0,
                sweepAngle: Number(section.revolveSettings.sweepAngle) || 360,
                sides: Number(section.revolveSettings.sides) || 48,
                quality: Number(section.revolveSettings.quality) || 4,
                thickness: Number(section.revolveSettings.thickness) || 1,
              }
            : undefined;
          return [{
            id,
            name,
            plane,
            sketchProfile: normalizeSketchProfile(section.sketchProfile),
            operation,
            extrusionDepth,
            unionMode,
            revolveSettings,
            resultShapeId,
            createdAt,
          } as CapSection];
        })
    : [];

  const timeline: CapTimelineEntry[] = Array.isArray(raw.timeline)
    ? (raw.timeline as unknown[])
        .filter(isRecord)
        .flatMap((entry) => {
          const id = typeof entry.id === "string" ? entry.id : "";
          if (!id) return [];
          const kind = typeof entry.kind === "string" ? entry.kind : "";
          if (kind !== "section-create" && kind !== "section-edit" && kind !== "section-rename" && kind !== "section-delete" && kind !== "piece-generate") return [];
          const label = typeof entry.label === "string" ? entry.label : "";
          if (!label) return [];
          const sectionId = typeof entry.sectionId === "string" ? entry.sectionId : undefined;
          const shapeId = typeof entry.shapeId === "string" ? entry.shapeId : undefined;
          const timestamp = typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now();
          return [{ id, kind, sectionId, shapeId, label, timestamp } as CapTimelineEntry];
        })
        .sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const activeSectionId = typeof raw.activeSectionId === "string" && sections.some((section) => section.id === raw.activeSectionId)
    ? raw.activeSectionId
    : undefined;

  return { sections, timeline, activeSectionId };
}

export function createCapSection(plane: WorkplanePlane, index: number, createdAt = Date.now()): CapSection {
  const id = createLocalId("section");
  return {
    id,
    name: `Sección ${Math.max(1, index + 1)}`,
    plane,
    sketchProfile: { points: [], segments: [], images: [] },
    operation: "extrude",
    extrusionDepth: 10,
    createdAt,
  };
}

export function appendCapTimelineEntry(cap: CapDocument, entry: CapTimelineEntry): CapDocument {
  return {
    ...cap,
    timeline: [...cap.timeline, entry],
  };
}

/**
 * Cleans orphaned `resultShapeId` references (sections whose generated piece no
 * longer exists in the shape list). Returns the same reference when unchanged.
 */
export function reconcileCapDocument(cap: CapDocument, shapes: WorkplaneShape[]): CapDocument {
  const shapeIds = new Set(shapes.map((shape) => shape.id));
  let changed = false;
  const sections = cap.sections.map((section) => {
    if (section.resultShapeId && !shapeIds.has(section.resultShapeId)) {
      changed = true;
      return { ...section, resultShapeId: undefined };
    }
    return section;
  });
  if (!changed) return cap;
  return { ...cap, sections };
}

export function planeElevation(plane: WorkplanePlane) {
  if (plane.kind === "base") return 0;
  if (plane.kind === "offset") return plane.elevation;
  return plane.center[1];
}

/**
 * Work plane used to build a section's sketch tool. In "Cortar" mode the plane
 * origin is shifted inward along the face normal by `depth` so the extrusion
 * penetrates the host and the boolean cut opens a pocket (blind or through) at
 * the face. Non-face planes and revolve operations return the plane unchanged.
 */
export function capSectionToolPlane(section: CapSection, depth: number): WorkplanePlane {
  if (section.plane.kind === "face" && section.operation === "extrude" && section.unionMode === "cut") {
    const [nx, ny, nz] = section.plane.normal;
    return {
      ...section.plane,
      center: [
        section.plane.center[0] - nx * depth,
        section.plane.center[1] - ny * depth,
        section.plane.center[2] - nz * depth,
      ],
    };
  }
  return section.plane;
}

/**
 * Extrusion height used to build a section's sketch tool. In "Cortar" mode the
 * tool is one overhang longer so its top cap pokes just above the host face,
 * guaranteeing the boolean cut opens cleanly at the face.
 */
export function capSectionToolHeight(section: CapSection, overhang = 0.25): number {
  return section.plane.kind === "face" && section.operation === "extrude" && section.unionMode === "cut"
    ? section.extrusionDepth + overhang
    : section.extrusionDepth;
}

type OrderedStep = { segment: SketchProfile["segments"][number]; from: SketchPoint; to: SketchPoint };
type OrderedPath = { points: SketchPoint[]; steps: OrderedStep[]; closed: boolean };

// Self-contained path ordering (mirrors the editor helper) so this lib stays
// pure and testable without importing the editor component.
function orderedSketchPaths(profile: SketchProfile): OrderedPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchProfile["segments"][number] }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const validSegments = profile.segments.filter((segment) => {
    if (!pointById.has(segment.startId) || !pointById.has(segment.endId) || segment.startId === segment.endId) return false;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(validSegments.map((segment) => segment.id));
  const paths: OrderedPath[] = [];
  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string | undefined;
    const seed = validSegments.find((segment) => segment.id === seedId);
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
    const first = pointById.get(startId);
    if (!first) {
      unvisited.delete(seed.id);
      continue;
    }
    const points = [first];
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
      points.push(to);
    }
    paths.push({ points, steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

/**
 * A section is usable when its sketch profile contains at least one closed
 * path (which is what extrude/revolve need to generate a solid).
 */
export function capSectionHasUsableProfile(section: CapSection) {
  return orderedSketchPaths(section.sketchProfile).some((path) => path.closed);
}
