// Pure geometry helpers for the CAP (planos de trabajo) system.
// No editor dependencies — safe for unit tests.
//
// The CAP work plane is X/Z. Angles are in degrees, 0° points along +X and
// increases toward +Z (which maps to the SVG "down" direction, i.e. the
// natural screen orientation of the sketch workspace).
import { createLocalId } from "@/lib/localIds";
import { entityContourLoops, entityContourPathData } from "@/lib/sketchEntityContours";
import type { SketchEntity, SketchPoint, SketchProfile, SketchSegment } from "@/types/sketchforge";

// Tessellation resolution: fixed 8° angular step.
// A full circle therefore produces ~45 points (360/8). Degenerate / tiny arcs
// still keep a minimum number of segments so path closure logic stays useful.
const ANGULAR_STEP_DEGREES = 8;
const MIN_ARC_SEGMENTS = 3;

export type TessellationResult = {
  points: SketchPoint[];
  segments: SketchSegment[];
};

export function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function normalizeDegrees(degrees: number) {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

type CircularEntity = Extract<SketchEntity, { kind: "circle" | "semicircle" | "arc" }>;

function pointOnCircle(entity: CircularEntity, angleDegrees: number) {
  const radians = degreesToRadians(angleDegrees);
  return {
    x: entity.cx + entity.radius * Math.cos(radians),
    z: entity.cz + entity.radius * Math.sin(radians),
  };
}

function normalizeSweep(startAngle: number, endAngle: number) {
  let sweep = (endAngle - startAngle) % 360;
  if (sweep <= 0) sweep += 360;
  return sweep;
}

function arcStepCount(sweepDegrees: number) {
  return Math.max(MIN_ARC_SEGMENTS, Math.round(sweepDegrees / ANGULAR_STEP_DEGREES));
}

/**
 * Tessellates a parametric sketch entity into deterministic points/segments.
 *
 * - circle / rectangle produce a closed loop (the final segment returns to the
 *   first point).
 * - semicircle produces a closed "D" (arc + closing chord).
 * - arc is open (no closing chord).
 *
 * Every generated point/segment is tagged with `sourceEntityId` so
 * `materializeSketchEntities` can regenerate it idempotently.
 */
export function tessellateSketchEntity(entity: SketchEntity): TessellationResult {
  const points: SketchPoint[] = [];
  const segments: SketchSegment[] = [];

  if (entity.kind === "text" || entity.kind === "vector") {
    entityContourLoops(entity).forEach((loop, loopIndex) => {
      loop.forEach((point, pointIndex) => {
        points.push({
          id: `${entity.id}:l${loopIndex}:p${pointIndex}`,
          x: point.x,
          z: point.z,
          mode: "corner",
          sourceEntityId: entity.id,
        });
      });
      loop.forEach((_, pointIndex) => {
        segments.push({
          id: `${entity.id}:l${loopIndex}:s${pointIndex}`,
          startId: `${entity.id}:l${loopIndex}:p${pointIndex}`,
          endId: `${entity.id}:l${loopIndex}:p${(pointIndex + 1) % loop.length}`,
          kind: "line",
          sourceEntityId: entity.id,
        });
      });
    });
    return { points, segments };
  }

  if (entity.kind === "circle") {
    const count = Math.max(4, Math.round(360 / ANGULAR_STEP_DEGREES));
    for (let index = 0; index < count; index += 1) {
      const p = pointOnCircle(entity, index * ANGULAR_STEP_DEGREES);
      points.push({ id: `${entity.id}:p${index}`, x: p.x, z: p.z, mode: "corner", sourceEntityId: entity.id });
    }
    for (let index = 0; index < count; index += 1) {
      segments.push({
        id: `${entity.id}:s${index}`,
        startId: `${entity.id}:p${index}`,
        endId: `${entity.id}:p${(index + 1) % count}`,
        kind: "line",
        sourceEntityId: entity.id,
      });
    }
    return { points, segments };
  }

  if (entity.kind === "ellipse" || entity.kind === "polygon" || entity.kind === "slot") {
    const rotation = degreesToRadians(entity.rotation);
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const transform = (x: number, z: number) => ({
      x: entity.cx + x * cosine - z * sine,
      z: entity.cz + x * sine + z * cosine,
    });
    const outline: Array<{ x: number; z: number }> = [];
    if (entity.kind === "ellipse") {
      const count = Math.max(16, Math.round(360 / ANGULAR_STEP_DEGREES));
      for (let index = 0; index < count; index += 1) {
        const angle = degreesToRadians((index / count) * 360);
        outline.push(transform(entity.radiusX * Math.cos(angle), entity.radiusZ * Math.sin(angle)));
      }
    } else if (entity.kind === "polygon") {
      const sides = Math.max(3, Math.min(64, Math.round(entity.sides)));
      for (let index = 0; index < sides; index += 1) {
        const angle = (index / sides) * Math.PI * 2;
        outline.push(transform(entity.radius * Math.cos(angle), entity.radius * Math.sin(angle)));
      }
    } else {
      const radius = Math.max(0.05, entity.width / 2);
      const straightHalf = Math.max(0, (entity.length - entity.width) / 2);
      const arcSegments = Math.max(6, Math.round(180 / ANGULAR_STEP_DEGREES));
      for (let index = 0; index <= arcSegments; index += 1) {
        const angle = -Math.PI / 2 + (index / arcSegments) * Math.PI;
        outline.push(transform(straightHalf + radius * Math.cos(angle), radius * Math.sin(angle)));
      }
      for (let index = 0; index <= arcSegments; index += 1) {
        const angle = Math.PI / 2 + (index / arcSegments) * Math.PI;
        outline.push(transform(-straightHalf + radius * Math.cos(angle), radius * Math.sin(angle)));
      }
    }
    outline.forEach((point, index) => points.push({ id: `${entity.id}:p${index}`, ...point, mode: "corner", sourceEntityId: entity.id }));
    outline.forEach((_, index) => segments.push({ id: `${entity.id}:s${index}`, startId: `${entity.id}:p${index}`, endId: `${entity.id}:p${(index + 1) % outline.length}`, kind: "line", sourceEntityId: entity.id }));
    return { points, segments };
  }

  if (entity.kind === "rectangle") {
    const halfWidth = entity.width / 2;
    const halfDepth = entity.depth / 2;
    const corners = [
      { x: entity.cx - halfWidth, z: entity.cz - halfDepth },
      { x: entity.cx + halfWidth, z: entity.cz - halfDepth },
      { x: entity.cx + halfWidth, z: entity.cz + halfDepth },
      { x: entity.cx - halfWidth, z: entity.cz + halfDepth },
    ];
    for (let index = 0; index < corners.length; index += 1) {
      points.push({ id: `${entity.id}:p${index}`, x: corners[index].x, z: corners[index].z, mode: "corner", sourceEntityId: entity.id });
    }
    for (let index = 0; index < corners.length; index += 1) {
      segments.push({
        id: `${entity.id}:s${index}`,
        startId: `${entity.id}:p${index}`,
        endId: `${entity.id}:p${(index + 1) % corners.length}`,
        kind: "line",
        sourceEntityId: entity.id,
      });
    }
    return { points, segments };
  }

  // semicircle + arc share the arc tessellation.
  const sweep = entity.kind === "semicircle" ? 180 : normalizeSweep(entity.startAngle, entity.endAngle);
  const count = arcStepCount(sweep) + 1; // points = segments + 1 for an open arc
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const p = pointOnCircle(entity, entity.startAngle + sweep * t);
    points.push({ id: `${entity.id}:p${index}`, x: p.x, z: p.z, mode: "corner", sourceEntityId: entity.id });
  }
  for (let index = 0; index < count - 1; index += 1) {
    segments.push({
      id: `${entity.id}:s${index}`,
      startId: `${entity.id}:p${index}`,
      endId: `${entity.id}:p${index + 1}`,
      kind: "line",
      sourceEntityId: entity.id,
    });
  }
  if (entity.kind === "semicircle") {
    // Close the "D" with a chord from the arc end back to the start.
    segments.push({
      id: `${entity.id}:s${count - 1}`,
      startId: `${entity.id}:p${count - 1}`,
      endId: `${entity.id}:p0`,
      kind: "line",
      sourceEntityId: entity.id,
    });
  }
  return { points, segments };
}

