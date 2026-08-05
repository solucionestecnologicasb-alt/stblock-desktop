import { makeShapeFromAsset, toolbarShapeAssets, type ToolbarShapeAsset } from "@/lib/shapeCatalog";
import { appAsset } from "@/lib/appBasePath";
import { importedShapeFromStl } from "@/lib/stlImport";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { libraryRealAssets, type GeneratedRealAsset } from "@/lib/libraryRealAssets.generated";
import type { ShapeAsset, WorkplaneShape } from "@/types/sketchforge";

// Librería de formas por categorías para el modo Diseño 3D.
//
// Cada objeto compuesto es un ensamblaje paramétrico (`kind:"assembly"`) definido
// en código: un contenedor (`width/depth/height`) + `children` (primitivas con
// coordenadas locales, `x/z` relativas al centro del contenedor y `elevation`
// relativa a su base). El render ya lo soporta vía `groupedShapes` en
// `createShapeObject` (WorkplaneViewport), que escala el contenido al bbox del
// padre.
//
// Los 3 objetos estrella (Motor DC, Arduino UNO, LED) pueden además cargar un
// `.stl` precargado (`stlPath`): si el fetch funciona se convierte con el
// pipeline `importedShapeFromStl`; si falla (offline/CORS) se cae al ensamblaje
// paramétrico, visualmente equivalente.

export type LibraryChildSpec = Partial<WorkplaneShape> & Pick<WorkplaneShape, "kind" | "name" | "color">;

export type LibraryAsset = ToolbarShapeAsset & {
  children?: LibraryChildSpec[];
  width?: number;
  depth?: number;
  height?: number;
  stlPath?: string;
  preview?: string;
  tags?: string[];
  metadata?: {
    source?: string;
    sourceUrl?: string;
    license?: string;
    attribution?: string;
    triangleCount?: number;
  };
};

export type LibraryCategory = {
  id: string;
  label: string;
  items: LibraryAsset[];
};

// ---------------------------------------------------------------------------
// Helpers de especificación de hijos (primitivas paramétricas).
// ---------------------------------------------------------------------------

function boxChild(name: string, color: string, x: number, z: number, elevation: number, width: number, depth: number, height: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "box", name, color, x, z, elevation, width, depth, height, radius: 0, ...extra };
}

function cylinderChild(name: string, color: string, x: number, z: number, elevation: number, radius: number, height: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "cylinder", name, color, x, z, elevation, width: radius * 2, depth: radius * 2, height, sides: 64, radius: 0, ...extra };
}

function sphereChild(name: string, color: string, x: number, z: number, elevation: number, radius: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "sphere", name, color, x, z, elevation, width: radius * 2, depth: radius * 2, height: radius * 2, steps: 24, ...extra };
}

function coneChild(name: string, color: string, x: number, z: number, elevation: number, radius: number, height: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "cone", name, color, x, z, elevation, width: radius * 2, depth: radius * 2, height, sides: 64, topRadius: 0, baseRadius: radius, ...extra };
}

function wedgeChild(name: string, color: string, x: number, z: number, elevation: number, width: number, depth: number, height: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "wedge", name, color, x, z, elevation, width, depth, height, ...extra };
}

function roofChild(name: string, color: string, x: number, z: number, elevation: number, width: number, depth: number, height: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "roof", name, color, x, z, elevation, width, depth, height, ...extra };
}

function roundRoofChild(name: string, color: string, x: number, z: number, elevation: number, width: number, depth: number, height: number, extra: Partial<WorkplaneShape> = {}): LibraryChildSpec {
  return { kind: "roundRoof", name, color, x, z, elevation, width, depth, height, sides: 64, ...extra };
}

// ---------------------------------------------------------------------------
// Especificaciones de hijos (exportadas para reutilizarlas en el script de STL).
// ---------------------------------------------------------------------------

const motorDcChildren: LibraryChildSpec[] = [
  cylinderChild("Cuerpo", "#8a8f96", 0, 0, 0, 10, 22),
  cylinderChild("Eje", "#c9ced4", 0, 0, 22, 1.8, 6),
  boxChild("Base", "#5f6670", 0, 0, 0, 30, 20, 3),
  cylinderChild("Cable rojo", "#d41721", -15, -8, 0, 1.2, 12, { rotationX: 90 }),
  cylinderChild("Cable negro", "#222222", -15, 8, 0, 1.2, 12, { rotationX: 90 }),
];

