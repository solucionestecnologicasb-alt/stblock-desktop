"use client";

import { ChevronDown, ChevronRight, Move3d, Scale3d, Target, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Axis = "x" | "y" | "z";
type TopologyMode = "face" | "vertex" | "edge";

type TopologyInspectorProps = {
  mode: TopologyMode;
  count: number;
  onClose: () => void;
  onMove: (delta: { x: number; y: number; z: number }) => void;
  onAlign: (axis: Axis) => void;
  onScalePreview: (factor: number) => void;
  onScaleCommit: (factor: number) => void;
  onRotatePreview: (axis: Axis, degrees: number) => void;
  onRotateCommit: (axis: Axis, degrees: number) => void;
  onCollapse: () => void;
  vertexPlacementActive: boolean;
  onVertexPlacementChange: (active: boolean) => void;
  constructionEdgeCount: number;
  onConnectVertices: () => void;
  onRemoveLastConstructionEdge: () => void;
  onApexPreview: (height: number) => void;
  onApexCommit: (height: number) => void;
  onFaceNormalPreview: (distance: number) => void;
  onFaceNormalCommit: (distance: number) => void;
  onCancelPreview: () => void;
  onInsertEdgeCenter: () => void;
  onInsertEdgeAtRatio: (ratio: number) => void;
};

function numeric(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function TopologyInspector({ mode, count, onClose, onMove, onAlign, onScalePreview, onScaleCommit, onRotatePreview, onRotateCommit, onCollapse, vertexPlacementActive, onVertexPlacementChange, constructionEdgeCount, onConnectVertices, onRemoveLastConstructionEdge, onApexPreview, onApexCommit, onFaceNormalPreview, onFaceNormalCommit, onCancelPreview, onInsertEdgeCenter, onInsertEdgeAtRatio }: TopologyInspectorProps) {
  const [moveOpen, setMoveOpen] = useState(true);
  const [shapeOpen, setShapeOpen] = useState(true);
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("0");
  const [step, setStep] = useState("5");
  const [scale, setScale] = useState("0.8");
  const [rotation, setRotation] = useState("15");
  const [rotationAxis, setRotationAxis] = useState<Axis>("y");
  const [apexHeight, setApexHeight] = useState("20");
  const [normalDistance, setNormalDistance] = useState("10");
  const activePreview = useRef<"scale" | "rotate" | "apex" | "normal" | null>(null);
  const title = mode === "vertex" ? "Vértices" : mode === "edge" ? "Líneas" : "Caras";
  const amount = Math.abs(numeric(step, 5));

  const cancelPreview = () => {
    if (!activePreview.current) return;
    activePreview.current = null;
    onCancelPreview();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activePreview.current) {
        event.preventDefault();
        activePreview.current = null;
        onCancelPreview();
      }
      if (vertexPlacementActive) {
        event.preventDefault();
        onVertexPlacementChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancelPreview, onVertexPlacementChange, vertexPlacementActive]);

  const previewScale = (raw: string) => {
    setScale(raw);
    activePreview.current = "scale";
    onScalePreview(Math.max(0.01, numeric(raw, 1)));
  };
  const commitScale = (raw = scale) => {
    if (activePreview.current !== "scale") return;
    activePreview.current = null;
    onScaleCommit(Math.max(0.01, numeric(raw, 1)));
  };
  const previewRotation = (raw: string, axis = rotationAxis) => {
    setRotation(raw);
    activePreview.current = "rotate";
    onRotatePreview(axis, numeric(raw, 0));
  };
  const commitRotation = (raw = rotation) => {
    if (activePreview.current !== "rotate") return;
    activePreview.current = null;
    onRotateCommit(rotationAxis, numeric(raw, 0));
  };
  const previewApex = (raw: string) => {
    setApexHeight(raw);
    activePreview.current = "apex";
    onApexPreview(numeric(raw, 20));
  };
  const commitApex = (raw = apexHeight) => {
    if (activePreview.current !== "apex") return;
    activePreview.current = null;
    onApexCommit(numeric(raw, 20));
  };
  const previewNormal = (raw: string) => {
    setNormalDistance(raw);
    activePreview.current = "normal";
    onFaceNormalPreview(numeric(raw, 10));
  };
  const commitNormal = (raw = normalDistance) => {
    if (activePreview.current !== "normal") return;
    activePreview.current = null;
    onFaceNormalCommit(numeric(raw, 10));
  };

  return (
    <aside className="topology-inspector" aria-label={`Herramientas de ${title.toLowerCase()}`}>
      <header className="topology-inspector-header">
        <div><strong>{title}</strong><span>{count} seleccionado{count === 1 ? "" : "s"}</span></div>
        <button type="button" onClick={onClose} aria-label="Cerrar inspector"><X size={17} /></button>
      </header>

      {mode === "vertex" ? <section className="topology-inspector-section topology-vertex-creation">
        <div className="topology-inspector-section-body">
          <strong>Crear vértices</strong>
          <button type="button" className={"topology-primary-action" + (vertexPlacementActive ? " active" : "")} onClick={() => onVertexPlacementChange(!vertexPlacementActive)}>
            {vertexPlacementActive ? "Finalizar inserción" : "Insertar vértices con mouse"}
          </button>
          <span className="topology-inspector-hint">{vertexPlacementActive ? "Modo activo: haz clic sobre cualquier lugar de una arista. Puedes insertar varios vértices; pulsa Escape para terminar." : "Activa esta herramienta y pulsa sobre el borde donde necesites el nuevo vértice. Después podrás arrastrarlo."}</span>
        </div>
      </section> : null}

      <section className="topology-inspector-section">
        <button className="topology-inspector-section-toggle" type="button" onClick={() => setMoveOpen((open) => !open)}>
          {moveOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<Move3d size={16} /><span>Mover</span>
        </button>
        {moveOpen ? <div className="topology-inspector-section-body">
          <div className="topology-vector-inputs">
            <label><span>X</span><input type="number" step="0.1" value={x} onChange={(event) => setX(event.currentTarget.value)} /></label>
            <label><span>Y</span><input type="number" step="0.1" value={y} onChange={(event) => setY(event.currentTarget.value)} /></label>
            <label><span>Z</span><input type="number" step="0.1" value={z} onChange={(event) => setZ(event.currentTarget.value)} /></label>
          </div>
          <button className="topology-primary-action" type="button" disabled={count === 0} onClick={() => onMove({ x: numeric(x, 0), y: numeric(y, 0), z: numeric(z, 0) })}>Aplicar desplazamiento</button>
          <label className="topology-step-input"><span>Paso</span><input type="number" min="0.01" step="0.1" value={step} onChange={(event) => setStep(event.currentTarget.value)} /></label>
          <div className="topology-axis-grid">
            {(["x", "y", "z"] as Axis[]).flatMap((axis) => ([1, -1] as const).map((sign) => (
              <button key={`${axis}-${sign}`} type="button" disabled={count === 0} onClick={() => onMove({ x: axis === "x" ? amount * sign : 0, y: axis === "y" ? amount * sign : 0, z: axis === "z" ? amount * sign : 0 })}>{sign > 0 ? "+" : "−"}{axis.toUpperCase()}</button>
            )))}
          </div>
        </div> : null}
      </section>

      <section className="topology-inspector-section">
        <button className="topology-inspector-section-toggle" type="button" onClick={() => setShapeOpen((open) => !open)}>
          {shapeOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<Scale3d size={16} /><span>Ajustar selección</span>
        </button>
        {shapeOpen ? <div className="topology-inspector-section-body">
          <span className="topology-inspector-hint">Las operaciones usan el centro común de la selección.</span>
          <div className="topology-align-row">
            {(["x", "y", "z"] as Axis[]).map((axis) => <button key={axis} type="button" disabled={count === 0} onClick={() => onAlign(axis)}><Target size={14} /> Alinear {axis.toUpperCase()}</button>)}
          </div>
          {mode !== "vertex" ? <div className="topology-live-control">
            <div className="topology-live-control-heading"><span>Escala interactiva</span><output>{numeric(scale, 1).toFixed(2)}×</output></div>
            <input className="topology-live-range" aria-label="Escala interactiva" type="range" min="0.1" max="3" step="0.01" value={scale} onChange={(event) => previewScale(event.currentTarget.value)} onPointerUp={(event) => commitScale(event.currentTarget.value)} onPointerCancel={cancelPreview} onKeyUp={(event) => commitScale(event.currentTarget.value)} onBlur={(event) => commitScale(event.currentTarget.value)} />
            <div className="topology-live-value-row"><input type="number" min="0.01" max="10" step="0.05" value={scale} onChange={(event) => previewScale(event.currentTarget.value)} onBlur={(event) => commitScale(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") commitScale(event.currentTarget.value); }} /><button type="button" onClick={() => { activePreview.current = null; setScale("1"); onScaleCommit(1); }}>Restablecer</button></div>
            <span className="topology-inspector-hint">Arrastra para ver el resultado en naranja; suelta para aplicarlo.</span>
          </div> : null}
          {mode !== "vertex" ? <div className="topology-live-control">
            <div className="topology-live-control-heading"><span>Rotación interactiva</span><output>{numeric(rotation, 0).toFixed(1)}°</output></div>
            <div className="topology-align-row">
              {(["x", "y", "z"] as Axis[]).map((axis) => <button className={rotationAxis === axis ? "active" : ""} key={axis} type="button" onClick={() => { cancelPreview(); setRotationAxis(axis); }}>Eje {axis.toUpperCase()}</button>)}
            </div>
            <input className="topology-live-range" aria-label="Rotación interactiva" type="range" min="-180" max="180" step="1" value={rotation} onChange={(event) => previewRotation(event.currentTarget.value)} onPointerUp={(event) => commitRotation(event.currentTarget.value)} onPointerCancel={cancelPreview} onKeyUp={(event) => commitRotation(event.currentTarget.value)} onBlur={(event) => commitRotation(event.currentTarget.value)} />
            <div className="topology-live-value-row"><input type="number" min="-360" max="360" step="1" value={rotation} onChange={(event) => previewRotation(event.currentTarget.value)} onBlur={(event) => commitRotation(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") commitRotation(event.currentTarget.value); }} /><button type="button" onClick={() => { activePreview.current = null; setRotation("0"); onRotateCommit(rotationAxis, 0); }}>Restablecer</button></div>
          </div> : null}
          {mode === "vertex" ? <>
            <div className="topology-construction-actions">
              <button type="button" className="topology-primary-action" onClick={onConnectVertices} disabled={count !== 2}>Crear línea entre 2 vértices</button>
              <button type="button" className="topology-secondary-action" onClick={onRemoveLastConstructionEdge} disabled={constructionEdgeCount === 0}>Eliminar última línea ({constructionEdgeCount})</button>
            </div>
            <span className="topology-inspector-hint">Después de insertar y mover los vértices, usa Ctrl para seleccionar exactamente dos y unirlos.</span>
            <button type="button" className="topology-secondary-action" onClick={onCollapse} disabled={count < 2}>Mover todos al centro</button>
            <div className="topology-live-control">
              <div className="topology-live-control-heading"><span>Altura de punta</span><output>{numeric(apexHeight, 20).toFixed(1)} mm</output></div>
              <input className="topology-live-range" aria-label="Altura de punta" type="range" min="-100" max="100" step="0.5" value={apexHeight} disabled={count < 3} onChange={(event) => previewApex(event.currentTarget.value)} onPointerUp={(event) => commitApex(event.currentTarget.value)} onPointerCancel={cancelPreview} onKeyUp={(event) => commitApex(event.currentTarget.value)} onBlur={(event) => commitApex(event.currentTarget.value)} />
              <div className="topology-live-value-row"><input type="number" step="0.1" value={apexHeight} disabled={count < 3} onChange={(event) => previewApex(event.currentTarget.value)} onBlur={(event) => commitApex(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") commitApex(event.currentTarget.value); }} /><button type="button" disabled={count < 3} onClick={() => { activePreview.current = null; onApexCommit(numeric(apexHeight, 20)); }}>Aplicar</button></div>
            </div>
            <span className="topology-inspector-hint">Crear punta contrae X/Z al centro común y eleva los vértices en Y.</span>
          </> : null}
          {mode === "edge" ? <div className="topology-construction-actions">
            <span className="topology-inspector-hint">Crear vértice sobre la línea seleccionada</span>
            <div className="topology-edge-ratio-grid">
              <button type="button" onClick={() => onInsertEdgeAtRatio(0.25)} disabled={count !== 1}>25 %</button>
              <button type="button" onClick={onInsertEdgeCenter} disabled={count !== 1}>Centro</button>
              <button type="button" onClick={() => onInsertEdgeAtRatio(0.75)} disabled={count !== 1}>75 %</button>
            </div>
          </div> : null}
          {mode === "face" ? <div className="topology-live-control">
            <div className="topology-live-control-heading"><span>Extruir por normal</span><output>{numeric(normalDistance, 10).toFixed(1)} mm</output></div>
            <input className="topology-live-range" aria-label="Extruir por normal" type="range" min="-100" max="100" step="0.5" value={normalDistance} onChange={(event) => previewNormal(event.currentTarget.value)} onPointerUp={(event) => commitNormal(event.currentTarget.value)} onPointerCancel={cancelPreview} onKeyUp={(event) => commitNormal(event.currentTarget.value)} onBlur={(event) => commitNormal(event.currentTarget.value)} />
            <div className="topology-live-value-row"><input type="number" step="0.1" value={normalDistance} onChange={(event) => previewNormal(event.currentTarget.value)} onBlur={(event) => commitNormal(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") commitNormal(event.currentTarget.value); }} /><button type="button" onClick={() => { activePreview.current = null; onFaceNormalCommit(numeric(normalDistance, 10)); }}>Aplicar</button></div>
            <span className="topology-inspector-hint">Valores negativos empujan la cara hacia el interior.</span>
          </div> : null}
        </div> : null}
      </section>
    </aside>
  );
}