/**
 * Re-tessellates every parametric entity of the profile. Generated points and
 * segments (those carrying `sourceEntityId`) are dropped first, then each
 * entity is re-materialized. Freehand drawing is preserved untouched.
 *
 * Idempotent: calling it twice on the same profile returns the same result.
 */
export function materializeSketchEntities(profile: SketchProfile): SketchProfile {
  const entities = profile.entities ?? [];
  const generatedPointIds = new Set<string>();
  profile.points.forEach((point) => {
    if (point.sourceEntityId) generatedPointIds.add(point.id);
  });
  const generatedSegmentIds = new Set<string>();
  profile.segments.forEach((segment) => {
    if (segment.sourceEntityId) generatedSegmentIds.add(segment.id);
  });

  const points = profile.points.filter((point) => !generatedPointIds.has(point.id));
  const segments = profile.segments.filter((segment) => !generatedSegmentIds.has(segment.id));

  const pointIds = new Set(points.map((point) => point.id));
  // Keep topology consistent: drop segments referencing removed points.
  const keptSegments = segments.filter((segment) => pointIds.has(segment.startId) && pointIds.has(segment.endId));

  const next: SketchProfile = {
    ...profile,
    points,
    segments: keptSegments,
  };

  entities.forEach((entity) => {
    const tessellated = tessellateSketchEntity(entity);
    next.points.push(...tessellated.points);
    next.segments.push(...tessellated.segments);
  });

  return next;
}

