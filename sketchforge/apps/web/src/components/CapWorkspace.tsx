"use client";

import { Check, Layers, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { capSectionHasUsableProfile, planeElevation } from "@/lib/capDocument";
import type {
  CapDocument,
  CapSection,
  CapSectionUnionMode,
  SketchOperation,
  WorkplanePlane,
  WorkplaneShape,
} from "@/types/sketchforge";

type CapWorkspaceProps = {
  capDocument: CapDocument | null;
  shapes: WorkplaneShape[];
  selectedIds: string[];
  drawingActive: boolean;
  activeSection: CapSection | null;
  // When false, only the workspace content renders; the "Planos de trabajo"
  // side panel (sections list + new-section form) is hidden.
  showPanel?: boolean;
  onSelectSection: (id: string) => void;
  onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onCreateSection: (plane: WorkplanePlane, operation: SketchOperation, extrusionDepth: number, unionMode?: CapSectionUnionMode) => void;
  onEditSection: (id: string) => void;
  onGeneratePiece: (id: string) => void;
  onExitDrawing: () => void;
  facePlaneDraft?: WorkplanePlane | null;
  children: ReactNode;
};

export function CapWorkspace({
  capDocument,
  shapes,
  selectedIds,
  drawingActive,
  activeSection,
  showPanel = true,
  onSelectSection,
  onRenameSection,
  onDeleteSection,
  onCreateSection,
  onEditSection,
  onGeneratePiece,
  onExitDrawing,
  facePlaneDraft,
  children,
}: CapWorkspaceProps) {
  const [newSectionOpen, setNewSectionOpen] = useState(true);
  const [planeKind, setPlaneKind] = useState<"base" | "offset" | "face">("base");
  const [elevation, setElevation] = useState("60");
  const [operation, setOperation] = useState<SketchOperation>("extrude");
  const [depth, setDepth] = useState("10");
  const [unionMode, setUnionMode] = useState<CapSectionUnionMode>("floating");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const deleteConfirmTimerRef = useRef<number | null>(null);

  const disarmDeleteConfirm = () => {
    if (deleteConfirmTimerRef.current !== null) {
      window.clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = null;
    }
    setConfirmingDeleteId(null);
  };

  const armDeleteConfirm = (sectionId: string) => {
    disarmDeleteConfirm();
    setConfirmingDeleteId(sectionId);
    deleteConfirmTimerRef.current = window.setTimeout(() => {
      deleteConfirmTimerRef.current = null;
      setConfirmingDeleteId(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (deleteConfirmTimerRef.current !== null) window.clearTimeout(deleteConfirmTimerRef.current);
    };
  }, []);

  const sections = capDocument?.sections ?? [];
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]));

  const sectionStatus = (section: CapSection) => {
    if (section.resultShapeId) {
      return shapeById.has(section.resultShapeId) ? "generada" : "eliminada";
    }
    return "borrador";
  };

  const handleCreate = () => {
    if (planeKind === "face") {
      if (!facePlaneDraft) {
        return;
      }
      onCreateSection(facePlaneDraft, operation, Math.max(0.1, Number.parseFloat(depth) || 10), unionMode);
      return;
    }
    const plane: WorkplanePlane = planeKind === "offset"
      ? { kind: "offset", elevation: Number.parseFloat(elevation) || 0 }
      : { kind: "base" };
    onCreateSection(plane, operation, Math.max(0.1, Number.parseFloat(depth) || 10));
  };

  const startRename = (section: CapSection) => {
    setRenamingId(section.id);
    setNameDraft(section.name);
  };

  const commitRename = () => {
    if (renamingId && nameDraft.trim()) onRenameSection(renamingId, nameDraft.trim());
    setRenamingId(null);
  };

  return (
    <main className="cap-workspace">
      {showPanel ? <aside className="cap-sections-panel" aria-label="Planos de trabajo CAP">
        <div className="cap-panel-header">
          <strong>Planos de trabajo</strong>
          <button className="cap-new-section-toggle" type="button" onClick={() => setNewSectionOpen((open) => !open)}>
            {newSectionOpen ? <X size={15} /> : <Plus size={15} />}
            <span>Nueva sección</span>
          </button>
        </div>
        {newSectionOpen ? (
          <div className="cap-new-section-form">
            <div className="cap-form-row">
              <label>
                <span>Plano</span>
                <select value={planeKind} onChange={(event) => setPlaneKind(event.currentTarget.value as "base" | "offset" | "face")}>
                  <option value="base">Base (Y = 0)</option>
                  <option value="offset">Elevado</option>
                  <option value="face">Cara de una pieza</option>
                </select>
              </label>
            </div>
            {planeKind === "offset" ? (
              <div className="cap-form-row">
                <label>
                  <span>Elevación (mm)</span>
                  <input type="text" inputMode="decimal" value={elevation} onChange={(event) => setElevation(event.currentTarget.value)} />
                </label>
              </div>
            ) : null}
            {planeKind === "face" ? (
              <div className="cap-form-row cap-face-plane-row">
                {facePlaneDraft && facePlaneDraft.kind === "face" ? (
                  <span className="cap-face-plane-picked">
                    Cara seleccionada (pieza {facePlaneDraft.shapeId.slice(0, 6)}…)
                  </span>
                ) : (
                  <span className="cap-face-plane-hint">
                    Ve a Geometría, selecciona una pieza, activa «Cara» y haz clic en una cara para elegirla.
                  </span>
                )}
              </div>
            ) : null}
            <div className="cap-form-row">
              <label>
                <span>Operación</span>
                <select value={operation} onChange={(event) => setOperation(event.currentTarget.value as SketchOperation)}>
                  <option value="extrude">Extrusión</option>
                  <option value="revolve">Revolución</option>
                </select>
              </label>
            </div>
            <div className="cap-form-row">
              <label>
                <span>Profundidad (mm)</span>
                <input type="text" inputMode="decimal" value={depth} onChange={(event) => setDepth(event.currentTarget.value)} />
              </label>
            </div>
            {planeKind === "face" ? (
              <div className="cap-form-row">
                <label>
                  <span>Modo de unión</span>
                  <select value={unionMode} onChange={(event) => setUnionMode(event.currentTarget.value as CapSectionUnionMode)}>
                    <option value="floating">Flotante (pieza independiente)</option>
                    <option value="add">Añadir (funde con la pieza)</option>
                    <option value="cut">Cortar (hace hueco en la pieza)</option>
                  </select>
                </label>
              </div>
            ) : null}
            <button
              className="cap-create-button"
              type="button"
              onClick={handleCreate}
              disabled={planeKind === "face" && !facePlaneDraft}
            >
              <Check size={15} /> Crear sección
            </button>
          </div>
        ) : null}
        {drawingActive ? (
          <div className="cap-drawing-bar">
            <span>Dibujando {activeSection ? `«${activeSection.name}»` : "la sección"}</span>
            <button type="button" onClick={onExitDrawing}>
              <X size={13} /> Salir del boceto
            </button>
          </div>
        ) : null}
        <div className="cap-sections-list">
          {sections.length === 0 ? (
            <div className="cap-empty-hint">Crea una sección para dibujar en un plano de trabajo.</div>
          ) : null}
          {sections.map((section) => {
            const status = sectionStatus(section);
            const active = activeSection?.id === section.id;
            const usable = capSectionHasUsableProfile(section);
            const pieceSelected = section.resultShapeId ? selectedIds.includes(section.resultShapeId) : false;
            return (
              <div key={section.id} className={`cap-section-item ${active ? "active" : ""} ${pieceSelected ? "piece-selected" : ""}`}>
                <div className="cap-section-item-main" onClick={() => onSelectSection(section.id)}>
                  <div className="cap-section-name-row">
                    {renamingId === section.id ? (
                      <input
                        className="cap-section-rename-input"
                        type="text"
                        value={nameDraft}
                        autoFocus
                        onChange={(event) => setNameDraft(event.currentTarget.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitRename();
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                      />
                    ) : (
                      <button className="cap-section-name" type="button" onClick={() => onSelectSection(section.id)} onDoubleClick={() => startRename(section)}>
                        {section.name}
                      </button>
                    )}
                    <span className={`cap-status-chip ${status}`}>
                      {status === "generada" ? "Pieza generada" : status === "eliminada" ? "Pieza eliminada" : "Borrador"}
                    </span>
                  </div>
                  <div className="cap-section-plane">
                    <Layers size={13} />
                    <span>{planeElevation(section.plane).toFixed(0)} mm · {section.operation === "revolve" ? "Revolución" : "Extrusión"}</span>
                  </div>
                </div>
                <div className="cap-section-actions">
                  <button type="button" title={usable ? "Editar el boceto de esta sección" : "Dibuja primero un perfil cerrado"} onClick={() => onEditSection(section.id)}>
                    <Pencil size={13} /><span>Editar boceto</span>
                  </button>
                  <button type="button" title={usable ? "Generar la pieza 3D a partir del boceto" : "Cierra al menos un perfil para generar la pieza"} onClick={() => onGeneratePiece(section.id)}>
                    <Play size={13} /><span>Generar pieza</span>
                  </button>
                  {confirmingDeleteId === section.id ? (
                    <span className="cap-section-delete-confirm">
                      <button
                        className="danger"
                        type="button"
                        title="Confirmar eliminación"
                        onClick={() => {
                          disarmDeleteConfirm();
                          onDeleteSection(section.id);
                        }}
                      >
                        <Check size={13} />
                      </button>
                      <button type="button" title="Cancelar" onClick={disarmDeleteConfirm}>
                        <X size={13} />
                      </button>
                    </span>
                  ) : (
                    <button
                      className="danger"
                      type="button"
                      title="Eliminar sección"
                      onClick={() => armDeleteConfirm(section.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside> : null}
      <div className="cap-workspace-content">{children}</div>
    </main>
  );
}
