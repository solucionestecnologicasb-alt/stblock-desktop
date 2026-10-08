import type { WorkplaneShape } from "@/types/sketchforge";
import type { EditableMesh } from "./editableMesh";

/** Persist world-space edited vertices without rounding the new bounding box. */
export function editableMeshToShape(source: WorkplaneShape, mesh: EditableMesh): WorkplaneShape {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const id of mesh.indices) for (let axis = 0; axis < 3; axis++) {
    const value = mesh.positions[id * 3 + axis];
    if (!Number.isFinite(value)) throw new Error("La malla contiene coordenadas inválidas");
    min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
  }
  if (!mesh.indices.length) throw new Error("La malla no contiene caras");
  const x = (min[0] + max[0]) / 2, z = (min[2] + max[2]) / 2, elevation = min[1];
  const width = Math.max(0.001, max[0] - min[0]), height = Math.max(0.001, max[1] - min[1]), depth = Math.max(0.001, max[2] - min[2]);
  const positions: number[] = [];
  for (const id of mesh.indices) positions.push(mesh.positions[id * 3] - x, mesh.positions[id * 3 + 1] - elevation, mesh.positions[id * 3 + 2] - z);
  return {
    ...source, kind: "mesh", x, z, elevation, width, depth, height, size: Math.max(width, depth),
    rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: undefined, mirrorY: undefined, mirrorZ: undefined,
    importedMesh: { positions, baseWidth: width, baseDepth: depth, baseHeight: height, triangleCount: mesh.indices.length / 3, sourceFormat: "json", editFaceGroups: mesh.faces.map(face => [...face]) },
    cadBrep: undefined, cadBrepFrame: undefined, cadPrimitiveFrame: undefined,
    cadDisplayEdges: undefined, cadDisplayEdgesVersion: undefined, cadPartitioned: undefined,
    constructionVertices: undefined, constructionEdges: undefined,
    groupedShapes: undefined, edgeTreatments: undefined, edgeTreatmentHistory: undefined,
    sketchProfile: undefined, capSectionId: undefined, imagePlate: undefined,
  };
}
