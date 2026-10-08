import { useState } from 'react';
import type { MeshEditState, MeshEditViewport } from '../lib/meshEditViewport';
import { defaultAssist, type AssistSettings } from '../lib/meshTransformAssist';

export function MeshAdvancedTools({ controller, state }: { controller: { current: MeshEditViewport | null }; state: MeshEditState }) {
  const [tolerance,setTolerance]=useState(.01),[segments,setSegments]=useState(1);
  const assist=state.assist??defaultAssist;
  const set=(value:Partial<AssistSettings>)=>controller.current?.setAssist(value);
  return <div className="mesh-edit-menus mesh-advanced-tools">
    <details open><summary>Cortar y dar forma</summary><div>
      <button disabled={state.active} onClick={()=>controller.current?.startOperation('knife')}>Cuchillo <kbd>K</kbd></button>
      <button disabled={state.active||state.mode!=='edge'||state.count!==1} onClick={()=>controller.current?.startOperation('loop')}>Corte en bucle <kbd>Ctrl+R</kbd></button>
      <button disabled={state.active||state.mode!=='face'||!state.count} onClick={()=>controller.current?.startOperation('inset')}>Borde interior (Inset) <kbd>I</kbd></button>
      <button disabled={state.active||state.mode!=='edge'||!state.count} onClick={()=>controller.current?.startOperation('bevel',segments)}>Bisel <kbd>Ctrl+B</kbd></button>
      <label>Segmentos del bisel <input aria-label="Segmentos del bisel" type="number" min={1} max={8} step={1} value={segments} disabled={state.active} onChange={e=>setSegments(Math.max(1,Math.min(8,Number(e.target.value)||1)))}/></label>
      <small>Cuchillo: dos puntos sobre una cara plana convexa. Bucle: una arista de cuadriláteros. Bisel: sólidos convexos cerrados.</small>
      {state.operation && state.operation!=='knife' ? <label>{state.operation==='loop'?'Posición (%)':'Distancia (mm)'}<input aria-label="Valor de operación" type="number" step={state.operation==='loop'?1:.1} value={state.value??1} onChange={e=>controller.current?.setOperationValue(Number(e.target.value))}/></label>:null}
    </div></details>
    <details><summary>Unir y limpiar</summary><div>
      <button disabled={state.active||state.mode!=='vertex'||state.count<2} onClick={()=>controller.current?.merge(null)}>Soldar al centro <kbd>M</kbd></button>
      <label>Tolerancia (mm)<input aria-label="Tolerancia de soldadura" type="number" min={.0001} step={.01} value={tolerance} disabled={state.active} onChange={e=>setTolerance(Math.max(.0001,Number(e.target.value)||.01))}/></label>
      <button disabled={state.active||state.mode!=='vertex'||state.count<2} onClick={()=>controller.current?.merge(tolerance)}>Soldar por distancia</button>
      <button disabled={state.active||state.mode!=='edge'||!state.count} onClick={()=>controller.current?.dissolve()}>Disolver aristas coplanares</button>
    </div></details>
    <details><summary>Precisión y deformación</summary><div>
      <label>Ajuste magnético<select aria-label="Ajuste magnético" disabled={state.active} value={assist.snap} onChange={e=>set({snap:e.target.value as AssistSettings['snap']})}><option value="off">Desactivado</option><option value="grid">Cuadrícula</option><option value="vertex">Vértices</option><option value="edge">Aristas</option></select></label>
      <label>Paso (mm)<input aria-label="Paso de cuadrícula" type="number" min={.001} step={.1} value={assist.step} disabled={state.active} onChange={e=>set({step:Number(e.target.value)})}/></label>
      <label>Simetría<select aria-label="Eje de simetría" disabled={state.active} value={assist.symmetry} onChange={e=>set({symmetry:e.target.value as AssistSettings['symmetry']})}><option value="off">Desactivada</option><option value="x">Eje X</option><option value="y">Eje Y</option><option value="z">Eje Z</option></select></label>
      <small>Plano por el centro inicial de la pieza. Edita pares existentes; si seleccionas ambos lados, manda el lado positivo.</small>
      <button disabled={state.active} aria-pressed={assist.proportional} onClick={()=>set({proportional:!assist.proportional})}>Edición proporcional <kbd>O</kbd></button>
      <label>Radio (mm)<input aria-label="Radio proporcional" type="number" min={.001} step={1} value={assist.radius} disabled={state.active} onChange={e=>set({radius:Number(e.target.value)})}/></label>
      <small>Influencia suave por distancia. El círculo muestra el radio durante G/R/S. El imán ajusta el centro de la selección al mover; los valores escritos tienen prioridad.</small>
    </div></details>
  </div>;
}
