import { describe, expect, it } from "vitest";
import {
  alignTargetValue,
  buildMeshEdgeAdjacency,
  moveMeshVerticesNear,
  nearestPointOnSegments,
  snapToGridValue,
  splitMeshEdgeAtPoint,
} from "@/lib/meshTopologyEdit";

describe("moveMeshVerticesNear", () => {
  it("moves only the vertices within tolerance of an update target", () => {
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      5, 5, 5,
    ]);
    const moved = moveMeshVerticesNear(positions, [{ from: { x: 0, y: 0, z: 0 }, to: { x: 9, y: 9, z: 9 } }], 0.01);
    expect(Array.from(moved)).toEqual([9, 9, 9, 1, 0, 0, 0, 1, 0, 5, 5, 5]);
  });

  it("moves multiple nearby vertices when several updates are provided", () => {
    const positions = new Float32Array([
      0, 0, 0,
      2, 0, 0,
      4, 0, 0,
    ]);
    const moved = moveMeshVerticesNear(
      positions,
      [
        { from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 10, z: 10 } },
        { from: { x: 4, y: 0, z: 0 }, to: { x: -4, y: 0, z: 0 } },
      ],
      0.1,
    );
    expect(Array.from(moved)).toEqual([10, 10, 10, 2, 0, 0, -4, 0, 0]);
  });

  it("respects the tolerance and leaves distant vertices untouched", () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 10, 0, 0]);
    const moved = moveMeshVerticesNear(positions, [{ from: { x: 0, y: 0, z: 0 }, to: { x: 3, y: 0, z: 0 } }], 0.5);
    expect(moved[0]).toBeCloseTo(3);
    expect(moved[1]).toBeCloseTo(0);
    expect(moved[2]).toBeCloseTo(0);
    expect(moved[3]).toBeCloseTo(1);
    expect(moved[6]).toBeCloseTo(10);
  });
});

describe("buildMeshEdgeAdjacency", () => {
  it("groups triangles by undirected edge", () => {
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    const adjacency = buildMeshEdgeAdjacency(indices);
    expect(adjacency.size).toBe(5);
    expect(adjacency.get("0:1")?.triangles).toEqual([0]);
    expect(adjacency.get("1:2")?.triangles).toEqual([0]);
    expect(adjacency.get("2:3")?.triangles).toEqual([1]);
    expect(adjacency.get("0:3")?.triangles).toEqual([1]);
    // The diagonal edge (0,2) is shared by both triangles.
    expect(adjacency.get("0:2")?.triangles).toEqual([0, 1]);
  });

  it("keys the edge with the canonical low:high order regardless of winding", () => {
    const indices = new Uint32Array([3, 2, 1]);
    const adjacency = buildMeshEdgeAdjacency(indices);
    expect(adjacency.has("1:2")).toBe(true);
    expect(adjacency.has("1:3")).toBe(true);
    expect(adjacency.has("2:3")).toBe(true);
    expect(adjacency.has("3:1")).toBe(false);
  });
});

