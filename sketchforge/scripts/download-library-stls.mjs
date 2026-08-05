#!/usr/bin/env node
// Descarga los STL reales de la librería de formas del modo Diseño 3D y genera
// sus miniaturas SVG (proyección isométrica, sin WebGL) + el TS generado.
//
// Ejecutar desde la raíz del repo:
//   node scripts/download-library-stls.mjs            # descarga y regenera todo
//   node scripts/download-library-stls.mjs --skip-existing  # usa los .stl en disco
//
// Escribe en apps/web/public/assets/sketchforge/library/stl-real/:
//   {id}.stl          — modelo binario/ASCII tal cual se descarga
//   {id}-preview.svg  — miniatura isométrica decimada a ≤6000 triángulos
//   NOTICE.txt        — atribución y licencia de cada modelo
// y regenera apps/web/src/lib/libraryRealAssets.generated.ts.
//
// Por entrada fallida se imprime un warning ([skip]) y se continúa: un modelo
// que no descargue no rompe ni el build ni el runtime (el fetch del STL cae al
// placeholder paramétrico en el viewport).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, "apps", "web", "public", "assets", "sketchforge", "library", "stl-real");
const generatedTsPath = join(rootDir, "apps", "web", "src", "lib", "libraryRealAssets.generated.ts");

// Manifesto curado. Cada entrada incluye id, nombre, categoría temática, color
// de marcado, etiquetas de búsqueda, URL de descarga y metadatos de atribución.
const MANIFEST = [
  {
    id: "thor-bearing-ring",
    name: "Anillo de rodamiento (Thor)",
    category: "vehicular",
    color: "#8a93a0",
    tags: ["mecanica", "rodamiento", "impresion3d"],
    url: "https://raw.githubusercontent.com/AngelLM/Thor/main/mods/stl/Art4BearingRing_Stopper.stl",
    license: "CC BY-SA 4.0",
    attribution: "AngelLM — Thor (CC BY-SA 4.0)",
    source: "AngelLM/Thor",
    sourceUrl: "https://github.com/AngelLM/Thor",
  },
  {
    id: "klp-keycap-choc",
    name: "Tecla KLP Choc 1.5U",
    category: "basicas",
    color: "#7ec4e8",
    tags: ["teclado", "keycap", "ergonomico"],
    url: "https://raw.githubusercontent.com/braindefender/KLP-Lame-Keycaps/master/STL/Choc Stem + Choc Size/Choc_Stem_Choc_Size_1.5U_Normal.stl",
    license: "CC BY-SA 4.0",
    attribution: "braindefender — KLP-Lame-Keycaps (CC BY-SA 4.0)",
    source: "braindefender/KLP-Lame-Keycaps",
    sourceUrl: "https://github.com/braindefender/KLP-Lame-Keycaps",
  },
  {
    id: "smars-track-18mm",
    name: "Oruga SMARS 18 mm",
    category: "vehicular",
    color: "#5f6670",
    tags: ["robotica", "oruga", "smars"],
    url: "https://raw.githubusercontent.com/kevinmcaleer/smars/master/STL_Files/Track 18mm.stl",
    license: "CC BY-SA 4.0",
    attribution: "Kevin McAleer — SMARS (CC BY-SA 4.0)",
    source: "kevinmcaleer/smars",
    sourceUrl: "https://github.com/kevinmcaleer/smars",
  },
  {
    id: "pelican",
    name: "Pelícano",
    category: "naturaleza",
    color: "#c98850",
    tags: ["animal", "ave", "naturaleza"],
    url: "https://raw.githubusercontent.com/raymondben/3d/master/pelican.stl",
    license: "CC BY",
    attribution: "raymondben — 3d (CC BY)",
    source: "raymondben/3d",
    sourceUrl: "https://github.com/raymondben/3d",
  },
  {
    id: "deer-skull-mule",
    name: "Cráneo de ciervo mulo",
    category: "naturaleza",
    color: "#d8d2c4",
    tags: ["animal", "craneo", "naturaleza"],
    url: "https://raw.githubusercontent.com/raymondben/3d/master/Odocoileus_hemionus.stl",
    license: "CC BY",
    attribution: "raymondben — 3d (CC BY)",
    source: "raymondben/3d",
    sourceUrl: "https://github.com/raymondben/3d",
  },
  {
    id: "deer-skull-white-tailed",
    name: "Cráneo de ciervo de cola blanca",
    category: "naturaleza",
    color: "#e8e2d4",
    tags: ["animal", "craneo", "naturaleza"],
    url: "https://raw.githubusercontent.com/raymondben/3d/master/Odocoileus_virginianus.stl",
    license: "CC BY",
    attribution: "raymondben — 3d (CC BY)",
    source: "raymondben/3d",
    sourceUrl: "https://github.com/raymondben/3d",
  },
];

