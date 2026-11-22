import * as THREE from "three";
import type { ManifoldToplevel } from "manifold-3d";
import { editableMeshToShape } from "./editableMeshShape";
import type { WorkplaneShape } from "@/types/sketchforge";

export type CutVector = [number, number, number];
export type PlaneCutSettings = {
  position: CutVector;
  rotation: CutVector;
  keep: "both" | "positive" | "negative";
  kerf: number;
  count: number;
  spacing: number;
  separation: number;
  splitDisconnected: boolean;
  keepOriginals: boolean;
  union: boolean;
  gizmo: "translate" | "rotate";
  snap: number;
};
export type CutSolid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;
export type CutFragment = { positions: number[]; band: number; volume: number };

export function cutFragmentToShape(source: WorkplaneShape, fragment: CutFragment, settings: PlaneCutSettings, id: string, name: string): WorkplaneShape {
  const normal = cutPlaneNormal(settings.rotation);
  const displacement = (fragment.band - settings.count / 2) * settings.separation;
  const positions = new Float32Array(fragment.positions.map((v, i) => v + normal[i % 3] * displacement));
  const shape = editableMeshToShape(source, {positions, indices: Uint32Array.from({length: positions.length / 3}, (_, i) => i), faces: []});
  return {...shape, id, name, hidden:false, locked:false, hole:false,
    groupedBaseWidth:undefined, groupedBaseHeight:undefined, groupedBaseDepth:undefined};
}

export function cutPlaneNormal(rotation: CutVector): CutVector {
  return new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...rotation.map(THREE.MathUtils.degToRad) as CutVector, "XYZ")).normalize().toArray() as CutVector;
}

export function cutPlaneOffsets(settings: PlaneCutSettings): number[] {
  const values = [...settings.position, ...settings.rotation, settings.kerf, settings.count, settings.spacing, settings.separation, settings.snap];
  if (!values.every(Number.isFinite) || settings.kerf < 0 || settings.separation < 0 || settings.snap < 0 ||
      !Number.isInteger(settings.count) || settings.count < 1 || settings.count > 32 ||
      (settings.count > 1 && (settings.spacing <= 0 || settings.spacing <= settings.kerf)) ||
      (settings.count > 1 && settings.keep !== "both")) {
    throw new Error("Revisa las medidas: de 1 a 32 planos; la distancia entre cortes debe superar el grosor. Los cortes múltiples conservan ambos lados.");
  }
  const normal = cutPlaneNormal(settings.rotation);
  const center = normal.reduce((sum, value, axis) => sum + value * settings.position[axis], 0);
  return Array.from({length: settings.count}, (_, i) => center + (i - (settings.count - 1) / 2) * settings.spacing);
}

/** Closed solid cuts. Input remains owned by the caller; all temporary WASM objects are released. */
export function cutSolidByPlanes(source: CutSolid, settings: PlaneCutSettings): CutFragment[] {
  const offsets = cutPlaneOffsets(settings);
  const normal = cutPlaneNormal(settings.rotation);
  const opposite = normal.map(value => -value) as CutVector;
  const owned = new Set<CutSolid>();
  const track = (solid: CutSolid) => { owned.add(solid); return solid; };
  const fragments: CutFragment[] = [];
  let intersected = false;
  try {
    if (source.status() !== "NoError" || source.isEmpty()) throw new Error("La pieza no es un sólido cerrado válido. Repara la malla antes de cortarla.");
    // Every band is bounded by the two adjacent planes, keeping kerf symmetric.
    for (let band = 0; band <= offsets.length; band++) {
      if (settings.keep === "positive" && band === 0 || settings.keep === "negative" && band === offsets.length) continue;
      let part = source;
      if (band > 0) part = track(part.trimByPlane(normal, offsets[band - 1] + settings.kerf / 2));
      if (band < offsets.length) part = track(part.trimByPlane(opposite, -offsets[band] + settings.kerf / 2));
      if (part.status() !== "NoError") throw new Error("No se pudo cerrar la superficie de corte. No se modificó el proyecto.");
      if (part.isEmpty() || part.volume() <= 1e-8) continue;
      if (part.volume() < source.volume() - Math.max(1e-7, source.volume() * 1e-8)) intersected = true;
      const parts = settings.splitDisconnected ? part.decompose().map(track) : [part];
      for (const component of parts) {
        const mesh = component.getMesh();
        const positions: number[] = [];
        for (const vertex of mesh.triVerts) {
          const start = vertex * mesh.numProp;
          positions.push(mesh.vertProperties[start], mesh.vertProperties[start + 1], mesh.vertProperties[start + 2]);
        }
        if (positions.length) fragments.push({ positions, band, volume: component.volume() });
      }
    }
    if (!fragments.length) throw new Error("El corte elimina toda la pieza. Mueve el plano o conserva ambos lados.");
    if (!intersected) throw new Error("El plano no atraviesa el interior de la pieza. Mueve el plano y vuelve a previsualizar.");
    return fragments;
  } finally {
    owned.delete(source);
    for (const solid of owned) solid.delete();
  }
}