const arduinoUnoChildren: LibraryChildSpec[] = [
  boxChild("Placa", "#0b9dd8", 0, 0, 0, 70, 54, 3),
  boxChild("Chip", "#1c1c1c", -16, -10, 3, 12, 12, 2),
  boxChild("USB", "#c9ced4", 0, 25, 3, 16, 8, 3),
  ...Array.from({ length: 9 }, (_, index) => {
    const x = -28 + index * 7;
    return boxChild(`Pin superior ${index + 1}`, "#c9ced4", x, -22, 3, 4, 1.6, 4);
  }),
  ...Array.from({ length: 9 }, (_, index) => {
    const x = -28 + index * 7;
    return boxChild(`Pin inferior ${index + 1}`, "#c9ced4", x, 22, 3, 4, 1.6, 4);
  }),
];

const ledChildren: LibraryChildSpec[] = [
  sphereChild("Lente", "#ff5a5a", 0, 0, 10, 4),
  cylinderChild("Cuerpo", "#3a3f45", 0, 0, 5, 2.5, 4),
  cylinderChild("Pata larga", "#c9ced4", -1.5, 0, 0, 0.5, 6),
  cylinderChild("Pata corta", "#c9ced4", 1.5, 0, 0, 0.5, 5),
];

const resistenciaChildren: LibraryChildSpec[] = [
  cylinderChild("Cuerpo", "#d9a013", 0, 0, 0, 3, 12, { rotationZ: 90 }),
  boxChild("Banda 1", "#7a3a12", -2, 0, 0, 1.6, 6, 6),
  boxChild("Banda 2", "#222222", 0, 0, 0, 1.6, 6, 6),
  boxChild("Banda 3", "#d41721", 2, 0, 0, 1.6, 6, 6),
  cylinderChild("Pata 1", "#c9ced4", -6, 0, 0, 0.6, 6, { rotationZ: 90 }),
  cylinderChild("Pata 2", "#c9ced4", 6, 0, 0, 0.6, 6, { rotationZ: 90 }),
];

const bateria9vChildren: LibraryChildSpec[] = [
  boxChild("Cuerpo", "#3a3f45", 0, 0, 0, 26, 18, 48),
  boxChild("Etiqueta", "#d9a013", 0, 0, 22, 26, 18, 12),
  cylinderChild("Terminal 1", "#c9ced4", -5, 0, 48, 1.6, 3),
  cylinderChild("Terminal 2", "#c9ced4", 5, 0, 48, 1.6, 3),
];

const servoChildren: LibraryChildSpec[] = [
  boxChild("Cuerpo", "#5f6670", 0, 0, 0, 24, 12, 18),
  boxChild("Soporte", "#8a8f96", 0, 0, 18, 24, 12, 3),
  cylinderChild("Eje", "#c9ced4", 0, 0, 21, 2, 3),
  boxChild("Spline", "#222222", 0, 0, 21, 8, 4, 2),
];

const columnaChildren: LibraryChildSpec[] = [
  cylinderChild("Fuste", "#d8d2c4", 0, 0, 0, 6, 44),
  boxChild("Base", "#b8b0a0", 0, 0, 0, 16, 16, 4),
  boxChild("Capitel", "#b8b0a0", 0, 0, 48, 16, 16, 5),
];

const ventanaChildren: LibraryChildSpec[] = [
  boxChild("Marco", "#5a6b78", 0, 0, 0, 44, 8, 30),
  boxChild("Panel izquierdo", "#a5d8f2", -10, 0, 3, 16, 6, 22),
  boxChild("Panel derecho", "#a5d8f2", 10, 0, 3, 16, 6, 22),
  boxChild("Travesaño", "#5a6b78", 0, 0, 3, 44, 6, 2),
  boxChild("Mainel", "#5a6b78", 0, 0, 3, 2, 6, 22),
];

const escaleraChildren: LibraryChildSpec[] = [
  boxChild("Escalón 1", "#b0703a", -8, 0, 0, 9, 16, 5),
  boxChild("Escalón 2", "#c98850", 0, 0, 5, 9, 16, 5),
  boxChild("Escalón 3", "#d99a62", 8, 0, 10, 9, 16, 5),
  boxChild("Contrahuella 2", "#9a5a2c", -3, 0, 5, 6, 16, 5),
  boxChild("Contrahuella 3", "#9a5a2c", 5, 0, 10, 6, 16, 5),
];

const arcoChildren: LibraryChildSpec[] = [
  boxChild("Jamba izquierda", "#b8b0a0", -8, 0, 0, 5, 8, 24),
  boxChild("Jamba derecha", "#b8b0a0", 8, 0, 0, 5, 8, 24),
  roundRoofChild("Arco", "#b8b0a0", 0, 0, 24, 16, 8, 8),
];

