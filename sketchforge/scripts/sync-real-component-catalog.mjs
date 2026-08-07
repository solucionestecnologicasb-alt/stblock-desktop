#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { COMPONENT_MANIFEST, ADAFRUIT_REVISION } from "./library-components.mjs";
import { EXTRA_COMPONENT_MANIFEST, FREECAD_REVISION, PARAMETRIC_MOTION_PARTS } from "./library-components-extra.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "apps", "web", "public", "assets", "sketchforge", "library");
const gearDir = join(publicDir, "generated-gears");
const bundleDir = join(publicDir, "components");
const generatedPath = join(rootDir, "apps", "web", "src", "lib", "libraryComponentCatalog.generated.ts");
const bundle = process.argv.includes("--bundle");

function parseStl(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const count = bytes.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const binaryExpected = 84 + count * 50;
  if (count > 0 && binaryExpected <= bytes.byteLength && bytes.byteLength - binaryExpected < 4096) {
    const vertices = [];
    let offset = 84;
    for (let triangle = 0; triangle < count; triangle += 1) {
      for (let vertex = 0; vertex < 3; vertex += 1) {
        const base = offset + 12 + vertex * 12;
        vertices.push([view.getFloat32(base, true), view.getFloat32(base + 4, true), view.getFloat32(base + 8, true)]);
      }
      offset += 50;
    }
    return { vertices, triangleCount: count };
  }
  const text = new TextDecoder("latin1").decode(bytes);
  const pattern = /\bvertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  const vertices = [];
  for (const match of text.matchAll(pattern)) vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  if (vertices.length < 3 || vertices.length % 3 !== 0) throw new Error("STL no válido");
  return { vertices, triangleCount: vertices.length / 3 };
}

function dimensions(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const point of vertices) for (let axis = 0; axis < 3; axis += 1) {
    min[axis] = Math.min(min[axis], point[axis]); max[axis] = Math.max(max[axis], point[axis]);
  }
  const round = (value) => Number(value.toFixed(3));
  return { width: round(max[0] - min[0]), height: round(max[1] - min[1]), depth: round(max[2] - min[2]) };
}

function gearOutline(teeth, moduleSize, pressureAngleDeg = 20) {
  const pressure = THREE.MathUtils.degToRad(pressureAngleDeg);
  const pitchRadius = moduleSize * teeth / 2;
  const baseRadius = pitchRadius * Math.cos(pressure);
  const outerRadius = pitchRadius + moduleSize;
  const rootRadius = Math.max(moduleSize * 0.8, pitchRadius - 1.25 * moduleSize);
  const involute = (radius) => { const t = Math.sqrt(Math.max(0, radius * radius / (baseRadius * baseRadius) - 1)); return t - Math.atan(t); };
  const pitchInvolute = Math.tan(pressure) - pressure;
  const halfTooth = Math.PI / (2 * teeth);
  const flankStart = Math.max(rootRadius, baseRadius);
  const points = [];
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const center = tooth * Math.PI * 2 / teeth;
    const leftRootAngle = center - (halfTooth + pitchInvolute - involute(flankStart));
    points.push(new THREE.Vector2(Math.cos(leftRootAngle) * rootRadius, Math.sin(leftRootAngle) * rootRadius));
    for (let step = 0; step <= 8; step += 1) {
      const radius = flankStart + (outerRadius - flankStart) * step / 8;
      const angle = center - (halfTooth + pitchInvolute - involute(radius));
      points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
    for (let step = 1; step <= 3; step += 1) {
      const left = center - (halfTooth + pitchInvolute - involute(outerRadius));
      const right = center + (halfTooth + pitchInvolute - involute(outerRadius));
      const angle = left + (right - left) * step / 3;
      points.push(new THREE.Vector2(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius));
    }
    for (let step = 8; step >= 0; step -= 1) {
      const radius = flankStart + (outerRadius - flankStart) * step / 8;
      const angle = center + (halfTooth + pitchInvolute - involute(radius));
      points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
    const rightRootAngle = center + (halfTooth + pitchInvolute - involute(flankStart));
    const nextCenter = center + Math.PI * 2 / teeth;
    const nextLeftRoot = nextCenter - (halfTooth + pitchInvolute - involute(flankStart));
    for (let step = 1; step <= 3; step += 1) {
      const angle = rightRootAngle + (nextLeftRoot - rightRootAngle) * step / 3;
      points.push(new THREE.Vector2(Math.cos(angle) * rootRadius, Math.sin(angle) * rootRadius));
    }
  }
  return points;
}

function exportBinary(object) {
  object.updateMatrixWorld(true);
  const output = new STLExporter().parse(object, { binary: true });
  return output instanceof DataView ? output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) : new TextEncoder().encode(output).buffer;
}

