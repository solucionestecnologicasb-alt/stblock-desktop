import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import droidMonoFontJson from "three/examples/fonts/droid/droid_sans_mono_regular.typeface.json";
import droidSansBoldFontJson from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import droidSerifBoldFontJson from "three/examples/fonts/droid/droid_serif_bold.typeface.json";
import gentilisBoldFontJson from "three/examples/fonts/gentilis_bold.typeface.json";
import helvetikerBoldFontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import optimerBoldFontJson from "three/examples/fonts/optimer_bold.typeface.json";
import type { SketchEntity, SketchTextFont, SketchVectorLoop } from "@/types/sketchforge";

const loader = new FontLoader();
const fonts: Record<SketchTextFont, Font> = {
  Multilanguage: loader.parse(helvetikerBoldFontJson as FontData),
  Sans: loader.parse(droidSansBoldFontJson as FontData),
  Serif: loader.parse(droidSerifBoldFontJson as FontData),
  Script: loader.parse(gentilisBoldFontJson as FontData),
  Monospace: loader.parse(droidMonoFontJson as FontData),
  Rounded: loader.parse(optimerBoldFontJson as FontData),
  Stencil: loader.parse(helvetikerBoldFontJson as FontData),
};

export const SKETCH_TEXT_FONTS = Object.keys(fonts) as SketchTextFont[];

function withoutRepeatedEnd(loop: SketchVectorLoop) {
  if (loop.length < 2) return loop;
  const first = loop[0];
  const last = loop[loop.length - 1];
  return Math.hypot(first.x - last.x, first.z - last.z) < 1e-7 ? loop.slice(0, -1) : loop;
}

function centered(loops: SketchVectorLoop[]) {
  const all = loops.flat();
  if (!all.length) return loops;
  const minX = Math.min(...all.map((point) => point.x));
  const maxX = Math.max(...all.map((point) => point.x));
  const minZ = Math.min(...all.map((point) => point.z));
  const maxZ = Math.max(...all.map((point) => point.z));
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return loops.map((loop) => loop.map((point) => ({ x: point.x - centerX, z: point.z - centerZ })));
}

export function textEntityBaseLoops(text: string, font: SketchTextFont, size: number): SketchVectorLoop[] {
  const safeText = text.replace(/[\r\n]+/g, " ").slice(0, 120);
  if (!safeText.trim()) return [];
  const shapes = fonts[font].generateShapes(safeText, Math.max(0.1, Math.min(300, size)));
  const loops = shapes.flatMap((shape) => {
    const extracted = shape.extractPoints(12);
    return [
      withoutRepeatedEnd(extracted.shape.map((point) => ({ x: point.x, z: -point.y }))),
      ...extracted.holes.map((hole) => withoutRepeatedEnd(hole.map((point) => ({ x: point.x, z: -point.y })))),
    ];
  }).filter((loop) => loop.length >= 3);
  return centered(loops);
}

export function entityContourLoops(entity: SketchEntity): SketchVectorLoop[] {
  let loops: SketchVectorLoop[];
  if (entity.kind === "text") loops = textEntityBaseLoops(entity.text, entity.font, entity.size);
  else if (entity.kind === "vector") loops = entity.loops;
  else return [];

  const radians = entity.rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return loops.map((loop) => loop.map((point) => {
    const x = point.x * entity.scaleX;
    const z = point.z * entity.scaleZ;
    return {
      x: entity.cx + x * cosine - z * sine,
      z: entity.cz + x * sine + z * cosine,
    };
  }));
}

export function entityContourPathData(entity: SketchEntity) {
  const loops = entityContourLoops(entity);
  if (!loops.length) return null;
  return loops.map((loop) => `M ${loop.map((point) => `${point.x} ${point.z}`).join(" L ")} Z`).join(" ");
}

export function entityContourBounds(entity: SketchEntity) {
  const points = entityContourLoops(entity).flat();
  if (!points.length) return { width: 0, depth: 0 };
  return {
    width: Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)),
    depth: Math.max(...points.map((point) => point.z)) - Math.min(...points.map((point) => point.z)),
  };
}