const techoChildren: LibraryChildSpec[] = [
  roofChild("Vertiente", "#8a5a3a", 0, 0, 0, 40, 28, 20),
];

const puertaChildren: LibraryChildSpec[] = [
  boxChild("Hoja", "#9a5a2c", 0, 0, 0, 20, 8, 36),
  boxChild("Panel superior", "#7a4520", 0, -1, 4, 16, 4, 12),
  boxChild("Panel inferior", "#7a4520", 0, -1, 20, 16, 4, 12),
  cylinderChild("Picaporte", "#c9ced4", 8, 3, 18, 1, 3, { rotationX: 90 }),
];

const chasisChildren: LibraryChildSpec[] = [
  boxChild("Base", "#b03030", 0, 0, 0, 44, 20, 4),
  boxChild("Cabina", "#8a2323", 0, 0, 4, 22, 18, 8),
  wedgeChild("Capó", "#d04040", -13, 0, 4, 18, 18, 6),
  wedgeChild("Maletero", "#d04040", 13, 0, 4, 18, 18, 4),
];

const ruedaChildren: LibraryChildSpec[] = [
  cylinderChild("Neumático", "#222222", 0, 0, 0, 8, 4, { rotationX: 90 }),
  cylinderChild("Llanta", "#c9ced4", 0, 0, 0, 5, 3, { rotationX: 90 }),
  cylinderChild("Eje", "#8a8f96", 0, 0, 0, 1.5, 12, { rotationX: 90 }),
];

const heliceChildren: LibraryChildSpec[] = [
  cylinderChild("Cubo", "#5f6670", 0, 0, 0, 2, 4),
  boxChild("Pala 1", "#c9ced4", 7, 0, 1, 12, 2, 1),
  boxChild("Pala 2", "#c9ced4", -3.5, 6.1, 1, 12, 2, 1, { rotation: 120 }),
  boxChild("Pala 3", "#c9ced4", -3.5, -6.1, 1, 12, 2, 1, { rotation: 240 }),
];

const coheteChildren: LibraryChildSpec[] = [
  cylinderChild("Cuerpo", "#d8dbe0", 0, 0, 4, 5, 28),
  coneChild("Ojiva", "#d41721", 0, 0, 32, 5, 6),
  wedgeChild("Aleta 1", "#d41721", 0, -7, 2, 7, 4, 8, { rotationZ: 90 }),
  wedgeChild("Aleta 2", "#d41721", 0, 7, 2, 7, 4, 8, { rotationZ: -90 }),
  cylinderChild("Tobera", "#8a8f96", 0, 0, 0, 3, 3),
];

const aleronChildren: LibraryChildSpec[] = [
  boxChild("Plano", "#2a6fb8", 0, 0, 0, 28, 6, 2),
  wedgeChild("Perfil", "#2a6fb8", 0, 0, 2, 28, 6, 5),
  boxChild("Soporte", "#8a8f96", 0, 0, 0, 6, 4, 7),
];

// ---------------------------------------------------------------------------
// Catálogo por categorías.
// ---------------------------------------------------------------------------

