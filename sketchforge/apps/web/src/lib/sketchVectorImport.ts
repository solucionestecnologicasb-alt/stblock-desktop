import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { SketchEntity, SketchVectorLoop } from "@/types/sketchforge";
import { createLocalId } from "@/lib/localIds";
import { normalizeSvgDocumentType, normalizeSvgUseReferences, validateSvgSourcePreflight } from "@/lib/svgImport";

const svgLoader = new SVGLoader();
const MAX_TRACE_SIDE = 320;
const DEFAULT_WIDTH = 60;

function normalizeLoops(loops: SketchVectorLoop[], targetWidth = DEFAULT_WIDTH) {
  const valid = loops.filter((loop) => loop.length >= 3);
  const points = valid.flat();
  if (!points.length) throw new Error("No se encontraron contornos cerrados convertibles");
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const scale = targetWidth / Math.max(maxX - minX, 0.001);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return valid.map((loop) => loop.map((point) => ({ x: (point.x - centerX) * scale, z: (point.z - centerZ) * scale })));
}

export function vectorEntityFromSvg(fileName: string, source: string): Extract<SketchEntity, { kind: "vector" }> {
  validateSvgSourcePreflight(source);
  const parsed = svgLoader.parse(normalizeSvgUseReferences(normalizeSvgDocumentType(source)));
  const loops: SketchVectorLoop[] = [];
  parsed.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const extracted = shape.extractPoints(16);
      loops.push(extracted.shape.map((point) => ({ x: point.x, z: point.y })));
      extracted.holes.forEach((hole) => loops.push(hole.map((point) => ({ x: point.x, z: point.y }))));
    });
  });
  return {
    id: createLocalId("sketch-vector"),
    kind: "vector",
    cx: 0,
    cz: 0,
    name: fileName.replace(/\.[^.]+$/, "") || "Vector SVG",
    loops: normalizeLoops(loops),
    scaleX: 1,
    scaleZ: 1,
    rotation: 0,
    sourceFormat: "svg",
  };
}

type PixelPoint = { x: number; y: number };
const pointKey = (point: PixelPoint) => `${point.x},${point.y}`;

export function traceBinaryMask(mask: readonly boolean[], width: number, height: number): SketchVectorLoop[] {
  const outgoing = new Map<string, PixelPoint[]>();
  const add = (start: PixelPoint, end: PixelPoint) => {
    const key = pointKey(start);
    outgoing.set(key, [...(outgoing.get(key) ?? []), end]);
  };
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && Boolean(mask[y * width + x]);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!filled(x, y)) continue;
    if (!filled(x, y - 1)) add({ x, y }, { x: x + 1, y });
    if (!filled(x + 1, y)) add({ x: x + 1, y }, { x: x + 1, y: y + 1 });
    if (!filled(x, y + 1)) add({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
    if (!filled(x - 1, y)) add({ x, y: y + 1 }, { x, y });
  }
  const loops: SketchVectorLoop[] = [];
  while (outgoing.size) {
    const firstKey = outgoing.keys().next().value as string;
    const [x, y] = firstKey.split(",").map(Number);
    const start = { x, y };
    const loop: PixelPoint[] = [start];
    let current = start;
    for (let guard = 0; guard < width * height * 8; guard += 1) {
      const options = outgoing.get(pointKey(current));
      if (!options?.length) break;
      const next = options.pop()!;
      if (!options.length) outgoing.delete(pointKey(current));
      if (next.x === start.x && next.y === start.y) break;
      loop.push(next);
      current = next;
    }
    const simplified = loop.filter((point, index) => {
      const previous = loop[(index - 1 + loop.length) % loop.length];
      const next = loop[(index + 1) % loop.length];
      return (point.x - previous.x) * (next.y - point.y) !== (point.y - previous.y) * (next.x - point.x);
    });
    if (simplified.length >= 3) loops.push(simplified.map((point) => ({ x: point.x, z: point.y })));
  }
  return loops;
}

export async function vectorEntityFromRaster(file: File): Promise<Extract<SketchEntity, { kind: "vector" }>> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_TRACE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("El navegador no pudo preparar la imagen para vectorizar");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  const mask = Array.from({ length: width * height }, (_, index) => {
    const offset = index * 4;
    const luminance = pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
    return pixels[offset + 3] > 24 && luminance < 160;
  });
  const loops = normalizeLoops(traceBinaryMask(mask, width, height));
  if (loops.reduce((total, loop) => total + loop.length, 0) > 20_000) throw new Error("La imagen produce demasiados puntos; simplifica el gráfico antes de importarlo");
  return {
    id: createLocalId("sketch-trace"),
    kind: "vector",
    cx: 0,
    cz: 0,
    name: file.name.replace(/\.[^.]+$/, "") || "Imagen vectorizada",
    loops,
    scaleX: 1,
    scaleZ: 1,
    rotation: 0,
    sourceFormat: "trace",
  };
}

export async function vectorEntityFromFile(file: File) {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return vectorEntityFromSvg(file.name, await file.text());
  }
  if (!file.type.startsWith("image/")) throw new Error("Elige SVG, PNG, JPG, WebP, GIF o BMP");
  return vectorEntityFromRaster(file);
}
