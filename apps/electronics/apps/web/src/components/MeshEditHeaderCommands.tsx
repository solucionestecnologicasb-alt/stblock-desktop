import type { ReactNode } from 'react';
import type { MeshEditViewport, MeshEditState } from '../lib/meshEditViewport';
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  BoxSelect,
  Camera,
  CircleDot,
  CircleMinus,
  CirclePlus,
  Eye,
  FlipHorizontal,
  FlipVertical,
  Focus,
  Layers,
  Link2,
  Move3D,
  MoveHorizontal,
  MoveVertical,
  ScanEye,
  Spline,
  Split,
  SquareDashed,
  Triangle,
  Waves,
} from 'lucide-react';

type Controller = { current: MeshEditViewport | null };
type Icon = typeof BoxSelect;

function Command({ label, icon: Icon, disabled, onClick }: { label: string; icon: Icon; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} title={label} aria-label={label}><Icon size={16} aria-hidden="true" /></button>;
}

function CommandGroup({ label, icon: Icon, children }: { label: string; icon: Icon; children: ReactNode }) {
  return <div className="mesh-edit-command-group" role="group" aria-label={label}>
    <span className="mesh-edit-command-label"><Icon size={14} aria-hidden="true" /><span>{label}</span></span>
    <div className="mesh-edit-command-buttons">{children}</div>
  </div>;
}

export function MeshEditHeaderCommands({ controller, state }: { controller: Controller; state: MeshEditState }) {
  const active = state.active;
  const faceReady = !active && state.mode === 'face' && state.count > 0;
  return <div className="mesh-edit-commands" role="toolbar" aria-label="Acciones de malla">
    <CommandGroup label="Seleccionar" icon={BoxSelect}>
      <Command label="Seleccionar todo · A" icon={BoxSelect} disabled={active} onClick={() => controller.current?.selectAll()} />
      <Command label="Deseleccionar todo · Alt+A" icon={SquareDashed} disabled={active} onClick={() => controller.current?.selectAll(true)} />
      <Command label="Invertir selección · Ctrl+I" icon={FlipHorizontal} disabled={active} onClick={() => controller.current?.selectRelated('invert')} />
      <Command label="Seleccionar conectados · Ctrl+L" icon={Link2} disabled={active} onClick={() => controller.current?.selectRelated('linked')} />
      <Command label="Ampliar selección · Ctrl++" icon={CirclePlus} disabled={active} onClick={() => controller.current?.selectRelated('grow')} />
      <Command label="Reducir selección · Ctrl+−" icon={CircleMinus} disabled={active} onClick={() => controller.current?.selectRelated('shrink')} />
    </CommandGroup>
    <CommandGroup label="Superficie" icon={Layers}>
      <Command label="Añadir puntos medios a aristas" icon={Split} disabled={active || state.mode !== 'edge' || !state.count} onClick={() => controller.current?.subdivide()} />
      <Command label="Crear línea entre dos vértices · J" icon={Spline} disabled={active || state.mode !== 'vertex' || state.count !== 2} onClick={() => controller.current?.fill()} />
      <Command label="Insertar puntos en triángulos" icon={CircleDot} disabled={!faceReady} onClick={() => controller.current?.surface('poke')} />
      <Command label="Triangular caras · Ctrl+T" icon={Triangle} disabled={!faceReady} onClick={() => controller.current?.surface('triangulate')} />
      <Command label="Invertir normales" icon={FlipVertical} disabled={!faceReady} onClick={() => controller.current?.surface('flip')} />
      <Command label="Suavizar vértices · 50%" icon={Waves} disabled={active || !state.count} onClick={() => controller.current?.surface('smooth')} />
      <Command label="Alinear al centro en X" icon={MoveHorizontal} disabled={active || !state.count} onClick={() => controller.current?.surface('flattenX')} />
      <Command label="Alinear al centro en Y" icon={MoveVertical} disabled={active || !state.count} onClick={() => controller.current?.surface('flattenY')} />
      <Command label="Alinear al centro en Z" icon={Move3D} disabled={active || !state.count} onClick={() => controller.current?.surface('flattenZ')} />
    </CommandGroup>
    <CommandGroup label="Vista" icon={Camera}>
      <Command label="Vista frontal · Num 1" icon={Eye} disabled={active} onClick={() => controller.current?.view('front')} />
      <Command label="Vista posterior · Ctrl+Num 1" icon={ScanEye} disabled={active} onClick={() => controller.current?.view('back')} />
      <Command label="Vista derecha · Num 3" icon={ArrowRightToLine} disabled={active} onClick={() => controller.current?.view('right')} />
      <Command label="Vista izquierda · Ctrl+Num 3" icon={ArrowLeftToLine} disabled={active} onClick={() => controller.current?.view('left')} />
      <Command label="Vista superior · Num 7" icon={ArrowUpToLine} disabled={active} onClick={() => controller.current?.view('top')} />
      <Command label="Vista inferior · Ctrl+Num 7" icon={ArrowDownToLine} disabled={active} onClick={() => controller.current?.view('bottom')} />
      <Command label="Encuadrar selección · ." icon={Focus} onClick={() => controller.current?.frameSelection()} />
    </CommandGroup>
  </div>;
}
