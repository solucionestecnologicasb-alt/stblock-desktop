import type { LibraryAsset, LibraryCategory } from "@/lib/shapeLibrary";

// Helpers puros de filtrado de la librería de formas. No dependen de React ni
// del DOM, por lo que son directamente testeables en Node.

export function assetMatchesQuery(asset: LibraryAsset, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) {
    return true;
  }
  if (asset.name.toLocaleLowerCase().includes(q) || asset.id.toLocaleLowerCase().includes(q)) {
    return true;
  }
  const metadata = [asset.metadata?.manufacturer, asset.metadata?.partNumber, asset.metadata?.source, asset.metadata?.license];
  return [...(asset.tags ?? []), ...metadata].some((value) => value?.toLocaleLowerCase().includes(q));
}

export function filterLibraryAssets(categories: LibraryCategory[], filters: { query?: string }): LibraryAsset[] {
  const query = filters.query ?? "";
  return categories.flatMap((category) => category.items).filter((item) => assetMatchesQuery(item, query));
}