function extrudeShape(shape, depth, curveSegments = 48) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments, steps: 1 });
  geometry.computeVertexNormals();
  return exportBinary(new THREE.Mesh(geometry));
}

function circularShape(outerRadius, holes = []) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  for (const hole of holes) {
    const path = new THREE.Path();
    path.absarc(hole.x ?? 0, hole.y ?? 0, hole.radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  return shape;
}

function generateGearBuffer(spec) {
  const shape = new THREE.Shape(gearOutline(spec.teeth, spec.module));
  const hole = new THREE.Path();
  hole.absarc(0, 0, spec.bore / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return extrudeShape(shape, spec.thickness, 32);
}

function generateRackBuffer(spec) {
  const pressure = THREE.MathUtils.degToRad(20);
  const pitch = Math.PI * spec.module;
  const addendum = spec.module;
  const dedendum = 1.25 * spec.module;
  const length = spec.teeth * pitch;
  const rootY = spec.baseHeight;
  const tipY = rootY + addendum + dedendum;
  const top = [];
  for (let tooth = 0; tooth < spec.teeth; tooth += 1) {
    const center = -length / 2 + (tooth + 0.5) * pitch;
    const pitchHalf = pitch / 4;
    const tipHalf = pitchHalf - addendum * Math.tan(pressure);
    const rootHalf = pitchHalf + dedendum * Math.tan(pressure);
    top.push(
      new THREE.Vector2(center - rootHalf, rootY),
      new THREE.Vector2(center - tipHalf, tipY),
      new THREE.Vector2(center + tipHalf, tipY),
      new THREE.Vector2(center + rootHalf, rootY),
    );
  }
  const points = [
    new THREE.Vector2(-length / 2, 0),
    new THREE.Vector2(length / 2, 0),
    new THREE.Vector2(length / 2, rootY),
    ...top.reverse(),
    new THREE.Vector2(-length / 2, rootY),
  ];
  return extrudeShape(new THREE.Shape(points), spec.thickness, 12);
}

function latheBuffer(profile, segments = 96) {
  const geometry = new THREE.LatheGeometry(profile.map(([radius, axial]) => new THREE.Vector2(radius, axial)), segments);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return exportBinary(new THREE.Mesh(geometry));
}

function generatePulleyBuffer(spec) {
  const inner = spec.bore / 2;
  const flange = spec.outerDiameter / 2;
  const belt = spec.beltDiameter / 2;
  const edge = Math.max(0, Math.min(spec.flangeThickness, spec.width / 2));
  if (edge === 0 || belt === flange) {
    return latheBuffer([[inner, 0], [flange, 0], [flange, spec.width], [inner, spec.width], [inner, 0]]);
  }
  return latheBuffer([
    [inner, 0], [flange, 0], [flange, edge], [belt, edge],
    [belt, spec.width - edge], [flange, spec.width - edge], [flange, spec.width],
    [inner, spec.width], [inner, 0],
  ]);
}

function generateCouplerBuffer(spec) {
  const middle = spec.length / 2;
  if (spec.boreA === spec.boreB) {
    return latheBuffer([[spec.boreA / 2, 0], [spec.outerDiameter / 2, 0], [spec.outerDiameter / 2, spec.length], [spec.boreA / 2, spec.length], [spec.boreA / 2, 0]]);
  }
  return latheBuffer([
    [spec.boreA / 2, 0], [spec.outerDiameter / 2, 0],
    [spec.outerDiameter / 2, spec.length], [spec.boreB / 2, spec.length],
    [spec.boreB / 2, middle], [spec.boreA / 2, middle], [spec.boreA / 2, 0],
  ]);
}

function generateShaftBuffer(spec) {
  const geometry = new THREE.CylinderGeometry(spec.diameter / 2, spec.diameter / 2, spec.length, 48);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, spec.length / 2);
  geometry.computeVertexNormals();
  return exportBinary(new THREE.Mesh(geometry));
}

function generateCollarBuffer(spec) {
  return extrudeShape(circularShape(spec.outerDiameter / 2, [{ radius: spec.bore / 2 }]), spec.length);
}

function generateCrankBuffer(spec) {
  return extrudeShape(circularShape(spec.diameter / 2, [
    { radius: spec.bore / 2 },
    { x: spec.pinOffset, radius: spec.pinBore / 2 },
  ]), spec.thickness);
}

function generateCamBuffer(spec) {
  const ellipse = new THREE.EllipseCurve(0, 0, spec.width / 2, spec.height / 2, 0, Math.PI * 2, false, 0);
  const shape = new THREE.Shape(ellipse.getPoints(96));
  const bore = new THREE.Path();
  bore.absarc(spec.boreOffset, 0, spec.bore / 2, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  return extrudeShape(shape, spec.thickness);
}

function generateLinkBuffer(spec) {
  const radius = spec.barWidth / 2;
  const halfCenters = spec.centers / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfCenters, -radius);
  shape.lineTo(halfCenters, -radius);
  shape.absarc(halfCenters, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-halfCenters, radius);
  shape.absarc(-halfCenters, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  for (const x of [-halfCenters, halfCenters]) {
    const hole = new THREE.Path();
    hole.absarc(x, 0, spec.bore / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return extrudeShape(shape, spec.thickness);
}

function generateMotionBuffer(spec) {
  switch (spec.kind) {
    case "gear": return generateGearBuffer(spec);
    case "rack": return generateRackBuffer(spec);
    case "pulley": return generatePulleyBuffer(spec);
    case "coupler": return generateCouplerBuffer(spec);
    case "shaft": return generateShaftBuffer(spec);
    case "collar": return generateCollarBuffer(spec);
    case "crank": return generateCrankBuffer(spec);
    case "cam": return generateCamBuffer(spec);
    case "link": return generateLinkBuffer(spec);
    default: throw new Error(`${spec.id}: tipo paramétrico desconocido ${spec.kind}`);
  }
}

function motionPartNumber(spec) {
  if (spec.kind === "gear") return `M${spec.module}-Z${spec.teeth}`;
  if (spec.kind === "rack") return `RACK-M${spec.module}-Z${spec.teeth}`;
  return spec.id.toUpperCase();
}

function motionTags(spec) {
  const common = ["movimiento", "mecanica", "parametrico"];
  switch (spec.kind) {
    case "gear": return ["engranaje", "gear", "involuta", `modulo ${spec.module}`, `${spec.teeth} dientes`, "20 grados", ...common];
    case "rack": return ["cremallera", "rack", "piñon cremallera", `modulo ${spec.module}`, `${spec.teeth} dientes`, "20 grados", ...common];
    case "pulley": return ["polea", "pulley", "correa", "transmision", ...common];
    case "coupler": return ["acople", "acoplador", "eje", "motor", "transmision", ...common];
    case "shaft": return ["eje", "varilla", `${spec.diameter} mm`, "rotacion", ...common];
    case "collar": return ["collar", "tope", "eje", `${spec.bore} mm`, ...common];
    case "crank": return ["manivela", "ciguenal", "biela", "movimiento alternativo", ...common];
    case "cam": return ["leva", "excentrica", "seguidor", "movimiento alternativo", ...common];
    case "link": return ["biela", "barra", "articulacion", "mecanismo", ...common];
    default: return common;
  }
}

function motionEntry(spec) {
  mkdirSync(gearDir, { recursive: true });
  const buffer = generateMotionBuffer(spec);
  writeFileSync(join(gearDir, `${spec.id}.stl`), Buffer.from(buffer));
  return { id: spec.id, name: spec.name, category: "transmision", manufacturer: "SketchForge", partNumber: motionPartNumber(spec), color: "#9a7448",
    tags: motionTags(spec), modelFormat: "stl", modelPath: `assets/sketchforge/library/generated-gears/${spec.id}.stl`,
    license: "MIT", attribution: "Generado paramétricamente por SketchForge", source: "SketchForge Parametric Motion Parts", sourceUrl: "https://en.wikipedia.org/wiki/Mechanical_system", buffer };
}

async function inspect(entry) {
  let buffer = entry.buffer;
  if (!buffer) {
    const response = await fetch(encodeURI(entry.modelUrl), { headers: { "User-Agent": "SketchForge-library-sync" } });
    if (!response.ok) throw new Error(`${entry.id}: HTTP ${response.status}`);
    buffer = await response.arrayBuffer();
  }
  const modelFormat = entry.modelFormat ?? "stl";
  let size = entry.dimensions;
  let triangleCount = 0;
  if (modelFormat === "stl") {
    const parsed = parseStl(buffer); size = dimensions(parsed.vertices); triangleCount = parsed.triangleCount;
  } else if (!size) throw new Error(`${entry.id}: STEP sin dimensiones declaradas`);
  const sha256 = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  if (bundle && entry.modelUrl) {
    mkdirSync(bundleDir, { recursive: true }); writeFileSync(join(bundleDir, `${entry.id}.${modelFormat}`), Buffer.from(buffer));
  }
  console.log(`[ok] ${entry.id}: ${buffer.byteLength} bytes, ${modelFormat}${triangleCount ? `, ${triangleCount} tri` : ""}`);
  const { buffer: ignored, dimensions: ignoredDimensions, ...clean } = entry;
  return { ...clean, modelFormat, ...size, triangleCount, fileBytes: buffer.byteLength, sha256,
    modelPath: clean.modelPath ?? (bundle ? `assets/sketchforge/library/components/${entry.id}.${modelFormat}` : undefined) };
}

function writeCatalog(entries) {
  const type = `// AUTO-GENERADO por scripts/sync-real-component-catalog.mjs. No editar.\n\nexport type GeneratedComponentAsset = {\n  id: string; name: string; category: string; manufacturer: string; partNumber: string; color: string; tags: string[];\n  modelFormat: \"stl\" | \"step\"; modelUrl?: string; modelPath?: string; cadUrl?: string; previewUrl?: string; license: string; attribution: string; source: string; sourceUrl: string;\n  width: number; depth: number; height: number; triangleCount: number; fileBytes: number; sha256: string;\n};\n\nexport const libraryComponentAssets: GeneratedComponentAsset[] = ${JSON.stringify(entries, null, 2)};\n`;
  writeFileSync(generatedPath, type);
}

function writeNotice(entries) {
  mkdirSync(publicDir, { recursive: true });
  const rows = entries.flatMap((entry, index) => [`${index + 1}. ${entry.name} (${entry.id})`, `   Fabricante / referencia: ${entry.manufacturer} ${entry.partNumber}`, `   Fuente: ${entry.sourceUrl}`, `   Licencia: ${entry.license} — ${entry.attribution}`, `   Formato: ${entry.modelFormat.toUpperCase()} — SHA-256: ${entry.sha256}`, ""]);
  writeFileSync(join(publicDir, "NOTICE.txt"), ["SketchForge — Catálogo CAD verificable", "=======================================", "", `Adafruit revision: ${ADAFRUIT_REVISION}`, `FreeCAD-library revision: ${FREECAD_REVISION}`, "", "Los activos se descargan bajo demanda, se validan y se almacenan en caché.", "", ...rows].join("\n"));
}

const allEntries = [...COMPONENT_MANIFEST.map((entry) => ({ ...entry, modelFormat: "stl" })), ...EXTRA_COMPONENT_MANIFEST, ...PARAMETRIC_MOTION_PARTS.map(motionEntry)];
const inspected = [];
for (const entry of allEntries) inspected.push(await inspect(entry));
writeCatalog(inspected); writeNotice(inspected);
console.log(`[done] ${inspected.length} componentes CAD en ${new Set(inspected.map((entry) => entry.category)).size} categorías`);
