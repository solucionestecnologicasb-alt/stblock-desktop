import type { MeshEditViewport, MeshEditState } from '../lib/meshEditViewport';
export function MeshEditMenus({ controller, state }: { controller: { current: MeshEditViewport | null }; state: MeshEditState }) {
  return <div className="mesh-edit-menus">
    <details><summary>Seleccionar</summary><div>
      <button disabled={state.active} onClick={() => controller.current?.selectAll()}>Todo · A</button>
      <button disabled={state.active} onClick={() => controller.current?.selectAll(true)}>Nada · Alt+A</button>
      {([['invert', 'Invertir · Ctrl+I'], ['linked', 'Conectados · Ctrl+L'], ['grow', 'Ampliar · Ctrl++'], ['shrink', 'Reducir · Ctrl+−']] as const).map(([action, label]) => <button key={action} disabled={state.active} onClick={() => controller.current?.selectRelated(action)}>{label}</button>)}
    </div></details>
    <details><summary>Superficie</summary><div>
      <button disabled={state.active || state.mode !== 'edge' || !state.count} onClick={() => controller.current?.subdivide()}>Añadir puntos medios a aristas</button>
      <button disabled={state.active || state.mode !== 'vertex' || state.count !== 2} onClick={() => controller.current?.fill()}>Crear línea entre dos vértices · J</button>
      {([['poke', 'Insertar puntos en triángulos'], ['triangulate', 'Triangular caras · Ctrl+T'], ['flip', 'Invertir normales']] as const).map(([action, label]) => <button key={action} disabled={state.active || state.mode !== 'face' || !state.count} onClick={() => controller.current?.surface(action)}>{label}</button>)}
      <button disabled={state.active || !state.count} onClick={() => controller.current?.surface('smooth')}>Suavizar vértices · 50%</button>
      {(['X', 'Y', 'Z'] as const).map(axis => <button key={axis} disabled={state.active || !state.count} onClick={() => controller.current?.surface(`flatten${axis}`)}>Alinear al centro en {axis}</button>)}
    </div></details>
    <details><summary>Vista</summary><div>
      {([['front', 'Frontal · Num 1'], ['back', 'Posterior · Ctrl+Num 1'], ['right', 'Derecha · Num 3'], ['left', 'Izquierda · Ctrl+Num 3'], ['top', 'Superior · Num 7'], ['bottom', 'Inferior · Ctrl+Num 7']] as const).map(([axis, label]) => <button key={axis} disabled={state.active} onClick={() => controller.current?.view(axis)}>{label}</button>)}
      <button onClick={() => controller.current?.frameSelection()}>Encuadrar selección · .</button>
    </div></details>
  </div>;
}
