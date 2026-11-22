import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cutPlaneNormal, type PlaneCutSettings } from "./planeCut";

export function attachCutPlane(state: {scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls; requestRender: () => void}, initial: PlaneCutSettings, size: number, onChange: (settings: PlaneCutSettings) => void) {
  let settings = initial;
  let syncing = false;
  const root = new THREE.Group();
  root.name = "PlaneCutPreview";
  const handle = new THREE.Object3D();
  handle.name = "CutPlaneHandle";
  const sheets = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshBasicMaterial({color: 0x22b8e8, transparent: true, opacity: 0.19, side: THREE.DoubleSide, depthWrite: false});
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({color: 0x26d1ff, transparent: true, opacity: 0.95});
  root.add(sheets, handle);
  const gizmo = new TransformControls(state.camera, state.renderer.domElement);
  gizmo.setSize(0.85);
  gizmo.attach(handle);
  root.add(gizmo.getHelper());
  state.scene.add(root);
  const drawPlanes = () => {
    sheets.clear();
    const n = new THREE.Vector3(...cutPlaneNormal(settings.rotation));
    const count = Math.max(1, Math.min(32, Math.round(settings.count)));
    for (let i = 0; i < count; i++) {
      const plane = new THREE.Group();
      plane.position.copy(handle.position).addScaledVector(n, (i - (count - 1) / 2) * settings.spacing);
      plane.quaternion.copy(handle.quaternion);
      for (const delta of settings.kerf > 0 ? [-settings.kerf / 2, settings.kerf / 2] : [0]) {
        const sheet = new THREE.Mesh(geometry, material);
        sheet.position.z = delta;
        const outline = new THREE.LineSegments(edges, lineMaterial);
        outline.position.z = delta;
        plane.add(sheet, outline);
      }
      sheets.add(plane);
    }
    const arrow = new THREE.ArrowHelper(n, handle.position, size * 0.18, 0xffc04d);
    // Arrow geometries are unique; release before rebuilding.
    root.add(arrow);
    return arrow;
  };
  let arrow: THREE.ArrowHelper | undefined;
  const releaseArrow = () => { if (arrow) { root.remove(arrow); arrow.dispose(); arrow = undefined; } };
  const refresh = () => { releaseArrow(); arrow = drawPlanes(); state.requestRender(); };
  const changed = () => {
    if (syncing) return;
    settings = {...settings, position: handle.position.toArray() as PlaneCutSettings["position"], rotation: [handle.rotation.x, handle.rotation.y, handle.rotation.z].map(THREE.MathUtils.radToDeg) as PlaneCutSettings["rotation"]};
    refresh(); onChange(settings);
  };
  const dragging = (event: {value?: unknown}) => { state.controls.enabled = !event.value; state.requestRender(); };
  gizmo.addEventListener("objectChange", changed);
  gizmo.addEventListener("dragging-changed", dragging);
  gizmo.addEventListener("change", state.requestRender);
  const update = (next: PlaneCutSettings) => {
    settings = next; syncing = true;
    handle.position.fromArray(next.position);
    handle.rotation.set(...next.rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    gizmo.setMode(next.gizmo);
    gizmo.setTranslationSnap(next.snap || null);
    gizmo.setRotationSnap(next.snap ? THREE.MathUtils.degToRad(5) : null);
    syncing = false; refresh();
  };
  update(initial);
  return {update, dispose: () => {
    gizmo.removeEventListener("objectChange", changed);
    gizmo.removeEventListener("dragging-changed", dragging);
    gizmo.removeEventListener("change", state.requestRender);
    gizmo.detach(); gizmo.dispose(); releaseArrow();
    state.scene.remove(root); geometry.dispose(); edges.dispose(); material.dispose(); lineMaterial.dispose();
    state.controls.enabled = true; state.requestRender();
  }};
}