const skipExisting = process.argv.includes("--skip-existing");

// ---------------------------------------------------------------------------
// Parseo de STL (binario con fallback ASCII) — sin three.
// ---------------------------------------------------------------------------

function parseStl(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const count = bytes.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const binaryExpected = 84 + count * 50;

  // Binario: el recuento del header encaja con el tamaño del fichero.
  if (count > 0 && binaryExpected <= bytes.byteLength && bytes.byteLength - binaryExpected < 4096) {
    return parseBinaryStl(view, count);
  }

  // Fallback ASCII: los ficheros texto empiezan por "solid".
  const text = new TextDecoder("latin1").decode(bytes);
  if (text.trimStart().startsWith("solid")) {
    const ascii = parseAsciiStl(text);
    if (ascii.length) {
      return ascii;
    }
  }
  throw new Error("STL no válido (ni binario con recuento coherente ni ASCII)");
}

function parseBinaryStl(view, count) {
  const triangles = [];
  let offset = 84;
  for (let i = 0; i < count; i += 1) {
    const normal = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    const vertices = [];
    for (let j = 0; j < 3; j += 1) {
      vertices.push([
        view.getFloat32(offset + 12 + j * 12, true),
        view.getFloat32(offset + 16 + j * 12, true),
        view.getFloat32(offset + 20 + j * 12, true),
      ]);
    }
    triangles.push({ vertices, normal });
    offset += 50;
  }
  return triangles;
}

const FACET_RE =
  /\bfacet\s+normal\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+outer\s+loop\s+vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+endloop\s+endfacet/g;

function parseAsciiStl(text) {
  const triangles = [];
  for (const match of text.matchAll(FACET_RE)) {
    const nums = match.slice(1).map(Number);
    triangles.push({
      normal: [nums[0], nums[1], nums[2]],
      vertices: [
        [nums[3], nums[4], nums[5]],
        [nums[6], nums[7], nums[8]],
        [nums[9], nums[10], nums[11]],
      ],
    });
  }
  return triangles;
}

// ---------------------------------------------------------------------------
// Bbox y miniatura SVG isométrica.
// ---------------------------------------------------------------------------

function computeBBox(triangles) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const triangle of triangles) {
    for (const [x, y, z] of triangle.vertices) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, minY, minZ, maxX, maxY, maxZ, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
}

// Proyección isométrica/dimétrica ortográfica: giro de 45° en Y y ~35.26° en X.
const COS45 = Math.SQRT1_2;
const SIN45 = Math.SQRT1_2;
const COS_T = Math.sqrt(2 / 3); // cos(35.264°)
const SIN_T = Math.sqrt(1 / 3); // sin(35.264°)

function projectPoint([x, y, z]) {
  const iso = (x + z) * SIN45;
  return {
    x: (x - z) * COS45,
    y: iso * SIN_T - y * COS_T,
    depth: iso * COS_T + y * SIN_T,
  };
}

