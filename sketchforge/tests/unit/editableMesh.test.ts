import { describe, expect, it } from "vitest";
import { BoxGeometry, Matrix4 } from "three";
import { cloneEditableMesh, createEditableMesh, deleteMeshSelection, editableEdges, extrudeEditableFaces, selectionVertices, subdivideEditableEdges, transformMeshSelection } from "@/lib/editableMesh";
import { buildMeshEdgeAdjacency } from "@/lib/meshTopologyEdit";

function cube() { const geometry = new BoxGeometry(20, 20, 20); return createEditableMesh(new Float32Array(geometry.getAttribute("position").array), new Uint32Array(geometry.index!.array)); }
describe("direct editable mesh", () => {
  it("welds triangle corners and selects six actual cube faces without diagonal edges", () => {
    const mesh = cube(); expect(mesh.positions.length / 3).toBe(8); expect(mesh.faces).toHaveLength(6); expect(editableEdges(mesh)).toHaveLength(12);
  });
  it("moves the surface vertices immediately and leaves unselected vertices untouched", () => {
    const mesh = cube(), original = mesh.positions.slice(), chosen = selectionVertices(mesh, "edge", new Set([0]));
    transformMeshSelection(original, mesh.positions, chosen, new Matrix4().makeTranslation(5, 3, -2));
    for (let i = 0; i < original.length / 3; i++) expect(Array.from(mesh.positions.slice(i * 3, i * 3 + 3))).toEqual(Array.from(original.slice(i * 3, i * 3 + 3)).map((value, axis) => value + (chosen.includes(i) ? [5, 3, -2][axis] : 0)));
    expect(mesh.faces).toHaveLength(6);
  });
  it("previews always transform the starting snapshot rather than accumulating errors", () => {
    const mesh = cube(), base = mesh.positions.slice();
    for (let i = 0; i < 100; i++) transformMeshSelection(base, mesh.positions, [0], new Matrix4().makeTranslation(5, 0, 0));
    expect(mesh.positions[0]).toBe(base[0] + 5); mesh.positions.set(base); expect(mesh.positions).toEqual(base);
  });
  it("scales all corners of a face once, including shared triangle vertices", () => {
    const mesh = cube(), ids = selectionVertices(mesh, "face", new Set([0])); expect(ids).toHaveLength(4);
    const before = mesh.positions.slice(); transformMeshSelection(before, mesh.positions, ids, new Matrix4().makeScale(2, 1, 1));
    ids.forEach(id => expect(mesh.positions[id * 3]).toBe(before[id * 3] * 2));
  });
  it("extrudes a connected face region with closed side walls and cancellable geometry", () => {
    const mesh = cube(), before = cloneEditableMesh(mesh), result = extrudeEditableFaces(mesh, new Set([0]));
    expect(result.vertices).toHaveLength(4); expect(result.mesh.faces).toHaveLength(10);
    expect([...buildMeshEdgeAdjacency(result.mesh.indices).values()].every(edge => edge.triangles.length === 2)).toBe(true);
    expect(mesh).toEqual(before);
  });
  it("subdivision inserts connected vertices into both adjacent surfaces", () => {
    const mesh = cube(), result = subdivideEditableEdges(mesh, [editableEdges(mesh)[0]]);
    expect(result.positions.length / 3).toBe(9); expect(result.indices.length / 3).toBe(14);
    expect([...buildMeshEdgeAdjacency(result.indices).values()].every(edge => edge.triangles.length === 2)).toBe(true);
  });
  it("keeps bent polygon groups after flattening and reopening", () => {
    const mesh = cube(); mesh.positions[0] += 4;
    const flat = new Float32Array(Array.from(mesh.indices).flatMap(id => Array.from(mesh.positions.slice(id * 3, id * 3 + 3))));
    const restored = createEditableMesh(flat, new Uint32Array(Array.from({ length: flat.length / 3 }, (_, i) => i)), mesh.faces);
    expect(restored.faces).toEqual(mesh.faces); expect(restored.faces).toHaveLength(6);
  });
  it("deletes a selected face and protects against accidental whole-piece deletion", () => {
    const mesh = cube(), result = deleteMeshSelection(mesh, "face", new Set([0]));
    expect(result.faces).toHaveLength(5); expect(result.indices.length / 3).toBe(10);
    expect(() => deleteMeshSelection(mesh, "face", new Set([0, 1, 2, 3, 4, 5]))).toThrow(/Piezas/);
  });
});
