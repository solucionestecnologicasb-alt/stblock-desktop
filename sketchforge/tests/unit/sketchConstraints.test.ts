import { describe, expect, it } from "vitest";
import { solveSketchConstraints, type SketchSolverState } from "@/lib/sketchConstraints";

const TOL = 1e-3;

describe("sketchConstraints", () => {
  it("satisfies a coincident constraint", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 3, z: 4 },
      ],
      segments: [],
      constraints: [{ id: "c1", kind: "coincident", pointA: "a", pointB: "b" }],
    };
    const result = solveSketchConstraints(state);
    expect(result.converged).toBe(true);
    const a = result.points.find((point) => point.id === "a")!;
    const b = result.points.find((point) => point.id === "b")!;
    expect(a.x).toBeCloseTo(b.x, 4);
    expect(a.z).toBeCloseTo(b.z, 4);
  });

  it("satisfies horizontal and vertical constraints", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a", x: 0, z: 1 },
        { id: "b", x: 2, z: 4 },
      ],
      segments: [{ id: "s1", startId: "a", endId: "b" }],
      constraints: [
        { id: "c1", kind: "horizontal", segmentId: "s1" },
      ],
    };
    const result = solveSketchConstraints(state);
    const a = result.points.find((point) => point.id === "a")!;
    const b = result.points.find((point) => point.id === "b")!;
    expect(a.z).toBeCloseTo(b.z, 4);
    expect(result.converged).toBe(true);
  });

  it("satisfies a distance constraint", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 2, z: 0 },
      ],
      segments: [],
      constraints: [{ id: "c1", kind: "distance", pointA: "a", pointB: "b", value: 5 }],
    };
    const result = solveSketchConstraints(state);
    const a = result.points.find((point) => point.id === "a")!;
    const b = result.points.find((point) => point.id === "b")!;
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    expect(distance).toBeCloseTo(5, 3);
  });

  it("keeps a segment parallel to another after dragging a point", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a1", x: 0, z: 0 },
        { id: "a2", x: 4, z: 0 },
        { id: "b1", x: 1, z: 2 },
        { id: "b2", x: 5, z: 3 },
      ],
      segments: [
        { id: "sa", startId: "a1", endId: "a2" },
        { id: "sb", startId: "b1", endId: "b2" },
      ],
      constraints: [{ id: "c1", kind: "parallel", segmentA: "sa", segmentB: "sb" }],
    };
    const result = solveSketchConstraints(state);
    const a1 = result.points.find((point) => point.id === "a1")!;
    const a2 = result.points.find((point) => point.id === "a2")!;
    const b1 = result.points.find((point) => point.id === "b1")!;
    const b2 = result.points.find((point) => point.id === "b2")!;
    const cross = (a2.x - a1.x) * (b2.z - b1.z) - (a2.z - a1.z) * (b2.x - b1.x);
    expect(cross).toBeCloseTo(0, 4);
  });

  it("satisfies a perpendicular constraint", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a1", x: 0, z: 0 },
        { id: "a2", x: 4, z: 0 },
        { id: "b1", x: 1, z: 2 },
        { id: "b2", x: 5, z: 3 },
      ],
      segments: [
        { id: "sa", startId: "a1", endId: "a2" },
        { id: "sb", startId: "b1", endId: "b2" },
      ],
      constraints: [{ id: "c1", kind: "perpendicular", segmentA: "sa", segmentB: "sb" }],
    };
    const result = solveSketchConstraints(state);
    const a1 = result.points.find((point) => point.id === "a1")!;
    const a2 = result.points.find((point) => point.id === "a2")!;
    const b1 = result.points.find((point) => point.id === "b1")!;
    const b2 = result.points.find((point) => point.id === "b2")!;
    const dot = (a2.x - a1.x) * (b2.x - b1.x) + (a2.z - a1.z) * (b2.z - b1.z);
    expect(dot).toBeCloseTo(0, 3);
  });

  it("does not move fixed points", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 3, z: 4 },
      ],
      segments: [],
      constraints: [
        { id: "c1", kind: "coincident", pointA: "a", pointB: "b" },
        { id: "c2", kind: "fixed", pointId: "a" },
      ],
    };
    const result = solveSketchConstraints(state);
    const a = result.points.find((point) => point.id === "a")!;
    const b = result.points.find((point) => point.id === "b")!;
    expect(a.x).toBeCloseTo(0, 6);
    expect(a.z).toBeCloseTo(0, 6);
    expect(b.x).toBeCloseTo(0, 4);
    expect(b.z).toBeCloseTo(0, 4);
  });

  it("preserves point ids and order", () => {
    const state: SketchSolverState = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 3, z: 4 },
      ],
      segments: [],
      constraints: [{ id: "c1", kind: "coincident", pointA: "a", pointB: "b" }],
    };
    const result = solveSketchConstraints(state);
    expect(result.points.map((point) => point.id)).toEqual(["a", "b"]);
  });
});