function shadeHex(hex, factor) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return "#808080";
  }
  const value = parseInt(match[1], 16);
  const r = Math.min(255, Math.round(((value >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((value >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((value & 255) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const MAX_PREVIEW_TRIANGLES = 6000;
const PREVIEW_SIZE = 96;
const SHADE_BUCKETS = 12;

function generatePreviewSvg(triangles, bbox, color) {
  const stride = Math.max(1, Math.ceil(triangles.length / MAX_PREVIEW_TRIANGLES));
  const decimated = [];
  for (let i = 0; i < triangles.length; i += stride) {
    decimated.push(triangles[i]);
  }

  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const cz = (bbox.minZ + bbox.maxZ) / 2;

  const projected = decimated.map((triangle) => {
    const points = triangle.vertices.map(([x, y, z]) => projectPoint([x - cx, y - cy, z - cz]));
    return { points, depth: (points[0].depth + points[1].depth + points[2].depth) / 3 };
  });

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const entry of projected) {
    for (const point of entry.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }

  const padding = PREVIEW_SIZE * 0.08;
  const scale = (PREVIEW_SIZE - padding * 2) / Math.max(1e-6, Math.max(maxX - minX, maxY - minY));

  // Algoritmo del pintor: dibujar primero lo lejano (menor profundidad).
  projected.sort((a, b) => a.depth - b.depth);

  let minDepth = Infinity;
  let maxDepth = -Infinity;
  for (const entry of projected) {
    minDepth = Math.min(minDepth, entry.depth);
    maxDepth = Math.max(maxDepth, entry.depth);
  }
  const depthSpan = Math.max(1e-9, maxDepth - minDepth);

  const paths = projected.map((entry) => {
    const bucket = Math.min(SHADE_BUCKETS - 1, Math.max(0, Math.floor(((entry.depth - minDepth) / depthSpan) * SHADE_BUCKETS)));
    // Lejos → oscuro, cerca → claro.
    const brightness = 0.42 + (bucket / (SHADE_BUCKETS - 1)) * 0.58;
    const fill = shadeHex(color, brightness);
    const coords = entry.points.map((point) => {
      const sx = padding + (point.x - minX) * scale;
      const sy = padding + (point.y - minY) * scale;
      return `${sx.toFixed(2)},${sy.toFixed(2)}`;
    });
    return `<path d="M ${coords[0]} L ${coords[1]} L ${coords[2]} Z" fill="${fill}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}">${paths.join("")}</svg>`;
}

// ---------------------------------------------------------------------------
// Escritura del fichero TS generado y de NOTICE.txt.
// ---------------------------------------------------------------------------

const round = (value, digits = 2) => Number(value.toFixed(digits));

function writeGeneratedTs(entries) {
  const lines = [
    "// AUTO-GENERADO — npm run download:library-stls",
    "// No editar a mano: regenera con `npm run download:library-stls`.",
    "",
    "export type GeneratedRealAsset = {",
    "  id: string;",
    '  category: "basicas" | "vehicular" | "naturaleza";',
    "  name: string;",
    "  color: string;",
    "  tags: string[];",
    "  license: string;",
    "  attribution: string;",
    "  source: string;",
    "  sourceUrl: string;",
    "  width: number;",
    "  depth: number;",
    "  height: number;",
    "  triangleCount: number;",
    "  preview: string;",
    "};",
    "",
    "export const libraryRealAssets: GeneratedRealAsset[] = ",
    JSON.stringify(entries, null, 2),
    ";",
    "",
  ];
  writeFileSync(generatedTsPath, lines.join("\n"));
}

function writeNotice(entries) {
  const blocks = entries.map((entry, index) => {
    return [
      `${index + 1}. ${entry.name} (${entry.id})`,
      `   Fuente: ${entry.source} — ${entry.sourceUrl}`,
      `   Licencia: ${entry.license}`,
      `   Atribución: ${entry.attribution}`,
      `   Bbox: ${entry.width} × ${entry.depth} × ${entry.height} mm (unidades raw del STL)`,
      `   Triángulos: ${entry.triangleCount}`,
    ].join("\n");
  });
  const notice = [
    "Librería de formas reales — SketchForge",
    "======================================",
    "",
    "Los modelos STL se descargan en build desde repositorios GitHub con licencias",
    "abiertas (Creative Commons). Cada entrada incluye su atribución y licencia.",
    "",
    blocks.join("\n\n"),
    "",
  ].join("\n");
  writeFileSync(join(outDir, "NOTICE.txt"), notice);
}

// ---------------------------------------------------------------------------
// Ejecución principal.
// ---------------------------------------------------------------------------

mkdirSync(outDir, { recursive: true });

const succeeded = [];

for (const entry of MANIFEST) {
  const stlPath = join(outDir, `${entry.id}.stl`);
  const previewPath = join(outDir, `${entry.id}-preview.svg`);
  let buffer;
  let downloaded = false;

  try {
    if (skipExisting && existsSync(stlPath)) {
      buffer = readFileSync(stlPath).buffer;
      downloaded = false;
    } else {
      const response = await fetch(encodeURI(entry.url));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      buffer = await response.arrayBuffer();
      writeFileSync(stlPath, Buffer.from(buffer));
      downloaded = true;
    }

    const triangles = parseStl(buffer);
    const bbox = computeBBox(triangles);
    const svg = generatePreviewSvg(triangles, bbox, entry.color);
    writeFileSync(previewPath, svg);

    const result = {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      color: entry.color,
      tags: entry.tags,
      license: entry.license,
      attribution: entry.attribution,
      source: entry.source,
      sourceUrl: entry.sourceUrl,
      width: round(bbox.width),
      depth: round(bbox.depth),
      height: round(bbox.height),
      triangleCount: triangles.length,
      preview: `assets/sketchforge/library/stl-real/${entry.id}-preview.svg`,
    };
    succeeded.push(result);

    const stlBytes = Buffer.byteLength(Buffer.from(buffer));
    console.log(`[ok] ${entry.id}.stl (${stlBytes} bytes, ${triangles.length} tri, ${result.width}×${result.depth}×${result.height})${downloaded ? "" : " [skip-existing]"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[skip] ${entry.id}: ${message}`);
  }
}

if (succeeded.length) {
  writeGeneratedTs(succeeded);
  writeNotice(succeeded);
  console.log(`[ts] libraryRealAssets.generated.ts (${succeeded.length} entradas)`);
  console.log(`[notice] NOTICE.txt`);
}

if (succeeded.length !== MANIFEST.length) {
  console.warn(`[warn] ${MANIFEST.length - succeeded.length} de ${MANIFEST.length} modelos no disponibles.`);
  process.exitCode = 1;
}