// Categorías base (paramétricas). `libraryCategories` (exportado) es el
// resultado de aplicar `withRealAssets` sobre esta lista: añade los STL reales
// descargados a `basicas`/`vehicular` y crea la categoría `naturaleza`.
export const BASE_LIBRARY_CATEGORIES: LibraryCategory[] = [
  {
    id: "basicas",
    label: "Formas básicas",
    items: toolbarShapeAssets.map((asset) => ({ ...asset })),
  },
  {
    id: "electrica",
    label: "Eléctrica",
    items: [
      {
        id: "motor-dc",
        name: "Motor DC",
        src: "assets/sketchforge/library-icons/motor-dc.svg",
        menuIcon: "assets/sketchforge/library-icons/motor-dc.svg",
        kind: "assembly",
        color: "#8a8f96",
        width: 32,
        depth: 28,
        height: 26,
        stlPath: "assets/sketchforge/library/stl/motor-dc.stl",
        children: motorDcChildren,
      },
      {
        id: "arduino-uno",
        name: "Arduino UNO",
        src: "assets/sketchforge/library-icons/arduino-uno.svg",
        menuIcon: "assets/sketchforge/library-icons/arduino-uno.svg",
        kind: "assembly",
        color: "#0b9dd8",
        width: 70,
        depth: 54,
        height: 15,
        stlPath: "assets/sketchforge/library/stl/arduino-uno.stl",
        children: arduinoUnoChildren,
      },
      {
        id: "led",
        name: "LED",
        src: "assets/sketchforge/library-icons/led.svg",
        menuIcon: "assets/sketchforge/library-icons/led.svg",
        kind: "assembly",
        color: "#ff5a5a",
        width: 10,
        depth: 10,
        height: 16,
        stlPath: "assets/sketchforge/library/stl/led.stl",
        children: ledChildren,
      },
      {
        id: "resistencia",
        name: "Resistencia",
        src: "assets/sketchforge/library-icons/resistencia.svg",
        menuIcon: "assets/sketchforge/library-icons/resistencia.svg",
        kind: "assembly",
        color: "#d9a013",
        width: 18,
        depth: 8,
        height: 6,
        children: resistenciaChildren,
      },
      {
        id: "bateria-9v",
        name: "Batería 9V",
        src: "assets/sketchforge/library-icons/bateria-9v.svg",
        menuIcon: "assets/sketchforge/library-icons/bateria-9v.svg",
        kind: "assembly",
        color: "#3a3f45",
        width: 26,
        depth: 18,
        height: 51,
        children: bateria9vChildren,
      },
      {
        id: "servo",
        name: "Servo",
        src: "assets/sketchforge/library-icons/servo.svg",
        menuIcon: "assets/sketchforge/library-icons/servo.svg",
        kind: "assembly",
        color: "#5f6670",
        width: 24,
        depth: 12,
        height: 24,
        children: servoChildren,
      },
    ],
  },
  {
    id: "arquitectura",
    label: "Arquitectura",
    items: [
      {
        id: "columna",
        name: "Columna",
        src: "assets/sketchforge/library-icons/columna.svg",
        menuIcon: "assets/sketchforge/library-icons/columna.svg",
        kind: "assembly",
        color: "#d8d2c4",
        width: 16,
        depth: 16,
        height: 53,
        children: columnaChildren,
      },
      {
        id: "ventana",
        name: "Ventana",
        src: "assets/sketchforge/library-icons/ventana.svg",
        menuIcon: "assets/sketchforge/library-icons/ventana.svg",
        kind: "assembly",
        color: "#7ec4e8",
        width: 44,
        depth: 8,
        height: 30,
        children: ventanaChildren,
      },
      {
        id: "escalera",
        name: "Escalera",
        src: "assets/sketchforge/library-icons/escalera.svg",
        menuIcon: "assets/sketchforge/library-icons/escalera.svg",
        kind: "assembly",
        color: "#b0703a",
        width: 26,
        depth: 16,
        height: 16,
        children: escaleraChildren,
      },
      {
        id: "arco",
        name: "Arco",
        src: "assets/sketchforge/library-icons/arco.svg",
        menuIcon: "assets/sketchforge/library-icons/arco.svg",
        kind: "assembly",
        color: "#c9c2b4",
        width: 24,
        depth: 8,
        height: 32,
        children: arcoChildren,
      },
      {
        id: "techo",
        name: "Techo a dos aguas",
        src: "assets/sketchforge/library-icons/techo.svg",
        menuIcon: "assets/sketchforge/library-icons/techo.svg",
        kind: "assembly",
        color: "#8a5a3a",
        width: 40,
        depth: 28,
        height: 20,
        children: techoChildren,
      },
      {
        id: "puerta",
        name: "Puerta",
        src: "assets/sketchforge/library-icons/puerta.svg",
        menuIcon: "assets/sketchforge/library-icons/puerta.svg",
        kind: "assembly",
        color: "#9a5a2c",
        width: 20,
        depth: 8,
        height: 36,
        children: puertaChildren,
      },
    ],
  },
  {
    id: "vehicular",
    label: "Vehicular",
    items: [
      {
        id: "chasis",
        name: "Chasis de auto",
        src: "assets/sketchforge/library-icons/chasis.svg",
        menuIcon: "assets/sketchforge/library-icons/chasis.svg",
        kind: "assembly",
        color: "#b03030",
        width: 44,
        depth: 20,
        height: 12,
        children: chasisChildren,
      },
      {
        id: "rueda",
        name: "Rueda",
        src: "assets/sketchforge/library-icons/rueda.svg",
        menuIcon: "assets/sketchforge/library-icons/rueda.svg",
        kind: "assembly",
        color: "#222222",
        width: 16,
        depth: 5,
        height: 16,
        children: ruedaChildren,
      },
      {
        id: "helice",
        name: "Hélice",
        src: "assets/sketchforge/library-icons/helice.svg",
        menuIcon: "assets/sketchforge/library-icons/helice.svg",
        kind: "assembly",
        color: "#c9ced4",
        width: 18,
        depth: 18,
        height: 6,
        children: heliceChildren,
      },
      {
        id: "cohete",
        name: "Cuerpo de cohete",
        src: "assets/sketchforge/library-icons/cohete.svg",
        menuIcon: "assets/sketchforge/library-icons/cohete.svg",
        kind: "assembly",
        color: "#d8dbe0",
        width: 12,
        depth: 12,
        height: 38,
        children: coheteChildren,
      },
      {
        id: "aleron",
        name: "Alerón",
        src: "assets/sketchforge/library-icons/aleron.svg",
        menuIcon: "assets/sketchforge/library-icons/aleron.svg",
        kind: "assembly",
        color: "#2a6fb8",
        width: 28,
        depth: 8,
        height: 8,
        children: aleronChildren,
      },
    ],
  },
];

