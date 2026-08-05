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
  return (asset.tags ?? []).some((tag) => tag.toLocaleLowerCase().includes(q));
}

export function filterLibraryAssets(categories: LibraryCategory[], filters: { query?: string }): LibraryAsset[] {
  const query = filters.query ?? "";
  return categories.flatMap((category) => category.items).filter((item) => assetMatchesQuery(item, query));
}
