"use client";

import { ChevronsLeft, ChevronsRight, CloudDownload, Database, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { libraryCategories, type LibraryAsset } from "@/lib/shapeLibrary";
import { filterLibraryAssets } from "@/lib/shapeLibraryFilter";
import { clearLibraryModelCache, isLibraryModelCached, LIBRARY_CACHE_CHANGED_EVENT } from "@/lib/libraryModelCache";
import { WindowedList } from "@/components/WindowedList";

type ShapeLibraryProps = {
  open: boolean;
  onToggle: () => void;
  onAddAsset: (asset: LibraryAsset) => Promise<void>;
  onImportStlFile: (file: File) => Promise<void>;
  onImportStlUrl: (url: string) => Promise<void>;
};

const ITEM_HEIGHT = 58;
const ITEM_OVERSCAN = 6;
const FALLBACK_ICON = "assets/sketchforge/library-icons/component-real.svg";
const allAssets = libraryCategories.flatMap((category) => category.items);
const downloadableAssets = allAssets.filter((asset) => asset.modelUrl || asset.modelPath);

function formatDimension(value: number | undefined): string {
  return value == null ? "" : `${Math.round(value * 100) / 100} mm`;
}

function itemDimensions(item: LibraryAsset): string {
  if (item.width == null || item.depth == null || item.height == null) return "";
  return `${formatDimension(item.width)}×${formatDimension(item.depth)}×${formatDimension(item.height)}`;
}

function formatBytes(value: number | undefined): string {
  if (!value) return "";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`;
}

function itemMeta(item: LibraryAsset): string {
  const maker = [item.metadata?.manufacturer, item.metadata?.partNumber].filter(Boolean).join(" ");
  return [maker, itemDimensions(item), formatBytes(item.metadata?.fileBytes)].filter(Boolean).join(" · ");
}

function itemTooltip(item: LibraryAsset, cached: boolean): string {
  const lines = [item.name];
  if (item.metadata?.manufacturer) lines.push(`Fabricante: ${item.metadata.manufacturer}`);
  if (item.metadata?.partNumber) lines.push(`Producto: ${item.metadata.partNumber}`);
  const dims = itemDimensions(item);
  if (dims) lines.push(`Dimensiones: ${dims}`);
  if (item.modelUrl || item.modelPath) {
    const format = (item.modelFormat ?? "stl").toUpperCase();
    lines.push(cached ? `Modelo ${format} disponible sin conexión` : `El ${format} se descargará al utilizarlo`);
  }
  if (item.metadata?.cadUrl) lines.push("Archivo STEP original disponible en la fuente");
  if (item.metadata?.license) lines.push(`Licencia: ${item.metadata.license}`);
  if (item.metadata?.attribution) lines.push(`Atribución: ${item.metadata.attribution}`);
  if (item.metadata?.sourceUrl) lines.push(item.metadata.sourceUrl);
  return lines.join("\n");
}

export function ShapeLibrary({ open, onToggle, onAddAsset, onImportStlFile, onImportStlUrl }: ShapeLibraryProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(libraryCategories[0]?.id ?? null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshCacheState = useCallback(async () => {
    const entries = await Promise.all(downloadableAssets.map(async (asset) => [asset.id, await isLibraryModelCached(asset)] as const));
    setCachedIds(new Set(entries.filter(([, cached]) => cached).map(([id]) => id)));
  }, []);

  useEffect(() => {
    void refreshCacheState();
    window.addEventListener(LIBRARY_CACHE_CHANGED_EVENT, refreshCacheState);
    return () => window.removeEventListener(LIBRARY_CACHE_CHANGED_EVENT, refreshCacheState);
  }, [refreshCacheState]);

  const { isFiltering, results } = useMemo(() => {
    const normalizedQuery = query.trim();
    return { isFiltering: normalizedQuery !== "", results: filterLibraryAssets(libraryCategories, { query: normalizedQuery }) };
  }, [query]);

  if (!open) {
    return <button className="shape-library-reopen" type="button" onClick={onToggle} title="Abrir librería de formas" aria-label="Abrir librería de formas"><ChevronsLeft /></button>;
  }

  const handleAdd = async (asset: LibraryAsset) => {
    if (pendingId) return;
    setPendingId(asset.id);
    setErrorMessage("");
    try {
      await onAddAsset(asset);
      if (asset.modelUrl || asset.modelPath) setCachedIds((current) => new Set(current).add(asset.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`No se pudo cargar ${asset.name}: ${message}`);
    } finally {
      setPendingId(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void onImportStlFile(file);
    event.target.value = "";
  };

  const handleUrlImport = async () => {
    const url = urlValue.trim();
    if (!url || importingUrl) return;
    setImportingUrl(true);
    try { await onImportStlUrl(url); setUrlValue(""); } finally { setImportingUrl(false); }
  };

  const renderLibraryItem = (item: LibraryAsset) => {
    const cached = cachedIds.has(item.id);
    const downloadable = Boolean(item.modelUrl || item.modelPath);
    const meta = itemMeta(item);
    return (
      <button className="shape-library-item" key={item.id} type="button" draggable onClick={() => void handleAdd(item)}
        onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-sketchforge-shape", JSON.stringify(item)); }}
        title={itemTooltip(item, cached)}>
        <span className="shape-library-preview-wrap">
          {pendingId === item.id ? <span className="shape-library-spinner" aria-label="Descargando" role="status" /> :
            <img src={item.preview ?? item.menuIcon} alt="" draggable={false} loading="lazy" decoding="async" fetchPriority="low" onError={(event) => { event.currentTarget.src = FALLBACK_ICON; }} />}
          {downloadable ? <span className={`shape-library-cache-badge ${cached ? "cached" : "remote"}`} title={cached ? "Disponible sin conexión" : "Descarga bajo demanda"}>{cached ? <Database /> : <CloudDownload />}</span> : null}
        </span>
        <span className="shape-library-item-text"><span className="shape-library-item-name">{item.name}</span>{meta ? <span className="shape-library-item-meta">{meta}</span> : null}</span>
      </button>
    );
  };

  return (
    <aside className="shape-library">
      <div className="shape-library-header"><span className="shape-library-title">Librería <small>{allAssets.length} objetos</small></span><button className="shape-library-collapse" type="button" onClick={onToggle} title="Plegar librería" aria-label="Plegar librería"><ChevronsRight /></button></div>
      <div className="shape-library-toolbar"><input className="shape-library-search" type="text" placeholder="Buscar componente, fabricante o referencia…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar formas" /></div>
      {errorMessage ? <div className="shape-library-error" role="alert">{errorMessage}</div> : null}
      <div className="shape-library-body">
        {isFiltering ? <WindowedList items={results} itemHeight={ITEM_HEIGHT} overscan={ITEM_OVERSCAN} emptyMessage="Sin resultados" className="shape-library-results" renderItem={renderLibraryItem} /> :
          libraryCategories.map((category) => <section key={category.id} className="shape-library-category"><button className="shape-library-category-header" type="button" aria-expanded={openCategory === category.id} onClick={() => setOpenCategory((current) => current === category.id ? null : category.id)}><span>{category.label} <small>{category.items.length}</small></span><span className={openCategory === category.id ? "shape-library-caret open" : "shape-library-caret"} aria-hidden="true">▾</span></button>{openCategory === category.id ? <div className="shape-library-items">{category.items.map(renderLibraryItem)}</div> : null}</section>)}
      </div>
      <div className="shape-library-cache-summary"><span>{cachedIds.size} de {downloadableAssets.length} modelos disponibles sin conexión</span><button type="button" disabled={cachedIds.size === 0} onClick={() => void clearLibraryModelCache()} title="Vaciar caché de modelos"><Trash2 /> Vaciar</button></div>
      <div className="shape-library-import"><div className="shape-library-import-title">Añadir modelo externo</div><button className="shape-library-file-button" type="button" onClick={() => fileInputRef.current?.click()}><Upload /><span>Subir archivo .stl</span></button><input ref={fileInputRef} type="file" accept=".stl,application/sla" hidden onChange={handleFileChange} /><div className="shape-library-url-row"><input type="text" placeholder="URL directa de .stl" value={urlValue} onChange={(event) => setUrlValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleUrlImport(); }} /><button type="button" onClick={() => void handleUrlImport()} disabled={importingUrl}>{importingUrl ? <span className="shape-library-spinner" /> : <CloudDownload />}</button></div><div className="shape-library-cors-note">La URL debe permitir CORS. Los modelos del catálogo se validan y almacenan automáticamente.</div></div>
    </aside>
  );
}
