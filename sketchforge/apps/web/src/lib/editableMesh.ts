import { Matrix4, Vector3, ShapeUtils, Vector2 } from "three";
import { canonicalizeMesh } from "./meshTopology";

// Faces retain their triangle membership during a deformation. A bent quad
// must not turn into two separately selectable faces when the mouse is released.
export type EditableMesh = { positions: Float32Array; indices: Uint32Array; faces: number[][] };
export type EditSelectionMode = "vertex" | "edge" | "face";
export type EditEdge = { a: number; b: number };
export const cloneEditableMesh = (mesh: EditableMesh): EditableMesh => ({ positions: mesh.positions.slice(), indices: mesh.indices.slice(), faces: mesh.faces.map(face => [...face]) });
export const meshPoint = (mesh: EditableMesh, id: number) => new Vector3().fromArray(mesh.positions, id * 3);

export function createEditableMesh(positions: Float32Array, indices: Uint32Array, savedFaces?: number[][]): EditableMesh {
  const mesh = canonicalizeMesh(positions, indices);
  const count = mesh.indices.length / 3;
  if (!count || ![...mesh.positions].every(Number.isFinite)) throw new Error("La pieza no tiene una malla válida para editar");
  if (Array.isArray(savedFaces) && savedFaces.every(face => Array.isArray(face) && face.length > 0) && savedFaces.flat().length === count && new Set(savedFaces.flat()).size === count && savedFaces.flat().every(n => Number.isInteger(n) && n >= 0 && n < count)) {
    return { ...mesh, faces: savedFaces.map(face => [...face]) };
  }
  const normal: Vector3[] = [];
  const parents = Array.from({ length: count }, (_, i) => i);
  const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  const edges = new Map<string, number[]>();
  for (let t = 0; t < count; t++) {
    const ids = Array.from(mesh.indices.slice(t * 3, t * 3 + 3));
    const [a, b, c] = ids.map(id => new Vector3().fromArray(mesh.positions, id * 3));
    normal.push(b.sub(a).cross(c.sub(a)).normalize());
    for (let j = 0; j < 3; j++) { const x = ids[j], y = ids[(j + 1) % 3]; const key = x < y ? `${x}:${y}` : `${y}:${x}`; const adjacent = edges.get(key) ?? []; adjacent.push(t); edges.set(key, adjacent); }
  }
  for (const adjacent of edges.values()) {
    if (adjacent.length !== 2) continue;
    const [a, b] = adjacent;
    // Strictly coplanar, equally oriented adjacent triangles only. Curved
    // surfaces are never collapsed into a giant approximate face.
    if (normal[a].dot(normal[b]) > 0.999999) parents[root(b)] = root(a);
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < count; i++) { const id = root(i), group = groups.get(id) ?? []; group.push(i); groups.set(id, group); }
  return { ...mesh, faces: [...groups.values()] };
}

