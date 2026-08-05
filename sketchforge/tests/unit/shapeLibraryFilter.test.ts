import { describe, expect, it } from "vitest";
import type { LibraryAsset } from "@/lib/shapeLibrary";
import { assetMatchesQuery, filterLibraryAssets } from "@/lib/shapeLibraryFilter";
import { libraryCategories } from "@/lib/shapeLibrary";

function asset(overrides: Partial<LibraryAsset> = {}): LibraryAsset {
  return {
    id: "test",
    name: "Prueba",
    src: "assets/test.svg",
    menuIcon: "assets/test.svg",
    kind: "box",
    color: "#000000",
    ...overrides,
  };
}

describe("shapeLibraryFilter", () => {
  it("matches queries by name, id and tags", () => {
    const example = asset({ name: "Cráneo de ciervo", id: "deer-skull", tags: ["animal", "naturaleza"] });
    expect(assetMatchesQuery(example, "cráneo")).toBe(true);
    expect(assetMatchesQuery(example, "deer")).toBe(true);
    expect(assetMatchesQuery(example, "animal")).toBe(true);
    expect(assetMatchesQuery(example, "naturaleza")).toBe(true);
    expect(assetMatchesQuery(example, "tecla")).toBe(false);
  });

  it("treats empty queries as matching everything", () => {
    expect(assetMatchesQuery(asset({ name: "Caja" }), "   ")).toBe(true);
  });

  it("filters across categories by query", () => {
    const results = filterLibraryAssets(libraryCategories, { query: "cráneo" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => assetMatchesQuery(item, "cráneo"))).toBe(true);
  });

  it("returns nothing for a query without matches", () => {
    expect(filterLibraryAssets(libraryCategories, { query: "zzz-no-existe" })).toEqual([]);
  });
});
