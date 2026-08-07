import { describe, expect, it } from "vitest";
import type { LibraryAsset } from "@/lib/shapeLibrary";
import { assetMatchesQuery, filterLibraryAssets } from "@/lib/shapeLibraryFilter";
import { libraryCategories } from "@/lib/shapeLibrary";

function asset(overrides: Partial<LibraryAsset> = {}): LibraryAsset {
  return { id: "test", name: "Prueba", src: "assets/test.svg", menuIcon: "assets/test.svg", kind: "box", color: "#000", ...overrides };
}

describe("shapeLibraryFilter", () => {
  it("matches name, id, tags, manufacturer and part number", () => {
    const example = asset({ name: "Sensor BNO055", id: "bno", tags: ["orientación"], metadata: { manufacturer: "Adafruit", partNumber: "2472" } });
    expect(assetMatchesQuery(example, "bno")).toBe(true);
    expect(assetMatchesQuery(example, "orientacion")).toBe(false);
    expect(assetMatchesQuery(example, "Adafruit")).toBe(true);
    expect(assetMatchesQuery(example, "2472")).toBe(true);
    expect(assetMatchesQuery(example, "motor")).toBe(false);
  });

  it("treats an empty query as matching everything", () => expect(assetMatchesQuery(asset(), "   ")).toBe(true));

  it("filters the complete catalog across categories", () => {
    const servos = filterLibraryAssets(libraryCategories, { query: "servo" });
    expect(servos.length).toBeGreaterThanOrEqual(4);
    expect(servos.every((item) => assetMatchesQuery(item, "servo"))).toBe(true);
    expect(filterLibraryAssets(libraryCategories, { query: "2472" }).map((item) => item.id)).toContain("adafruit-2472-bno055");
  });

  it("returns nothing for an unknown query", () => expect(filterLibraryAssets(libraryCategories, { query: "zzz-no-existe" })).toEqual([]));
});