/**
 * Builds a parametric entity from a drag gesture.
 *
 * `origin` is the anchor the user pressed and `current` is the live drag point.
 * - circle: center = origin, radius = distance to current.
 * - rectangle: center = origin, half-size = |current - origin|.
 * - semicircle: center = origin, radius = distance, startAngle aims at current.
 * - arc: center = origin, radius = distance, startAngle aims at current, with a
 *   90° sweep as a sensible default (fully editable later).
 */
export function entityFromDrag(
  kind: Extract<SketchEntity, { kind: "circle" | "semicircle" | "arc" | "rectangle" | "ellipse" | "polygon" | "slot" }>["kind"],
  origin: { x: number; z: number },
  current: { x: number; z: number },
): SketchEntity {
  const id = createLocalId("entity");
  const dx = current.x - origin.x;
  const dz = current.z - origin.z;
  const radius = Math.max(0.05, Math.hypot(dx, dz));
  const startAngle = normalizeDegrees(radiansToDegrees(Math.atan2(dz, dx)));

  switch (kind) {
    case "circle":
      return { id, kind: "circle", cx: origin.x, cz: origin.z, radius };
    case "rectangle":
      return { id, kind: "rectangle", cx: origin.x, cz: origin.z, width: Math.max(0.1, Math.abs(dx) * 2), depth: Math.max(0.1, Math.abs(dz) * 2) };
    case "ellipse":
      return { id, kind: "ellipse", cx: origin.x, cz: origin.z, radiusX: Math.max(0.05, Math.abs(dx)), radiusZ: Math.max(0.05, Math.abs(dz)), rotation: 0 };
    case "polygon":
      return { id, kind: "polygon", cx: origin.x, cz: origin.z, radius, sides: 6, rotation: startAngle };
    case "slot":
      return { id, kind: "slot", cx: origin.x, cz: origin.z, length: Math.max(0.1, radius * 2), width: Math.max(0.1, radius * 0.65), rotation: startAngle };
    case "semicircle":
      return { id, kind: "semicircle", cx: origin.x, cz: origin.z, radius, startAngle };
    case "arc":
      return { id, kind: "arc", cx: origin.x, cz: origin.z, radius, startAngle, endAngle: normalizeDegrees(startAngle + 90) };
  }
}

/**
 * Produces a smooth SVG path `d` for a semicircle ("D" arc + closing chord) or
 * an open arc. Circles and rectangles are rendered natively as <circle>/<rect>
 * in the workspace, so they are not handled here.
 */
export function entityPathData(entity: SketchEntity): string | null {
  if (entity.kind === "text" || entity.kind === "vector") return entityContourPathData(entity);
  if (entity.kind === "ellipse" || entity.kind === "polygon" || entity.kind === "slot") {
    const points = tessellateSketchEntity(entity).points;
    return points.length ? `M ${points.map((point) => `${point.x} ${point.z}`).join(" L ")} Z` : null;
  }
  if (entity.kind !== "semicircle" && entity.kind !== "arc") return null;
  const sweep = entity.kind === "semicircle" ? 180 : normalizeSweep(entity.startAngle, entity.endAngle);
  const d = arcPathData(entity, entity.startAngle, sweep);
  if (entity.kind === "semicircle") {
    const start = pointOnCircle(entity, entity.startAngle);
    return `${d} L ${start.x} ${start.z}`;
  }
  return d;
}

// Builds an SVG arc path, capped at 180° per command (SVG arcs cannot sweep
// more than that in a single command). sweep-flag=1 because increasing math
// angles map to the positive (clockwise-in-screen) SVG sweep direction.
function arcPathData(entity: CircularEntity, startAngle: number, sweep: number) {
  const commands: string[] = [];
  let angle = startAngle;
  const steps = Math.ceil(sweep / 180);
  for (let index = 0; index < steps; index += 1) {
    const chunk = Math.min(180, sweep - (angle - startAngle));
    const nextAngle = angle + chunk;
    const end = pointOnCircle(entity, nextAngle);
    commands.push(`A ${entity.radius} ${entity.radius} 0 ${chunk > 180 ? 1 : 0} 1 ${end.x} ${end.z}`);
    angle = nextAngle;
  }
  const start = pointOnCircle(entity, startAngle);
  return `M ${start.x} ${start.z} ${commands.join(" ")}`;
}
