import { describe, expect, it } from "vitest";
import {
  degreesToRadians,
  entityFromDrag,
  entityPathData,
  materializeSketchEntities,
  normalizeDegrees,
  radiansToDegrees,
  tessellateSketchEntity,
} from "@/lib/capGeometry";
import type { SketchEntity, SketchProfile } from "@/types/sketchforge";

const circle: SketchEntity = { id: "e1", kind: "circle", cx: 10, cz: 5, radius: 20 };
const rectangle: SketchEntity = { id: "e2", kind: "rectangle", cx: 0, cz: 0, width: 40, depth: 20 };
const semicircle: SketchEntity = { id: "e3", kind: "semicircle", cx: 0, cz: 0, radius: 10, startAngle: 0 };
const arc: SketchEntity = { id: "e4", kind: "arc", cx: 0, cz: 0, radius: 10, startAngle: 0, endAngle: 90 };
const ellipse: SketchEntity = { id: "e5", kind: "ellipse", cx: 0, cz: 0, radiusX: 20, radiusZ: 10, rotation: 0 };
const polygon: SketchEntity = { id: "e6", kind: "polygon", cx: 0, cz: 0, radius: 10, sides: 6, rotation: 0 };
const slot: SketchEntity = { id: "e7", kind: "slot", cx: 0, cz: 0, length: 30, width: 10, rotation: 0 };

describe("capGeometry tessellation", () => {
  it("tessellates a circle into a deterministic closed loop", () => {
    const result = tessellateSketchEntity(circle);
    expect(result.points.length).toBeGreaterThanOrEqual(4);
    expect(result.points[0].id).toBe("e1:p0");
    expect(result.points[result.points.length - 1].id).toBe(`e1:p${result.points.length - 1}`);
    expect(result.segments.length).toBe(result.points.length);
    // closed loop: last segment returns to the first point
    expect(result.segments[result.segments.length - 1].endId).toBe("e1:p0");
    // all points/segments carry the entity id
    expect(result.points.every((point) => point.sourceEntityId === "e1")).toBe(true);
    expect(result.segments.every((segment) => segment.sourceEntityId === "e1")).toBe(true);
    // points sit on the circle radius
    const [first] = result.points;
    expect(Math.hypot(first.x - circle.cx, first.z - circle.cz)).toBeCloseTo(20, 5);
  });

  it("tessellates a rectangle into a deterministic closed loop", () => {
    const result = tessellateSketchEntity(rectangle);
    expect(result.points.length).toBe(4);
    expect(result.segments.length).toBe(4);
    expect(result.segments[result.segments.length - 1].endId).toBe("e2:p0");
    const xs = result.points.map((point) => point.x);
    const zs = result.points.map((point) => point.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40, 5);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(20, 5);
  });

  it("tessellates a semicircle into a closed D (arc + chord)", () => {
    const result = tessellateSketchEntity(semicircle);
    expect(result.points.length).toBeGreaterThanOrEqual(4);
    // last segment is the closing chord back to p0
    expect(result.segments[result.segments.length - 1]).toMatchObject({ startId: `e3:p${result.points.length - 1}`, endId: "e3:p0", kind: "line" });
  });

  it("tessellates an arc as an open curve", () => {
    const result = tessellateSketchEntity(arc);
    expect(result.segments.length).toBe(result.points.length - 1);
    // no closing chord
    expect(result.segments[result.segments.length - 1].endId).not.toBe("e4:p0");
  });

  it.each([[ellipse, 16], [polygon, 6], [slot, 12]] as const)("tessellates %s as a closed parametric loop", (entity, minimumPoints) => {
    const result = tessellateSketchEntity(entity);
    expect(result.points.length).toBeGreaterThanOrEqual(minimumPoints);
    expect(result.segments.length).toBe(result.points.length);
    expect(result.segments.at(-1)?.endId).toBe(`${entity.id}:p0`);
  });

  it("produces stable ids and topology across calls", () => {
    const first = tessellateSketchEntity(circle);
    const second = tessellateSketchEntity(circle);
    expect(first.points.map((point) => point.id)).toEqual(second.points.map((point) => point.id));
    expect(first.segments.map((segment) => segment.id)).toEqual(second.segments.map((segment) => segment.id));
  });
});

