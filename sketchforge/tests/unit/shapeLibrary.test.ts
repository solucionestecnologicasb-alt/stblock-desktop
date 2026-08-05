import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShapeAsset } from "@/types/sketchforge";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { buildLibraryShape, findLibraryAsset, libraryCategories } from "@/lib/shapeLibrary";

const boxAsset: ShapeAsset = {
  id: "box",
  name: "Caja",
  src: "assets/sketchforge/shape-icons-gray/box.png",
  kind: "box",
  color: "#d41721",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shape library", () => {
  it("builds composite assemblies from library assets", async () => {
    const chasis = findLibraryAsset("chasis");
    expect(chasis).not.toBeNull();
    const placed = await buildLibraryShape(chasis!, { x: 12, z: -8, elevation: 4 });

    expect(placed.id).toBeTruthy();
    expect(placed).toMatchObject({
      name: "Chasis de auto",
      kind: "assembly",
      color: "#b03030",
      x: 12,
      z: -8,
      elevation: 4,
      width: 44,
      depth: 20,
      height: 12,
      groupedBaseWidth: 44,
      groupedBaseDepth: 20,
      groupedBaseHeight: 12,
      groupOperation: "group",
    });
    expect(placed.groupedShapes?.length).toBeGreaterThan(0);

    // canonicalizeShape no rompe el ensamblaje.
    const canonical = canonicalizeShape(placed);
    expect(canonical.kind).toBe("assembly");
    expect(canonical.groupedShapes?.length).toBe(placed.groupedShapes?.length);
    expect(canonical.groupedShapes?.every((child) => Boolean(child.id))).toBe(true);
  });

  it("falls back to the parametric assembly when the STL fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const motor = findLibraryAsset("motor-dc")!;
    const placed = await buildLibraryShape(motor, { x: 3, z: 3, elevation: 2 });

    expect(placed.kind).toBe("assembly");
    expect(placed.name).toBe("Motor DC");
    expect(placed.groupedShapes?.length).toBe(5);
    expect(placed.x).toBe(3);
  });

  it("loads the precached STL when the fetch succeeds", async () => {
    const buffer = minimalStlBuffer();
    const fetchMock = vi.fn(async () => ({ ok: true, arrayBuffer: async () => buffer }));
    vi.stubGlobal("fetch", fetchMock);

    const led = findLibraryAsset("led")!;
    const placed = await buildLibraryShape(led, { x: 10, z: 0, elevation: 0 });

    expect(fetchMock).toHaveBeenCalledWith("assets/sketchforge/library/stl/led.stl");
    expect(placed.kind).toBe("mesh");
    expect(placed.name).toBe("LED");
    expect(placed.color).toBe("#ff5a5a");
    expect(placed.x).toBe(10);
    expect(placed.z).toBe(0);
    expect(placed.importedMesh).toBeDefined();
  });

  it("builds simple assets exactly like makeShapeFromAsset", async () => {
    const point = { x: 12, z: -8, elevation: 4 };
    const built = await buildLibraryShape(boxAsset, point);
    const made = makeShapeFromAsset(boxAsset, point);
    // Los ids son UUIDs generados por separado; el resto del shape debe coincidir.
    expect({ ...built, id: "" }).toEqual({ ...made, id: "" });
  });

  it("exposes only well-formed assets across categories", () => {
    const items = libraryCategories.flatMap((category) => category.items);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.menuIcon).toBeTruthy();
      expect(item.kind).toBeTruthy();
      expect(item.color).toBeTruthy();
    }
  });

  it("keeps asset ids unique across all categories", () => {
    const ids = libraryCategories.flatMap((category) => category.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the basic shapes category in sync with the toolbar catalog", () => {
    const basicItems = libraryCategories.find((category) => category.id === "basicas")!.items;
    const toolbarIds = toolbarShapeAssets.map((asset) => asset.id);
    // Los STL reales se añaden al final de la categoría; el subconjunto de
    // primitivas de la barra de herramientas debe coincidir al principio.
    expect(basicItems.slice(0, toolbarIds.length).map((item) => item.id)).toEqual(toolbarIds);
    expect(basicItems.length).toBeGreaterThanOrEqual(toolbarIds.length);
  });

  it("finds assets from any category by id", () => {
    expect(findLibraryAsset("box")?.name).toBe("Caja");
    expect(findLibraryAsset("motor-dc")?.name).toBe("Motor DC");
    expect(findLibraryAsset("columna")?.name).toBe("Columna");
    expect(findLibraryAsset("aleron")?.name).toBe("Alerón");
    expect(findLibraryAsset("no-existe")).toBeNull();
  });

  it("maps generated real assets into the library categories", () => {
    const naturaleza = libraryCategories.find((category) => category.id === "naturaleza");
    expect(naturaleza).toBeDefined();
    expect(naturaleza!.label).toBe("Naturaleza");
    expect(naturaleza!.items.length).toBeGreaterThan(0);

    const pelican = findLibraryAsset("pelican");
    expect(pelican).not.toBeNull();
    expect(pelican!.kind).toBe("mesh");
    expect(pelican!.stlPath).toBe("assets/sketchforge/library/stl-real/pelican.stl");
    expect(pelican!.preview).toBe("assets/sketchforge/library/stl-real/pelican-preview.svg");
    expect(pelican!.tags?.length).toBeGreaterThan(0);
    expect(pelican!.metadata?.license).toBeTruthy();
    expect(pelican!.metadata?.sourceUrl).toMatch(/^https?:\/\//);
    expect(pelican!.width).toBeGreaterThan(0);
    expect(pelican!.depth).toBeGreaterThan(0);
    expect(pelican!.height).toBeGreaterThan(0);

    // Los reales se añaden al final de sus categorías temáticas.
    const vehicular = libraryCategories.find((category) => category.id === "vehicular")!;
    expect(vehicular.items.some((item) => item.id === "thor-bearing-ring")).toBe(true);
    expect(vehicular.items.some((item) => item.id === "smars-track-18mm")).toBe(true);
    const basicas = libraryCategories.find((category) => category.id === "basicas")!;
    expect(basicas.items.some((item) => item.id === "klp-keycap-choc")).toBe(true);
  });

  it("builds a real mesh when the STL fetch succeeds", async () => {
    const buffer = minimalStlBuffer();
    const fetchMock = vi.fn(async () => ({ ok: true, arrayBuffer: async () => buffer }));
    vi.stubGlobal("fetch", fetchMock);

    const pelican = findLibraryAsset("pelican")!;
    const placed = await buildLibraryShape(pelican, { x: 4, z: 2, elevation: 1 });

    expect(fetchMock).toHaveBeenCalledWith("assets/sketchforge/library/stl-real/pelican.stl");
    expect(placed.kind).toBe("mesh");
    expect(placed.name).toBe("Pelícano");
    expect(placed.x).toBe(4);
    expect(placed.z).toBe(2);
    expect(placed.importedMesh).toBeDefined();
  });

  it("falls back to a placeholder mesh without throwing when the real STL fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const pelican = findLibraryAsset("pelican")!;
    const placed = await buildLibraryShape(pelican, { x: 1, z: 1, elevation: 1 });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    expect(placed.kind).toBe("mesh");
    expect(placed.name).toBe("Pelícano");
    expect(placed.x).toBe(1);
  });
});

// STL binario mínimo (un triángulo no degenerado) para ejercitar el branch de
// descarga precargada sin depender de red ni de disco.
function minimalStlBuffer(): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + 50);
  const view = new DataView(buffer);
  view.setUint32(80, 1, true); // número de triángulos (1)
  const offset = 84;
  const writeFloat = (index: number, value: number) => view.setFloat32(offset + index * 4, value, true);
  writeFloat(0, 0); // normal x
  writeFloat(1, 0); // normal y
  writeFloat(2, 1); // normal z
  writeFloat(3, 0); // vértice 0 x
  writeFloat(4, 0); // vértice 0 y
  writeFloat(5, 0); // vértice 0 z
  writeFloat(6, 10); // vértice 1 x
  writeFloat(7, 0); // vértice 1 y
  writeFloat(8, 0); // vértice 1 z
  writeFloat(9, 0); // vértice 2 x
  writeFloat(10, 10); // vértice 2 y
  writeFloat(11, 0); // vértice 2 z
  return buffer;
}
