import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShapeAsset } from "@/types/sketchforge";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { buildLibraryShape, findLibraryAsset, libraryCategories, type LibraryAsset } from "@/lib/shapeLibrary";

const boxAsset: ShapeAsset = { id: "box", name: "Caja", src: "assets/sketchforge/shape-icons-gray/box.png", kind: "box", color: "#d41721" };
afterEach(() => vi.unstubAllGlobals());

describe("expanded real component library", () => {
  it("keeps only toolbar primitives in Formas básicas", () => {
    const basics = libraryCategories.find((category) => category.id === "basicas")!;
    expect(basics.items.map((item) => item.id)).toEqual(toolbarShapeAssets.map((item) => item.id));
  });

  it("does not restore former approximate assets", () => {
    for (const id of ["motor-dc", "arduino-uno", "led", "resistencia", "bateria-9v", "servo", "chasis", "columna", "pelican"]) expect(findLibraryAsset(id)).toBeNull();
  });

  it("groups 143 verified CAD assets into twelve useful categories", () => {
    const categories = libraryCategories.filter((category) => category.id !== "basicas");
    expect(categories).toHaveLength(12);
    expect(categories.reduce((total, category) => total + category.items.length, 0)).toBe(143);
    expect(categories.every((category) => category.items.length > 0)).toBe(true);
  });

  it("includes requested electronics, power, sensor and mechanical families", () => {
    expect(findLibraryAsset("freecad-arduino-uno")?.name).toBe("Arduino UNO");
    expect(findLibraryAsset("freecad-hcsr04")?.name).toContain("HC-SR04");
    expect(findLibraryAsset("adafruit-3190-drv8871")?.tags).toContain("puente h");
    expect(findLibraryAsset("adafruit-1321-battery-9v")?.modelFormat).toBe("step");
    expect(findLibraryAsset("adafruit-354-lipo-4400")?.name).toContain("LiPo");
    expect(findLibraryAsset("freecad-resistor-1k")?.name).toContain("1 kΩ");
    expect(findLibraryAsset("freecad-bearing-608zz")?.name).toContain("608ZZ");
    expect(findLibraryAsset("gear-spur-m2-z24")?.tags).toContain("engranaje");
  });

  it("includes compatible gear, rack, shaft and linkage families", () => {
    const m1z20 = findLibraryAsset("gear-spur-m1-z20")!;
    const m1z48 = findLibraryAsset("gear-spur-m1-z48")!;
    const rackM1 = findLibraryAsset("gear-rack-m1-z20")!;
    expect(m1z20.tags).toContain("modulo 1");
    expect(m1z48.tags).toContain("modulo 1");
    expect(rackM1.tags).toContain("modulo 1");
    expect(m1z20.width).toBeCloseTo(22, 2);
    expect(rackM1.width).toBeCloseTo(Math.PI * 20, 2);

    expect(findLibraryAsset("coupler-rigid-5-8")?.name).toContain("5 a 8 mm");
    expect(findLibraryAsset("shaft-d8-l120")?.depth).toBeCloseTo(120, 2);
    expect(findLibraryAsset("shaft-collar-d8")?.tags).toContain("8 mm");
    expect(findLibraryAsset("crank-disc-d40-bore5")?.tags).toContain("manivela");
    expect(findLibraryAsset("cam-eccentric-40x30-bore5")?.tags).toContain("leva");
    expect(findLibraryAsset("link-bar-50-hole5")?.tags).toContain("biela");
  });

  it("exposes traceable and checksummed geometry for every asset", () => {
    const components = libraryCategories.slice(1).flatMap((category) => category.items);
    for (const item of components) {
      expect(item.kind).toBe("mesh");
      expect(item.modelUrl || item.modelPath).toBeTruthy();
      if (item.modelUrl) expect(item.modelUrl).toMatch(/^https:\/\//);
      expect(item.metadata?.sourceUrl).toMatch(/^https:\/\//);
      expect(item.metadata?.manufacturer).toBeTruthy();
      expect(item.metadata?.partNumber).toBeTruthy();
      expect(["MIT", "CC BY 3.0"]).toContain(item.metadata?.license);
      expect(item.metadata?.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.metadata?.fileBytes).toBeGreaterThan(0);
      if (item.modelFormat === "stl") expect(item.metadata?.triangleCount).toBeGreaterThan(0);
      expect(item.width).toBeGreaterThan(0); expect(item.depth).toBeGreaterThan(0); expect(item.height).toBeGreaterThan(0);
    }
  });

  it("keeps ids unique", () => {
    const ids = libraryCategories.flatMap((category) => category.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds basic shapes exactly like the toolbar", async () => {
    const point = { x: 12, z: -8, elevation: 4 };
    const built = await buildLibraryShape(boxAsset, point); const made = makeShapeFromAsset(boxAsset, point);
    expect({ ...built, id: "" }).toEqual({ ...made, id: "" });
  });

  it("downloads and builds a real STL without a synthetic fallback", async () => {
    const buffer = minimalStlBuffer();
    const fetchModel = vi.fn(async () => ({ ok: true, arrayBuffer: async () => buffer }));
    vi.stubGlobal("fetch", fetchModel);
    const asset: LibraryAsset = { id: "real-test", name: "Modelo real", src: "test.svg", menuIcon: "test.svg", kind: "mesh", color: "#123456", modelFormat: "stl", modelUrl: "https://example.test/model.stl", metadata: {} };
    const placed = await buildLibraryShape(asset, { x: 4, z: 2, elevation: 1 });
    const duplicate = await buildLibraryShape(asset, { x: 8, z: 4, elevation: 0 });
    expect(placed.kind).toBe("mesh"); expect(placed.name).toBe("Modelo real"); expect(placed.importedMesh).toBeDefined();
    expect(duplicate.importedMesh).toBe(placed.importedMesh);
    expect(fetchModel).toHaveBeenCalledTimes(1);
  });

  it("reports download failures instead of inserting a fake object", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const asset = { id: "offline-test", name: "Modelo real", src: "test.svg", menuIcon: "test.svg", kind: "mesh", color: "#123456", modelFormat: "stl", modelUrl: "https://example.test/offline.stl", metadata: {} } as LibraryAsset;
    await expect(buildLibraryShape(asset)).rejects.toThrow("offline");
  });
});

function minimalStlBuffer(): ArrayBuffer {
  const buffer = new ArrayBuffer(134); const view = new DataView(buffer); view.setUint32(80, 1, true);
  [0, 0, 1, 0, 0, 0, 10, 0, 0, 0, 10, 0].forEach((value, index) => view.setFloat32(84 + index * 4, value, true));
  return buffer;
}
