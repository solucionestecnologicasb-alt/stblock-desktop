"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { computeWindowRange } from "@/lib/windowedListMath";

// Lista virtualizada genérica sin dependencias externas. Solo renderiza la
// ventana visible de `items` (más `overscan` por cada lado) sobre un spacer de
// altura `total * itemHeight`, lo que mantiene el scroll del contenedor nativo.

export { computeWindowRange, type WindowRange } from "@/lib/windowedListMath";

type WindowedListProps<T> = {
  items: T[];
  itemHeight: number;
  overscan?: number;
  emptyMessage?: string;
  className?: string;
  renderItem: (item: T) => ReactNode;
};

export function WindowedList<T>({
  items,
  itemHeight,
  overscan = 6,
  emptyMessage,
  className,
  renderItem,
}: WindowedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const update = () => setViewportHeight(element.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Al cambiar los items (búsqueda/etiqueta) se reinicia el scroll a arriba.
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [items]);

  const total = items.length;
  const range = computeWindowRange(total, scrollTop, viewportHeight, itemHeight, overscan);
  // Hasta que ResizeObserver conozca la altura, renderizamos todo para no dejar
  // la lista en blanco en el primer frame.
  const useFallback = viewportHeight <= 0;

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      {total === 0 && emptyMessage ? (
        <div className="shape-library-empty">{emptyMessage}</div>
      ) : useFallback ? (
        <div>
          {items.map((item, index) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="shape-library-window-spacer" style={{ height: total * itemHeight }}>
          <div
            className="shape-library-window-content"
            style={{ transform: `translateY(${range.start * itemHeight}px)` }}
          >
            {items.slice(range.start, range.end).map((item, index) => (
              <div key={range.start + index} style={{ height: itemHeight }}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
