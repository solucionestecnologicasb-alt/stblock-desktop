import { describe, expect, it } from "vitest";
import {
  buildMeshTopology,
  canonicalizeMesh,
  extrudeMeshFace,
  recomputeTriangleNormals,
  type MeshFaceMesh,
} from "@/lib/meshTopology";
import { buildMeshEdgeAdjacency } from "@/lib/meshTopologyEdit";

function quadMesh() {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    1, 1, 0,
    0, 1, 0,
  ]);
  const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
  return { positions, indices };
}

/**
 * An indexed unit cube (8 vertices, 12 triangles) with outward-facing winding.
 */
function cubeMesh() {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    1, 1, 0,
    0, 1, 0,
    0, 0, 1,
    1, 0, 1,
    1, 1, 1,
    0, 1, 1,
  ]);
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, // bottom (-Z)
    4, 5, 6, 4, 6, 7, // top (+Z)
    0, 1, 5, 0, 5, 4, // front (-Y)
    3, 7, 6, 3, 6, 2, // back (+Y)
    0, 4, 7, 0, 7, 3, // left (-X)
    1, 2, 6, 1, 6, 5, // right (+X)
  ]);
  return { positions, indices };
}

function boundaryEdgeSet(boundary: MeshFaceMesh["boundary"]) {
  return new Set(boundary.map((edge) => `${edge.a}:${edge.b}`));
}

describe("canonicalizeMesh", () => {
  it("deduplicates the vertices of a non-indexed quad and remaps the indices", () => {
    // Non-indexed "triangle soup": every corner is a separate vertex.
    const positions = new Float32Array([
      0, 0, 0, 1, 0, 0, 1, 1, 0, // tri 0
      0, 0, 0, 1, 1, 0, 0, 1, 0, // tri 1
    ]);
    const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);
    const result = canonicalizeMesh(positions, indices);
    expect(result.positions.length).toBe(4 * 3);
    expect(result.indices.length).toBe(6);
    // Unique positions: (0,0,0), (1,0,0), (1,1,0), (0,1,0).
    const expected = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
    expect(Array.from(result.positions)).toEqual(Array.from(expected));
    expect(Array.from(result.indices)).toEqual([0, 1, 2, 0, 2, 3]);
  });

  it("keeps already-indexed meshes unchanged", () => {
    const { positions, indices } = cubeMesh();
    const result = canonicalizeMesh(positions, indices);
    expect(result.positions.length).toBe(8 * 3);
    expect(Array.from(result.indices)).toEqual(Array.from(indices));
  });
});

describe("buildMeshTopology", () => {
  it("finds 8 vertices, 6 faces and the triangulated cube edges", () => {
    const { positions, indices } = canonicalizeMesh(cubeMesh().positions, cubeMesh().indices);
    const topology = buildMeshTopology(positions, indices);
    expect(topology.vertices.length).toBe(8);
    expect(topology.faces.length).toBe(6);
    // A triangulated cube has the 12 geometric edges plus one diagonal per
    // square face = 18 unique undirected edges.
    expect(topology.edges.length).toBe(18);
    expect(topology.faceMesh.length).toBe(6);
    // Every cube face is a coplanar pair of triangles.
    for (const face of topology.faces) {
      expect(face.area).toBeCloseTo(1);
      const normalLength = Math.hypot(face.normal.x, face.normal.y, face.normal.z);
      expect(normalLength).toBeCloseTo(1);
    }
  });

  it("builds a single face with a 4-edge boundary from a quad", () => {
    const { positions, indices } = canonicalizeMesh(quadMesh().positions, quadMesh().indices);
    const topology = buildMeshTopology(positions, indices);
    expect(topology.faces.length).toBe(1);
    expect(topology.vertices.length).toBe(4);
    const face = topology.faces[0];
    expect(face.normal.x).toBeCloseTo(0);
    expect(face.normal.y).toBeCloseTo(0);
    expect(face.normal.z).toBeCloseTo(1);
    expect(face.area).toBeCloseTo(1);
    expect(face.points.length).toBe(4 * 3);
    const boundary = topology.faceMesh[0].boundary;
    expect(boundary.length).toBe(4);
    const edges = boundaryEdgeSet(boundary);
    expect(edges.has("0:1")).toBe(true);
    expect(edges.has("1:2")).toBe(true);
    expect(edges.has("2:3")).toBe(true);
    expect(edges.has("3:0")).toBe(true);
    // The boundary is a single closed loop: chain a -> b -> c -> d -> a.
    const chain = boundary.map((edge) => edge.a).join(",");
    const nextByStart = new Map(boundary.map((edge) => [edge.a, edge.b]));
    let cursor = boundary[0].a;
    let steps = 0;
    const visited: number[] = [];
    while (steps < boundary.length + 1) {
      visited.push(cursor);
      const next = nextByStart.get(cursor);
      if (next === undefined) break;
      cursor = next;
      steps += 1;
    }
    expect(chain).toBe("0,1,2,3");
    expect(visited.length).toBe(5); // returns to the start vertex
    expect(visited[0]).toBe(visited[4]);
  });
});

