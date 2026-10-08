import { entityFromDrag, materializeSketchEntities } from "@/lib/capGeometry";
import { createLocalId } from "@/lib/localIds";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/sketchforge";

export type Direct2DDrawTool = "pencil" | "circle" | "semicircle" | "arc" | "rectangle" | "triangle" | "hexagon";
export type Direct2DPoint = { x: number; z: number };

function polygonProfile(center: Direct2DPoint, edge: Direct2DPoint, sides: number): SketchProfile {
  const radius = Math.max(0.05, Math.hypot(edge.x - center.x, edge.z - center.z));
  const startAngle = Math.atan2(edge.z - center.z, edge.x - center.x);
  const points: SketchPoint[] = Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index * Math.PI * 2) / sides;
    return { id: createLocalId("skpt"), x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius };
  });
  const segments: SketchSegment[] = points.map((point, index) => ({
    id: createLocalId("skseg"),
    kind: "line",
    startId: point.id,
    endId: points[(index + 1) % points.length].id,
  }));
  return { points, segments };
}

function pencilProfile(samples: Direct2DPoint[]): SketchProfile {
  const filtered = samples.filter((point, index) => index === 0 || Math.hypot(point.x - samples[index - 1].x, point.z - samples[index - 1].z) >= 0.02);
  if (filtered.length < 2) return { points: [], segments: [] };
  const xs = filtered.map((point) => point.x);
  const zs = filtered.map((point) => point.z);
  const diagonal = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  const closeTolerance = Math.max(0.75, diagonal * 0.1);
  const closed = filtered.length >= 4 && Math.hypot(filtered[0].x - filtered[filtered.length - 1].x, filtered[0].z - filtered[filtered.length - 1].z) <= closeTolerance;
  const source = closed ? filtered.slice(0, -1) : filtered;
  const points: SketchPoint[] = source.map((point) => ({ id: createLocalId("skpt"), ...point, mode: "smooth" }));
  const segments: SketchSegment[] = points.slice(1).map((point, index) => ({
    id: createLocalId("skseg"),
    kind: "line",
    startId: points[index].id,
    endId: point.id,
  }));
  if (closed && points.length >= 3) {
    segments.push({ id: createLocalId("skseg"), kind: "line", startId: points[points.length - 1].id, endId: points[0].id });
  }
  return { points, segments };
}

export function direct2dProfileFromGesture(
  tool: Direct2DDrawTool,
  origin: Direct2DPoint,
  current: Direct2DPoint,
  trail: Direct2DPoint[] = [origin, current],
): SketchProfile {
  if (tool === "pencil") return pencilProfile(trail);
  if (tool === "triangle") return polygonProfile(origin, current, 3);
  if (tool === "hexagon") return polygonProfile(origin, current, 6);
  return materializeSketchEntities({ points: [], segments: [], entities: [entityFromDrag(tool, origin, current)] });
}
