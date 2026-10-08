import { makeShapeFromAsset, toolbarShapeAssets, type ToolbarShapeAsset } from "@/lib/shapeCatalog";
import { importedShapeFromStl } from "@/lib/stlImport";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { getLibraryModelBuffer } from "@/lib/libraryModelCache";
import { libraryComponentAssets, type GeneratedComponentAsset } from "@/lib/libraryComponentCatalog.generated";
import type { ShapeAsset, WorkplaneShape } from "@/types/sketchforge";

const COMPONENT_FALLBACK_ICON = "assets/sketchforge/library-icons/component-real.svg";

export type LibraryAsset = ToolbarShapeAsset & {
  width?: number; depth?: number; height?: number; preview?: string; tags?: string[];
  modelFormat?: "stl" | "step"; modelUrl?: string; modelPath?: string;
  metadata?: {
    source?: string; sourceUrl?: string; license?: string; attribution?: string; manufacturer?: string; partNumber?: string;
    cadUrl?: string; triangleCount?: number; fileBytes?: number; sha256?: string;
  };
};

export type LibraryCategory = { id: string; label: string; items: LibraryAsset[] };

const CATEGORY_LABELS: Record<string, string> = {
  placas: "Placas y microcontroladores",
  sensores: "Sensores",
  componentes: "Componentes electrónicos",
  actuadores: "Motores y actuadores",
  controladores: "Controladores y potencia",
  energia: "Baterías y energía",
  pantallas: "Pantallas e iluminación",
  audio: "Audio",
  controles: "Botones y controles",
  conexion: "Conexión y prototipado",
  mecanica: "Rodamientos y mecánica",
  transmision: "Engranajes y transmisión",
};

function componentToLibraryAsset(component: GeneratedComponentAsset): LibraryAsset {
  const preview = component.previewUrl ?? COMPONENT_FALLBACK_ICON;
  return {
    id: component.id, name: component.name, src: preview, menuIcon: preview, preview, kind: "mesh", color: component.color,
    width: component.width, depth: component.depth, height: component.height,
    tags: [component.manufacturer, component.partNumber, component.modelFormat, ...component.tags],
    modelFormat: component.modelFormat, modelUrl: component.modelUrl, modelPath: component.modelPath,
    metadata: { source: component.source, sourceUrl: component.sourceUrl, license: component.license, attribution: component.attribution,
      manufacturer: component.manufacturer, partNumber: component.partNumber, cadUrl: component.cadUrl,
      triangleCount: component.triangleCount, fileBytes: component.fileBytes, sha256: component.sha256 },
  };
}

const componentsByCategory = new Map<string, LibraryAsset[]>();
for (const component of libraryComponentAssets) {
  const items = componentsByCategory.get(component.category) ?? [];
  items.push(componentToLibraryAsset(component)); componentsByCategory.set(component.category, items);
}

export const libraryCategories: LibraryCategory[] = [
  { id: "basicas", label: "Formas básicas", items: toolbarShapeAssets.map((asset) => ({ ...asset })) },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label, items: componentsByCategory.get(id) ?? [] })).filter((category) => category.items.length > 0),
];
export const BASE_LIBRARY_CATEGORIES = libraryCategories;

const MAX_PARSED_LIBRARY_TEMPLATES = 24;
const parsedLibraryTemplates = new Map<string, Promise<WorkplaneShape>>();

function parsedLibraryTemplate(asset: LibraryAsset) {
  const cacheKey = `${asset.id}:${asset.metadata?.sha256 ?? asset.modelUrl ?? asset.modelPath ?? ""}`;
  const cached = parsedLibraryTemplates.get(cacheKey);
  if (cached) {
    parsedLibraryTemplates.delete(cacheKey);
    parsedLibraryTemplates.set(cacheKey, cached);
    return cached;
  }
  const pending = getLibraryModelBuffer(asset)
    .then(async (buffer) => asset.modelFormat === "step"
      ? import("@/lib/stepImport").then(({ importedShapeFromStep }) => importedShapeFromStep(`${asset.id}.step`, buffer))
      : importedShapeFromStl(`${asset.id}.stl`, buffer))
    .catch((error) => {
      parsedLibraryTemplates.delete(cacheKey);
      throw error;
    });
  parsedLibraryTemplates.set(cacheKey, pending);
  while (parsedLibraryTemplates.size > MAX_PARSED_LIBRARY_TEMPLATES) {
    const oldest = parsedLibraryTemplates.keys().next().value;
    if (oldest === undefined) break;
    parsedLibraryTemplates.delete(oldest);
  }
  return pending;
}

export function findLibraryAsset(id: string): LibraryAsset | null {
  for (const category of libraryCategories) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

export async function buildLibraryShape(asset: ShapeAsset, point?: { x: number; z: number; elevation?: number }): Promise<WorkplaneShape> {
  const libraryAsset = asset as LibraryAsset;
  if (!libraryAsset.modelUrl && !libraryAsset.modelPath) return makeShapeFromAsset(asset, point);

  const imported = await parsedLibraryTemplate(libraryAsset);
  return canonicalizeShape({
    ...imported, id: createLocalId(asset.id), name: asset.name, color: asset.color,
    x: point?.x ?? 0, z: point?.z ?? 0, elevation: point?.elevation ?? 0,
    rotation: 0, rotationX: 0, rotationZ: 0, locked: false, hidden: false,
  });
}
