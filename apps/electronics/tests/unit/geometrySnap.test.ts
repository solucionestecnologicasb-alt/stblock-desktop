import { describe, expect, it } from "vitest";
import { excludeEdgesFromShapes, pickSnapCandidate, snapWorldPointToEdges } from "@/lib/geometrySnap";

// Camera at origin looking down -Z, fov 90°, square viewport.
// Perspective: clip.x = x / -z, clip.y = y / -z (f/aspect = 1).
// Three.js column-major perspective matrix: near=0.1, far=100, fov=90 (f=1).
const PROJECTION = {
  matrixWorldInverse: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  projectionMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1.002002, -1, 0, 0, -0.2002, 0],
  width: 100,
  height: 100,
};

const EDGES = [
  { id: 1, points: [0, 0, -10, 10, 0, -10] },   // X axis line at z=-10
  { id: 2, points: [10, 0, -10, 10, 0, -20] },  // Z axis line from (10,0,-10) to (10,0,-20)
];

describe("geometrySnap", () => {
  it("snaps to edge endpoints", () => {
    // Endpoint (0,0,-10) projects to screen center (50,50).
    const result = pickSnapCandidate(EDGES, { x: 50, y: 50 }, [0, 0, -10], PROJECTION, 14);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("endpoint");
    expect(result?.edgeId).toBe(1);
    expect(result?.point[0]).toBe(0);
    expect(result?.point[1]).toBe(0);
    expect(result?.point[2]).toBe(-10);
  });

  it("snaps to midpoints of edges", () => {
    // Midpoint (5,0,-10) projects to screen (75,50).
    const result = pickSnapCandidate(EDGES, { x: 75, y: 50 }, [5, 0, -10], PROJECTION, 14);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("midpoint");
    expect(result?.point[0]).toBeCloseTo(5, 5);
  });

  it("respects the pixel tolerance", () => {
    // Pointer far from any edge in screen space.
    const result = pickSnapCandidate(EDGES, { x: 10, y: 10 }, [0, 0, -10], PROJECTION, 14);
    expect(result).toBeNull();
  });

  it("picks the closest candidate when several are within tolerance", () => {
    // Pointer slightly right of the (0,0,-10) endpoint (screen 50,50): endpoint
    // is closer than the midpoint (screen 75,50).
    const result = pickSnapCandidate(EDGES, { x: 52, y: 50 }, [0.3, 0, -10], PROJECTION, 14);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("endpoint");
  });

  it("snaps world-space points to edges", () => {
    const result = snapWorldPointToEdges(EDGES, [10.2, 0, -15], 2);
    expect(result).not.toBeNull();
    // Closest is the midpoint of edge 2 at (10,0,-15).
    expect(result?.kind).toBe("midpoint");
    expect(result?.edgeId).toBe(2);
    expect(result?.point[0]).toBeCloseTo(10, 5);
  });

  it("excludes edges owned by excluded shapes", () => {
    const owners = new Map<number, string>([
      [1, "shape-a"],
      [2, "shape-b"],
    ]);
    const filtered = excludeEdgesFromShapes(EDGES, owners, new Set(["shape-a"]));
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(2);
  });
});
