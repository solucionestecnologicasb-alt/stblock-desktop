import { knifeFace, loopCut, insetFaces, bevelEdges, weldVertices, dissolveEdges, polygonLoop, requirePlanar } from "./meshPolygonTools";
import { defaultAssist, influenceWeights, symmetryPairs, assistedTransform, snapPosition, type AssistSettings } from "./meshTransformAssist";
import { expandMeshSelection, editMeshSurface } from "./meshEditOperations";
import { connectMeshVertices } from "./meshConnect";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { cloneEditableMesh, editableEdges, extrudeEditableFaces, fillMeshSelection, deleteMeshSelection, meshPoint, selectionCenter, selectionVertices, subdivideEditableEdges, type EditableMesh, type EditEdge, type EditSelectionMode } from "./editableMesh";

export type MeshEditTool = "translate" | "rotate" | "scale";
export type MeshEditState = { mode: EditSelectionMode; tool: MeshEditTool; count: number; xray: boolean; undo: boolean; redo: boolean; active: boolean; assist?: AssistSettings; operation?: string; value?: number };
type Snapshot = { mesh: EditableMesh; mode: EditSelectionMode; selection: Set<number> };
type Transaction = { weights: Float32Array; pairs: Array<[number, number]>; before: Snapshot; base: Float32Array; vertices: number[]; center: THREE.Vector3; start: THREE.Vector2; tool: MeshEditTool; axis: "x" | "y" | "z" | null; numeric: string; direction: THREE.Vector3 | null; modal: boolean; moved: boolean; label: string };
export type MeshEditCallbacks = { state: (state: MeshEditState) => void; commit: (mesh: EditableMesh, label: string, history?: "undo" | "redo") => void; activity: (active: boolean) => void; exit: () => void; notice: (message: string) => void };