describe("extrudeMeshFace", () => {
  it("extrudes a standalone quad into 8 vertices and 10 triangles", () => {
    const { positions, indices } = quadMesh();
    const face: MeshFaceMesh = {
      triangles: [0, 1],
      boundary: [
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 0 },
      ],
    };
    const result = extrudeMeshFace(positions, indices, face, { x: 0, y: 0, z: 1 }, 5);
    expect(result).not.toBeNull();
    expect(result!.positions.length).toBe(8 * 3);
    expect(result!.indices.length).toBe(10 * 3);
    // The cap triangles are at z = 5.
    const { positions: outPositions, indices: outIndices } = result!;
    for (let index = 4; index < 8; index += 1) {
      expect(outPositions[index * 3 + 2]).toBeCloseTo(5);
    }
    // The cap reuses the original triangle winding (same normal +Z). The kept
    // (non-face) triangle count is zero, so the first triangle is the cap.
    const i0 = outIndices[0];
    const i1 = outIndices[1];
    const i2 = outIndices[2];
    const ax = outPositions[i0 * 3];
    const ay = outPositions[i0 * 3 + 1];
    const az = outPositions[i0 * 3 + 2];
    const bx = outPositions[i1 * 3];
    const by = outPositions[i1 * 3 + 1];
    const bz = outPositions[i1 * 3 + 2];
    const cx = outPositions[i2 * 3];
    const cy = outPositions[i2 * 3 + 1];
    const cz = outPositions[i2 * 3 + 2];
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    expect(nz).toBeGreaterThan(0);
  });

  it("closes the boundary of a cube face so every edge has two adjacent triangles", () => {
    const cube = cubeMesh();
    const canonical = canonicalizeMesh(cube.positions, cube.indices);
    const topology = buildMeshTopology(canonical.positions, canonical.indices);
    const topFaceIndex = topology.faces.findIndex((face) => face.normal.y > 0.9);
    expect(topFaceIndex).toBeGreaterThanOrEqual(0);
    const result = extrudeMeshFace(
      canonical.positions,
      canonical.indices,
      topology.faceMesh[topFaceIndex],
      topology.faces[topFaceIndex].normal,
      5,
    );
    expect(result).not.toBeNull();
    const { positions, indices } = result!;
    // 8 original cube vertices + the 4 top-face vertices translated.
    expect(positions.length / 3).toBe(12);
    const adjacency = buildMeshEdgeAdjacency(indices);
    for (const [key, entry] of adjacency) {
      expect(entry.triangles.length, `edge ${key} should be manifold`).toBe(2);
    }
  });

  it("returns null for an unusable face or distance", () => {
    const { positions, indices } = quadMesh();
    const face: MeshFaceMesh = { triangles: [], boundary: [] };
    expect(extrudeMeshFace(positions, indices, face, { x: 0, y: 0, z: 1 }, 5)).toBeNull();
    const validFace: MeshFaceMesh = {
      triangles: [0, 1],
      boundary: [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 }],
    };
    expect(extrudeMeshFace(positions, indices, validFace, { x: 0, y: 0, z: 1 }, 0)).toBeNull();
    expect(extrudeMeshFace(positions, indices, validFace, { x: 0, y: 0, z: 0 }, 5)).toBeNull();
  });
});

describe("recomputeTriangleNormals", () => {
  it("produces unit-length vertex normals for a flat triangle", () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const indices = new Uint32Array([0, 1, 2]);
    const normals = recomputeTriangleNormals(positions, indices);
    expect(normals.length).toBe(9);
    for (let index = 0; index < normals.length; index += 3) {
      const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]);
      expect(length).toBeCloseTo(1);
      expect(normals[index]).toBeCloseTo(0);
      expect(normals[index + 1]).toBeCloseTo(0);
      expect(normals[index + 2]).toBeCloseTo(1);
    }
  });

  it("smooths normals across a shared quad diagonal", () => {
    const { positions, indices } = quadMesh();
    const normals = recomputeTriangleNormals(positions, indices);
    expect(normals.length).toBe(4 * 3);
    for (let index = 0; index < normals.length; index += 3) {
      const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]);
      expect(length).toBeCloseTo(1);
    }
  });
});
