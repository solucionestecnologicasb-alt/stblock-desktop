// Cálculo puro de la ventana visible de una lista virtualizada. Separado del
// componente (WindowedList.tsx) para poder testearse sin cargar JSX.

export type WindowRange = { start: number; end: number };

export function computeWindowRange(
  total: number,
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  overscan: number,
): WindowRange {
  const safeItemHeight = Math.max(1, itemHeight);
  const safeViewportHeight = Math.max(0, viewportHeight);
  const start = Math.max(0, Math.floor(scrollTop / safeItemHeight) - Math.max(0, overscan));
  const end = Math.min(total, Math.ceil((scrollTop + safeViewportHeight) / safeItemHeight) + Math.max(0, overscan));
  return { start, end };
}
