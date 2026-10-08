"use client";

import { MeshAdvancedTools } from "./MeshAdvancedTools";
import { MeshEditMenus } from "./MeshEditMenus";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Move, Rotate3D, Scaling, Undo2, Redo2, ScanEye, Focus, Split, Trash2, Box, ChevronUp, Plus } from "lucide-react";
import { MeshEditViewport, type MeshEditState, type MeshEditTool } from "@/lib/meshEditViewport";
import type { EditableMesh, EditSelectionMode } from "@/lib/editableMesh";

type Props = {
  mesh: EditableMesh;
  context: Array<{ mesh: EditableMesh; color: string }>;
  name: string;
  color: string;
  initialMode: EditSelectionMode;
  onCommit: (mesh: EditableMesh, label: string, history?: "undo" | "redo") => void;
  onActivity: (active: boolean) => void;
  onExit: () => void;
  onNotice: (message: string) => void;
};

export function MeshEditWorkspace(props: Props) {
  const host = useRef<HTMLDivElement>(null), output = useRef<HTMLOutputElement>(null), controller = useRef<MeshEditViewport | null>(null);
  const callbacks = useRef(props); callbacks.current = props;
  const [state, setState] = useState<MeshEditState>({ mode: props.initialMode, tool: "translate", count: 0, xray: false, undo: false, redo: false, active: false });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const initial = callbacks.current;
      controller.current = new MeshEditViewport(host.current!, initial.mesh, initial.color, initial.initialMode, output.current!, {
        state: setState,
        commit: (...args) => callbacks.current.onCommit(...args),
        activity: active => callbacks.current.onActivity(active),
        exit: () => callbacks.current.onExit(),
        notice: message => callbacks.current.onNotice(message),
      }, initial.context);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el editor de malla"); }
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);
  const tool = (kind: MeshEditTool, label: string, key: string, Icon: typeof Move) => <button type="button" aria-pressed={state.tool === kind} onClick={() => controller.current?.setTool(kind)} title={`${label}: manijas sobre la selección. ${key} inicia con teclado`}><Icon size={18} /><span>{label}</span><kbd>{key}</kbd></button>;
  return <section className="mesh-edit-workspace" aria-label="Editar malla">
    <div className="mesh-edit-toolbar">
      <button type="button" className="mesh-edit-back" disabled={state.active} onClick={props.onExit} title="Volver a trabajar por piezas (Tab)"><ArrowLeft size={17} /> Piezas <kbd>Tab</kbd></button>
      <span className="mesh-edit-name" title={props.name}>{props.name}</span>
      <div className="mesh-edit-modes" role="group" aria-label="Tipo de selección">
        {([['vertex', 'Vértices', '1'], ['edge', 'Aristas', '2'], ['face', 'Caras', '3']] as const).map(([mode, name, key]) => <button key={mode} type="button" aria-pressed={state.mode === mode} disabled={state.active} onClick={() => controller.current?.setMode(mode)}>{name}<kbd>{key}</kbd></button>)}
      </div>
      <span className="mesh-edit-count">{state.count} seleccionados</span>
      <button type="button" title="Deshacer (Ctrl+Z)" aria-label="Deshacer edición" disabled={!state.undo || state.active} onClick={() => controller.current?.undo()}><Undo2 size={18} /></button>
      <button type="button" title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer edición" disabled={!state.redo || state.active} onClick={() => controller.current?.undo(true)}><Redo2 size={18} /></button>
    </div>
    <div className="mesh-edit-canvas" ref={host} />
    <div className="mesh-edit-tools" role="toolbar" aria-label="Transformar selección">
      {tool("translate", "Mover", "G", Move)}
      {tool("rotate", "Rotar", "R", Rotate3D)}
      {tool("scale", "Escalar", "S", Scaling)}
      <hr />
      <button type="button" disabled={state.active || state.mode !== "face" || !state.count} onClick={() => controller.current?.extrude()} title="Extruir caras seleccionadas"><ChevronUp size={18} /><span>Extruir</span><kbd>E</kbd></button>
      <button type="button" disabled={state.active || state.mode !== "edge" || !state.count} onClick={() => controller.current?.subdivide()} title="Divide las aristas y sus caras adyacentes"><Split size={18} /><span>Subdividir</span></button>
      <button type="button" disabled={state.active || state.mode !== "vertex" || state.count < 2} onClick={() => controller.current?.fill()} title="Conecta dos vértices de una cara; con tres o más, cierra un contorno"><Plus size={18} /><span>{state.count === 2 ? "Conectar" : "Crear cara"}</span><kbd>F</kbd></button>
      <hr />
      <button type="button" aria-pressed={state.xray} onClick={() => controller.current?.toggleXray()} title="Seleccionar a través de la pieza (Alt+Z)"><ScanEye size={18} /><span>Rayos X</span></button>
      <button type="button" onClick={() => controller.current?.frameSelection()} title="Encuadrar selección (.)"><Focus size={18} /><span>Encuadrar</span></button>
      <button type="button" disabled={!state.count || state.active} onClick={() => controller.current?.remove()} title="Eliminar componentes seleccionados (Supr)"><Trash2 size={18} /><span>Eliminar</span></button>
      <hr />
      <MeshAdvancedTools controller={controller} state={state} />
      <MeshEditMenus controller={controller} state={state} />
    </div>
    <div className="mesh-edit-help"><Box size={14} /> Edición de superficie <span>Shift + clic: añadir · B: recuadro · A: todo</span></div>
    {state.active ? <div className="mesh-edit-confirm"><button onClick={() => controller.current?.finish()}>Confirmar <kbd>Enter</kbd></button><button onClick={() => controller.current?.cancel()}>Cancelar <kbd>Esc</kbd></button></div> : null}
    {error ? <div className="mesh-edit-error" role="alert">{error}<button onClick={props.onExit}>Volver a Piezas</button></div> : null}
    <footer className="mesh-edit-status"><output ref={output}>Selecciona y arrastra la superficie · G mover · R rotar · S escalar</output><span>Rueda: zoom · Derecho / central: orbitar · Shift + derecho: desplazar</span></footer>
  </section>;
}