describe("capGeometry materializeSketchEntities", () => {
  const profile: SketchProfile = {
    points: [
      { id: "hand-p0", x: 0, z: 0, mode: "corner" },
      { id: "hand-p1", x: 5, z: 5, mode: "corner" },
      ...tessellateSketchEntity(circle).points,
      ...tessellateSketchEntity(rectangle).points,
    ],
    segments: [
      { id: "hand-s0", startId: "hand-p0", endId: "hand-p1", kind: "line" },
      ...tessellateSketchEntity(circle).segments,
      ...tessellateSketchEntity(rectangle).segments,
    ],
    entities: [circle, rectangle],
  };

  it("is idempotent", () => {
    const once = materializeSketchEntities(profile);
    const twice = materializeSketchEntities(once);
    expect(twice.points).toEqual(once.points);
    expect(twice.segments).toEqual(once.segments);
  });

  it("preserves freehand drawing", () => {
    const next = materializeSketchEntities(profile);
    expect(next.points.some((point) => point.id === "hand-p0")).toBe(true);
    expect(next.segments.some((segment) => segment.id === "hand-s0")).toBe(true);
  });

  it("drops stale generated points when an entity is removed", () => {
    const reduced: SketchProfile = { ...profile, entities: [circle] };
    const next = materializeSketchEntities(reduced);
    expect(next.points.some((point) => point.id.startsWith("e2:"))).toBe(false);
    expect(next.points.some((point) => point.id.startsWith("e1:"))).toBe(true);
  });

  it("re-tessellates an edited entity without orphan segments", () => {
    const edited: SketchProfile = {
      ...profile,
      entities: [{ ...circle, radius: 30 }],
    };
    const next = materializeSketchEntities(edited);
    const generatedPoints = next.points.filter((point) => point.sourceEntityId === "e1");
    const generatedSegments = next.segments.filter((segment) => segment.sourceEntityId === "e1");
    expect(generatedPoints.length).toBeGreaterThan(0);
    // every generated segment references a generated point
    const pointIds = new Set(generatedPoints.map((point) => point.id));
    expect(generatedSegments.every((segment) => pointIds.has(segment.startId) && pointIds.has(segment.endId))).toBe(true);
    // radius updated
    const center = { x: 10, z: 5 };
    expect(Math.hypot(generatedPoints[0].x - center.x, generatedPoints[0].z - center.z)).toBeCloseTo(30, 5);
  });
});

describe("capGeometry entityFromDrag", () => {
  it("builds a circle from center and edge", () => {
    const entity = entityFromDrag("circle", { x: 0, z: 0 }, { x: 10, z: 0 });
    expect(entity).toMatchObject({ kind: "circle", cx: 0, cz: 0, radius: 10 });
  });

  it("builds a rectangle from center and corner", () => {
    const entity = entityFromDrag("rectangle", { x: 0, z: 0 }, { x: 10, z: 5 });
    expect(entity).toMatchObject({ kind: "rectangle", cx: 0, cz: 0, width: 20, depth: 10 });
  });

  it("builds a semicircle with start angle aiming at the drag point", () => {
    const entity = entityFromDrag("semicircle", { x: 0, z: 0 }, { x: 0, z: 10 });
    expect(entity).toMatchObject({ kind: "semicircle", cx: 0, cz: 0, radius: 10 });
    expect((entity as { startAngle: number }).startAngle).toBeCloseTo(90, 5);
  });

  it("builds an arc with a 90° default sweep", () => {
    const entity = entityFromDrag("arc", { x: 0, z: 0 }, { x: 10, z: 0 });
    expect(entity).toMatchObject({ kind: "arc", cx: 0, cz: 0, radius: 10, startAngle: 0, endAngle: 90 });
  });

  it("builds ellipse, polygon and slot entities from drag", () => {
    expect(entityFromDrag("ellipse", { x: 0, z: 0 }, { x: 10, z: 5 })).toMatchObject({ kind: "ellipse", radiusX: 10, radiusZ: 5 });
    expect(entityFromDrag("polygon", { x: 0, z: 0 }, { x: 10, z: 0 })).toMatchObject({ kind: "polygon", radius: 10, sides: 6 });
    expect(entityFromDrag("slot", { x: 0, z: 0 }, { x: 10, z: 0 })).toMatchObject({ kind: "slot", length: 20 });
  });
});

describe("capGeometry entityPathData", () => {
  it("returns null for circle and rectangle", () => {
    expect(entityPathData(circle)).toBeNull();
    expect(entityPathData(rectangle)).toBeNull();
  });

  it("produces a smooth arc path for an arc", () => {
    const d = entityPathData(arc);
    expect(d).toBeTruthy();
    expect(d).toContain("A 10 10");
  });

  it("closes the semicircle D with a chord", () => {
    const d = entityPathData(semicircle);
    expect(d).toBeTruthy();
    expect(d).toContain("A 10 10");
    expect(d).toMatch(/L 10 0$/);
  });
});

describe("capGeometry angle helpers", () => {
  it("converts degrees and radians", () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 5);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("normalizes degrees into [0, 360)", () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
    expect(normalizeDegrees(0)).toBe(0);
  });
});
