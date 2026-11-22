import { cloneEditableMesh, editableEdges, meshPoint, selectionCenter, selectionVertices, type EditableMesh, type EditSelectionMode } from './editableMesh';

export function expandMeshSelection(mesh: EditableMesh, mode: EditSelectionMode, selected: ReadonlySet<number>, action: 'invert' | 'grow' | 'shrink' | 'linked'): Set<number> {
  const edges = editableEdges(mesh), count = mode === 'vertex' ? mesh.positions.length / 3 : mode === 'edge' ? edges.length : mesh.faces.length;
  const members = Array.from({ length: count }, (_, id) => selectionVertices(mesh, mode, new Set([id]), edges));
  if (action === 'invert') return new Set(members.map((_, i) => i).filter(i => !selected.has(i)));
  const adjacency = Array.from({ length: count }, () => new Set<number>());
  if (mode === 'vertex') edges.forEach(({ a, b }) => { adjacency[a].add(b); adjacency[b].add(a); });
  else {
    const owners = new Map<number, number[]>();
    members.forEach((vertices, id) => vertices.forEach(v => { const list = owners.get(v) ?? []; list.push(id); owners.set(v, list); }));
    owners.forEach(ids => ids.forEach(a => ids.forEach(b => { if (a !== b) adjacency[a].add(b); })));
  }
  if (action === 'shrink') return new Set([...selected].filter(id => [...adjacency[id]].every(n => selected.has(n))));
  const result = new Set(selected), queue = [...selected];
  for (let i = 0; i < queue.length; i++) adjacency[queue[i]].forEach(id => { if (!result.has(id)) { result.add(id); if (action === 'linked') queue.push(id); } });
  return result;
}

export function editMeshSurface(mesh: EditableMesh, mode: EditSelectionMode, selected: ReadonlySet<number>, action: 'poke' | 'triangulate' | 'flip' | 'smooth' | 'flattenX' | 'flattenY' | 'flattenZ'): EditableMesh {
  if (!selected.size) throw new Error('Selecciona componentes primero');
  const result = cloneEditableMesh(mesh), vertices = selectionVertices(mesh, mode, selected);
  if (action === 'smooth' || action.startsWith('flatten')) {
    const center = selectionCenter(mesh, vertices);
    if (action === 'smooth') {
      const neighbors = new Map<number, Set<number>>();
      editableEdges(mesh).forEach(({ a, b }) => { if (!neighbors.has(a)) neighbors.set(a, new Set()); if (!neighbors.has(b)) neighbors.set(b, new Set()); neighbors.get(a)!.add(b); neighbors.get(b)!.add(a); });
      vertices.forEach(id => { const ids = [...(neighbors.get(id) ?? [])]; if (ids.length) meshPoint(mesh, id).lerp(selectionCenter(mesh, ids), 0.5).toArray(result.positions, id * 3); });
    } else { const axis = action.slice(-1).toLowerCase() as 'x' | 'y' | 'z', offset = { x: 0, y: 1, z: 2 }[axis]; vertices.forEach(id => { result.positions[id * 3 + offset] = center[axis]; }); }
    return result;
  }
  if (mode !== 'face') throw new Error('Esta operación requiere seleccionar caras');
  if (action === 'flip') { selected.forEach(id => mesh.faces[id].forEach(t => { const a = result.indices[t * 3]; result.indices[t * 3] = result.indices[t * 3 + 2]; result.indices[t * 3 + 2] = a; })); return result; }
  if (action === 'triangulate') { result.faces = mesh.faces.flatMap((face, id) => selected.has(id) ? face.map(t => [t]) : [face]); return result; }
  // Insert into each existing triangle: valid even on concave or bent faces.
  // Unlike a polygon-centroid fan, this cannot cross a concave boundary.
  const positions = Array.from(mesh.positions), indices: number[] = [], faces: number[][] = [];
  mesh.faces.forEach((face, id) => {
    const group: number[] = [];
    face.forEach(t => {
      const tri = Array.from(mesh.indices.slice(t * 3, t * 3 + 3));
      if (selected.has(id)) {
        const mid = positions.length / 3; positions.push(...selectionCenter(mesh, tri).toArray());
        for (let j = 0; j < 3; j++) { faces.push([indices.length / 3]); indices.push(tri[j], tri[(j + 1) % 3], mid); }
      } else { group.push(indices.length / 3); indices.push(...tri); }
    });
    if (group.length) faces.push(group);
  });
  result.positions = new Float32Array(positions); result.indices = new Uint32Array(indices); result.faces = faces; return result;
}