export function faceBoundary(mesh: EditableMesh, face: number): EditEdge[] {
  const edges = new Map<string, { a: number; b: number; count: number }>();
  for (const t of mesh.faces[face] ?? []) for (let j = 0; j < 3; j++) {
    const a = mesh.indices[t * 3 + j], b = mesh.indices[t * 3 + (j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const edge = edges.get(key); if (edge) edge.count++; else edges.set(key, { a, b, count: 1 });
  }
  return [...edges.values()].filter(edge => edge.count === 1).map(({ a, b }) => ({ a, b }));
}

export function editableEdges(mesh: EditableMesh): EditEdge[] {
  const edges = new Map<string, EditEdge>();
  mesh.faces.forEach((_, face) => faceBoundary(mesh, face).forEach(({ a, b }) => edges.set(a < b ? `${a}:${b}` : `${b}:${a}`, { a, b })));
  return [...edges.values()];
}

export function selectionVertices(mesh: EditableMesh, mode: EditSelectionMode, selected: ReadonlySet<number>, edges = editableEdges(mesh)): number[] {
  const vertices = new Set<number>();
  for (const id of selected) {
    if (mode === "vertex" && id >= 0 && id * 3 < mesh.positions.length) vertices.add(id);
    if (mode === "edge" && edges[id]) { vertices.add(edges[id].a); vertices.add(edges[id].b); }
    if (mode === "face") for (const t of mesh.faces[id] ?? []) for (let j = 0; j < 3; j++) vertices.add(mesh.indices[t * 3 + j]);
  }
  return [...vertices];
}

export function transformMeshSelection(base: Float32Array, output: Float32Array, vertices: readonly number[], matrix: Matrix4) {
  const point = new Vector3();
  for (const id of vertices) point.fromArray(base, id * 3).applyMatrix4(matrix).toArray(output, id * 3);
}

export function selectionCenter(mesh: EditableMesh, vertices: readonly number[]): Vector3 {
  const center = new Vector3(); vertices.forEach(id => center.add(meshPoint(mesh, id))); return center.divideScalar(vertices.length || 1);
}

export function extrudeEditableFaces(mesh: EditableMesh, selected: ReadonlySet<number>): { mesh: EditableMesh; vertices: number[] } {
  if (!selected.size) throw new Error("Selecciona una cara para extruir");
  const result = cloneEditableMesh(mesh), positions = Array.from(result.positions), indices = Array.from(result.indices);
  const remap = new Map<number, number>();
  const selectedTriangles = new Set([...selected].flatMap(id => mesh.faces[id] ?? []));
  const edges = new Map<string, { a: number; b: number; count: number }>();
  for (const t of selectedTriangles) for (let j = 0; j < 3; j++) {
    const a = mesh.indices[t * 3 + j], b = mesh.indices[t * 3 + (j + 1) % 3];
    if (!remap.has(a)) { remap.set(a, positions.length / 3); positions.push(...mesh.positions.slice(a * 3, a * 3 + 3)); }
    const key = a < b ? `${a}:${b}` : `${b}:${a}`, edge = edges.get(key);
    if (edge) edge.count++; else edges.set(key, { a, b, count: 1 });
  }
  for (const t of selectedTriangles) for (let j = 0; j < 3; j++) indices[t * 3 + j] = remap.get(mesh.indices[t * 3 + j])!;
  for (const { a, b, count } of edges.values()) if (count === 1) {
    const aa = remap.get(a)!, bb = remap.get(b)!, t = indices.length / 3;
    indices.push(a, b, bb, a, bb, aa); result.faces.push([t, t + 1]);
  }
  result.positions = new Float32Array(positions); result.indices = new Uint32Array(indices);
  return { mesh: result, vertices: [...remap.values()] };
}

export function subdivideEditableEdges(mesh: EditableMesh, selectedEdges: EditEdge[]): EditableMesh {
  const result = cloneEditableMesh(mesh), positions = Array.from(mesh.positions);
  let triangles = Array.from({ length: mesh.indices.length / 3 }, (_, t) => Array.from(mesh.indices.slice(t * 3, t * 3 + 3)));
  let groups = mesh.faces.map(face => [...face]);
  for (const { a, b } of selectedEdges) {
    const mid = positions.length / 3; positions.push(...meshPoint(mesh, a).add(meshPoint(mesh, b)).multiplyScalar(0.5).toArray());
    const next: number[][] = [], remap = new Map<number, number[]>();
    triangles.forEach((tri, t) => {
      let split = false;
      for (let j = 0; j < 3; j++) if ((tri[j] === a && tri[(j + 1) % 3] === b) || (tri[j] === b && tri[(j + 1) % 3] === a)) {
        remap.set(t, [next.length, next.length + 1]); next.push([tri[j], mid, tri[(j + 2) % 3]], [mid, tri[(j + 1) % 3], tri[(j + 2) % 3]]); split = true; break;
      }
      if (!split) { remap.set(t, [next.length]); next.push(tri); }
    });
    groups = groups.map(face => face.flatMap(t => remap.get(t)!)); triangles = next;
  }
  result.positions = new Float32Array(positions); result.indices = new Uint32Array(triangles.flat()); result.faces = groups; return result;
}

export function deleteMeshSelection(mesh: EditableMesh, mode: EditSelectionMode, selected: ReadonlySet<number>): EditableMesh {
  const result = cloneEditableMesh(mesh), vertices = new Set(selectionVertices(mesh, mode, selected));
  const selectedEdges = mode === "edge" ? editableEdges(mesh).filter((_, id) => selected.has(id)) : [];
  const removed = new Set<number>();
  if (mode === "face") [...selected].forEach(id => mesh.faces[id]?.forEach(t => removed.add(t)));
  else for (let t = 0; t < mesh.indices.length / 3; t++) {
    const hits = Array.from(mesh.indices.slice(t * 3, t * 3 + 3)).filter(id => vertices.has(id)).length;
    if (mode === "vertex" ? hits > 0 : selectedEdges.some(edge => Array.from(mesh.indices.slice(t * 3, t * 3 + 3)).includes(edge.a) && Array.from(mesh.indices.slice(t * 3, t * 3 + 3)).includes(edge.b))) removed.add(t);
  }
  const triangles: number[] = [], remap = new Map<number, number>();
  for (let t = 0; t < mesh.indices.length / 3; t++) if (!removed.has(t)) { remap.set(t, triangles.length / 3); triangles.push(...mesh.indices.slice(t * 3, t * 3 + 3)); }
  if (!triangles.length) throw new Error("Para eliminar toda la pieza, vuelve al modo Piezas");
  result.indices = new Uint32Array(triangles); result.faces = mesh.faces.map(face => face.filter(t => remap.has(t)).map(t => remap.get(t)!)).filter(face => face.length); return result;
}

export function fillMeshSelection(mesh: EditableMesh, selected: ReadonlySet<number>): EditableMesh {
  if (selected.size < 3) throw new Error("Selecciona al menos tres vértices de un contorno");
  const ids = [...selected], points = ids.map(id => meshPoint(mesh, id)), center = selectionCenter(mesh, ids);
  if (mesh.faces.some((_, id) => { const vertices = selectionVertices(mesh, "face", new Set([id])); return vertices.length === ids.length && vertices.every(id => selected.has(id)); })) throw new Error("Estos vértices ya forman una cara");
  const normal = new Vector3();
  for (let i = 1; i + 1 < points.length && normal.lengthSq() < 1e-12; i++) normal.crossVectors(points[i].clone().sub(points[0]), points[i + 1].clone().sub(points[0]));
  if (normal.lengthSq() < 1e-12) throw new Error("Los vértices están alineados; no definen una cara");
  normal.normalize();
  if (points.some(p => Math.abs(p.clone().sub(center).dot(normal)) > 0.01)) throw new Error("Para crear una cara, selecciona vértices en un mismo plano");
  const u = points[0].clone().sub(center).normalize(), v = normal.clone().cross(u);
  const sorted = ids.map((id, i) => ({ id, p: new Vector2(points[i].clone().sub(center).dot(u), points[i].clone().sub(center).dot(v)) })).sort((a, b) => Math.atan2(a.p.y, a.p.x) - Math.atan2(b.p.y, b.p.x));
  const boundary = new Map<string, [number, number]>();
  for (const edge of editableEdges(mesh)) boundary.set(`${edge.a}:${edge.b}`, [edge.a, edge.b]);
  // Orient a newly filled hole opposite its existing boundary.
  if (sorted.some((entry, i) => boundary.has(`${entry.id}:${sorted[(i + 1) % sorted.length].id}`))) sorted.reverse();
  const triangles = ShapeUtils.triangulateShape(sorted.map(item => item.p), []);
  const result = cloneEditableMesh(mesh), indices = Array.from(mesh.indices), face: number[] = [];
  triangles.forEach(tri => { face.push(indices.length / 3); indices.push(...tri.map(i => sorted[i].id)); });
  if (!face.length) throw new Error("No se pudo cerrar ese contorno");
  result.indices = new Uint32Array(indices); result.faces.push(face); return result;
}