// This controller owns the mutable GPU buffers. React and the CAD worker are
// deliberately outside the pointer-move path. Topology is rebuilt only after
// an operation that changes connectivity, never for a translation/rotation.
export class MeshEditViewport {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100000);
  private orbit: OrbitControls;
  private gizmo: TransformControls;
  private pivot = new THREE.Object3D();
  private body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private wire: THREE.LineSegments;
  private dots: THREE.Points;
  private highlight: THREE.Mesh;
  private mesh: EditableMesh;
  private edges: EditEdge[] = [];
  private selected = new Set<number>();
  private mode: EditSelectionMode;
  private tool: MeshEditTool = "translate";
  private xray = false;
  private assist: AssistSettings = { ...defaultAssist };
  private symmetryOrigin = new THREE.Vector3();
  private operation: { kind: "knife" | "loop" | "inset" | "bevel"; before: Snapshot; value: number; numeric: string; valid: boolean; start: THREE.Vector2; face?: number; point?: THREE.Vector3; plane?: THREE.Plane; segments: number } | null = null;
  private operationFrame = 0;
  private operationPoint: THREE.Vector3 | undefined;
  private influenceRing = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x009cde, depthTest: false, transparent: true, opacity: .7 }));
  private transaction: Transaction | null = null;
  private pointer = new THREE.Vector2();
  private pointerDown: { x: number; y: number; id: number | null; additive: boolean; button: number } | null = null;
  private history: Snapshot[] = [];
  private historyIndex = 0;
  private frame = 0;
  private geometryDirty = false;
  private dead = false;
  private resize: ResizeObserver;
  private abort = new AbortController();
  private ray = new THREE.Raycaster();
  private triangleFaces = new Int32Array();
  private boxSelecting = false;
  private box: HTMLDivElement;
  private snapshot = (): Snapshot => ({ mesh: cloneEditableMesh(this.mesh), mode: this.mode, selection: new Set(this.selected) });

  constructor(private host: HTMLDivElement, initial: EditableMesh, color: string, mode: EditSelectionMode, private output: HTMLOutputElement, private callbacks: MeshEditCallbacks, context: Array<{ mesh: EditableMesh; color: string }> = []) {
    this.mesh = cloneEditableMesh(initial); this.mode = mode;
    const initialBounds = new THREE.Box3(); for (let id = 0; id < initial.positions.length / 3; id++) initialBounds.expandByPoint(meshPoint(initial, id)); initialBounds.getCenter(this.symmetryOrigin);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0xf8fbfc); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.tabIndex = 0; this.renderer.domElement.setAttribute("aria-label", "Editor de malla 3D");
    this.host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc5d0dc, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 2.8); light.position.set(100, 200, 80); this.scene.add(light);
    this.body = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide, flatShading: true }));
    this.wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthTest: true }));
    this.dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, depthTest: true }));
    this.highlight = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x009cde, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.wire.renderOrder = 2; this.dots.renderOrder = 3; this.highlight.renderOrder = 1;
    this.scene.add(this.body, this.wire, this.dots, this.highlight, this.pivot, this.influenceRing);
    this.influenceRing.visible = false; this.influenceRing.renderOrder = 5;
    for (const entry of context) {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(entry.mesh.positions, 3)); geometry.setIndex(new THREE.BufferAttribute(entry.mesh.indices, 1)); geometry.computeVertexNormals();
      this.scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: entry.color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })));
    }
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement); this.orbit.enableDamping = false;
    this.orbit.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE };
    this.orbit.addEventListener("change", this.requestRender);
    this.gizmo = new TransformControls(this.camera, this.renderer.domElement); this.gizmo.setSize(0.85); this.gizmo.setSpace("world");
    this.scene.add(this.gizmo.getHelper());
    this.gizmo.addEventListener("change", this.requestRender);
    this.gizmo.addEventListener("mouseDown", () => this.begin(false));
    this.gizmo.addEventListener("objectChange", () => this.applyPivot());
    this.gizmo.addEventListener("mouseUp", () => this.finish());
    this.box = document.createElement("div"); this.box.className = "mesh-edit-marquee"; this.box.hidden = true; this.host.append(this.box);
    const canvas = this.renderer.domElement, signal = this.abort.signal;
    canvas.addEventListener("pointerdown", this.onPointerDown, { signal });
    canvas.addEventListener("pointermove", this.onPointerMove, { signal });
    canvas.addEventListener("pointerup", this.onPointerUp, { signal });
    canvas.addEventListener("pointercancel", this.cancel, { signal });
    canvas.addEventListener("contextmenu", event => event.preventDefault(), { signal });
    window.addEventListener("keydown", this.onKeyDown, { signal, capture: true });
    window.addEventListener("blur", this.cancel, { signal });
    this.resize = new ResizeObserver(() => { const { clientWidth: w, clientHeight: h } = host; this.renderer.setSize(w, h); this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix(); this.requestRender(); });
    this.resize.observe(host);
    this.rebuild(); this.frameSelection(true);
    const bounds = new THREE.Box3().setFromBufferAttribute(this.body.geometry.getAttribute("position") as THREE.BufferAttribute), size = Math.max(100, bounds.getSize(new THREE.Vector3()).length() * 4);
    const grid = new THREE.GridHelper(size, 20, 0x9adcf0, 0xd0dfea); this.scene.add(grid);
    this.history = [this.snapshot()]; this.publish(); canvas.focus({ preventScroll: true });
  }

  private publish() { this.callbacks.state({ mode: this.mode, tool: this.tool, count: this.selected.size, xray: this.xray, undo: this.historyIndex > 0, redo: this.historyIndex + 1 < this.history.length, active: !!this.transaction || !!this.operation, assist: { ...this.assist }, operation: this.operation?.kind, value: this.operation?.value }); }
  private message(text: string) { this.output.textContent = text; }
  private requestRender = () => {
    if (this.frame || this.dead) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.geometryDirty) { this.updateBuffers(); this.geometryDirty = false; }
      if (this.influenceRing.visible) this.influenceRing.quaternion.copy(this.camera.quaternion);
      this.renderer.render(this.scene, this.camera);
    });
  };
  private rebuild() {
    this.edges = editableEdges(this.mesh);
    this.body.geometry.dispose(); this.body.geometry = new THREE.BufferGeometry();
    this.body.geometry.setAttribute("position", new THREE.BufferAttribute(this.mesh.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.body.geometry.setIndex(new THREE.BufferAttribute(this.mesh.indices, 1));
    this.triangleFaces = new Int32Array(this.mesh.indices.length / 3);
    this.mesh.faces.forEach((face, id) => face.forEach(t => { this.triangleFaces[t] = id; }));
    this.wire.geometry.dispose(); this.wire.geometry = new THREE.BufferGeometry();
    this.wire.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.edges.length * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.wire.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.edges.length * 6), 3));
    this.dots.geometry.dispose(); this.dots.geometry = new THREE.BufferGeometry();
    this.dots.geometry.setAttribute("position", new THREE.BufferAttribute(this.mesh.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.dots.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.mesh.positions.length), 3));
    this.updateSelection(); this.geometryDirty = true; this.requestRender();
  }
  private updateBuffers() {
    (this.body.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    this.body.geometry.computeVertexNormals(); this.body.geometry.computeBoundingSphere();
    const lines = this.wire.geometry.getAttribute("position") as THREE.BufferAttribute;
    this.edges.forEach((edge, i) => { const a = edge.a * 3, b = edge.b * 3, p = this.mesh.positions; lines.setXYZ(i * 2, p[a], p[a + 1], p[a + 2]); lines.setXYZ(i * 2 + 1, p[b], p[b + 1], p[b + 2]); });
    lines.needsUpdate = true; this.wire.geometry.computeBoundingSphere();
    (this.dots.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true; this.dots.geometry.computeBoundingSphere();
    if (this.highlight.geometry.getAttribute("position")) { (this.highlight.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true; this.highlight.geometry.computeBoundingSphere(); }
  }
  private updateSelection() {
    const vertices = new Set(selectionVertices(this.mesh, this.mode, this.selected, this.edges));
    const regular = new THREE.Color(0x31465d), selectedColor = new THREE.Color(0x009cde), edgeColors = this.wire.geometry.getAttribute("color") as THREE.BufferAttribute, colors = this.dots.geometry.getAttribute("color") as THREE.BufferAttribute;
    this.edges.forEach((edge, i) => { const c = this.mode === "edge" ? (this.selected.has(i) ? selectedColor : regular) : vertices.has(edge.a) && vertices.has(edge.b) ? selectedColor : regular; edgeColors.setXYZ(i * 2, c.r, c.g, c.b); edgeColors.setXYZ(i * 2 + 1, c.r, c.g, c.b); }); edgeColors.needsUpdate = true;
    for (let id = 0; id < this.mesh.positions.length / 3; id++) { const c = vertices.has(id) ? selectedColor : new THREE.Color(0x56708b); colors.setXYZ(id, c.r, c.g, c.b); } colors.needsUpdate = true;
    this.dots.visible = this.mode === "vertex";
    this.highlight.geometry.dispose(); this.highlight.geometry = new THREE.BufferGeometry();
    this.highlight.geometry.setAttribute("position", new THREE.BufferAttribute(this.mesh.positions, 3));
    this.highlight.geometry.setIndex(this.mode === "face" ? [...this.selected].flatMap(id => (this.mesh.faces[id] ?? []).flatMap(t => Array.from(this.mesh.indices.slice(t * 3, t * 3 + 3)))) : []);
    if (!this.transaction && !this.operation) {
      this.pivot.position.copy(selectionCenter(this.mesh, [...vertices])); this.pivot.quaternion.identity(); this.pivot.scale.setScalar(1); this.pivot.updateMatrixWorld();
      if (vertices.size) this.gizmo.attach(this.pivot); else this.gizmo.detach();
    }
    this.publish(); this.requestRender();
  }
  setMode(mode: EditSelectionMode) { if (this.transaction || this.operation) this.cancel(); this.mode = mode; this.selected.clear(); this.updateSelection(); this.message("Selecciona con clic · Shift añade · B selección rectangular"); }
  setTool(tool: MeshEditTool) { if (this.transaction || this.operation) this.cancel(); this.tool = tool; this.gizmo.setMode(tool); this.publish(); }
  toggleXray() { this.xray = !this.xray; (this.dots.material as THREE.PointsMaterial).depthTest = !this.xray; (this.wire.material as THREE.LineBasicMaterial).depthTest = !this.xray; this.body.material.opacity = this.xray ? 0.35 : 1; this.body.material.transparent = this.xray; this.body.material.depthWrite = !this.xray; this.publish(); this.requestRender(); }
  selectAll(clear = false) { if (this.transaction) return; const count = this.mode === "vertex" ? this.mesh.positions.length / 3 : this.mode === "edge" ? this.edges.length : this.mesh.faces.length; this.selected = new Set(clear ? [] : Array.from({ length: count }, (_, i) => i)); this.updateSelection(); }
  frameSelection(all = false) {
    const ids = all || !this.selected.size ? Array.from({ length: this.mesh.positions.length / 3 }, (_, i) => i) : selectionVertices(this.mesh, this.mode, this.selected, this.edges);
    const box = new THREE.Box3().setFromPoints(ids.map(id => meshPoint(this.mesh, id))), center = box.getCenter(new THREE.Vector3()), size = Math.max(5, box.getSize(new THREE.Vector3()).length());
    this.camera.position.copy(center).add(new THREE.Vector3(1, 0.75, 1).normalize().multiplyScalar(size * 1.8)); this.orbit.target.copy(center); this.orbit.update(); this.requestRender();
  }
  private begin(modal: boolean, start = this.pointer.clone(), before = this.snapshot(), overrideVertices?: number[], label?: string) {
    if (this.transaction || this.operation || !this.selected.size) return;
    const vertices = overrideVertices ?? selectionVertices(this.mesh, this.mode, this.selected, this.edges);
    if (!vertices.length) return;
    const center = selectionCenter(this.mesh, vertices);
    const weights = influenceWeights(this.mesh.positions, vertices, overrideVertices ? 0 : this.assist.proportional ? this.assist.radius : 0);
    const pairs = !overrideVertices && this.assist.symmetry !== "off" ? symmetryPairs(this.mesh.positions, this.assist.symmetry, this.symmetryOrigin[this.assist.symmetry]) : [];
    this.transaction = { weights, pairs, before, base: this.mesh.positions.slice(), vertices, center, start, tool: this.tool, axis: null, numeric: "", direction: null, modal, moved: false, label: label ?? ({ translate: "Mover", rotate: "Rotar", scale: "Escalar" }[this.tool]) };
    this.updateInfluenceRing(center);
    this.orbit.enabled = false; this.gizmo.getHelper().visible = !modal; this.callbacks.activity(true); this.publish();
    this.message("X / Y / Z restringe · Escribe un valor · Enter confirma · Esc cancela");
  }
  startTransform(tool: MeshEditTool) { if (!this.selected.size) { this.message("Selecciona vértices, aristas o caras primero"); return; } this.setTool(tool); this.begin(true); this.gizmo.enabled = false; }
  private applyPivot() {
    const tx = this.transaction; if (!tx || tx.modal) return;
    this.pivot.updateMatrixWorld();
    const matrix = this.pivot.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(-tx.center.x, -tx.center.y, -tx.center.z));
    this.applySnap(matrix, tx); assistedTransform(tx.base, this.mesh.positions, matrix, tx.weights, tx.pairs, this.assist.symmetry); tx.moved = tx.vertices.some(id => Math.abs(this.mesh.positions[id * 3] - tx.base[id * 3]) + Math.abs(this.mesh.positions[id * 3 + 1] - tx.base[id * 3 + 1]) + Math.abs(this.mesh.positions[id * 3 + 2] - tx.base[id * 3 + 2]) > 1e-6); this.geometryDirty = true; this.requestRender();
    const delta = this.pivot.position.clone().sub(tx.center); this.message(tx.tool === "translate" ? `Mover  X ${delta.x.toFixed(2)}  Y ${delta.y.toFixed(2)}  Z ${delta.z.toFixed(2)} mm · Esc cancela` : `${tx.label} · Esc cancela`);
  }
  private applyModal() {
    const tx = this.transaction; if (!tx || !tx.modal) return;
    const rect = this.renderer.domElement.getBoundingClientRect(), center = tx.center;
    const normal = this.camera.getWorldDirection(new THREE.Vector3()), right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const scale = 2 * this.camera.position.distanceTo(center) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / rect.height;
    const dx = this.pointer.x - tx.start.x, dy = this.pointer.y - tx.start.y;
    const axis = tx.axis ? new THREE.Vector3(tx.axis === "x" ? 1 : 0, tx.axis === "y" ? 1 : 0, tx.axis === "z" ? 1 : 0) : normal;
    const numeric = tx.numeric !== "" && Number.isFinite(Number(tx.numeric)) ? Number(tx.numeric) : null;
    const matrix = new THREE.Matrix4(), move = right.multiplyScalar(dx * scale).add(up.multiplyScalar(-dy * scale));
    let value = 0;
    if (tx.tool === "translate") {
      if (tx.axis) { value = numeric ?? move.dot(axis); move.copy(axis).multiplyScalar(value); }
      else if (tx.direction) { value = numeric ?? (dx - dy) * scale; move.copy(tx.direction).multiplyScalar(value); }
      else if (numeric !== null) { move.normalize().multiplyScalar(numeric); if (!move.lengthSq()) move.copy(new THREE.Vector3(numeric, 0, 0)); }
      matrix.makeTranslation(move.x, move.y, move.z); value = tx.axis ? move[tx.axis] : move.length();
    } else {
      value = numeric ?? (tx.tool === "scale" ? Math.max(0.001, 1 + (dx - dy) / 180) : (dx - dy) * 0.5);
      matrix.makeTranslation(center.x, center.y, center.z);
      if (tx.tool === "rotate") matrix.multiply(new THREE.Matrix4().makeRotationAxis(axis, THREE.MathUtils.degToRad(value)));
      else { const factor = new THREE.Vector3(1, 1, 1); if (tx.axis) factor[tx.axis] = value; else factor.setScalar(value); matrix.multiply(new THREE.Matrix4().makeScale(factor.x, factor.y, factor.z)); }
      matrix.multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
    }
    this.applySnap(matrix, tx); assistedTransform(tx.base, this.mesh.positions, matrix, tx.weights, tx.pairs, this.assist.symmetry); tx.moved = tx.vertices.some(id => Math.abs(this.mesh.positions[id * 3] - tx.base[id * 3]) + Math.abs(this.mesh.positions[id * 3 + 1] - tx.base[id * 3 + 1]) + Math.abs(this.mesh.positions[id * 3 + 2] - tx.base[id * 3 + 2]) > 1e-6); this.geometryDirty = true; this.requestRender();
    this.message(`${tx.label} ${tx.axis?.toUpperCase() ?? "libre"}: ${tx.numeric || value.toFixed(2)}${tx.tool === "rotate" ? "°" : tx.tool === "scale" ? "×" : " mm"} · Enter / clic confirma · Esc cancela`);
  }
  finish = () => {
    if (this.operation) { this.finishOperation(); return; }
    this.influenceRing.visible = false;
    const tx = this.transaction; if (!tx) return;
    if (tx.numeric && (!Number.isFinite(Number(tx.numeric)) || (tx.tool === "scale" && Math.abs(Number(tx.numeric)) < 0.000001))) { this.message("Escribe un valor válido; la escala no puede ser cero"); return; }
    this.transaction = null; this.gizmo.enabled = true; this.gizmo.getHelper().visible = true; this.orbit.enabled = true; this.callbacks.activity(false);
    if (tx.moved) {
      const valid = Array.from(this.mesh.positions).every(Number.isFinite);
      if (!valid) { this.restore(tx.before); this.message("Transformación inválida; se restauró la pieza"); return; }
      this.record(tx.label);
    }
    if (!tx.moved) this.restore(tx.before);
    this.updateSelection(); this.message("Listo · G mover · R rotar · S escalar");
  };
  cancel = () => {
    this.influenceRing.visible = false;
    if (this.operationFrame) { cancelAnimationFrame(this.operationFrame); this.operationFrame = 0; }
    if (this.operation) { const before = this.operation.before; this.operation = null; this.operationPoint = undefined; this.restore(before); }
    const tx = this.transaction; this.transaction = null;
    if (tx) this.restore(tx.before);
    this.pointerDown = null; this.box.hidden = true; this.boxSelecting = false;
    this.gizmo.enabled = true; this.gizmo.getHelper().visible = true; this.orbit.enabled = true; this.callbacks.activity(false); this.updateSelection(); this.message("Operación cancelada");
  };
  private restore(snapshot: Snapshot) { this.mesh = cloneEditableMesh(snapshot.mesh); this.mode = snapshot.mode; this.selected = new Set(snapshot.selection); this.rebuild(); }
  private record(label: string) {
    this.history = this.history.slice(0, this.historyIndex + 1); this.history.push(this.snapshot());
    // Bound session history by bytes as well as entries for imported models.
    let bytes = this.history.reduce((sum, s) => sum + s.mesh.positions.byteLength + s.mesh.indices.byteLength + s.mesh.faces.reduce((n, f) => n + f.length * 8, 0), 0);
    while (this.history.length > 2 && (this.history.length > 100 || bytes > 128 * 1024 * 1024)) { const old = this.history.shift()!; bytes -= old.mesh.positions.byteLength + old.mesh.indices.byteLength + old.mesh.faces.reduce((n, f) => n + f.length * 8, 0); }
    this.historyIndex = this.history.length - 1; this.callbacks.commit(cloneEditableMesh(this.mesh), label); this.publish();
  }
  undo(redo = false) { if (this.transaction) { this.cancel(); return; } const next = this.historyIndex + (redo ? 1 : -1); if (next < 0 || next >= this.history.length) return; this.historyIndex = next; this.restore(this.history[next]); this.callbacks.commit(cloneEditableMesh(this.mesh), redo ? "Rehacer" : "Deshacer", redo ? "redo" : "undo"); this.publish(); }
  extrude() {
    if (this.transaction || this.mode !== "face" || !this.selected.size) { this.message("Selecciona caras para extruir"); return; }
    const before = this.snapshot(); const result = extrudeEditableFaces(this.mesh, this.selected); this.mesh = result.mesh; this.rebuild(); this.setTool("translate"); this.begin(true, this.pointer.clone(), before, result.vertices, "Extruir"); this.gizmo.enabled = false;
    const face = [...this.selected][0], tri = this.mesh.faces[face][0], ids = Array.from(this.mesh.indices.slice(tri * 3, tri * 3 + 3)), [a, b, c] = ids.map(id => meshPoint(this.mesh, id));
    const normal = b.sub(a).cross(c.sub(a)).normalize();
    if (this.transaction) (this.transaction as Transaction).direction = normal;
    this.message("Extruir: mueve el ratón o escribe distancia · X/Y/Z eje · Esc cancela");
  }
  subdivide() { this.changeGeometry(() => { if (this.mode !== "edge" || !this.selected.size) throw new Error("Selecciona aristas para subdividir"); return subdivideEditableEdges(this.mesh, [...this.selected].map(id => this.edges[id])); }, "Subdividir aristas"); }
  fill() { this.changeGeometry(() => { if (this.mode !== "vertex") throw new Error("Selecciona los vértices del contorno"); return this.selected.size === 2 ? connectMeshVertices(this.mesh, this.selected) : fillMeshSelection(this.mesh, this.selected); }, this.selected.size === 2 ? "Conectar vértices" : "Crear cara"); }
  remove() { if (!this.selected.size) return; this.changeGeometry(() => deleteMeshSelection(this.mesh, this.mode, this.selected), "Eliminar selección de malla"); }
  private changeGeometry(change: () => EditableMesh, label: string) { if (this.transaction || this.operation) return; try { this.mesh = change(); this.selected.clear(); this.rebuild(); this.record(label); this.message(label); } catch (e) { this.message(e instanceof Error ? e.message : "No se pudo modificar la malla"); } }
  selectRelated(action: "invert" | "grow" | "shrink" | "linked") { if (this.transaction) return; this.selected = expandMeshSelection(this.mesh, this.mode, this.selected, action); this.updateSelection(); }
  surface(action: Parameters<typeof editMeshSurface>[3]) { this.changeGeometry(() => editMeshSurface(this.mesh, this.mode, this.selected, action), ({ poke: "Insertar vértices en caras", triangulate: "Triangular caras", flip: "Invertir normales", smooth: "Suavizar vértices", flattenX: "Alinear X", flattenY: "Alinear Y", flattenZ: "Alinear Z" })[action]); }
  view(axis: "front" | "back" | "right" | "left" | "top" | "bottom") {
    if (this.transaction) return;
    const direction = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0.00001], bottom: [0, -1, 0.00001] }[axis];
    const center = selectionCenter(this.mesh, Array.from({ length: this.mesh.positions.length / 3 }, (_, i) => i));
    const distance = Math.max(5, this.camera.position.distanceTo(this.orbit.target));
    this.orbit.target.copy(center); this.camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(distance)); this.orbit.update(); this.requestRender();
  }
  setAssist(update: Partial<AssistSettings>) {
    if (this.transaction || this.operation) return;
    this.assist = { ...this.assist, ...update };
    this.assist.step = Math.max(.001, Number.isFinite(this.assist.step) ? this.assist.step : 1);
    this.assist.radius = Math.max(.001, Number.isFinite(this.assist.radius) ? this.assist.radius : 10);
    this.gizmo.setTranslationSnap(this.assist.snap === 'grid' ? this.assist.step : null);
    this.publish();
  }
  private updateInfluenceRing(center: THREE.Vector3) {
    this.influenceRing.visible = this.assist.proportional && !!this.transaction;
    if (!this.influenceRing.visible) return;
    const points = Array.from({ length: 64 }, (_,i) => new THREE.Vector3(Math.cos(i*Math.PI/32)*this.assist.radius, Math.sin(i*Math.PI/32)*this.assist.radius,0));
    this.influenceRing.geometry.dispose(); this.influenceRing.geometry = new THREE.BufferGeometry().setFromPoints(points); this.influenceRing.position.copy(center);
  }
  private applySnap(matrix: THREE.Matrix4, tx: Transaction) {
    if (tx.tool !== 'translate' || tx.numeric || this.assist.snap === 'off') return;
    const position = tx.center.clone().applyMatrix4(matrix), excluded = new Set<number>(); tx.weights.forEach((w,id) => { if (w) excluded.add(id); }); tx.pairs.forEach(([a,b]) => { if (excluded.has(a) || excluded.has(b)) { excluded.add(a); excluded.add(b); } });
    const threshold = this.camera.position.distanceTo(position) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 30 / Math.max(1,this.host.clientHeight);
    let target = snapPosition(position,tx.base,this.edges,excluded,this.assist.snap === 'grid' ? 'grid' : 'off',this.assist.step,threshold);
    if (this.assist.snap === 'vertex' || this.assist.snap === 'edge') {
      let best = 14; const a = new THREE.Vector3(), b = new THREE.Vector3(), nearest = new THREE.Vector3();
      const consider = (point: THREE.Vector3) => { const projected = point.clone().project(this.camera); if (projected.z < -1 || projected.z > 1) return; const distance = this.project(point).distanceTo(this.pointer); if (distance < best) { best = distance; target = point.clone(); } };
      if (this.assist.snap === 'vertex') for (let id=0;id<tx.base.length/3;id++) { if (!excluded.has(id)) consider(a.fromArray(tx.base,id*3)); }
      else { this.setRay(this.pointer.x,this.pointer.y); for (const edge of this.edges) { if (excluded.has(edge.a)||excluded.has(edge.b)) continue; a.fromArray(tx.base,edge.a*3);b.fromArray(tx.base,edge.b*3);this.ray.ray.distanceSqToSegment(a,b,undefined,nearest);consider(nearest); } }
      if (best < 14 && !this.visible(target)) target = position;
    }
    const delta=target.sub(tx.center);

    if (tx.axis) { for (const axis of ['x','y','z'] as const) if (axis !== tx.axis) delta[axis]=0; }
    matrix.makeTranslation(delta.x,delta.y,delta.z);
  }
  merge(distance: number | null) { this.changeGeometry(() => { if (this.mode !== 'vertex') throw new Error('Selecciona vértices para soldar'); return weldVertices(this.mesh,this.selected,distance); }, distance === null ? 'Soldar al centro' : 'Soldar por distancia'); }
  dissolve() { this.changeGeometry(() => { if (this.mode !== 'edge') throw new Error('Selecciona aristas para disolver'); return dissolveEdges(this.mesh,[...this.selected].map(id=>this.edges[id])); }, 'Disolver aristas coplanares'); }
  startOperation(kind: 'knife' | 'loop' | 'inset' | 'bevel', segments=1) {
    if (this.transaction || this.operation) return;
    if (kind !== 'knife' && (!this.selected.size || (kind === 'inset' ? this.mode !== 'face' : this.mode !== 'edge'))) { this.message(kind === 'inset' ? 'Selecciona caras para crear un borde interior' : 'Selecciona aristas primero'); return; }
    if (kind === 'loop' && this.selected.size !== 1) { this.message('Selecciona una sola arista para iniciar el bucle'); return; }
    if (this.mesh.indices.length > 120000) { this.message('Para cortes interactivos, simplifica esta malla o trabaja con una pieza menor (máximo 40 000 triángulos)'); return; }
    const before=this.snapshot();
    this.operation={kind,before,value:kind==='loop'?50:1,numeric:'',valid:false,start:this.pointer.clone(),segments};
    this.selected.clear(); this.gizmo.detach(); this.gizmo.enabled=false; this.orbit.enabled=false; this.callbacks.activity(true);
    if (kind==='knife') this.message('Cuchillo: marca dos puntos sobre una cara plana convexa · Esc cancela');
    else this.previewOperation();
    this.publish();
  }
  setOperationValue(value: number) { if (!this.operation || !Number.isFinite(value)) return; this.operation.value=value; this.operation.numeric=String(value); this.previewOperation(); }
  private previewOperation(point?: THREE.Vector3) {
    const op=this.operation;if(!op)return;
    if (point) this.operationPoint=point.clone();
    try {
      const base=op.before.mesh, edges=editableEdges(base);
      let result: EditableMesh;
      if(op.kind==='knife') { if(op.face===undefined || !op.point || !this.operationPoint)return; result=knifeFace(base,op.face,op.point,this.operationPoint); }
      else if(op.kind==='loop') result=loopCut(base,edges[[...op.before.selection][0]],op.value/100);
      else if(op.kind==='inset') result=insetFaces(base,op.before.selection,op.value);
      else result=bevelEdges(base,[...op.before.selection].map(id=>edges[id]),op.value,op.segments);
      this.mesh=result;op.valid=true;this.rebuild();this.message(`${{knife:'Cuchillo',loop:'Corte en bucle',inset:'Borde interior',bevel:'Bisel'}[op.kind]}${op.kind==='knife'?'':`: ${op.value.toFixed(2)} ${op.kind==='loop'?'%':'mm'}`} · Enter confirma · Esc cancela`);
    } catch(e) {op.valid=false;this.mesh=cloneEditableMesh(op.before.mesh);this.rebuild();this.message(e instanceof Error?e.message:'No se puede realizar la operación');}
    this.publish();
  }
  private moveOperation() {
    const op=this.operation;if(!op)return;
    if(op.kind==='knife') { if(!op.plane)return;this.setRay(this.pointer.x,this.pointer.y);const point=this.ray.ray.intersectPlane(op.plane,new THREE.Vector3());if(point)this.previewOperation(point); }
    else if(!op.numeric) { op.value=op.kind==='loop'?THREE.MathUtils.clamp(50+(this.pointer.x-op.start.x)*.2,.2,99.8):Math.max(.001,1+(this.pointer.x-op.start.x)*.05);this.previewOperation(); }
  }
  private finishOperation() {
    if(this.operationFrame){cancelAnimationFrame(this.operationFrame);this.operationFrame=0;this.moveOperation();}
    const op=this.operation;if(!op)return;
    if(!op.valid || op.numeric && !Number.isFinite(Number(op.numeric))){this.message('Ajusta una operación válida antes de confirmar · Esc cancela');return;}
    this.operation=null;this.operationPoint=undefined;this.gizmo.enabled=true;this.orbit.enabled=true;this.callbacks.activity(false);this.record({knife:'Cortar cara',loop:'Cortar bucle',inset:'Borde interior',bevel:'Bisel'}[op.kind]);this.updateSelection();this.message('Operación aplicada · Ctrl+Z deshace');
  }

  private setRay(x: number, y: number) { const rect = this.renderer.domElement.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), this.camera); }
  private project(point: THREE.Vector3) { const rect = this.renderer.domElement.getBoundingClientRect(), p = point.clone().project(this.camera); return new THREE.Vector2(rect.left + (p.x + 1) * rect.width / 2, rect.top + (1 - p.y) * rect.height / 2); }
  private visible(point: THREE.Vector3) { if (this.xray) return true; const screen = this.project(point); this.setRay(screen.x, screen.y); const hit = this.ray.intersectObject(this.body, false)[0]; return !hit || hit.distance + Math.max(0.01, this.camera.position.distanceTo(point) * 0.0001) >= this.ray.ray.origin.distanceTo(point); }
  private pick(x: number, y: number): number | null {
    this.setRay(x, y);
    if (this.mode === "face") { const hit = this.ray.intersectObject(this.body, false)[0]; return hit?.faceIndex != null ? this.triangleFaces[hit.faceIndex] : null; }
    const pointer = new THREE.Vector2(x, y); let best: number | null = null, distance = 11;
    if (this.mode === "vertex") for (let id = 0; id < this.mesh.positions.length / 3; id++) { const p = meshPoint(this.mesh, id), d = this.project(p).distanceTo(pointer); if (d < distance && this.visible(p)) { distance = d; best = id; } }
    else this.edges.forEach((edge, id) => { const a = meshPoint(this.mesh, edge.a), b = meshPoint(this.mesh, edge.b), aa = this.project(a), bb = this.project(b), direction = bb.clone().sub(aa); const t = THREE.MathUtils.clamp(pointer.clone().sub(aa).dot(direction) / (direction.lengthSq() || 1), 0, 1), d = aa.addScaledVector(direction, t).distanceTo(pointer); if (d < distance && this.visible(a.lerp(b, t))) { distance = d; best = id; } });
    return best;
  }
  private onPointerDown = (event: PointerEvent) => {
    this.pointer.set(event.clientX, event.clientY); this.renderer.domElement.focus({ preventScroll: true });
    if (this.operation) {
      if (event.button === 2) { this.cancel(); return; }
      if (event.button !== 0) return;
      const op = this.operation;
      if (op.kind === 'knife' && !op.point) {
        this.setRay(event.clientX,event.clientY); const hit=this.ray.intersectObject(this.body,false)[0];
        if (hit?.faceIndex == null) { this.message('Marca el inicio sobre una cara'); return; }
        try { op.face=this.triangleFaces[hit.faceIndex]; const normal=requirePlanar(polygonLoop(op.before.mesh,op.face).map(id=>meshPoint(op.before.mesh,id))); op.point=hit.point.clone(); op.plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,op.point); this.message('Mueve el ratón para previsualizar el corte · Segundo clic confirma · Esc cancela'); }
        catch(e) { this.message(e instanceof Error?e.message:'Cara no válida'); }
      } else { if(op.kind==='knife')this.moveOperation(); this.finishOperation(); }
      return;
    }
    if (this.transaction?.modal) { if (event.button === 0) this.finish(); else if (event.button === 2) this.cancel(); return; }
    if (event.button !== 0 || this.gizmo.dragging || this.gizmo.axis) return;
    const id = this.boxSelecting ? null : this.pick(event.clientX, event.clientY), additive = event.shiftKey || event.ctrlKey || event.metaKey;
    this.pointerDown = { x: event.clientX, y: event.clientY, id, additive, button: event.button };
    this.renderer.domElement.setPointerCapture(event.pointerId);
    if (id !== null) {
      if (additive) { if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id); }
      else if (!this.selected.has(id)) this.selected = new Set([id]);
      this.updateSelection();
    }
  };
  private onPointerMove = (event: PointerEvent) => {
    this.pointer.set(event.clientX, event.clientY);
    if (this.operation) { if (!this.operationFrame) this.operationFrame=requestAnimationFrame(()=>{this.operationFrame=0;this.moveOperation();}); return; }
    if (this.transaction?.modal) { this.applyModal(); return; }
    const down = this.pointerDown; if (!down || this.gizmo.dragging) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y) > 3;
    if (down.id !== null && moved && !down.additive) { this.tool = "translate"; this.begin(true, new THREE.Vector2(down.x, down.y)); this.gizmo.enabled = false; this.applyModal(); }
    else if (down.id === null && moved) { const rect = this.host.getBoundingClientRect(); this.box.hidden = false; Object.assign(this.box.style, { left: `${Math.min(down.x, event.clientX) - rect.left}px`, top: `${Math.min(down.y, event.clientY) - rect.top}px`, width: `${Math.abs(down.x - event.clientX)}px`, height: `${Math.abs(down.y - event.clientY)}px` }); }
  };
  private onPointerUp = (event: PointerEvent) => {
    if (this.operation) return;
    const down = this.pointerDown; this.pointerDown = null;
    if (this.transaction?.modal && down?.id !== null && down) { this.pointer.set(event.clientX, event.clientY); this.applyModal(); this.finish(); }
    if (down?.id === null) {
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y) > 3;
      if (!down.additive) this.selected.clear();
      if (moved) {
        const count = this.mode === "vertex" ? this.mesh.positions.length / 3 : this.mode === "edge" ? this.edges.length : this.mesh.faces.length;
        for (let id = 0; id < count; id++) { const vertices = selectionVertices(this.mesh, this.mode, new Set([id]), this.edges), point = selectionCenter(this.mesh, vertices), p = this.project(point); if (p.x >= Math.min(down.x, event.clientX) && p.x <= Math.max(down.x, event.clientX) && p.y >= Math.min(down.y, event.clientY) && p.y <= Math.max(down.y, event.clientY) && this.visible(point)) this.selected.add(id); }
      }
      this.updateSelection();
    }
    this.box.hidden = true; this.boxSelecting = false;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
  };
  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.isContentEditable || target?.closest("input, textarea, select")) {
      if ((this.operation || this.transaction) && (event.key === "Enter" || event.key === "Escape")) { event.preventDefault(); event.stopImmediatePropagation(); if (event.key === "Escape") this.cancel(); else this.finish(); }
      return;
    }
    const key = event.key.toLowerCase(), ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && key === "s") return; // host save checks activity before exporting
    event.stopImmediatePropagation();
    if (this.operation) {
      event.preventDefault();
      if (key==='escape')this.cancel();else if(key==='enter')this.finishOperation();
      else if(this.operation.kind!=='knife') { if (/^[0-9.\-]$/.test(key))this.operation.numeric+=key;else if(key==='backspace')this.operation.numeric=this.operation.numeric.slice(0,-1);if(this.operation.numeric && Number.isFinite(Number(this.operation.numeric))){this.operation.value=Number(this.operation.numeric);this.previewOperation();} }
      return;
    }
    if (this.transaction) {
      event.preventDefault();
      if (key === "escape") this.cancel();
      else if (key === "enter") this.finish();
      else if (this.transaction.modal) {
        if (["x", "y", "z"].includes(key)) this.transaction.axis = this.transaction.axis === key ? null : key as "x" | "y" | "z";
        else if (/^[0-9.\-]$/.test(key)) this.transaction.numeric += key;
        else if (key === "backspace") this.transaction.numeric = this.transaction.numeric.slice(0, -1);
        this.applyModal();
      }
      return;
    }
    if (["tab", "1", "2", "3", "g", "r", "s", "a", "b", "e", "f", "delete", "backspace", "escape", "."].includes(key) || (ctrl && ["z", "y"].includes(key)) || (event.altKey && key === "z")) event.preventDefault();
    if (key==='k' || key==='i' && !ctrl || ctrl && (key==='r' || key==='b')) { event.preventDefault(); this.startOperation(key==='k'?'knife':key==='i'?'inset':key==='r'?'loop':'bevel'); }
    else if (key==='m' && !ctrl) { event.preventDefault(); this.merge(null); }
    else if (key==='o') { event.preventDefault(); this.setAssist({proportional:!this.assist.proportional}); }
    else if (event.shiftKey && key==='s') { event.preventDefault(); this.setAssist({snap:this.assist.snap==='off'?'grid':'off'}); }
    else if (ctrl && ["i", "l", "+", "=", "-", "t"].includes(key)) {
      event.preventDefault();
      if (key === "t") this.surface("triangulate");
      else this.selectRelated(key === "i" ? "invert" : key === "l" ? "linked" : key === "-" ? "shrink" : "grow");
    }
    else if (event.code === "Numpad1" || event.code === "Numpad3" || event.code === "Numpad7") { event.preventDefault(); this.view(event.code === "Numpad1" ? (ctrl ? "back" : "front") : event.code === "Numpad3" ? (ctrl ? "left" : "right") : (ctrl ? "bottom" : "top")); }
    else if (key === "j") { event.preventDefault(); this.fill(); }
    else if (key === "tab") this.callbacks.exit();
    else if (ctrl && key === "z") this.undo(event.shiftKey);
    else if (ctrl && key === "y") this.undo(true);
    else if (event.altKey && key === "z") this.toggleXray();
    else if (key === "1") this.setMode("vertex"); else if (key === "2") this.setMode("edge"); else if (key === "3") this.setMode("face");
    else if (key === "g") this.startTransform("translate"); else if (key === "r") this.startTransform("rotate"); else if (key === "s") this.startTransform("scale");
    else if (key === "a") this.selectAll(event.altKey); else if (key === "b") { this.boxSelecting = true; this.message("Arrastra un rectángulo para seleccionar"); }
    else if (key === "e") this.extrude(); else if (key === "f") this.fill();
    else if (key === "delete" || key === "backspace") this.remove();
    else if (key === "escape") this.selectAll(true); else if (key === ".") this.frameSelection();
  };
  dispose() {
    this.dead = true; if (this.operationFrame) cancelAnimationFrame(this.operationFrame); this.abort.abort(); this.resize.disconnect(); if (this.frame) cancelAnimationFrame(this.frame);
    this.callbacks.activity(false); this.orbit.dispose(); this.gizmo.dispose();
    this.scene.traverse(object => { const item = object as THREE.Mesh; item.geometry?.dispose(); if (item.material) (Array.isArray(item.material) ? item.material : [item.material]).forEach(material => material.dispose()); });
    this.renderer.dispose(); this.renderer.domElement.remove(); this.box.remove();
  }
}
