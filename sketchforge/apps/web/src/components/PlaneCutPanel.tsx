"use client";
import { Scissors, X } from "lucide-react";
import {useEffect, useState} from "react";
import {cutPlaneNormal, type PlaneCutSettings, type CutVector} from "@/lib/planeCut";

function CutNumberInput({value, onChange, min, max, step}: {value:number; onChange:(value:number)=>void; min?:number; max?:number; step:number}) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(4))));
  useEffect(() => {setDraft(String(Number(value.toFixed(4))));}, [value]);
  return <input type="number" value={draft} min={min} max={max} step={step}
    onChange={event => {setDraft(event.target.value); if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber);}}
    onBlur={() => setDraft(String(Number(value.toFixed(4))))} />;
}

type Props = {
  settings: PlaneCutSettings;
  targetCount: number;
  bounds: {min: CutVector; max: CutVector};
  busy: boolean;
  error: string | null;
  previewCount: number;
  onChange: (settings: PlaneCutSettings) => void;
  onPreview: () => void;
  onApply: () => void;
  onClose: () => void;
};

export function PlaneCutPanel({settings: s, targetCount, bounds, busy, error, previewCount, onChange, onPreview, onApply, onClose}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const patch = (value: Partial<PlaneCutSettings>) => onChange({...s, ...value});
  const center = bounds.min.map((v, i) => (v + bounds.max[i]) / 2) as CutVector;
  const normal = cutPlaneNormal(s.rotation);
  const minimum = normal.reduce((sum,n,i) => sum+n*(n >= 0 ? bounds.min[i] : bounds.max[i]),0);
  const maximum = normal.reduce((sum,n,i) => sum+n*(n >= 0 ? bounds.max[i] : bounds.min[i]),0);
  const offset = normal.reduce((sum,n,i) => sum+n*s.position[i],0);
  const fromEdge = offset-minimum;
  const moveAlongNormal = (distance:number) => patch({position:s.position.map((p,i)=>p+normal[i]*(minimum+distance-offset)) as CutVector});
  const vector = (key: "position" | "rotation", axis: number, value: number) => {
    const next = [...s[key]] as CutVector; next[axis] = value; patch({[key]: next});
  };
  const number = (label: string, value: number, change: (value: number) => void, min?: number, max?: number, step = 0.1) => (
    <label className="plane-cut-field"><span>{label}</span><CutNumberInput value={value} min={min} max={max} step={step} onChange={change}/></label>
  );
  const preset = (rotation: CutVector) => patch({rotation, position: center});
  return <aside className="plane-cut-panel" data-collapsed={collapsed} role="dialog" aria-label="Cortar piezas con un plano" onKeyDown={event => event.stopPropagation()}>
    <header><div><Scissors size={19}/><strong>Cortar piezas</strong></div><div><button type="button" aria-label={collapsed ? "Expandir opciones de corte" : "Minimizar opciones de corte"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? "+" : "−"}</button><button type="button" aria-label="Cancelar corte" disabled={busy} onClick={onClose}><X size={18}/></button></div></header>
    <p>{targetCount} pieza{targetCount === 1 ? "" : "s"} seleccionada{targetCount === 1 ? "" : "s"}. Arrastra las flechas o los anillos del plano.</p>
    <fieldset disabled={busy}>
      <div className="plane-cut-presets">
        <button type="button" onClick={() => preset([-90, 0, 0])}>Horizontal · Y</button>
        <button type="button" onClick={() => preset([0, 90, 0])}>Vertical · X</button>
        <button type="button" onClick={() => preset([0, 0, 0])}>Vertical · Z</button>
      </div>
      <div className="plane-cut-presets">
        <button type="button" className={s.gizmo === "translate" ? "active" : ""} onClick={() => patch({gizmo:"translate"})}>Mover plano</button>
        <button type="button" className={s.gizmo === "rotate" ? "active" : ""} onClick={() => patch({gizmo:"rotate"})}>Girar plano</button>
        <button type="button" onClick={() => patch({position:center})}>Centrar</button>
      </div>
      <h4>Posición exacta · mm</h4>
      <div className="plane-cut-triple">{["X", "Y · altura", "Z"].map((label, i) => <div key={label}>{number(label, s.position[i], v => vector("position", i, v))}</div>)}</div>
      {number("Distancia desde borde − de la selección · mm", fromEdge, moveAlongNormal)}
      <label className="plane-cut-field"><span>Recorrer selección</span><input type="range" min={0} max={Math.max(0.001,maximum-minimum)} step={0.01}
        value={Math.max(0,Math.min(maximum-minimum,fromEdge))} onChange={e=>moveAlongNormal(Number(e.target.value))}/></label>
      <h4>Inclinación · grados</h4>
      <div className="plane-cut-triple">{["X", "Y", "Z"].map((label, i) => <div key={label}>{number(label, s.rotation[i], v => vector("rotation", i, v), undefined, undefined, 1)}</div>)}</div>
      <label className="plane-cut-field"><span>Conservar</span><select value={s.keep} onChange={e => patch({keep:e.target.value as PlaneCutSettings["keep"], count:1})}>
        <option value="both">Ambos lados</option><option value="positive">Lado de la flecha (+)</option><option value="negative">Lado opuesto (−)</option>
      </select></label>
      <div className="plane-cut-double">
        {number("Grosor eliminado · mm", s.kerf, kerf => patch({kerf}), 0)}
        {number("Separar resultados · mm", s.separation, separation => patch({separation}), 0)}
        {number("Cantidad de cortes", s.count, count => patch({count:Math.round(count)}), 1, s.keep === "both" ? 32 : 1, 1)}
        {number("Distancia entre cortes · mm", s.spacing, spacing => patch({spacing}), 0.01)}
      </div>
      <p className="plane-cut-hint">Los cortes paralelos se distribuyen alrededor del plano central. Y indica la altura respecto a la base del proyecto.</p>
      <label className="plane-cut-check"><input type="checkbox" checked={s.snap > 0} onChange={e => patch({snap:e.target.checked ? 1 : 0})}/>Ajustar movimiento a 1 mm y giro a 5°</label>
      <label className="plane-cut-check"><input type="checkbox" checked={s.splitDisconnected} onChange={e => patch({splitDisconnected:e.target.checked})}/>Separar fragmentos desconectados</label>
      <label className="plane-cut-check"><input type="checkbox" checked={s.union} onChange={e => patch({union:e.target.checked})}/>Unir las piezas seleccionadas antes de cortar</label>
      <label className="plane-cut-check"><input type="checkbox" checked={s.keepOriginals} onChange={e => patch({keepOriginals:e.target.checked})}/>Guardar originales ocultos como respaldo</label>
    </fieldset>
    {error ? <p className="plane-cut-error" role="alert">{error}</p> : null}
    {previewCount ? <p className="plane-cut-success" role="status">Vista previa: {previewCount} piezas. El proyecto se conserva hasta aplicar.</p> : null}
    <p className="plane-cut-hint">El corte cierra las superficies y convierte el resultado en mallas. Puedes deshacerlo con Ctrl+Z.</p>
    <footer><button type="button" disabled={busy} onClick={onPreview}>{busy ? "Calculando…" : "Vista previa"}</button><button type="button" className="primary" disabled={busy || !previewCount} onClick={onApply}>Aplicar corte</button></footer>
  </aside>;
}