describe("splitMeshEdgeAtPoint", () => {
  function signedAreaZ(i0: number[], i1: number[], i2: number[]) {
    const ax = i1[0] - i0[0];
    const ay = i1[1] - i0[1];
    const bx = i2[0] - i0[0];
    const by = i2[1] - i0[1];
    return ax * by - ay * bx;
  }

  it("inserts a vertex on the midpoint of a shared edge and splits both adjacent triangles", () => {
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ]);
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    const result = splitMeshEdgeAtPoint(positions, indices, { x: 0.5, y: 0.5, z: 0 }, 0.01);
    expect(result).not.toBeNull();
    const { positions: outPositions, indices: outIndices, newVertexIndex } = result!;
    expect(newVertexIndex).toBe(4);
    expect(outPositions.length).toBe(5 * 3);
    expect(outIndices.length).toBe(4 * 3);
    expect(outPositions[12]).toBeCloseTo(0.5);
    expect(outPositions[13]).toBeCloseTo(0.5);
    expect(outPositions[14]).toBeCloseTo(0);
  });

  it("keeps the winding orientation of every split triangle", () => {
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ]);
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    const result = splitMeshEdgeAtPoint(positions, indices, { x: 0.5, y: 0.5, z: 0 }, 0.01)!;
    const { positions: outPositions, indices: outIndices } = result;
    const vertex = (index: number) => [outPositions[index * 3], outPositions[index * 3 + 1], outPositions[index * 3 + 2]];
    // Original triangles were counter-clockwise in +Z, so every split triangle
    // must have a positive signed area.
    for (let index = 0; index < outIndices.length; index += 3) {
      const area = signedAreaZ(vertex(outIndices[index]), vertex(outIndices[index + 1]), vertex(outIndices[index + 2]));
      expect(area).toBeGreaterThan(0);
    }
  });

  it("returns null when the point is far from every edge", () => {
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ]);
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    const result = splitMeshEdgeAtPoint(positions, indices, { x: 50, y: 50, z: 0 }, 0.01);
    expect(result).toBeNull();
  });

  it("splits a single-triangle edge into two triangles with correct winding", () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const indices = new Uint32Array([0, 1, 2]);
    const result = splitMeshEdgeAtPoint(positions, indices, { x: 0.5, y: 0, z: 0 }, 0.01)!;
    expect(result.newVertexIndex).toBe(3);
    expect(result.indices.length).toBe(6);
    const { positions: outPositions, indices: outIndices } = result;
    const vertex = (index: number) => [outPositions[index * 3], outPositions[index * 3 + 1], outPositions[index * 3 + 2]];
    const area0 = signedAreaZ(vertex(outIndices[0]), vertex(outIndices[1]), vertex(outIndices[2]));
    const area1 = signedAreaZ(vertex(outIndices[3]), vertex(outIndices[4]), vertex(outIndices[5]));
    expect(area0).toBeGreaterThan(0);
    expect(area1).toBeGreaterThan(0);
  });
});

describe("alignTargetValue", () => {
  it("returns the minimum value for target min", () => {
    expect(alignTargetValue([3, 1, 2], "min")).toBe(1);
  });

  it("returns the maximum value for target max", () => {
    expect(alignTargetValue([3, 1, 2], "max")).toBe(3);
  });

  it("returns the arithmetic mean for target center", () => {
    expect(alignTargetValue([0, 4, 2], "center")).toBeCloseTo(2);
  });

  it("returns 0 for an empty list on center", () => {
    expect(alignTargetValue([], "center")).toBe(0);
  });
});

describe("snapToGridValue", () => {
  it("snaps to the nearest grid line from the origin", () => {
    expect(snapToGridValue(4.2, 0, 5)).toBeCloseTo(5);
    expect(snapToGridValue(2.1, 0, 5)).toBeCloseTo(0);
  });

  it("uses the grid origin offset for layouts not starting at zero", () => {
    // Grid lines laid out from -7.5 in increments of 2.5.
    expect(snapToGridValue(-6.4, -7.5, 2.5)).toBeCloseTo(-7.5);
    expect(snapToGridValue(-6.1, -7.5, 2.5)).toBeCloseTo(-5);
  });

  it("returns the value unchanged for a non-positive or non-finite step", () => {
    expect(snapToGridValue(4.2, 0, 0)).toBe(4.2);
    expect(snapToGridValue(4.2, 0, Number.NaN)).toBe(4.2);
  });
});

describe("nearestPointOnSegments", () => {
  it("returns the closest point on the polyline", () => {
    const points = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0]);
    const result = nearestPointOnSegments(points, { x: 5, y: 2, z: 0 });
    expect(result.point).toEqual({ x: 5, y: 0, z: 0 });
    expect(result.distance).toBeCloseTo(2);
  });

  it("finds the nearest point on a later segment", () => {
    const points = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0]);
    const result = nearestPointOnSegments(points, { x: 12, y: 8, z: 0 });
    expect(result.point).toEqual({ x: 10, y: 8, z: 0 });
    expect(result.distance).toBeCloseTo(2);
  });

  it("clamps to segment endpoints when the projection falls outside", () => {
    const points = new Float32Array([0, 0, 0, 10, 0, 0]);
    const result = nearestPointOnSegments(points, { x: -3, y: 1, z: 0 });
    expect(result.point).toEqual({ x: 0, y: 0, z: 0 });
    expect(result.distance).toBeCloseTo(Math.sqrt(10));
  });

  it("returns the input point and infinite distance for an empty polyline", () => {
    const result = nearestPointOnSegments(new Float32Array([]), { x: 1, y: 2, z: 3 });
    expect(result.point).toEqual({ x: 1, y: 2, z: 3 });
    expect(result.distance).toBe(Number.POSITIVE_INFINITY);
  });
});
