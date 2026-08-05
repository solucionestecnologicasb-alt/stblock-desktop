#!/usr/bin/env node
// Genera los STL precargados de la librería de formas (objetos estrella).
//
// Ejecutar una vez desde la raíz del repo:
//   node scripts/generate-library-stls.mjs
//
// Escribe en apps/web/public/assets/sketchforge/library/stl/*.stl.
// Las dimensiones/posiciones replican las specs paramétricas de
// apps/web/src/lib/shapeLibrary.ts para que el fallback visual sea idéntico.
//
// Dev-only: si STLExporter no estuviera disponible en Node, los assets
// correspondientes se mantienen paramétricos (buildLibraryShape cae al
// ensamblaje si el fetch del STL falla), así que el fallo no rompe la app.

import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, "apps", "web", "public", "assets", "sketchforge", "library", "stl");

function box(width, depth, height, x = 0, z = 0, elevation = 0, { rotation = 0, rotationX = 0, rotationZ = 0 } = {}) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.rotateX(THREE.MathUtils.degToRad(rotationX));
  geometry.rotateY(THREE.MathUtils.degToRad(rotation));
  geometry.rotateZ(THREE.MathUtils.degToRad(rotationZ));
  geometry.translate(x, elevation + height / 2, z);
  return geometry;
}

function cylinder(radius, height, x = 0, z = 0, elevation = 0, sides = 64) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, sides);
  geometry.translate(x, elevation + height / 2, z);
  return geometry;
}

// Cilindro tumbado con el eje a lo largo de Z (equivalente a rotationX:90 en la
// spec paramétrica).
function cylinderAlongZ(radius, length, x = 0, z = 0, elevation = 0, sides = 64) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, sides);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, elevation + radius, z);
  return geometry;
}

function sphere(radius, x = 0, z = 0, elevation = 0) {
  const geometry = new THREE.SphereGeometry(radius, 24, 16);
  geometry.translate(x, elevation + radius, z);
  return geometry;
}

function cone(radius, height, x = 0, z = 0, elevation = 0, sides = 64) {
  const geometry = new THREE.ConeGeometry(radius, height, sides);
  geometry.translate(x, elevation + height / 2, z);
  return geometry;
}

function mesh(geometry) {
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#aaaaaa" }));
}

function buildMotorDc() {
  const root = new THREE.Group();
  root.add(mesh(cylinder(10, 22, 0, 0, 0))); // cuerpo
  root.add(mesh(cylinder(1.8, 6, 0, 0, 22))); // eje
  root.add(mesh(box(30, 20, 3, 0, 0, 0))); // base
  root.add(mesh(cylinderAlongZ(1.2, 12, -15, -8, 0))); // cable rojo
  root.add(mesh(cylinderAlongZ(1.2, 12, -15, 8, 0))); // cable negro
  return root;
}

function buildArduinoUno() {
  const root = new THREE.Group();
  root.add(mesh(box(70, 54, 3, 0, 0, 0))); // placa
  root.add(mesh(box(12, 12, 2, -16, -10, 3))); // chip
  root.add(mesh(box(16, 8, 3, 0, 25, 3))); // usb
  for (let index = 0; index < 9; index += 1) {
    const x = -28 + index * 7;
    root.add(mesh(box(4, 1.6, 4, x, -22, 3))); // pin superior
    root.add(mesh(box(4, 1.6, 4, x, 22, 3))); // pin inferior
  }
  return root;
}

function buildLed() {
  const root = new THREE.Group();
  root.add(mesh(sphere(4, 0, 0, 10))); // lente
  root.add(mesh(cylinder(2.5, 4, 0, 0, 5))); // cuerpo
  root.add(mesh(cylinder(0.5, 6, -1.5, 0, 0))); // pata larga
  root.add(mesh(cylinder(0.5, 5, 1.5, 0, 0))); // pata corta
  return root;
}

const exporters = {
  "motor-dc": buildMotorDc,
  "arduino-uno": buildArduinoUno,
  led: buildLed,
};

mkdirSync(outDir, { recursive: true });

const stlExporter = new STLExporter();
for (const [name, build] of Object.entries(exporters)) {
  try {
    const object = build();
    const result = stlExporter.parse(object, { binary: true });
    const bytes = Buffer.from(result.buffer, result.byteOffset, result.byteLength);
    writeFileSync(join(outDir, `${name}.stl`), bytes);
    console.log(`[library-stl] ${name}.stl (${bytes.byteLength} bytes)`);
  } catch (error) {
    console.error(`[library-stl] no se pudo generar ${name}.stl: ${error instanceof Error ? error.message : error}`);
    console.error("[library-stl] el asset queda paramétrico (se elimina stlPath o el fetch fallará y caerá al ensamblaje).");
  }
}
