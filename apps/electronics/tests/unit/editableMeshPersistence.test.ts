import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";
import { createEditableMesh, editableEdges, selectionVertices } from "@/lib/editableMesh";
import { connectMeshVertices } from "@/lib/meshConnect";
import { editableMeshToShape } from "@/lib/editableMeshShape";
import { buildMeshEdgeAdjacency } from "@/lib/meshTopologyEdit";
import type { WorkplaneShape } from "@/types/sketchforge";

function cube() { const geometry = new BoxGeometry(20, 20, 20); return createEditableMesh(new Float32Array(geometry.getAttribute("position").array), new Uint32Array(geometry.index!.array)); }
describe("editable surface integration", () => {
  it("connecting vertices partitions a real surface without opening the solid", () => {
    const mesh = cube(), vertices = selectionVertices(mesh, "face", new Set([0]));
    const edges = editableEdges(mesh), a = vertices[0], b = vertices.find(b => b !== a && !edges.some(e => (e.a === a && e.b === b) || (e.b === a && e.a === b)))!;
    const result = connectMeshVertices(mesh, new Set([a, b]));
    expect(result.faces).toHaveLength(7); expect(editableEdges(result)).toHaveLength(13);
    expect([...buildMeshEdgeAdjacency(result.indices).values()].every(edge => edge.triangles.length === 2)).toBe(true);
    expect(() => connectMeshVertices(result, new Set([a, b]))).toThrow(/conectados/);
  });
  it("does not round mesh extents or retain stale CAD geometry", () => {
    const mesh = cube(); mesh.positions[0] += 0.00321;
    const source = { id: "mesh", name: "Mesh", kind: "box", color: "red", x: 0, z: 0, rotation: 0, size: 20, height: 20, cadBrep: "old-brep" } as WorkplaneShape;
    const shape = editableMeshToShape(source, mesh);
    expect(shape.cadBrep).toBeUndefined(); expect(shape.id).toBe(source.id); expect(shape.importedMesh?.editFaceGroups).toEqual(mesh.faces);
    expect(shape.width).toBe(mesh.positions[0] + 10);
    const local = shape.importedMesh!.positions;
    for (let i = 0; i < mesh.indices.length; i++) {
      expect(local[i * 3] + shape.x).toBeCloseTo(mesh.positions[mesh.indices[i] * 3], 6);
      expect(local[i * 3 + 1] + shape.elevation!).toBeCloseTo(mesh.positions[mesh.indices[i] * 3 + 1], 6);
    }
  });
});
