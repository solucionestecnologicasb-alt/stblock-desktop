"use client";

import { ChevronsLeft, ChevronsRight, CloudDownload, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { libraryCategories, type LibraryAsset } from "@/lib/shapeLibrary";
import { filterLibraryAssets } from "@/lib/shapeLibraryFilter";
import { WindowedList } from "@/components/WindowedList";

type ShapeLibraryProps = {
  open: boolean;
  onToggle: () => void;
  onAddAsset: (asset: LibraryAsset) => Promise<void>;
  onImportStlFile: (file: File) => Promise<void>;
  onImportStlUrl: (url: string) => Promise<void>;
};

const ITEM_HEIGHT = 54;
const ITEM_OVERSCAN = 6;

function formatDimension(value: number | undefined): string {
  return value == null ? "" : `${Math.round(value * 100) / 100} mm`;
}

function itemDimensions(item: LibraryAsset): string {
  if (item.width == null || item.depth == null || item.height == null) {
    return "";
  }
  return `${formatDimension(item.width)}×${formatDimension(item.depth)}×${formatDimension(item.height)}`;
}

function itemMeta(item: LibraryAsset): string {
  const parts = [itemDimensions(item), item.metadata?.source, item.metadata?.license].filter(Boolean);
  return parts.join(" · ");
}

function itemTooltip(item: LibraryAsset): string {
  const lines = [item.name];
  const dims = itemDimensions(item);
  if (dims) {
    lines.push(`Dimensiones: ${dims}`);
  }
  if (item.metadata?.source) {
    lines.push(`Fuente: ${item.metadata.source}`);
  }
  if (item.metadata?.license) {
    lines.push(`Licencia: ${item.metadata.license}`);
  }
  if (item.metadata?.attribution) {
    lines.push(`Atribución: ${item.metadata.attribution}`);
  }
  if (item.metadata?.sourceUrl) {
    lines.push(item.metadata.sourceUrl);
  }
  return lines.join("\n");
}

export function ShapeLibrary({ open, onToggle, onAddAsset, onImportStlFile, onImportStlUrl }: ShapeLibraryProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(libraryCategories[0]?.id ?? null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isFiltering, results } = useMemo(() => {
    const normalizedQuery = query.trim();
    return {
      isFiltering: normalizedQuery !== "",
      results: filterLibraryAssets(libraryCategories, { query: normalizedQuery }),
    };
  }, [query]);

  if (!open) {
    return (
      <button
        className="shape-library-reopen"
        type="button"
        onClick={onToggle}
        title="Abrir librería de formas"
        aria-label="Abrir librería de formas"
      >
        <ChevronsLeft />
      </button>
    );
  }

  const handleAdd = async (asset: LibraryAsset) => {
    if (pendingId) {
      return;
    }
    setPendingId(asset.id);
    try {
      await onAddAsset(asset);
    } finally {
      setPendingId(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onImportStlFile(file);
    }
    event.target.value = "";
  };

  const handleUrlImport = async () => {
    const url = urlValue.trim();
    if (!url || importingUrl) {
      return;
    }
    setImportingUrl(true);
    try {
      await onImportStlUrl(url);
      setUrlValue("");
    } finally {
      setImportingUrl(false);
    }
  };

  const renderLibraryItem = (item: LibraryAsset) => {
    const meta = itemMeta(item);
    return (
      <button
        className="shape-library-item"
        key={item.id}
        type="button"
        draggable
        onClick={() => {
          void handleAdd(item);
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-sketchforge-shape", JSON.stringify(item));
        }}
        title={itemTooltip(item)}
      >
        {pendingId === item.id ? (
          <span className="shape-library-spinner" aria-label="Cargando" role="status" />
        ) : (
          <img src={item.preview ?? item.menuIcon} alt="" draggable={false} />
        )}
        <span className="shape-library-item-text">
          <span className="shape-library-item-name">{item.name}</span>
          {meta ? <span className="shape-library-item-meta">{meta}</span> : null}
        </span>
      </button>
    );
  };

  return (
    <aside className="shape-library">
      <div className="shape-library-header">
        <span className="shape-library-title">Librería</span>
        <button
          className="shape-library-collapse"
          type="button"
          onClick={onToggle}
          title="Plegar librería"
          aria-label="Plegar librería"
        >
          <ChevronsRight />
        </button>
      </div>
      <div className="shape-library-toolbar">
        <input
          className="shape-library-search"
          type="text"
          placeholder="Buscar formas…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar formas"
        />
      </div>
      <div className="shape-library-body">
        {isFiltering ? (
          <WindowedList
            items={results}
            itemHeight={ITEM_HEIGHT}
            overscan={ITEM_OVERSCAN}
            emptyMessage="Sin resultados"
            className="shape-library-results"
            renderItem={renderLibraryItem}
          />
        ) : (
          libraryCategories.map((category) => (
            <section key={category.id} className="shape-library-category">
              <button
                className="shape-library-category-header"
                type="button"
                aria-expanded={openCategory === category.id}
                onClick={() => setOpenCategory((current) => (current === category.id ? null : category.id))}
              >
                <span>{category.label}</span>
                <span className={openCategory === category.id ? "shape-library-caret open" : "shape-library-caret"} aria-hidden="true">
                  ▾
                </span>
              </button>
              {openCategory === category.id ? (
                <div className="shape-library-items">
                  {category.items.map((item) => renderLibraryItem(item))}
                </div>
              ) : null}
            </section>
          ))
        )}
      </div>
      <div className="shape-library-import">
        <div className="shape-library-import-title">Añadir modelo externo</div>
        <button className="shape-library-file-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload />
          <span>Subir archivo .stl</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,application/sla"
          hidden
          onChange={handleFileChange}
        />
        <div className="shape-library-url-row">
          <input
            type="text"
            placeholder="URL directa de .stl"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleUrlImport();
              }
            }}
          />
          <button type="button" onClick={() => void handleUrlImport()} disabled={importingUrl}>
            {importingUrl ? <span className="shape-library-spinner" /> : <CloudDownload />}
          </button>
        </div>
        <div className="shape-library-cors-note">Nota: la URL debe permitir CORS para descargarse desde el navegador.</div>
      </div>
    </aside>
  );
}
