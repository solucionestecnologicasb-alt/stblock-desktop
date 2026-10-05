import { ShapeUtils, Vector2 } from "three";
import { editableEdges, faceBoundary, meshPoint, type EditableMesh } from "./editableMesh";

/** Split an existing surface, never create a disconnected decorative line. */
export function connectMeshVertices(mesh: EditableMesh, selected: ReadonlySet<number>): EditableMesh {
  if (selected.size !== 2) throw new Error("Selecciona dos vértices para conectar");
  const [a, b] = [...selected];
  if (editableEdges(mesh).some(edge => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a))) throw new Error("Estos vértices ya están conectados");
  for (let faceId = 0; faceId < mesh.faces.length; faceId++) {
    const boundary = faceBoundary(mesh, faceId), next = new Map(boundary.map(edge => [edge.a, edge.b]));
    if (!next.has(a) || !next.has(b)) continue;
    const loop = [a]; let current = next.get(a)!;
    while (current !== a && !loop.includes(current) && next.has(current)) { loop.push(current); current = next.get(current)!; }
    if (current !== a || loop.length !== boundary.length || !loop.includes(b)) continue;
    const split = loop.indexOf(b), loops = [loop.slice(0, split + 1), [...loop.slice(split), a]];
    const tri = mesh.faces[faceId][0], p0 = meshPoint(mesh, mesh.indices[tri * 3]), p1 = meshPoint(mesh, mesh.indices[tri * 3 + 1]), p2 = meshPoint(mesh, mesh.indices[tri * 3 + 2]);
    const normal = p1.clone().sub(p0).cross(p2.clone().sub(p0)).normalize(), u = p1.clone().sub(p0).normalize(), v = normal.clone().cross(u);
    const removed = new Set(mesh.faces[faceId]), indices: number[] = [], remap = new Map<number, number>();
    for (let t = 0; t < mesh.indices.length / 3; t++) if (!removed.has(t)) { remap.set(t, indices.length / 3); indices.push(...mesh.indices.slice(t * 3, t * 3 + 3)); }
    const faces = mesh.faces.filter((_, id) => id !== faceId).map(face => face.map(t => remap.get(t)!));
    for (const polygon of loops) {
      const flat = polygon.map(id => { const point = meshPoint(mesh, id).sub(p0); return new Vector2(point.dot(u), point.dot(v)); });
      const group: number[] = [];
      for (const triangle of ShapeUtils.triangulateShape(flat, [])) { group.push(indices.length / 3); indices.push(...triangle.map(i => polygon[i])); }
      if (!group.length) throw new Error("No se pudo dividir esa cara");
      faces.push(group);
    }
    return { positions: mesh.positions.slice(), indices: new Uint32Array(indices), faces };
  }
  throw new Error("Elige dos vértices del contorno de una misma cara");
}
