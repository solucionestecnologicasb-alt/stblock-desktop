import { describe, expect, it } from "vitest";
import { entityContourBounds, entityContourLoops, entityContourPathData } from "@/lib/sketchEntityContours";
import { tessellateSketchEntity } from "@/lib/capGeometry";
import { traceBinaryMask } from "@/lib/sketchVectorImport";
import type { SketchEntity } from "@/types/sketchforge";

describe("rich sketch entities", () => {
  it("converts editable text into closed extrusion loops including letter holes", () => {
    const entity: SketchEntity = {
      id: "text-1",
      kind: "text",
      cx: 4,
      cz: 7,
      text: "O",
      font: "Sans",
      size: 20,
      scaleX: 1,
      scaleZ: 1,
      rotation: 0,
    };
    const loops = entityContourLoops(entity);
    expect(loops.length).toBeGreaterThanOrEqual(2);
    expect(loops.every((loop) => loop.length >= 3)).toBe(true);
    const topology = tessellateSketchEntity(entity);
    expect(topology.points.length).toBeGreaterThan(8);
    expect(topology.segments.length).toBe(topology.points.length);
    expect(entityContourPathData(entity)).toContain(" Z");
  });

  it("applies independent scale and rotation to imported contours", () => {
    const entity: SketchEntity = {
      id: "vector-1",
      kind: "vector",
      cx: 0,
      cz: 0,
      name: "Square",
      loops: [[{ x: -1, z: -1 }, { x: 1, z: -1 }, { x: 1, z: 1 }, { x: -1, z: 1 }]],
      scaleX: 2,
      scaleZ: 3,
      rotation: 0,
      sourceFormat: "svg",
    };
    expect(entityContourBounds(entity)).toEqual({ width: 4, depth: 6 });
    entity.rotation = 90;
    const rotated = entityContourBounds(entity);
    expect(rotated.width).toBeCloseTo(6);
    expect(rotated.depth).toBeCloseTo(4);
  });

  it("traces raster pixels into closed boundaries and preserves holes", () => {
    const mask = [
      true, true, true,
      true, false, true,
      true, true, true,
    ];
    const loops = traceBinaryMask(mask, 3, 3);
    expect(loops.length).toBe(2);
    expect(loops.every((loop) => loop.length >= 4)).toBe(true);
  });
});