function realAssetToLibraryAsset(asset: GeneratedRealAsset): LibraryAsset {
  const preview = `assets/sketchforge/library/stl-real/${asset.id}-preview.svg`;
  return {
    id: asset.id,
    name: asset.name,
    src: preview,
    menuIcon: preview,
    preview,
    kind: "mesh",
    color: asset.color,
    width: asset.width,
    depth: asset.depth,
    height: asset.height,
    stlPath: `assets/sketchforge/library/stl-real/${asset.id}.stl`,
    tags: asset.tags,
    metadata: {
      source: asset.source,
      sourceUrl: asset.sourceUrl,
      license: asset.license,
      attribution: asset.attribution,
      triangleCount: asset.triangleCount,
    },
  };
}

// Añade los STL reales (descargados por scripts/download-library-stls.mjs) al
// final de sus categorías temáticas y crea `naturaleza` si hay modelos sin
// categoría base equivalente.
function withRealAssets(categories: LibraryCategory[]): LibraryCategory[] {
  const realByCategory = new Map<string, LibraryAsset[]>();
  for (const real of libraryRealAssets) {
    const list = realByCategory.get(real.category) ?? [];
    list.push(realAssetToLibraryAsset(real));
    realByCategory.set(real.category, list);
  }

  const next = categories.map((category) => {
    const additions = realByCategory.get(category.id);
    if (!additions) {
      return category;
    }
    return { ...category, items: [...category.items, ...additions] };
  });

  const naturaleza = realByCategory.get("naturaleza");
  if (naturaleza) {
    next.push({ id: "naturaleza", label: "Naturaleza", items: naturaleza });
  }
  return next;
}

export const libraryCategories: LibraryCategory[] = withRealAssets(BASE_LIBRARY_CATEGORIES);

export function findLibraryAsset(id: string): LibraryAsset | null {
  for (const category of libraryCategories) {
    const found = category.items.find((item) => item.id === id);
    if (found) {
      return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Construcción de la forma para insertar en la escena.
// ---------------------------------------------------------------------------

export async function buildLibraryShape(asset: ShapeAsset, point?: { x: number; z: number; elevation?: number }): Promise<WorkplaneShape> {
  const libraryAsset = asset as LibraryAsset;
  if (libraryAsset.stlPath) {
    try {
      const response = await fetch(appAsset(libraryAsset.stlPath));
      if (!response.ok) {
        throw new Error(`STL no disponible: ${libraryAsset.stlPath}`);
      }
      const buffer = await response.arrayBuffer();
      const meshShape = importedShapeFromStl(libraryAsset.stlPath, buffer);
      return canonicalizeShape({
        ...meshShape,
        id: createLocalId(asset.id),
        name: asset.name,
        color: asset.color,
        x: point?.x ?? 0,
        z: point?.z ?? 0,
        elevation: point?.elevation ?? 0,
        rotation: 0,
        rotationX: 0,
        rotationZ: 0,
        locked: false,
        hidden: false,
      });
    } catch (error) {
      // El fetch del STL falló (offline/archivo ausente): caemos al ensamblaje
      // paramétrico (visualmente equivalente) o al placeholder de mesh para los
      // assets reales. Nunca lanzamos: `addLibraryAsset` no tiene try/catch.
      console.warn(`[shapeLibrary] No se pudo cargar el STL ${libraryAsset.stlPath}; se usa el fallback.`, error);
    }
  }
  return makeShapeFromAsset(asset, point);
}

export { motorDcChildren, arduinoUnoChildren, ledChildren };
