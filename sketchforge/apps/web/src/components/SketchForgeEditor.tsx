"use client";

import { Check, CloudUpload, Download, FileImage, FolderOpen, Hexagon, Minus, Pencil, Triangle, Type, X } from "lucide-react";
import type manifoldModule from "manifold-3d";
import type { ManifoldToplevel } from "manifold-3d";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ADDITION, Brush, Evaluator, HOLLOW_INTERSECTION, HOLLOW_SUBTRACTION, INTERSECTION, SUBTRACTION, type CSGOperation } from "three-bvh-csg";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import droidMonoFontJson from "three/examples/fonts/droid/droid_sans_mono_regular.typeface.json";
import droidSansBoldFontJson from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import droidSerifBoldFontJson from "three/examples/fonts/droid/droid_serif_bold.typeface.json";
import gentilisBoldFontJson from "three/examples/fonts/gentilis_bold.typeface.json";
import helvetikerBoldFontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import optimerBoldFontJson from "three/examples/fonts/optimer_bold.typeface.json";
import type { AppThemePreference, ResolvedAppTheme } from "@/lib/appTheme";
import { manifoldModuleSource } from "@/generated/manifoldModuleSource";
import { manifoldWasmBase64 } from "@/generated/manifoldWasmBase64";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { vectorEntityFromFile } from "@/lib/sketchVectorImport";
import { createGearGeometry } from "@/lib/gearGeometry";
import {
  SketchEntityArcIcon,
  SketchEntityCircleIcon,
  SketchEntityRectangleIcon,
  SketchEntitySemicircleIcon,
  ToolbarAlignIcon,
  ToolbarChamferIcon,
  ToolbarCaretDownIcon,
  ToolbarCopyIcon,
  ToolbarDuplicateIcon,
  ToolbarDropToWorkplaneIcon,
  ToolbarExportIcon,
  ToolbarRaiseToWorkplaneIcon,
  ToolbarGroupIcon,
  ToolbarHideSelectedIcon,
  ToolbarHomeIcon,
  ToolbarImportIcon,
  ToolbarIntersectionIcon,
  ToolbarFilletIcon,
  ToolbarMirrorIcon,
  ToolbarPasteIcon,
  ToolbarPushPullIcon,
  ToolbarRedoIcon,
  ToolbarSnapGridIcon,
  ToolbarSettingsIcon,
  ToolbarTrashIcon,
  ToolbarUngroupIcon,
  ToolbarUndoIcon,
  ToolbarVectorExportIcon,
  ToolbarWorkplaneIcon,
} from "./icons";
import { WorkplaneViewport } from "./WorkplaneViewport";
import { ShapeLibrary } from "./ShapeLibrary";
import type { SketchMeasurement, SketchSelection, SketchTool } from "./SketchWorkspace";
import {
  canonicalizeShape,
  canonicalizeShapes,
  cleanNearZero,
  cleanRotationDegrees,
  fallbackSolidColor,
  meshYawDegrees,
  mirroredAxisCount,
  mirrorSign,
  normalizeDegrees,
  preservesEdgeTreatmentSize,
  resizedImportedMeshPositions,
  serializeShapesForSync,
  shapeDepth,
  shapeWidth,
  withHoleMode,
  workplaneShapesEqual,
} from "@/lib/workplaneShapes";
import { bakeCadMetadataForShapeTransform, cadBrepTransformForShape, cadModifierPrimitiveForAnalyticBox, cadModifierPrimitiveForBakedShape } from "@/lib/cadBakeMetadata";
import { hasOneToOneCadComponentMapping } from "@/lib/cadModifierGroups";
import {
  CAD_MODIFIER_MAX_SHARP_ANGLE,
  CAD_MODIFIER_REQUEST_TIMEOUT_MS,
  cadModifierTimeoutMessage,
  cadModifierWorkerFailureMessage,
  defaultCadModifierTangentChain,
  selectableCadModifierEdge,
  type CadModifierRequestPhase,
} from "@/lib/cadModifierRuntime";
import { cloneWorkplaneShapeSnapshot, compactEdgeTreatmentHistory, edgeTreatmentAppliedFrame, restoreShapeBeforeEdgeTreatment } from "@/lib/edgeTreatmentHistory";
import { appendEditorHistorySnapshot, boundedEditorHistoryState, editorHistoryEntry, editorHistoryForExport, hydrateEditorHistoryState, projectShapesFingerprint, type EditorHistoryEntry, type EditorHistoryExportLimit, type EditorHistoryState } from "@/lib/editorHistory";
import { snapShapeFootprintToVisibleGrid, visibleGridStep } from "@/lib/gridSnap";
import { alignTargetValue, snapToGridValue } from "@/lib/meshTopologyEdit";
import { createLocalId } from "@/lib/localIds";
import { projectExportFileName } from "@/lib/exportNames";
import { attachProjectAsset, dedupeProjectAssets, projectAssetFromBytes, sourceFormatForFileName } from "@/lib/projectAssets";
import { findSketchOutlineIntersection } from "@/lib/sketchProfileValidation";
import { buildSketchRevolveMesh, DEFAULT_SKETCH_REVOLVE_SETTINGS, normalizeSketchRevolveSettings, type SketchRevolveMesh } from "@/lib/sketchRevolve";
import { entityFromDrag, materializeSketchEntities, tessellateSketchEntity } from "@/lib/capGeometry";
import type { Direct2DDrawTool } from "@/lib/direct2dDrawing";
import { appendCapTimelineEntry, capSectionHasUsableProfile, capSectionToolHeight, capSectionToolPlane, createCapSection as newCapSection, emptyCapDocument, normalizeCapDocument, planeElevation, reconcileCapDocument } from "@/lib/capDocument";
import { exportSkfProject, SKF_MEDIA_TYPE } from "@/lib/skfProject";
import { sceneShape } from "@/lib/shapeCatalog";
import { buildLibraryShape, findLibraryAsset } from "@/lib/shapeLibrary";
import { importedShapeFromStl, importExtensionSupported } from "@/lib/stlImport";
import { importedShapeFromSvg, invalidSvgMeshReason } from "@/lib/svgImport";
import { toSvgProjection, type SvgProjectionLayer } from "@/lib/svgExport";
import { normalizeSnapGrid, normalizeWorkspaceSettings, workplaneSettingsFingerprint } from "@/lib/workplaneSettings";
import { placementFromPlane } from "@/lib/planeBasis";
import {
  SKETCHFORGE_MCP_POLL_MS,
  SKETCHFORGE_MCP_ROUTE,
  type SketchForgeMcpCommand,
  type SketchForgeMcpSceneSummary,
  type SketchForgeMcpShapeSummary,
  type SketchForgeMcpViewFace,
} from "@/lib/sketchforgeMcpProtocol";
import type { CadModifierComponentMesh, CadModifierDisplayEdge, CadModifierEdge, CadModifierKind, CadModifierMeshPart, CadModifierPrimitivePart, CadModifierQuality, CadModifierWorkerRequest, CadModifierWorkerResponse, CadTopologyEdge, CadTopologyFace, CadTopologyPick, CadTopologyPickKind, CadTopologyVertex } from "@/lib/cadModifierTypes";
import type { AlignAxis, AlignHandleStatus, AlignTarget, CapDocument, CapSection, CapSectionUnionMode, GridSize, ProjectAsset, ShapeAsset, SketchEntity, SketchImage, SketchOperation, SketchPoint, SketchProfile, SketchRevolveSettings, SketchSegment, SketchShapeBuildOptions, WorkplanePlane, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/sketchforge";

const SketchWorkspace = dynamic(() => import("./SketchWorkspace").then((module) => module.SketchWorkspace), { ssr: false });
const TopologyInspector = dynamic(() => import("./TopologyInspector").then((module) => module.TopologyInspector), { ssr: false });
const EdgeModifierPanel = dynamic(() => import("./workplane/EdgeModifierPanel").then((module) => module.EdgeModifierPanel), { ssr: false });

export { importedShapeFromStl, importedShapeFromSvg };

type TopPanel = "import" | "export" | "tips" | "profile" | "settings" | null;
type ExportFormat = "stl" | "obj" | "step" | "svg" | "skf";
type DirectExportFormat = Exclude<ExportFormat, "step" | "skf">;
type SkfHistoryLimit = EditorHistoryExportLimit;
type SkfExportTarget = "download" | "shared";
type ToolbarMode = "geometry" | "sketch";
type Vec3 = [number, number, number];
type MeshData = { name: string; vertices: Vec3[]; faces: [number, number, number][] };
type Cuboid = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
type ShapeUpdatePatch = Partial<WorkplaneShape> & { bakeTransform?: boolean };
// Spec de forma que llega desde el intérprete 3D de la IA (ai-3d-interpreter.js):
// el intérprete garantiza kind/name/color, el resto son parámetros opcionales.
type AiImportShapeSpec = Partial<WorkplaneShape> & Pick<WorkplaneShape, "name" | "kind" | "color">;
type WithoutRequestId<T> = T extends unknown ? Omit<T, "requestId"> : never;
type CadModifierWorkerPayload = WithoutRequestId<CadModifierWorkerRequest>;
type EdgeModifierSession = {
  kind: CadModifierKind;
  edges: CadModifierEdge[];
  selectedEdgeIds: number[];
  amount: number;
  sharpAngle: number;
  chamferAngle: number;
  quality: CadModifierQuality;
  tangentChain: boolean;
  preserveEdgeSize: boolean;
  busy: boolean;
  prepared: boolean;
  error: string | null;
  preview: WorkplaneShape | null;
  componentPreviews: EdgeModifierComponentPreview[];
};

type EdgeModifierComponentPreview = {
  owner: number;
  shape: WorkplaneShape;
};
type EdgeFeatureRevertOption = {
  id: string;
  entryId: string;
  path: number[];
  label: string;
  targetName: string;
  createdAt: number;
  removesNewerCount: number;
};
type ManifoldSolid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;
type DownloadResult = { mode: "browser" } | { mode: "folder"; path: string };
type GroupBuildResult = {
  group: WorkplaneShape | null;
  booleanSelection: WorkplaneShape[];
  hasSolid: boolean;
  hasHole: boolean;
  hasImportedMesh: boolean;
  consumed: boolean;
  failureNotice: string;
};
type IntersectionAttempt =
  | { status: "success"; group: WorkplaneShape }
  | { status: "empty" }
  | { status: "unsupported" };
type IntersectionBuildResult = {
  group: WorkplaneShape | null;
  empty: boolean;
  failureNotice: string;
};
type BooleanAutomationMode = "before" | "after" | "ungroup";
type BooleanAutomationResult = {
  ok: boolean;
  caseId: string;
  label: string;
  mode: BooleanAutomationMode;
  notice: string;
  shapeCount: number;
  selectedCount: number;
  triangleCount?: number;
  groupedCount?: number;
  groupId?: string;
  error?: string;
};
const DOWNLOAD_MODE_STORAGE_KEY = "sketchForge.downloadMode";
const DOWNLOAD_FOLDER_STORAGE_KEY = "sketchForge.downloadFolder";
const SHARED_CLIPBOARD_STORAGE_KEY = "sketchForge.clipboard";
const SYSTEM_CLIPBOARD_PREFIX = "SKETCHFORGE3D/1\n";
const STATIC_EXPORT_BUILD = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

declare global {
  interface Window {
    __sketchforgeBooleanTest?: BooleanAutomationResult;
    __sketchforgeBooleanTestImage?: string;
    sketchforgeCaptureCanvas?: () => string;
    sketchforgeCaptureCanvasAsync?: () => Promise<string>;
    sketchforgeCaptureView?: (face?: SketchForgeMcpViewFace) => Promise<string> | string;
  }
}

const CUTTER_PADDING = 0.05;
const POINT_TOLERANCE = 0.0001;
const CUTTER_RESIDUAL_INSET = CUTTER_PADDING * 0.4;
const MIN_SHAPE_DIMENSION = 0.01;
const MAX_SKETCH_HISTORY_ENTRIES = 100;
const MODEL_DIMENSION_PRECISION = 3;
const IMPORTED_EXACT_BOOLEAN_TRIANGLE_LIMIT = 150000;
const COPLANAR_BOOLEAN_RESCUE_DEGREES = 0.02;
const NORMAL_SELECTION_CAD_EDGE_MIN_ANGLE = 60;
const MIN_EDGE_MODIFIER_AMOUNT = 0.001;
const SEPARATE_PARTS_VERTEX_TOLERANCE = 0.0005;
// Extra extrusion length in "Cortar" (cut) mode so the tool's top cap pokes just
// above the host face, guaranteeing the boolean cut opens cleanly at the face.
const CAP_CUT_OVERHANG = 0.25;
const booleanFontLoader = new FontLoader();
const booleanTextFonts: Record<string, Font> = {
  Multilanguage: booleanFontLoader.parse(helvetikerBoldFontJson as FontData),
  Sans: booleanFontLoader.parse(droidSansBoldFontJson as FontData),
  Serif: booleanFontLoader.parse(droidSerifBoldFontJson as FontData),
  Script: booleanFontLoader.parse(gentilisBoldFontJson as FontData),
  Monospace: booleanFontLoader.parse(droidMonoFontJson as FontData),
  Rounded: booleanFontLoader.parse(optimerBoldFontJson as FontData),
  Stencil: booleanFontLoader.parse(helvetikerBoldFontJson as FontData),
};
let manifoldRuntimePromise: Promise<ManifoldToplevel> | null = null;

function emptySketchProfile(): SketchProfile {
  return { points: [], segments: [], images: [], entities: [] };
}

function cloneSketchProfile(profile: SketchProfile): SketchProfile {
  return {
    points: profile.points.map((point) => ({
      ...point,
      handleIn: point.handleIn ? { ...point.handleIn } : undefined,
      handleOut: point.handleOut ? { ...point.handleOut } : undefined,
    })),
    segments: profile.segments.map((segment) => ({ ...segment })),
    images: (profile.images ?? []).map((image) => ({ ...image })),
    entities: (profile.entities ?? []).map((entity) => entity.kind === "vector"
      ? { ...entity, loops: entity.loops.map((loop) => loop.map((point) => ({ ...point }))) }
      : { ...entity }),
  };
}

type OrderedSketchStep = { segment: SketchProfile["segments"][number]; from: SketchPoint; to: SketchPoint };
type OrderedSketchPath = { points: SketchPoint[]; steps: OrderedSketchStep[]; closed: boolean };

function orderedSketchPaths(profile: SketchProfile): OrderedSketchPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchProfile["segments"][number] }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const validSegments = profile.segments.filter((segment) => {
    if (!pointById.has(segment.startId) || !pointById.has(segment.endId) || segment.startId === segment.endId) return;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(validSegments.map((segment) => segment.id));
  const paths: OrderedSketchPath[] = [];
  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string | undefined;
    const seed = validSegments.find((segment) => segment.id === seedId);
    if (!seed) break;
    const componentIds = new Set<string>();
    const queue = [seed.startId, seed.endId];
    while (queue.length > 0) {
      const id = queue.pop();
      if (!id || componentIds.has(id)) continue;
      componentIds.add(id);
      adjacency.get(id)?.forEach((entry) => queue.push(entry.pointId));
    }
    const startId = [...componentIds].find((id) => (adjacency.get(id)?.filter((entry) => unvisited.has(entry.segment.id)).length ?? 0) === 1) ?? seed.startId;
    const first = pointById.get(startId);
    if (!first) {
      unvisited.delete(seed.id);
      continue;
    }
    const points = [first];
    const steps: OrderedSketchStep[] = [];
    let currentId = startId;
    for (let guard = 0; guard <= validSegments.length; guard += 1) {
      const edge = adjacency.get(currentId)?.find((entry) => unvisited.has(entry.segment.id));
      if (!edge) break;
      const from = pointById.get(currentId);
      const to = pointById.get(edge.pointId);
      if (!from || !to) break;
      unvisited.delete(edge.segment.id);
      steps.push({ segment: edge.segment, from, to });
      currentId = to.id;
      if (currentId === startId) break;
      points.push(to);
    }
    paths.push({ points, steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

function withSmoothSketchHandles(profile: SketchProfile) {
  const next = cloneSketchProfile(profile);
  const points = new Map(next.points.map((point) => [point.id, point]));
  orderedSketchPaths(next).forEach((path) => {
    path.points.forEach((sourcePoint, index) => {
      const point = points.get(sourcePoint.id);
      if (!point) return;
      const previous = path.closed ? path.points[(index - 1 + path.points.length) % path.points.length] : path.points[Math.max(0, index - 1)];
      const following = path.closed ? path.points[(index + 1) % path.points.length] : path.points[Math.min(path.points.length - 1, index + 1)];
      const tangentX = (following.x - previous.x) / 6;
      const tangentZ = (following.z - previous.z) / 6;
      point.handleIn = { x: point.x - tangentX, z: point.z - tangentZ };
      point.handleOut = { x: point.x + tangentX, z: point.z + tangentZ };
      point.mode = "smooth";
    });
  });
  return next;
}

function pointInSketchPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = currentPoint.y > point.y !== previousPoint.y > point.y;
    if (crosses && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x) {
      inside = !inside;
    }
  }
  return inside;
}

async function shapeFromResolvedSketchProfile(
  profile: SketchProfile,
  polygons: Array<Array<[number, number]>>,
  height: number,
  centerX: number,
  centerZ: number,
  existing?: WorkplaneShape | null,
  options?: SketchShapeBuildOptions,
) {
  const runtime = await getManifoldRuntime();
  const disposable: unknown[] = [];
  try {
    const section = new runtime.CrossSection(polygons, "EvenOdd");
    disposable.push(section);
    const coordinateScale = polygons.reduce(
      (largest, polygon) => polygon.reduce((polygonLargest, point) => Math.max(polygonLargest, Math.abs(point[0]), Math.abs(point[1])), largest),
      1,
    );
    const simplified = section.simplify(Math.max(1e-7, coordinateScale * 1e-8));
    disposable.push(simplified);
    if (simplified.toPolygons().length === 0) throw new Error("El boceto no tiene área rellena después de resolver sus cruces");

    const solid = simplified.extrude(height);
    disposable.push(solid);
    if (solid.status() !== "NoError" || solid.numTri() < 1) {
      throw new Error("El boceto con cruces no se pudo convertir en un sólido válido");
    }

    const manifoldPositions = manifoldMeshToPositions(solid.getMesh());
    const positions = new Array<number>(manifoldPositions.length);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    for (let index = 0; index + 2 < manifoldPositions.length; index += 3) {
      const x = manifoldPositions[index];
      const y = manifoldPositions[index + 2];
      const z = -manifoldPositions[index + 1];
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    const localCenterX = (minX + maxX) / 2;
    const localCenterZ = (minZ + maxZ) / 2;
    for (let index = 0; index + 2 < positions.length; index += 3) {
      positions[index] -= localCenterX;
      positions[index + 2] -= localCenterZ;
    }
    const meshWidth = Math.max(0.01, maxX - minX);
    const meshDepth = Math.max(0.01, maxZ - minZ);
    const planePlacement = options?.plane ? placementFromPlane(options.plane, height) : null;
    const placement = planePlacement ?? options?.placement ?? {};
    return canonicalizeShape({
      id: existing?.id ?? createLocalId("sketch-extrusion"),
      name: existing?.name ?? "Extrusión de boceto",
      kind: "mesh",
      color: existing?.color ?? "#d41721",
      hole: existing?.hole,
      x: placement.x ?? centerX + localCenterX,
      z: placement.z ?? centerZ + localCenterZ,
      elevation: planePlacement ? planePlacement.elevation : (options?.elevation ?? placement.elevation ?? 0),
      size: Math.max(meshWidth, meshDepth),
      width: meshWidth,
      depth: meshDepth,
      height,
      rotation: placement.rotation ?? 0,
      rotationX: placement.rotationX ?? 0,
      rotationZ: placement.rotationZ ?? 0,
      importedMesh: {
        positions,
        baseWidth: meshWidth,
        baseDepth: meshDepth,
        baseHeight: height,
        triangleCount: Math.floor(positions.length / 9),
        sourceFormat: "json",
      },
      sketchProfile: cloneSketchProfile(profile),
      sketchOperation: "extrude",
    } satisfies WorkplaneShape);
  } finally {
    [...new Set(disposable)].reverse().forEach(disposeManifold);
  }
}

async function shapeFromSketchProfile(profile: SketchProfile, height: number, existing?: WorkplaneShape | null, options?: SketchShapeBuildOptions) {
  const closedPaths = orderedSketchPaths(profile).filter((path) => path.closed);
  if (closedPaths.length === 0) return null;
  const profilePoints = closedPaths.flatMap((path) => path.points);
  const minX = Math.min(...profilePoints.map((point) => point.x));
  const maxX = Math.max(...profilePoints.map((point) => point.x));
  const minZ = Math.min(...profilePoints.map((point) => point.z));
  const maxZ = Math.max(...profilePoints.map((point) => point.z));
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = Math.max(0.01, maxX - minX);
  const depth = Math.max(0.01, maxZ - minZ);
  const safeHeight = Math.max(0.01, height);
  const outlineRecords = closedPaths.map((path) => {
    const outline = new THREE.Shape();
    const first = path.points[0];
    outline.moveTo(first.x - centerX, -(first.z - centerZ));
    path.steps.forEach(({ segment, from, to }) => {
      const forward = segment.startId === from.id;
      const control1 = forward ? from.handleOut : from.handleIn;
      const control2 = forward ? to.handleIn : to.handleOut;
      if (segment.kind !== "line" && control1 && control2) {
        outline.bezierCurveTo(
          control1.x - centerX,
          -(control1.z - centerZ),
          control2.x - centerX,
          -(control2.z - centerZ),
          to.x - centerX,
          -(to.z - centerZ),
        );
      } else {
        outline.lineTo(to.x - centerX, -(to.z - centerZ));
      }
    });
    outline.closePath();
    const polygon = outline.extractPoints(16).shape;
    return { outline, polygon, area: Math.abs(THREE.ShapeUtils.area(polygon)) };
  });
  const hasCurves = profile.segments.some((segment) => segment.kind === "bezier" || segment.kind === "smooth");
  const longestHandle = profile.points.reduce((longest, point) => Math.max(
    longest,
    point.handleIn ? Math.hypot(point.handleIn.x - point.x, point.handleIn.z - point.z) : 0,
    point.handleOut ? Math.hypot(point.handleOut.x - point.x, point.handleOut.z - point.z) : 0,
  ), 0);
  const curveScale = Math.max(width, depth, longestHandle * 2);
  const curveSegments = hasCurves ? Math.min(256, Math.max(32, Math.ceil(curveScale * 1.25))) : 1;
  const sampledPolygons = outlineRecords.map((record) => record.outline.extractPoints(curveSegments).shape);
  if (findSketchOutlineIntersection(sampledPolygons)) {
    return shapeFromResolvedSketchProfile(
      profile,
      sampledPolygons.map((polygon) => polygon.map((point) => [point.x, point.y] as [number, number])),
      safeHeight,
      centerX,
      centerZ,
      existing,
      options,
    );
  }
  const sortedOutlines = [...outlineRecords].sort((a, b) => b.area - a.area);
  const outlines: THREE.Shape[] = [];
  sortedOutlines.forEach((record) => {
    const sample = record.polygon[0];
    const parent = sample
      ? sortedOutlines
          .filter((candidate) => candidate !== record && candidate.area > record.area && pointInSketchPolygon(sample, candidate.polygon))
          .sort((a, b) => a.area - b.area)[0]
      : undefined;
    if (parent) parent.outline.holes.push(record.outline);
    else outlines.push(record.outline);
  });
  const geometry = new THREE.ExtrudeGeometry(outlines, { depth: safeHeight, bevelEnabled: false, steps: 1, curveSegments });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const geometryBox = geometry.boundingBox;
  const meshWidth = Math.max(0.01, geometryBox ? geometryBox.max.x - geometryBox.min.x : width);
  const meshDepth = Math.max(0.01, geometryBox ? geometryBox.max.z - geometryBox.min.z : depth);
  const meshCenterX = centerX + (geometryBox ? (geometryBox.min.x + geometryBox.max.x) / 2 : 0);
  const meshCenterZ = centerZ + (geometryBox ? (geometryBox.min.z + geometryBox.max.z) / 2 : 0);
  const meshGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = meshGeometry.getAttribute("position");
  const normal = meshGeometry.getAttribute("normal");
  const positions = Array.from(position.array as ArrayLike<number>);
  const normals = normal ? Array.from(normal.array as ArrayLike<number>) : undefined;
  if (meshGeometry !== geometry) meshGeometry.dispose();
  geometry.dispose();
  const planePlacement = options?.plane ? placementFromPlane(options.plane, safeHeight) : null;
  const placement = planePlacement ?? options?.placement ?? {};
  const mirrorPlacement = planePlacement ? null : options?.placement ?? null;
  return canonicalizeShape({
    id: existing?.id ?? createLocalId("sketch-extrusion"),
    name: existing?.name ?? "Extrusión de boceto",
    kind: "mesh",
    color: existing?.color ?? "#d41721",
    hole: existing?.hole,
    x: placement.x ?? meshCenterX,
    z: placement.z ?? meshCenterZ,
    elevation: planePlacement ? planePlacement.elevation : (options?.elevation ?? placement.elevation ?? 0),
    size: Math.max(meshWidth, meshDepth),
    width: meshWidth,
    depth: meshDepth,
    height: safeHeight,
    rotation: placement.rotation ?? 0,
    rotationX: placement.rotationX ?? 0,
    rotationZ: placement.rotationZ ?? 0,
    mirrorX: mirrorPlacement?.mirrorX ?? undefined,
    mirrorY: mirrorPlacement?.mirrorY ?? undefined,
    mirrorZ: mirrorPlacement?.mirrorZ ?? undefined,
    importedMesh: {
      positions,
      normals,
      baseWidth: meshWidth,
      baseDepth: meshDepth,
      baseHeight: safeHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "extrude",
    ...(options?.capSectionId ? { capSectionId: options.capSectionId } : {}),
  } satisfies WorkplaneShape);
}

async function shapeFromRevolvedSketchProfile(
  profile: SketchProfile,
  settings: Partial<SketchRevolveSettings>,
  existing?: WorkplaneShape | null,
  options?: SketchShapeBuildOptions,
) {
  const runtime = await getManifoldRuntime();
  const normalizedSettings = normalizeSketchRevolveSettings(settings);
  const mesh = buildSketchRevolveMesh(runtime, profile, normalizedSettings);
  const planePlacement = options?.plane ? placementFromPlane(options.plane, mesh.height) : null;
  const placement = planePlacement ?? options?.placement ?? {};
  const mirrorPlacement = planePlacement ? null : options?.placement ?? null;
  return canonicalizeShape({
    id: existing?.id ?? createLocalId("sketch-revolve"),
    name: existing?.name ?? "Revolución de boceto",
    kind: "mesh",
    color: existing?.color ?? "#78b96b",
    hole: existing?.hole,
    x: placement.x ?? existing?.x ?? 0,
    z: placement.z ?? existing?.z ?? 0,
    elevation: planePlacement ? planePlacement.elevation : (options?.elevation ?? placement.elevation ?? existing?.elevation ?? 0),
    size: Math.max(mesh.width, mesh.depth),
    width: mesh.width,
    depth: mesh.depth,
    height: mesh.height,
    rotation: placement.rotation ?? existing?.rotation ?? 0,
    rotationX: placement.rotationX ?? existing?.rotationX ?? 0,
    rotationZ: placement.rotationZ ?? existing?.rotationZ ?? 0,
    mirrorX: mirrorPlacement?.mirrorX ?? existing?.mirrorX,
    mirrorY: mirrorPlacement?.mirrorY ?? existing?.mirrorY,
    mirrorZ: mirrorPlacement?.mirrorZ ?? existing?.mirrorZ,
    importedMesh: {
      positions: mesh.positions,
      baseWidth: mesh.width,
      baseDepth: mesh.depth,
      baseHeight: mesh.height,
      triangleCount: mesh.triangleCount,
      sourceFormat: "json",
    },
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "revolve",
    sketchRevolve: normalizedSettings,
    locked: existing?.locked ?? false,
    hidden: existing?.hidden ?? false,
    ...(options?.capSectionId ? { capSectionId: options.capSectionId } : {}),
  } satisfies WorkplaneShape);
}

function cleanModelDimension(value: number) {
  return Math.max(MIN_SHAPE_DIMENSION, Number(value.toFixed(MODEL_DIMENSION_PRECISION)));
}

function parseClipboardShapes(serialized: string) {
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((shape: Partial<WorkplaneShape>) => {
      const { name, kind, color } = shape;
      if (typeof name !== "string" || typeof kind !== "string" || typeof color !== "string") {
        return [];
      }
      return [canonicalizeShape(sceneShape({ ...shape, name, kind, color }))];
    });
  } catch {
    return [];
  }
}

function readSharedClipboard() {
  if (typeof window === "undefined") {
    return [];
  }
  return parseClipboardShapes(window.localStorage.getItem(SHARED_CLIPBOARD_STORAGE_KEY) ?? "[]");
}

async function readSystemClipboard() {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return [];
  }
  try {
    const value = await navigator.clipboard.readText();
    return value.startsWith(SYSTEM_CLIPBOARD_PREFIX)
      ? parseClipboardShapes(value.slice(SYSTEM_CLIPBOARD_PREFIX.length))
      : [];
  } catch {
    return [];
  }
}

function copyTextWithSelectionFallback(value: string) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return;
  }
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // The modern Clipboard API below may still succeed.
  }
  textarea.remove();
  previousFocus?.focus({ preventScroll: true });
}

function writeSharedClipboard(shapes: WorkplaneShape[]) {
  if (typeof window === "undefined") {
    return;
  }
  const serialized = serializeShapesForSync(shapes);
  try {
    window.localStorage.setItem(SHARED_CLIPBOARD_STORAGE_KEY, serialized);
  } catch {
    // The system clipboard can still carry large models if local storage is full.
  }
  const systemPayload = `${SYSTEM_CLIPBOARD_PREFIX}${serialized}`;
  copyTextWithSelectionFallback(systemPayload);
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(systemPayload).catch(() => {
      // Same-origin tabs still have the local-storage fallback.
    });
  }
}

function base64ToUint8Array(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importBundledManifoldModule() {
  const blobUrl = URL.createObjectURL(new Blob([manifoldModuleSource], { type: "text/javascript" }));
  try {
    return (await import(/* webpackIgnore: true */ blobUrl)) as { default: typeof manifoldModule };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function getManifoldRuntime() {
  const assetBase = typeof window === "undefined" ? "/" : new URL(".", window.location.href).href;
  const isFileBuild = typeof window !== "undefined" && window.location.protocol === "file:";
  const manifoldScriptUrl = new URL("manifold.js", assetBase).href;
  const runtimeModule = isFileBuild
    ? importBundledManifoldModule().then((module) => module.default)
    : import(/* webpackIgnore: true */ manifoldScriptUrl).then((module) => (module as { default: typeof manifoldModule }).default);
  manifoldRuntimePromise ??= runtimeModule
    .then((module) => {
      if (isFileBuild) {
        return (module as unknown as (config: { wasmBinary: Uint8Array }) => Promise<ManifoldToplevel>)({
          wasmBinary: base64ToUint8Array(manifoldWasmBase64),
        });
      }
      return module({
        locateFile: ((file: string) => (file.endsWith(".wasm") ? new URL("manifold.wasm", assetBase).href : new URL(file, assetBase).href)) as () => string,
      });
    })
    .then((runtime) => {
      runtime.setup();
      return runtime;
    });
  return manifoldRuntimePromise;
}
function stlBoxTrianglePositions(width: number, depth: number, height: number) {
  const x = width / 2;
  const z = depth / 2;
  const vertices: Vec3[] = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, 0, z],
    [-x, 0, z],
    [-x, height, -z],
    [x, height, -z],
    [x, height, z],
    [-x, height, z],
  ];
  const faces: [number, number, number][] = [
    [0, 1, 2],
    [0, 2, 3],
    [4, 6, 5],
    [4, 7, 6],
    [0, 5, 1],
    [0, 4, 5],
    [1, 6, 2],
    [1, 5, 6],
    [2, 7, 3],
    [2, 6, 7],
    [3, 4, 0],
    [3, 7, 4],
  ];
  return faces.flatMap((face) => face.flatMap((index) => vertices[index]));
}

function automationSolidBox(overrides: Partial<WorkplaneShape> = {}) {
  return sceneShape({
    id: "solid-cube",
    name: "Solid cube",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    width: 28,
    depth: 28,
    height: 28,
    ...overrides,
  });
}

function automationHoleBox(overrides: Partial<WorkplaneShape> = {}) {
  return sceneShape({
    id: "hole-cube",
    name: "Hole cube",
    kind: "box",
    color: "#b8c2cc",
    hole: true,
    x: 0,
    z: 0,
    elevation: -4,
    width: 13,
    depth: 40,
    height: 36,
    ...overrides,
  });
}

function automationImportedStlBox(overrides: Partial<WorkplaneShape> = {}) {
  const width = overrides.width ?? 28;
  const depth = overrides.depth ?? 28;
  const height = overrides.height ?? 28;
  return sceneShape({
    id: "imported-stl-cube",
    name: "Imported STL cube",
    kind: "mesh",
    color: "#0098c7",
    x: 0,
    z: 0,
    width,
    depth,
    height,
    importedMesh: {
      positions: stlBoxTrianglePositions(width, depth, height),
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: 12,
      sourceFormat: "stl",
    },
    ...overrides,
  });
}

function automationHoleStlBox(overrides: Partial<WorkplaneShape> = {}) {
  return automationImportedStlBox({
    id: "hole-stl",
    name: "Hole STL",
    color: "#b8c2cc",
    hole: true,
    elevation: -4,
    width: 13,
    depth: 40,
    height: 38,
    ...overrides,
  });
}

function automationImportedStlFromShapes(id: string, name: string, color: string, parts: WorkplaneShape[], overrides: Partial<WorkplaneShape> = {}) {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  parts.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
  const bounds = boundsForCuboids([{ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }, ...parts.map(meshAabb)]);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const depth = Math.max(1, bounds.maxZ - bounds.minZ);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const positions: number[] = [];
  faces.forEach(([ai, bi, ci]) => {
    [vertices[ai], vertices[bi], vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - bounds.minY, z - centerZ);
    });
  });

  return sceneShape({
    id,
    name,
    kind: "mesh",
    color,
    x: centerX,
    z: centerZ,
    elevation: bounds.minY,
    width,
    depth,
    height,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: faces.length,
      sourceFormat: "stl",
    },
    ...overrides,
  });
}

function automationRaspberryPiStl(overrides: Partial<WorkplaneShape> = {}) {
  const parts: WorkplaneShape[] = [
    sceneShape({ id: "raspi-board", name: "Board", kind: "box", color: "#1f9f5f", width: 70, depth: 48, height: 3, elevation: 0 }),
    sceneShape({ id: "raspi-soc", name: "Main chip", kind: "box", color: "#30343b", x: -8, z: 0, width: 15, depth: 15, height: 3.2, elevation: 3 }),
    sceneShape({ id: "raspi-memory", name: "Memory chip", kind: "box", color: "#2b2e34", x: 10, z: 1, width: 11, depth: 13, height: 2.8, elevation: 3 }),
    sceneShape({ id: "raspi-usb-a", name: "USB block", kind: "box", color: "#b9c1c9", x: 23, z: -13, width: 17, depth: 11, height: 9, elevation: 3 }),
    sceneShape({ id: "raspi-usb-b", name: "USB block", kind: "box", color: "#b9c1c9", x: 23, z: 4, width: 17, depth: 11, height: 9, elevation: 3 }),
    sceneShape({ id: "raspi-ethernet", name: "Ethernet jack", kind: "box", color: "#c4c9ce", x: 23, z: 18, width: 18, depth: 13, height: 11, elevation: 3 }),
    sceneShape({ id: "raspi-hdmi", name: "HDMI", kind: "box", color: "#c9c0b2", x: -15, z: -22, width: 16, depth: 5, height: 4, elevation: 3 }),
    sceneShape({ id: "raspi-camera", name: "Camera connector", kind: "box", color: "#2b2e34", x: -28, z: 4, width: 5, depth: 20, height: 3, elevation: 3 }),
    sceneShape({ id: "raspi-mount-a", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: -29, z: -17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-b", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: 29, z: -17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-c", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: -29, z: 17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-d", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: 29, z: 17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    ...Array.from({ length: 14 }, (_, index) =>
      sceneShape({
        id: `raspi-pin-${index}`,
        name: "GPIO pin",
        kind: "box",
        color: "#e2b94f",
        x: -29 + index * 4,
        z: 23,
        width: 1.6,
        depth: 2.6,
        height: 6,
        elevation: 3,
      }),
    ),
  ];
  return automationImportedStlFromShapes("raspberry-pi-stl", "Raspberry Pi-like STL", "#0098c7", parts, overrides);
}

const booleanAutomationShapeConfigs: Record<
  string,
  {
    name: string;
    kind: WorkplaneShape["kind"];
    color: string;
    width?: number;
    depth?: number;
    height?: number;
    props?: Partial<WorkplaneShape>;
  }
> = {
  cube: { name: "Cube", kind: "box", color: "#d41721" },
  cylinder: { name: "Cylinder", kind: "cylinder", color: "#d97813", props: { sides: 96, segments: 1 } },
  sphere: { name: "Sphere", kind: "sphere", color: "#0098c7", props: { steps: 28, sides: 56 } },
  cone: { name: "Cone", kind: "cone", color: "#6e2786", props: { sides: 96, topRadius: 0, baseRadius: 14 } },
  pyramid: { name: "Pyramid", kind: "pyramid", color: "#f2cf10", props: { sides: 4 } },
  wedge: { name: "Wedge", kind: "wedge", color: "#33983d" },
  text: { name: "Text", kind: "text", color: "#cf101b", width: 34, depth: 18, height: 28, props: { text: "T", font: "Sans" } },
  "round-roof": { name: "Round Roof", kind: "roundRoof", color: "#67c4ce", props: { sides: 64 } },
  "half-sphere": { name: "Half Sphere", kind: "halfSphere", color: "#c9009a", props: { steps: 32 } },
  torus: { name: "Torus", kind: "torus", color: "#0098c7", width: 34, depth: 34, height: 8, props: { sides: 96 } },
  tube: { name: "Tube", kind: "tube", color: "#ce7013", width: 34, depth: 34, height: 28, props: { bevel: 6, sides: 96 } },
};

function automationShape(key: string, overrides: Partial<WorkplaneShape> = {}) {
  const config = booleanAutomationShapeConfigs[key];
  if (!config) {
    return null;
  }

  const width = overrides.width ?? config.width ?? 28;
  const depth = overrides.depth ?? config.depth ?? 28;
  const height = overrides.height ?? config.height ?? 28;
  return sceneShape({
    id: `${overrides.hole ? "hole" : "solid"}-${key}`,
    name: config.name,
    kind: config.kind,
    color: config.color,
    x: 0,
    z: 0,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    ...config.props,
    ...overrides,
  });
}

function automationHoleShape(key: string, overrides: Partial<WorkplaneShape> = {}) {
  const shape = automationShape(key, {
    hole: true,
    color: "#b8c2cc",
    elevation: key === "torus" ? 18 : -3,
    rotation: 27,
    width: key === "text" ? 32 : key === "torus" || key === "tube" ? 34 : 24,
    depth: key === "text" ? 17 : key === "torus" || key === "tube" ? 34 : 24,
    height: key === "torus" ? 12 : 34,
    ...overrides,
  });
  return shape ? withHoleMode(shape, true) : null;
}

function automationNormalGroupedObject(overrides: Partial<WorkplaneShape> = {}) {
  const cube = automationShape("cube", { id: "normal-group-cube", x: -9, width: 18, depth: 24, height: 26 });
  const cylinder = automationShape("cylinder", { id: "normal-group-cylinder", x: 10, width: 20, depth: 20, height: 28 });
  if (!cube || !cylinder) {
    return null;
  }
  const group = groupedShape([cube, cylinder]);
  return group ? { ...group, id: "normal-group", name: "Normal grouped object", ...overrides } : null;
}

function automationSelectionOutlineRegressionShape() {
  const geometries: THREE.BufferGeometry[] = [
    new RoundedBoxGeometry(30, 20, 20, 8, 4).translate(-15, 10, 0),
    new THREE.BoxGeometry(16, 20, 20).translate(18, 10, 0),
  ];
  const positions: number[] = [];
  const normals: number[] = [];

  geometries.forEach((geometry) => {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    nonIndexed.computeVertexNormals();
    positions.push(...Array.from(nonIndexed.getAttribute("position").array as ArrayLike<number>));
    normals.push(...Array.from(nonIndexed.getAttribute("normal").array as ArrayLike<number>));
    if (nonIndexed !== geometry) {
      nonIndexed.dispose();
    }
    geometry.dispose();
  });

  return canonicalizeShape(
    sceneShape({
      id: "selection-outline-regression",
      name: "Selection outline regression",
      kind: "mesh",
      color: "#d41721",
      x: 0,
      z: 0,
      width: 56,
      depth: 20,
      height: 20,
      size: 56,
      importedMesh: {
        positions,
        normals,
        baseWidth: 56,
        baseDepth: 20,
        baseHeight: 20,
        triangleCount: Math.floor(positions.length / 9),
        sourceFormat: "json",
      },
      groupedShapes: [
        sceneShape({ id: "rounded-child", name: "Rounded child", kind: "box", color: "#d41721", x: -15, width: 30, depth: 20, height: 20, radius: 4 }),
        sceneShape({ id: "box-child", name: "Box child", kind: "box", color: "#d41721", x: 18, width: 16, depth: 20, height: 20 }),
      ],
    }),
  );
}

function booleanAutomationDynamicScene(caseId: string): { label: string; shapes: WorkplaneShape[] } | null {
  const requestedKeys = Object.keys(booleanAutomationShapeConfigs).filter((key) => key !== "cube" && key !== "cylinder");
  const allNormalKeys = Object.keys(booleanAutomationShapeConfigs);

  for (const key of requestedKeys) {
    if (caseId === `${key}-rot-hole`) {
      const solid = automationShape(key);
      return solid
        ? {
            label: `${solid.name} + rotated hole cube`,
            shapes: [solid, automationHoleBox({ rotation: 32 })],
          }
        : null;
    }

    if (caseId === `${key}-hole-cube`) {
      const hole = automationHoleShape(key);
      return hole
        ? {
            label: `${hole.name} hole + solid cube`,
            shapes: [automationSolidBox({ width: 36, depth: 36, height: 30 }), hole],
          }
        : null;
    }

    if (caseId === `${key}-hole-stl`) {
      const hole = automationHoleShape(key);
      return hole
        ? {
            label: `${hole.name} hole + imported STL`,
            shapes: [automationImportedStlBox({ width: 36, depth: 36, height: 30 }), hole],
          }
        : null;
    }
  }

  for (const key of allNormalKeys) {
    if (caseId === `hole-stl-${key}`) {
      const solid = automationShape(key, { width: key === "text" ? 42 : undefined, depth: key === "text" ? 20 : undefined });
      return solid
        ? {
            label: `rotated hole STL + ${solid.name}`,
            shapes: [
              solid,
              automationHoleStlBox({
                id: `hole-stl-${key}`,
                rotation: 29,
                rotationZ: 8,
              }),
            ],
          }
        : null;
    }

    if (caseId === `straight-hole-stl-${key}`) {
      const solid = automationShape(key, { width: key === "text" ? 42 : undefined, depth: key === "text" ? 20 : undefined });
      return solid
        ? {
            label: `non-rotated hole STL + ${solid.name}`,
            shapes: [
              solid,
              automationHoleStlBox({
                id: `straight-hole-stl-${key}`,
                rotation: 0,
                rotationZ: 0,
              }),
            ],
          }
        : null;
    }
  }

  return null;
}

function booleanAutomationScene(caseId: string): { label: string; shapes: WorkplaneShape[] } | null {
  const rotatedHole = () => automationHoleBox({ rotation: 32 });
  if (caseId === "selection-outline-regression") {
    return {
      label: "segmented rounded mesh selection outline",
      shapes: [automationSelectionOutlineRegressionShape()],
    };
  }
  if (caseId === "locked-align-pair") {
    return {
      label: "locked alignment reference pair",
      shapes: [
        sceneShape({ id: "locked-anchor", name: "Locked cube", kind: "box", color: "#d41721", x: 24, z: 10, width: 20, depth: 20, height: 20, locked: true }),
        sceneShape({ id: "moving-cube", name: "Moving cube", kind: "box", color: "#ef7f1a", x: -24, z: -18, width: 12, depth: 12, height: 12 }),
      ],
    };
  }
  if (caseId === "normal-group") {
    const group = groupedShape([
      sceneShape({ id: "modifier-base", name: "Base", kind: "box", color: "#d41721", width: 54, depth: 38, height: 7 }),
      sceneShape({ id: "modifier-upright", name: "Upright", kind: "box", color: "#d41721", x: 8, width: 14, depth: 14, height: 40, elevation: 4 }),
      sceneShape({ id: "modifier-rail", name: "Rail", kind: "box", color: "#d41721", x: -7, z: 5, width: 32, depth: 10, height: 13, elevation: 4 }),
    ]);
    return group ? { label: "overlapping normal solid group", shapes: [group] } : null;
  }
  if (caseId === "straight-hole-stl-group") {
    const group = automationNormalGroupedObject();
    return group
      ? {
          label: "normal grouped object + non-rotated hole STL",
          shapes: [group, automationHoleStlBox({ id: "straight-hole-stl-group", width: 24, depth: 42 })],
        }
      : null;
  }
  if (caseId === "straight-hole-stl-mixed-group") {
    const group = automationNormalGroupedObject({ x: 12 });
    const cube = automationShape("cube", { id: "mixed-solid-cube", x: -14, width: 24, depth: 26, height: 28 });
    return group && cube
      ? {
          label: "cube + normal grouped object + non-rotated hole STL",
          shapes: [cube, group, automationHoleStlBox({ id: "straight-hole-stl-mixed-group", width: 48, depth: 42 })],
        }
      : null;
  }
  if (caseId === "raspi-stl-hole") {
    return {
      label: "Raspberry Pi-like STL + non-rotated hole cube",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleBox({ id: "raspi-hole-cube", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 0, rotationZ: 0 }),
      ],
    };
  }
  if (caseId === "raspi-stl-rot-hole") {
    return {
      label: "Raspberry Pi-like STL + rotated hole cube",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleBox({ id: "raspi-rot-hole-cube", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 28, rotationZ: 8 }),
      ],
    };
  }
  if (caseId === "raspi-stl-hole-stl") {
    return {
      label: "Raspberry Pi-like STL + non-rotated hole STL",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleStlBox({ id: "raspi-hole-stl", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 0, rotationZ: 0 }),
      ],
    };
  }
  if (caseId === "raspi-stl-rot-hole-stl") {
    return {
      label: "Raspberry Pi-like STL + rotated hole STL",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleStlBox({ id: "raspi-rot-hole-stl", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 28, rotationZ: 8 }),
      ],
    };
  }
  const cases: Record<string, { label: string; shapes: WorkplaneShape[] }> = {
    "cube-hole": {
      label: "solid cube + non-rotated hole cube",
      shapes: [automationSolidBox(), automationHoleBox()],
    },
    "cube-rot-hole": {
      label: "solid cube + rotated hole cube",
      shapes: [automationSolidBox(), rotatedHole()],
    },
    "stl-hole": {
      label: "STL + non-rotated hole cube",
      shapes: [automationImportedStlBox(), automationHoleBox()],
    },
    "stl-rot-hole": {
      label: "STL + rotated hole cube",
      shapes: [automationImportedStlBox(), rotatedHole()],
    },
    "rot-stl-hole": {
      label: "rotated STL + hole cube",
      shapes: [automationImportedStlBox({ rotation: 28, rotationZ: 8 }), automationHoleBox()],
    },
    "rot-stl-rot-hole": {
      label: "rotated STL + rotated hole cube",
      shapes: [automationImportedStlBox({ rotation: 28, rotationZ: 8 }), rotatedHole()],
    },
    "cylinder-rot-hole": {
      label: "cylinder + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-cylinder", name: "Cylinder", kind: "cylinder", color: "#d97813", sides: 48 }), rotatedHole()],
    },
    "sphere-rot-hole": {
      label: "sphere + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-sphere", name: "Sphere", kind: "sphere", color: "#0098c7", sides: 48 }), rotatedHole()],
    },
    "cone-rot-hole": {
      label: "cone + rotated hole cube",
      shapes: [
        automationSolidBox({ id: "solid-cone", name: "Cone", kind: "cone", color: "#6e2786", sides: 64, topRadius: 0, baseRadius: 14 }),
        rotatedHole(),
      ],
    },
    "pyramid-rot-hole": {
      label: "pyramid + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-pyramid", name: "Pyramid", kind: "pyramid", color: "#f2cf10", sides: 4 }), rotatedHole()],
    },
  };
  return cases[caseId] ?? booleanAutomationDynamicScene(caseId);
}

function makeHouseScene(): WorkplaneShape[] {
  return [
    sceneShape({ name: "Grass base", kind: "box", color: "#4f9b58", x: 0, z: 0, width: 118, depth: 92, height: 1 }),
    sceneShape({ name: "House body", kind: "box", color: "#e7c49a", x: 0, z: 2, width: 52, depth: 42, height: 34, elevation: 1 }),
    sceneShape({ name: "Gable roof", kind: "roof", color: "#a83c32", x: 0, z: 2, width: 66, depth: 54, height: 23, elevation: 35 }),
    sceneShape({ name: "Chimney", kind: "box", color: "#7f3328", x: 17, z: -9, width: 8, depth: 8, height: 18, elevation: 45 }),
    sceneShape({ name: "Front door", kind: "box", color: "#6d4427", x: 0, z: -20.4, width: 12, depth: 1.4, height: 19, elevation: 1.5 }),
    sceneShape({ name: "Door knob", kind: "sphere", color: "#e0b23f", x: 4.2, z: -21.6, width: 2.2, depth: 2.2, height: 2.2, elevation: 11 }),
    sceneShape({ name: "Left front window", kind: "box", color: "#6fc8e8", x: -16, z: -20.7, width: 10, depth: 1.2, height: 8, elevation: 18 }),
    sceneShape({ name: "Right front window", kind: "box", color: "#6fc8e8", x: 16, z: -20.7, width: 10, depth: 1.2, height: 8, elevation: 18 }),
    sceneShape({ name: "Left side window", kind: "box", color: "#6fc8e8", x: -26.2, z: 8, width: 10, depth: 1.2, height: 8, elevation: 18, rotation: 90 }),
    sceneShape({ name: "Right side window", kind: "box", color: "#6fc8e8", x: 26.2, z: 8, width: 10, depth: 1.2, height: 8, elevation: 18, rotation: 90 }),
    sceneShape({ name: "Porch step", kind: "box", color: "#9d9b91", x: 0, z: -28, width: 24, depth: 10, height: 2, elevation: 1 }),
    sceneShape({ name: "Walkway", kind: "box", color: "#b8b4a8", x: 0, z: -50, width: 12, depth: 36, height: 0.8, elevation: 0.2 }),
    sceneShape({ name: "Tree trunk", kind: "cylinder", color: "#7b4a2b", x: -42, z: 22, width: 7, depth: 7, height: 18, elevation: 1, sides: 18 }),
    sceneShape({ name: "Tree crown", kind: "sphere", color: "#2f8e45", x: -42, z: 22, width: 24, depth: 24, height: 22, elevation: 18 }),
    sceneShape({ name: "Mailbox post", kind: "box", color: "#5a4b3d", x: 32, z: -42, width: 3, depth: 3, height: 12, elevation: 1 }),
    sceneShape({ name: "Mailbox", kind: "roundRoof", color: "#2e6ca8", x: 32, z: -42, width: 13, depth: 8, height: 7, elevation: 13, rotation: 90 }),
  ];
}

function makeBlockPerfScene(count = 500): WorkplaneShape[] {
  const safeCount = Math.max(1, Math.min(5000, Math.floor(count)));
  const columns = Math.ceil(Math.sqrt(safeCount));
  const spacing = 7;
  const offset = ((columns - 1) * spacing) / 2;
  const colors = ["#d41721", "#d97813", "#f2cf10", "#33983d", "#0098c7", "#294c93"];

  return Array.from({ length: safeCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return sceneShape({
      id: `perf-block-${index + 1}`,
      name: `Perf block ${index + 1}`,
      kind: "box",
      color: colors[index % colors.length],
      x: column * spacing - offset,
      z: row * spacing - offset,
      width: 5,
      depth: 5,
      height: 5,
    });
  });
}

function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, "_") || "shape";
}

function meshDataToCadTransfer(mesh: MeshData) {
  const positions = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach((vertex, index) => positions.set(vertex, index * 3));
  const indices = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach((face, index) => indices.set(face, index * 3));
  return { positions, indices };
}

function shapeFromCadMesh(
  source: WorkplaneShape,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  brep: string,
): WorkplaneShape | null {
  if (positions.length < 9 || indices.length < 3) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxX = Math.max(maxX, positions[index]);
    maxY = Math.max(maxY, positions[index + 1]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const flattenedPositions: number[] = [];
  const flattenedNormals: number[] = [];
  for (let index = 0; index < indices.length; index += 1) {
    const vertex = indices[index] * 3;
    flattenedPositions.push(positions[vertex] - centerX, positions[vertex + 1] - minY, positions[vertex + 2] - centerZ);
    if (normals.length >= vertex + 3) flattenedNormals.push(normals[vertex], normals[vertex + 1], normals[vertex + 2]);
  }
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  return canonicalizeShape({
    ...source,
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(minY, 0.0005),
    width,
    depth,
    height,
    size: Math.max(width, depth),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    radius: undefined,
    importedMesh: {
      positions: flattenedPositions,
      normals: flattenedNormals.length === flattenedPositions.length ? flattenedNormals : undefined,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(indices.length / 3),
      sourceFormat: "json",
    },
    imagePlate: undefined,
    cadBrep: brep,
    cadBrepFrame: {
      x: cleanNearZero(centerX, 0.0005),
      z: cleanNearZero(centerZ, 0.0005),
      elevation: cleanNearZero(minY, 0.0005),
      width,
      depth,
      height,
    },
    cadPrimitiveFrame: undefined,
    constructionEdges: source.constructionEdges?.map((edge) => {
      const start = topologyShapeLocalPointToWorld(source, edge.start);
      const end = topologyShapeLocalPointToWorld(source, edge.end);
      const nextCenterY = minY + rawHeight / 2;
      return {
        ...edge,
        start: { x: start.x - centerX, y: start.y - nextCenterY, z: start.z - centerZ },
        end: { x: end.x - centerX, y: end.y - nextCenterY, z: end.z - centerZ },
      };
    }),
    constructionVertices: source.constructionVertices?.map((vertex) => {
      const world = topologyShapeLocalPointToWorld(source, vertex.position);
      return {
        ...vertex,
        position: {
          x: world.x - centerX,
          y: world.y - (minY + rawHeight / 2),
          z: world.z - centerZ,
        },
      };
    }),
  });
}

/**
 * Computes the next shape list after a CAP section generates (or regenerates)
 * its piece. In Añadir/Cortar mode the combined piece replaces the host shape
 * in-place (the host keeps its identity); otherwise the section's own piece
 * replaces its previous result or is appended as a new shape.
 */
function capResultShapes(shapes: WorkplaneShape[], section: CapSection, existingShape: WorkplaneShape | null, resolved: WorkplaneShape): WorkplaneShape[] {
  const hostId = section.plane.kind === "face" ? section.plane.shapeId : undefined;
  const isUnionMode = section.unionMode === "add" || section.unionMode === "cut";
  if (isUnionMode && hostId) {
    return shapes.map((shape) => shape.id === hostId ? resolved : shape);
  }
  if (existingShape) {
    return shapes.map((shape) => shape.id === existingShape.id ? resolved : shape);
  }
  return [...shapes, resolved];
}

function cadEdgeEndpoint(edge: CadModifierEdge, end: "start" | "end") {
  const offset = end === "start" ? 0 : edge.points.length - 3;
  return new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
}

function cadEdgeTangentAt(edge: CadModifierEdge, endpoint: THREE.Vector3) {
  const start = cadEdgeEndpoint(edge, "start");
  const end = cadEdgeEndpoint(edge, "end");
  if (endpoint.distanceToSquared(start) <= endpoint.distanceToSquared(end)) {
    const next = new THREE.Vector3(edge.points[3], edge.points[4], edge.points[5]);
    return next.sub(start).normalize();
  }
  const offset = Math.max(0, edge.points.length - 6);
  const previous = new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
  return previous.sub(end).normalize();
}

function tangentCadEdgeChain(edges: CadModifierEdge[], startId: number, allowedIds: Set<number>) {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const selected = new Set<number>([startId]);
  const queue = [startId];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  edges.forEach((edge) => {
    for (let index = 0; index + 2 < edge.points.length; index += 3) {
      minX = Math.min(minX, edge.points[index]);
      minY = Math.min(minY, edge.points[index + 1]);
      minZ = Math.min(minZ, edge.points[index + 2]);
      maxX = Math.max(maxX, edge.points[index]);
      maxY = Math.max(maxY, edge.points[index + 1]);
      maxZ = Math.max(maxZ, edge.points[index + 2]);
    }
  });
  const diagonal = [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)
    ? Math.hypot(maxX - minX, maxY - minY, maxZ - minZ)
    : 1;
  const tolerance = Math.max(1e-6, Math.min(0.01, diagonal * 1e-5));
  while (queue.length > 0) {
    const id = queue.shift() as number;
    const edge = edgeById.get(id);
    if (!edge) continue;
    const endpoints = [cadEdgeEndpoint(edge, "start"), cadEdgeEndpoint(edge, "end")];
    edges.forEach((candidate) => {
      if (selected.has(candidate.id) || !allowedIds.has(candidate.id)) return;
      const candidateEndpoints = [cadEdgeEndpoint(candidate, "start"), cadEdgeEndpoint(candidate, "end")];
      const shared = endpoints.find((point) => candidateEndpoints.some((other) => point.distanceTo(other) <= tolerance));
      if (!shared) return;
      const a = cadEdgeTangentAt(edge, shared);
      const b = cadEdgeTangentAt(candidate, shared);
      const deviation = (Math.acos(Math.max(-1, Math.min(1, Math.abs(a.dot(b))))) * 180) / Math.PI;
      if (deviation <= 16) {
        selected.add(candidate.id);
        queue.push(candidate.id);
      }
    });
  }
  return [...selected];
}

function cadDisplayEdgesAfterTreatment(shape: WorkplaneShape, session: EdgeModifierSession) {
  const removed = new Set(session.selectedEdgeIds);
  const elevation = shape.elevation ?? 0;
  return session.edges
    .filter((edge) => {
      const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
      return edge.manifold
        && !edge.boundary
        && effectiveAngle + 1e-3 >= Math.max(session.sharpAngle, NORMAL_SELECTION_CAD_EDGE_MIN_ANGLE)
        && !removed.has(edge.id);
    })
    .map((edge) => ({
      points: edge.points.map((value, index) => {
        if (index % 3 === 0) return value - shape.x;
        if (index % 3 === 1) return value - elevation;
        return value - shape.z;
      }),
    }));
}

function cadDisplayEdgesForShape(shape: WorkplaneShape, edges: CadModifierDisplayEdge[]) {
  const elevation = shape.elevation ?? 0;
  return edges
    .filter((edge) => edge.points.length >= 6)
    .map((edge) => ({
      points: edge.points.map((value, index) => {
        if (index % 3 === 0) return value - shape.x;
        if (index % 3 === 1) return value - elevation;
        return value - shape.z;
      }),
    }));
}

function cadModifierComponentPreviews(sourceParts: WorkplaneShape[], components: CadModifierComponentMesh[] | undefined): EdgeModifierComponentPreview[] {
  if (!components?.length) return [];
  const previews: EdgeModifierComponentPreview[] = [];
  components.forEach((component) => {
    const source = sourceParts[component.owner] ?? sourceParts[0];
    if (!source) return;
    const shape = shapeFromCadMesh(source, component.positions, component.normals, component.indices, component.brep);
    if (!shape) return;
    previews.push({
      owner: component.owner,
      shape: canonicalizeShape({
        ...shape,
        cadDisplayEdges: cadDisplayEdgesForShape(shape, component.displayEdges),
        cadDisplayEdgesVersion: 2 as const,
      }),
    });
  });
  return previews;
}

function edgeTreatmentLabel(feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number]) {
  const size = `${Number(feature.amount.toFixed(2))} mm`;
  return `${feature.kind === "fillet" ? "redondeo" : "chaflán"} (${size}, ${feature.edgeCount} borde${feature.edgeCount === 1 ? "" : "s"})`;
}

function shapeWithEdgeTreatmentRecord(
  shape: WorkplaneShape,
  before: WorkplaneShape,
  feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number],
  preserveEdgeSize: boolean,
  createdAt: number,
) {
  return canonicalizeShape({
    ...shape,
    edgeResizeMode: preserveEdgeSize ? "preserve" : "scale",
    edgeTreatments: [
      ...(before.edgeTreatments ?? []),
      {
        ...feature,
      },
    ],
    edgeTreatmentHistory: [
      ...compactEdgeTreatmentHistory(before.edgeTreatmentHistory),
      {
        id: createLocalId("edge-history"),
        createdAt,
        feature,
        before: cloneWorkplaneShapeSnapshot(before),
        appliedFrame: edgeTreatmentAppliedFrame(shape),
      },
    ],
  });
}

function bakedEdgeTreatmentPreview(shape: WorkplaneShape, base: WorkplaneShape) {
  if (!base.groupedShapes?.length) return shape;
  return canonicalizeShape({
    ...shape,
    groupedShapes: undefined,
    groupedBaseWidth: undefined,
    groupedBaseDepth: undefined,
    groupedBaseHeight: undefined,
  });
}

function shapeCenterDistance(a: WorkplaneShape, b: WorkplaneShape) {
  const ax = a.x;
  const ay = (a.elevation ?? 0) + a.height / 2;
  const az = a.z;
  const bx = b.x;
  const by = (b.elevation ?? 0) + b.height / 2;
  const bz = b.z;
  return Math.hypot(ax - bx, ay - by, az - bz);
}

function shapeDimensionDistance(a: WorkplaneShape, b: WorkplaneShape) {
  return Math.hypot(shapeWidth(a) - shapeWidth(b), a.height - b.height, shapeDepth(a) - shapeDepth(b));
}

function matchCadComponentsToSources(sourceParts: WorkplaneShape[], componentPreviews: EdgeModifierComponentPreview[]) {
  const candidates = componentPreviews.flatMap((component, componentIndex) =>
    sourceParts.map((source, sourceIndex) => ({
      component,
      componentIndex,
      sourceIndex,
      score: shapeCenterDistance(component.shape, source) + shapeDimensionDistance(component.shape, source) * 0.25,
    })),
  );
  candidates.sort((a, b) => a.score - b.score);

  const usedComponents = new Set<number>();
  const usedSources = new Set<number>();
  const ownerToSourceIndex = new Map<number, number>();
  candidates.forEach((candidate) => {
    if (usedComponents.has(candidate.componentIndex) || usedSources.has(candidate.sourceIndex)) return;
    usedComponents.add(candidate.componentIndex);
    usedSources.add(candidate.sourceIndex);
    ownerToSourceIndex.set(candidate.component.owner, candidate.sourceIndex);
  });
  return ownerToSourceIndex;
}

function groupedShapeWithComponentEdgeTreatment(
  base: WorkplaneShape,
  preview: WorkplaneShape,
  sourceParts: WorkplaneShape[],
  session: EdgeModifierSession,
  feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number],
  createdAt: number,
) {
  if (
    !base.groupedShapes?.length ||
    !hasOneToOneCadComponentMapping(sourceParts.length, session.componentPreviews.map((component) => component.owner))
  ) {
    return null;
  }

  const edgeById = new Map(session.edges.map((edge) => [edge.id, edge]));
  const ownerEdgeCounts = new Map<number, number>();
  session.selectedEdgeIds.forEach((edgeId) => {
    const owner = edgeById.get(edgeId)?.owner;
    if (typeof owner !== "number") return;
    ownerEdgeCounts.set(owner, (ownerEdgeCounts.get(owner) ?? 0) + 1);
  });
  if (ownerEdgeCounts.size === 0) {
    return null;
  }

  const ownerToSourceIndex = matchCadComponentsToSources(sourceParts, session.componentPreviews);
  if (ownerToSourceIndex.size !== sourceParts.length) {
    return null;
  }
  const componentByOwner = new Map(session.componentPreviews.map((component) => [component.owner, component]));
  const updatedSources = [...sourceParts];
  let changed = false;

  ownerEdgeCounts.forEach((edgeCount, owner) => {
    const sourceIndex = ownerToSourceIndex.get(owner);
    const component = componentByOwner.get(owner);
    if (sourceIndex === undefined || !component) return;
    const source = sourceParts[sourceIndex];
    const ownerFeature = { ...feature, edgeCount };
    const retargeted = canonicalizeShape({
      ...component.shape,
      id: source.id,
      name: source.name,
      color: source.color,
      hole: source.hole || undefined,
      locked: source.locked,
      hidden: source.hidden,
      groupedShapes: source.groupedShapes,
      groupedBaseWidth: source.groupedBaseWidth,
      groupedBaseDepth: source.groupedBaseDepth,
      groupedBaseHeight: source.groupedBaseHeight,
    });
    updatedSources[sourceIndex] = shapeWithEdgeTreatmentRecord(retargeted, source, ownerFeature, session.preserveEdgeSize, createdAt);
    changed = true;
  });

  if (!changed) {
    return null;
  }

  const elevation = preview.elevation ?? 0;
  return canonicalizeShape({
    ...preview,
    edgeResizeMode: session.preserveEdgeSize ? "preserve" : "scale",
    edgeTreatments: base.edgeTreatments,
    edgeTreatmentHistory: base.edgeTreatmentHistory?.length ? compactEdgeTreatmentHistory(base.edgeTreatmentHistory) : undefined,
    groupedBaseWidth: shapeWidth(preview),
    groupedBaseDepth: shapeDepth(preview),
    groupedBaseHeight: preview.height,
    groupedShapes: updatedSources.map((shape) => cloneAsGroupChild(shape, preview.x, preview.z, elevation)),
  });
}

function edgeTreatmentFeatureCount(shape: WorkplaneShape): number {
  return (shape.edgeTreatments?.length ?? 0) + (shape.groupedShapes?.reduce((total, child) => total + edgeTreatmentFeatureCount(child), 0) ?? 0);
}

function reversibleEdgeTreatmentCount(shape: WorkplaneShape): number {
  return (shape.edgeTreatmentHistory?.length ?? 0) + (shape.groupedShapes?.reduce((total, child) => total + reversibleEdgeTreatmentCount(child), 0) ?? 0);
}

function edgeTreatmentHistoryOptions(shape: WorkplaneShape, path: number[] = [], targetName = shape.name): EdgeFeatureRevertOption[] {
  const ownHistory = shape.edgeTreatmentHistory ?? [];
  const ownOptions = ownHistory.map((entry, index) => ({
    id: `${path.length ? path.join(".") : "root"}:${entry.id}`,
    entryId: entry.id,
    path,
    label: edgeTreatmentLabel(entry.feature),
    targetName,
    createdAt: entry.createdAt,
    removesNewerCount: Math.max(0, ownHistory.length - index - 1),
  }));
  const childOptions = (shape.groupedShapes ?? []).flatMap((child, index) =>
    edgeTreatmentHistoryOptions(child, [...path, index], `${targetName} / ${child.name}`),
  );
  return [...ownOptions, ...childOptions].sort((a, b) => b.createdAt - a.createdAt);
}

function restoreOwnLastEdgeTreatment(shape: WorkplaneShape, entry: NonNullable<WorkplaneShape["edgeTreatmentHistory"]>[number]) {
  return restoreShapeBeforeEdgeTreatment(shape, entry);
}

async function restoreEdgeTreatmentInShape(shape: WorkplaneShape, path: number[], entryId: string): Promise<{ shape: WorkplaneShape; label: string } | null> {
  if (path.length === 0) {
    const entry = (shape.edgeTreatmentHistory ?? []).find((candidate) => candidate.id === entryId);
    return entry ? { shape: restoreOwnLastEdgeTreatment(shape, entry), label: edgeTreatmentLabel(entry.feature) } : null;
  }

  if (!shape.groupedShapes?.length) {
    return null;
  }

  const [childIndex, ...restPath] = path;
  const restoredChildren = restoreGroupedChildren(shape);
  const child = restoredChildren[childIndex];
  if (!child) {
    return null;
  }
  const restoredChild = await restoreEdgeTreatmentInShape(child, restPath, entryId);
  if (!restoredChild) {
    return null;
  }

  restoredChildren[childIndex] = restoredChild.shape;
  const rebuilt = await buildGroupedShapeFromSelection(restoredChildren);
  if (!rebuilt.group) {
    return null;
  }

  return {
    shape: canonicalizeShape({
      ...rebuilt.group,
      id: shape.id,
      name: shape.name,
      color: shape.color,
      hole: shape.hole || rebuilt.group.hole,
      locked: shape.locked,
      hidden: shape.hidden,
      edgeResizeMode: shape.edgeResizeMode,
      groupOperation: shape.groupOperation,
      edgeTreatments: shape.edgeTreatments,
      edgeTreatmentHistory: shape.edgeTreatmentHistory?.length ? compactEdgeTreatmentHistory(shape.edgeTreatmentHistory) : undefined,
    }),
    label: restoredChild.label,
  };
}

function transformMesh(mesh: MeshData, shape: WorkplaneShape): MeshData {
  const centerY = shape.height / 2;
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(meshYawDegrees(shape)),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
  const mirrorX = mirrorSign(shape.mirrorX);
  const mirrorY = mirrorSign(shape.mirrorY);
  const mirrorZ = mirrorSign(shape.mirrorZ);
  const reversedWinding = mirroredAxisCount(shape) % 2 === 1;
  return {
    ...mesh,
    vertices: mesh.vertices.map(([x, y, z]) => {
      const vertex = new THREE.Vector3(x * mirrorX, (y - centerY) * mirrorY, z * mirrorZ).applyMatrix4(matrix);
      return [vertex.x + shape.x, vertex.y + (shape.elevation ?? 0) + centerY, vertex.z + shape.z] as Vec3;
    }),
    faces: reversedWinding ? mesh.faces.map(([a, b, c]) => [a, c, b] as [number, number, number]) : mesh.faces,
  };
}

function boxMesh(shape: WorkplaneShape): MeshData {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const x = width / 2;
  const z = depth / 2;
  return {
    name: sanitizeName(shape.name),
    vertices: [
      [-x, 0, -z],
      [x, 0, -z],
      [x, 0, z],
      [-x, 0, z],
      [-x, height, -z],
      [x, height, -z],
      [x, height, z],
      [-x, height, z],
    ],
    faces: [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ],
  };
}

function cylinderMesh(shape: WorkplaneShape, sides = 96, topRadiusScale = 1): MeshData {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const vertices: Vec3[] = [[0, 0, 0], [0, height, 0]];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push([(Math.cos(angle) * width) / 2, 0, (Math.sin(angle) * depth) / 2]);
    vertices.push([(Math.cos(angle) * width * topRadiusScale) / 2, height, (Math.sin(angle) * depth * topRadiusScale) / 2]);
  }
  const faces: [number, number, number][] = [];
  for (let i = 0; i < sides; i += 1) {
    const next = (i + 1) % sides;
    const b0 = 2 + i * 2;
    const t0 = b0 + 1;
    const b1 = 2 + next * 2;
    const t1 = b1 + 1;
    faces.push([0, b1, b0]);
    if (topRadiusScale > 0) {
      faces.push([1, t0, t1]);
      faces.push([b0, b1, t1], [b0, t1, t0]);
    } else {
      faces.push([b0, b1, t0]);
    }
  }
  return { name: sanitizeName(shape.name), vertices, faces };
}

function sphereMesh(shape: WorkplaneShape): MeshData {
  const { widthSegments: lon, heightSegments: lat } = sphereTessellation(shape.steps);
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const vertices: Vec3[] = [];
  for (let yStep = 0; yStep <= lat; yStep += 1) {
    const theta = (yStep / lat) * Math.PI;
    const y = height / 2 + Math.cos(theta) * (height / 2);
    const ring = Math.sin(theta);
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const phi = (xStep / lon) * Math.PI * 2;
      vertices.push([(Math.cos(phi) * width * ring) / 2, y, (Math.sin(phi) * depth * ring) / 2]);
    }
  }
  const faces: [number, number, number][] = [];
  for (let yStep = 0; yStep < lat; yStep += 1) {
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const next = (xStep + 1) % lon;
      const a = yStep * lon + xStep;
      const b = yStep * lon + next;
      const c = (yStep + 1) * lon + next;
      const d = (yStep + 1) * lon + xStep;
      faces.push([a, d, c], [a, c, b]);
    }
  }
  return { name: sanitizeName(shape.name), vertices, faces };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function bufferGeometryToMeshData(name: string, geometry: THREE.BufferGeometry): MeshData {
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  prepared.computeVertexNormals();
  prepared.computeBoundingBox();
  const minY = prepared.boundingBox?.min.y ?? 0;
  if (Math.abs(minY) > 0.000001) {
    prepared.translate(0, -minY, 0);
    prepared.computeBoundingBox();
  }

  const position = prepared.getAttribute("position");
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < position.count; i += 1) {
    vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  }
  for (let i = 0; i + 2 < position.count; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  if (prepared !== geometry) {
    prepared.dispose();
  }
  geometry.dispose();
  return { name, vertices, faces };
}

function createBooleanRoofGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, 0, height, -d,
    -w, 0, d, w, 0, d, 0, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    0, 3, 5, 0, 5, 2,
    1, 2, 5, 1, 5, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createBooleanWedgeGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, w, height, -d,
    -w, 0, d, w, 0, d, w, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    1, 2, 5, 1, 5, 4,
    0, 3, 5, 0, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createBooleanPyramidGeometry(width: number, height: number, depth: number, sides = 4) {
  const count = Math.max(3, Math.round(sides));
  if (count !== 4) {
    const radius = Math.min(width, depth) / 2;
    const geometry = new THREE.ConeGeometry(radius, height, count);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, w, 0, d, -w, 0, d,
    0, height, 0,
  ]);
  const indices = [
    0, 1, 2, 0, 2, 3,
    0, 4, 1,
    1, 4, 2,
    2, 4, 3,
    3, 4, 0,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createBooleanRoundRoofGeometry(width: number, height: number, depth: number, sides = 64) {
  const radius = width / 2;
  const segments = Math.max(4, Math.round(sides));
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.absarc(0, 0, radius, Math.PI, 0, true);
  shape.lineTo(-radius, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: segments });
  geometry.translate(0, 0, -depth / 2);
  geometry.scale(1, height / Math.max(0.001, radius), 1);
  return geometry;
}

function createBooleanHalfSphereGeometry(width: number, height: number, depth: number, steps = 32) {
  const lon = Math.max(8, Math.round(steps) * 2);
  const lat = Math.max(4, Math.round(steps / 2));
  const rx = width / 2;
  const rz = depth / 2;
  const positions: number[] = [];
  const point = (latIndex: number, lonIndex: number): Vec3 => {
    const theta = (latIndex / lat) * (Math.PI / 2);
    const phi = ((lonIndex % lon) / lon) * Math.PI * 2;
    const ring = Math.sin(theta);
    return [Math.cos(phi) * rx * ring, Math.cos(theta) * height, Math.sin(phi) * rz * ring];
  };
  const addTri = (a: Vec3, b: Vec3, c: Vec3) => positions.push(...a, ...b, ...c);

  const top: Vec3 = [0, height, 0];
  for (let xStep = 0; xStep < lon; xStep += 1) {
    addTri(top, point(1, xStep + 1), point(1, xStep));
  }

  for (let yStep = 1; yStep < lat; yStep += 1) {
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const next = xStep + 1;
      const a = point(yStep, xStep);
      const b = point(yStep, next);
      const c = point(yStep + 1, next);
      const d = point(yStep + 1, xStep);
      addTri(a, c, d);
      addTri(a, b, c);
    }
  }

  const bottomCenter: Vec3 = [0, 0, 0];
  const capPoint = (lonIndex: number): Vec3 => {
    const phi = ((lonIndex % lon) / lon) * Math.PI * 2;
    return [Math.cos(phi) * rx, 0, Math.sin(phi) * rz];
  };
  for (let xStep = 0; xStep < lon; xStep += 1) {
    addTri(bottomCenter, capPoint(xStep), capPoint(xStep + 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createBooleanTorusGeometry(width: number, height: number, depth: number) {
  const tubeRadius = Math.max(0.1, height / 2);
  const majorRadius = Math.max(0.2, Math.min(width, depth) / 2 - tubeRadius);
  const geometry = new THREE.TorusGeometry(majorRadius, tubeRadius, 36, 144);
  geometry.rotateX(Math.PI / 2);
  const outerDiameter = (majorRadius + tubeRadius) * 2;
  geometry.scale(width / Math.max(0.001, outerDiameter), 1, depth / Math.max(0.001, outerDiameter));
  return geometry;
}

function createBooleanHollowCylinderGeometry(width: number, height: number, depth: number, thickness: number, segments = 96) {
  const outerX = width / 2;
  const outerZ = depth / 2;
  const safeThickness = clampNumber(thickness, 0.1, Math.max(0.1, Math.min(outerX, outerZ) - 0.1));
  const innerX = Math.max(0.1, outerX - safeThickness);
  const innerZ = Math.max(0.1, outerZ - safeThickness);
  const count = Math.max(12, Math.round(segments));
  const positions: number[] = [];
  const point = (rx: number, rz: number, y: number, index: number): Vec3 => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle) * rx, y, Math.sin(angle) * rz];
  };
  const addTri = (a: Vec3, b: Vec3, c: Vec3) => positions.push(...a, ...b, ...c);
  const addQuad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
    addTri(a, b, c);
    addTri(a, c, d);
  };

  for (let index = 0; index < count; index += 1) {
    const next = index + 1;
    const ob0 = point(outerX, outerZ, 0, index);
    const ob1 = point(outerX, outerZ, 0, next);
    const ot0 = point(outerX, outerZ, height, index);
    const ot1 = point(outerX, outerZ, height, next);
    const ib0 = point(innerX, innerZ, 0, index);
    const ib1 = point(innerX, innerZ, 0, next);
    const it0 = point(innerX, innerZ, height, index);
    const it1 = point(innerX, innerZ, height, next);

    addQuad(ob0, ot0, ot1, ob1);
    addQuad(ib1, it1, it0, ib0);
    addQuad(ot0, it0, it1, ot1);
    addQuad(ob0, ob1, ib1, ib0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createBooleanTextGeometry(shape: WorkplaneShape) {
  const text = (shape.text ?? "TEXT").trim() || " ";
  const bevel = clampNumber(shape.bevel ?? 0, 0, 8);
  const fontName = shape.font ?? "Multilanguage";
  const geometry = new TextGeometry(text, {
    font: booleanTextFonts[fontName] ?? booleanTextFonts.Multilanguage,
    size: 20,
    depth: shape.height,
    curveSegments: fontName === "Stencil" ? 1 : 8,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * 0.22,
    bevelSize: bevel * 0.16,
    bevelSegments: Math.max(1, shape.segments ?? 0),
  });

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    const textWidth = Math.max(1, box.max.x - box.min.x);
    const textDepth = Math.max(1, box.max.y - box.min.y);
    const scale = Math.min(shapeWidth(shape) / textWidth, shapeDepth(shape) / textDepth);
    geometry.scale(scale, scale, 1);
  }

  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const rotatedBox = geometry.boundingBox;
  if (rotatedBox) {
    geometry.translate(
      -(rotatedBox.min.x + rotatedBox.max.x) / 2,
      -rotatedBox.min.y,
      -(rotatedBox.min.z + rotatedBox.max.z) / 2,
    );
  }
  return geometry;
}

function geometryMeshForShape(shape: WorkplaneShape): MeshData | null {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const size = Math.min(width, depth);
  let geometry: THREE.BufferGeometry | null = null;

  switch (shape.kind) {
    case "box":
      geometry = shape.radius && shape.radius > 0
        ? new RoundedBoxGeometry(width, height, depth, Math.max(1, shape.steps ?? 10), shape.radius)
        : new THREE.BoxGeometry(width, height, depth);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(1, 1, height, shape.sides ?? 96, shape.segments ?? 1);
      geometry.scale(width / 2, 1, depth / 2);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(1, sphereTessellation(shape.steps).widthSegments, sphereTessellation(shape.steps).heightSegments);
      geometry.scale(width / 2, height / 2, depth / 2);
      break;
    case "cone": {
      const baseRadius = shape.baseRadius ?? width / 2;
      geometry = new THREE.CylinderGeometry(shape.topRadius ?? 0, baseRadius, height, shape.sides ?? 96);
      geometry.scale(1, 1, depth / Math.max(0.001, width));
      break;
    }
    case "pyramid":
      geometry = createBooleanPyramidGeometry(width, height, depth, shape.sides ?? 4);
      break;
    case "roof":
      geometry = createBooleanRoofGeometry(width, height, depth);
      break;
    case "roundRoof":
      geometry = createBooleanRoundRoofGeometry(width, height, depth, shape.sides ?? 64);
      break;
    case "halfSphere":
      geometry = createBooleanHalfSphereGeometry(width, height, depth, shape.steps ?? 32);
      break;
    case "torus":
      geometry = createBooleanTorusGeometry(width, height, depth);
      break;
    case "ring":
    case "tube":
      geometry = createBooleanHollowCylinderGeometry(width, height, depth, shape.bevel ?? 4, 144);
      break;
    case "gear":
      geometry = createGearGeometry({
        width,
        depth,
        height,
        teeth: shape.teeth,
        toothSize: shape.toothSize,
        toothWidth: shape.toothWidth,
        centerHoleSize: shape.centerHoleSize,
        gearType: shape.gearType,
        helixAngle: shape.helixAngle,
        helixQuality: shape.helixQuality,
      });
      break;
    case "wedge":
      geometry = createBooleanWedgeGeometry(width, height, depth);
      break;
    case "polygon":
      geometry = new THREE.CylinderGeometry(1, 1, height, 6);
      geometry.scale(width / 2, 1, depth / 2);
      break;
    case "icosahedron":
      geometry = new THREE.IcosahedronGeometry(size / 2, 1);
      geometry.translate(0, height / 2, 0);
      break;
    case "text":
      geometry = createBooleanTextGeometry(shape);
      break;
    case "scribble":
      geometry = new THREE.TorusKnotGeometry(size * 0.22, size * 0.055, 120, 12);
      geometry.translate(0, height / 2, 0);
      break;
    case "sketch":
    default:
      geometry = new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72);
      break;
  }

  return geometry ? bufferGeometryToMeshData(sanitizeName(shape.name), geometry) : null;
}

function meshForShape(shape: WorkplaneShape): MeshData {
  if (shape.kind === "mesh" && shape.importedMesh) {
    return importedMeshForShape(shape);
  }

  if (shape.groupedShapes?.length) {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    shape.groupedShapes.filter((child) => !child.hidden).forEach((child) => {
      const childMesh = meshForShape(child);
      appendMeshData(vertices, faces, childMesh);
    });
    return transformMesh({ name: sanitizeName(shape.name), vertices, faces }, shape);
  }

  const raw =
    geometryMeshForShape(shape) ??
    (shape.kind === "cylinder" || shape.kind === "tube" || shape.kind === "ring" || shape.kind === "torus"
      ? cylinderMesh(shape, shape.sides ?? 96)
      : shape.kind === "cone"
        ? cylinderMesh(shape, shape.sides ?? 96, shape.baseRadius ? (shape.topRadius ?? 0) / shape.baseRadius : 0)
        : shape.kind === "sphere" || shape.kind === "halfSphere"
          ? sphereMesh(shape)
          : shape.kind === "pyramid"
            ? cylinderMesh(shape, shape.sides ?? 4, 0)
            : boxMesh(shape));
  return transformMesh(raw, shape);
}

function facePlaneUpFromNormal(normal: [number, number, number]): [number, number, number] {
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  if (length < 1e-12) return [0, 1, 0];
  const n = [normal[0] / length, normal[1] / length, normal[2] / length];
  const worldUp = [0, 1, 0];
  const component = worldUp[0] * n[0] + worldUp[1] * n[1] + worldUp[2] * n[2];
  const up = worldUp.map((value, index) => value - component * n[index]);
  const upLength = Math.hypot(up[0], up[1], up[2]);
  if (upLength < 1e-6) return [0, 0, 1];
  return [up[0] / upLength, up[1] / upLength, up[2] / upLength];
}

function shapeTopologySignature(shape: WorkplaneShape): string {
  return JSON.stringify({
    id: shape.id,
    kind: shape.kind,
    x: shape.x,
    z: shape.z,
    elevation: shape.elevation ?? 0,
    rotation: shape.rotation,
    rotationX: shape.rotationX ?? 0,
    rotationZ: shape.rotationZ ?? 0,
    mirrorX: shape.mirrorX ?? false,
    mirrorY: shape.mirrorY ?? false,
    mirrorZ: shape.mirrorZ ?? false,
    width: shape.width,
    depth: shape.depth,
    height: shape.height,
    radius: shape.radius,
    steps: shape.steps,
    sides: shape.sides,
    bevel: shape.bevel,
    segments: shape.segments,
    topRadius: shape.topRadius,
    baseRadius: shape.baseRadius,
    teeth: shape.teeth,
    toothSize: shape.toothSize,
    toothWidth: shape.toothWidth,
    centerHoleSize: shape.centerHoleSize,
    helixAngle: shape.helixAngle,
    helixQuality: shape.helixQuality,
    groupCount: shape.groupedShapes?.length ?? 0,
    brep: shape.cadBrep ? shape.cadBrep.length : 0,
    partitions: shape.constructionEdges?.filter((edge) => edge.partition).length ?? 0,
    // Mesh edits change `importedMesh.positions` without touching width/depth/
    // height, so the fingerprint must be part of the signature or the stale
    // topology would never be re-collected after a mesh-mode edit.
    meshFingerprint: importedMeshContentFingerprint(shape.importedMesh),
  });
}

function importedMeshContentFingerprint(mesh: WorkplaneShape["importedMesh"]): string {
  if (!mesh || mesh.positions.length === 0) return "";
  let hash = 2166136261;
  const positions = mesh.positions;
  for (let index = 0; index < positions.length; index += 1) {
    const quantized = Math.round(positions[index] / 1e-4);
    hash = Math.imul(hash ^ quantized, 16777619) >>> 0;
  }
  return `${mesh.triangleCount}:${positions.length}:${hash}`;
}

function appendMeshData(vertices: Vec3[], faces: [number, number, number][], mesh: MeshData) {
  const offset = vertices.length;
  for (let i = 0; i < mesh.vertices.length; i += 1) {
    vertices.push(mesh.vertices[i]);
  }
  for (let i = 0; i < mesh.faces.length; i += 1) {
    const [a, b, c] = mesh.faces[i];
    faces.push([a + offset, b + offset, c + offset]);
  }
}

function importedMeshForShape(shape: WorkplaneShape): MeshData {
  const mesh = shape.importedMesh;
  if (!mesh || mesh.positions.length < 9) {
    return transformMesh(boxMesh(shape), shape);
  }

  const resizedPositions = resizedImportedMeshPositions(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < resizedPositions.length; i += 3) {
    vertices.push([resizedPositions[i], resizedPositions[i + 1], resizedPositions[i + 2]]);
  }

  const faces: [number, number, number][] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  return transformMesh({ name: sanitizeName(shape.name), vertices, faces }, shape);
}

function shapeHasTransformToBake(shape: WorkplaneShape) {
  return (
    Math.abs(cleanRotationDegrees(shape.rotation ?? 0, 3)) > 0 ||
    Math.abs(cleanRotationDegrees(shape.rotationX ?? 0, 3)) > 0 ||
    Math.abs(cleanRotationDegrees(shape.rotationZ ?? 0, 3)) > 0 ||
    Boolean(shape.mirrorX || shape.mirrorY || shape.mirrorZ)
  );
}

function cadModifierPrimitiveForShape(shape: WorkplaneShape): CadModifierPrimitivePart | null {
  return cadModifierPrimitiveForBakedShape(shape)
    ?? (shapeHasTransformToBake(shape) ? cadModifierPrimitiveForAnalyticBox(shape) : null);
}

function bakeShapeTransformIntoMesh(shape: WorkplaneShape): WorkplaneShape {
  if (!shapeHasTransformToBake(shape)) {
    return shape;
  }

  const mesh = meshForShape(shape);
  if (mesh.vertices.length < 3 || mesh.faces.length < 1) {
    return shape;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  mesh.vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return shape;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];
  const bakedCadMetadata = bakeCadMetadataForShapeTransform(shape, { centerX, minY, centerZ, width, depth, height, yawDegrees: meshYawDegrees(shape) });

  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - minY, z - centerZ);
    });
  });

  return {
    ...shape,
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(minY, 0.0005),
    width,
    depth,
    height,
    size: Math.max(width, depth),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: mesh.faces.length,
      sourceFormat: "json",
    },
    ...bakedCadMetadata,
    imagePlate: undefined,
    groupedShapes: undefined,
    groupedBaseWidth: undefined,
    groupedBaseDepth: undefined,
    groupedBaseHeight: undefined,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo leer la imagen"));
      }
    });
    reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen")));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("No se pudo decodificar la imagen")));
    image.src = dataUrl;
  });
}

async function prepareImportedImage(file: File) {
  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceUrl);
  const pixelWidth = image.naturalWidth || image.width;
  const pixelHeight = image.naturalHeight || image.height;

  if (!pixelWidth || !pixelHeight) {
    throw new Error("La imagen no tiene dimensiones legibles");
  }

  const maxTextureSide = 2048;
  const textureScale = Math.min(1, maxTextureSide / Math.max(pixelWidth, pixelHeight));
  if (textureScale >= 1) {
    return {
      dataUrl: sourceUrl,
      mimeType: file.type || "image/png",
      pixelWidth,
      pixelHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelWidth * textureScale));
  canvas.height = Math.max(1, Math.round(pixelHeight * textureScale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mimeType = file.type === "image/jpeg" || file.type === "image/webp" ? file.type : "image/png";
  return {
    dataUrl: canvas.toDataURL(mimeType, 0.92),
    mimeType,
    pixelWidth,
    pixelHeight,
  };
}

function imagePlateDimensions(pixelWidth: number, pixelHeight: number) {
  const aspect = pixelWidth / Math.max(1, pixelHeight);
  const targetMax = 72;
  const minVisibleSide = 14;
  const maxAllowedSide = 110;
  let width = aspect >= 1 ? targetMax : targetMax * aspect;
  let depth = aspect >= 1 ? targetMax / aspect : targetMax;
  const minSide = Math.min(width, depth);

  if (minSide < minVisibleSide) {
    const boost = minVisibleSide / Math.max(0.001, minSide);
    width *= boost;
    depth *= boost;
  }

  const maxSide = Math.max(width, depth);
  if (maxSide > maxAllowedSide) {
    const shrink = maxAllowedSide / maxSide;
    width *= shrink;
    depth *= shrink;
  }

  return {
    width: Number(width.toFixed(2)),
    depth: Number(depth.toFixed(2)),
    height: 1.6,
  };
}

async function importedShapeFromImage(file: File): Promise<WorkplaneShape> {
  const imagePlate = await prepareImportedImage(file);
  const dimensions = imagePlateDimensions(imagePlate.pixelWidth, imagePlate.pixelHeight);
  return {
    id: createLocalId("uploaded-image"),
    name: file.name.replace(/\.[^.]+$/, "") || "Imagen importada",
    kind: "box",
    color: "#f4f7f9",
    x: 10,
    z: -10,
    size: Math.max(dimensions.width, dimensions.depth),
    width: dimensions.width,
    depth: dimensions.depth,
    height: dimensions.height,
    elevation: 0,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    radius: 0,
    steps: 1,
    imagePlate,
    locked: false,
    hidden: false,
  };
}

function normalFor(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

function toStl(meshes: MeshData[]) {
  const lines = ["solid sketchforge_design"];
  meshes.forEach((mesh) => {
    mesh.faces.forEach(([ai, bi, ci]) => {
      const a = mesh.vertices[ai];
      const b = mesh.vertices[bi];
      const c = mesh.vertices[ci];
      const n = normalFor(a, b, c);
      lines.push(`  facet normal ${n[0]} ${n[1]} ${n[2]}`);
      lines.push("    outer loop");
      lines.push(`      vertex ${a[0]} ${a[1]} ${a[2]}`);
      lines.push(`      vertex ${b[0]} ${b[1]} ${b[2]}`);
      lines.push(`      vertex ${c[0]} ${c[1]} ${c[2]}`);
      lines.push("    endloop");
      lines.push("  endfacet");
    });
  });
  lines.push("endsolid sketchforge_design");
  return lines.join("\n");
}

function toObj(meshes: MeshData[]) {
  const lines = ["# SketchForge OBJ export"];
  let offset = 1;
  meshes.forEach((mesh) => {
    lines.push(`o ${mesh.name}`);
    mesh.vertices.forEach(([x, y, z]) => lines.push(`v ${x} ${y} ${z}`));
    mesh.faces.forEach(([a, b, c]) => lines.push(`f ${a + offset} ${b + offset} ${c + offset}`));
    offset += mesh.vertices.length;
  });
  return lines.join("\n");
}

async function toSvg(shapes: WorkplaneShape[], title: string) {
  const runtime = await getManifoldRuntime();
  const layers: SvgProjectionLayer[] = [];

  for (const shape of shapes) {
    const created: ManifoldSolid[] = [];
    const projectedObjects: unknown[] = [];
    try {
      const solid = shapeToManifoldSolid(runtime, shape, created);
      if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) {
        throw new Error(`No se pudo convertir ${shape.name} en un contorno SVG hermético`);
      }

      const topView = solid.rotate([90, 0, 0]);
      if (topView !== solid) created.push(topView);
      const projection = topView.project();
      projectedObjects.push(projection);
      const simplified = projection.simplify(0.00001);
      if (simplified !== projection) projectedObjects.push(simplified);
      const polygons = simplified.toPolygons();
      if (!polygons.length) throw new Error(`La vista superior de ${shape.name} no tiene área exportable`);
      layers.push({ name: shape.name, color: shape.color, polygons });
    } finally {
      [...new Set([...projectedObjects, ...created])].reverse().forEach(disposeManifold);
    }
  }

  return toSvgProjection(layers, title);
}

function triggerBrowserDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadTextFile(filename: string, content: string, type: string): Promise<DownloadResult> {
  const mode = window.localStorage.getItem(DOWNLOAD_MODE_STORAGE_KEY);
  const folder = window.localStorage.getItem(DOWNLOAD_FOLDER_STORAGE_KEY)?.trim() ?? "";
  if (!STATIC_EXPORT_BUILD && mode === "folder" && folder) {
    const response = await fetch("/api/local-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename, folder }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; path?: string } | null;
    if (!response.ok || !payload?.path) {
      throw new Error(payload?.error ?? "No se pudo guardar la exportación");
    }
    return { mode: "folder", path: payload.path };
  }

  triggerBrowserDownload(filename, content, type);
  return { mode: "browser" };
}

async function downloadBlobFile(filename: string, blob: Blob): Promise<DownloadResult> {
  const mode = window.localStorage.getItem(DOWNLOAD_MODE_STORAGE_KEY);
  const folder = window.localStorage.getItem(DOWNLOAD_FOLDER_STORAGE_KEY)?.trim() ?? "";
  if (!STATIC_EXPORT_BUILD && mode === "folder" && folder) {
    const formData = new FormData();
    formData.set("file", blob, filename);
    formData.set("filename", filename);
    formData.set("folder", folder);
    const response = await fetch("/api/local-download", { method: "POST", body: formData });
    const payload = (await response.json().catch(() => null)) as { error?: string; path?: string } | null;
    if (!response.ok || !payload?.path) throw new Error(payload?.error ?? "No se pudo guardar la exportación");
    return { mode: "folder", path: payload.path };
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { mode: "browser" };
}

function shapeAabb(shape: WorkplaneShape): Cuboid {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  return {
    minX: shape.x - halfWidth,
    maxX: shape.x + halfWidth,
    minY: shape.elevation ?? 0,
    maxY: (shape.elevation ?? 0) + shape.height,
    minZ: shape.z - halfDepth,
    maxZ: shape.z + halfDepth,
  };
}

function boundsForShapes(shapes: WorkplaneShape[]): Cuboid {
  const bounds = shapes.map(meshAabb);
  return boundsForCuboids(bounds);
}

function boundsForCuboids(bounds: Cuboid[]): Cuboid {
  return {
    minX: Math.min(...bounds.map((box) => box.minX)),
    maxX: Math.max(...bounds.map((box) => box.maxX)),
    minY: Math.min(...bounds.map((box) => box.minY)),
    maxY: Math.max(...bounds.map((box) => box.maxY)),
    minZ: Math.min(...bounds.map((box) => box.minZ)),
    maxZ: Math.max(...bounds.map((box) => box.maxZ)),
  };
}

function dropPatchForShape(shape: WorkplaneShape, targetY: number): Partial<WorkplaneShape> {
  const bounds = meshAabb(shape);
  const delta = targetY - bounds.minY;
  const nextElevation = (shape.elevation ?? 0) + delta;
  return { elevation: Math.abs(nextElevation) < 0.0005 ? 0 : Number(nextElevation.toFixed(4)) };
}

function meshAabb(shape: WorkplaneShape): Cuboid {
  const mesh = meshForShape(shape);
  if (mesh.vertices.length === 0) {
    return shapeAabb(shape);
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  mesh.vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return shapeAabb(shape);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

const ALIGN_EPSILON = 0.0005;
const ALIGN_AXES: AlignAxis[] = ["x", "y", "z"];
const ALIGN_TARGETS: AlignTarget[] = ["min", "center", "max"];

function alignCoordinate(bounds: Cuboid, axis: AlignAxis, target: AlignTarget) {
  const min = axis === "x" ? bounds.minX : axis === "y" ? bounds.minY : bounds.minZ;
  const max = axis === "x" ? bounds.maxX : axis === "y" ? bounds.maxY : bounds.maxZ;
  if (target === "min") {
    return min;
  }
  if (target === "max") {
    return max;
  }
  return (min + max) / 2;
}

function alignmentLabel(axis: AlignAxis, target: AlignTarget) {
  if (axis === "x") {
    return target === "min" ? "izquierda" : target === "max" ? "derecha" : "centro";
  }
  if (axis === "z") {
    return target === "min" ? "adelante" : target === "max" ? "atrás" : "medio";
  }
  return target === "min" ? "inferior" : target === "max" ? "superior" : "medio";
}

function alignmentStatuses(selection: WorkplaneShape[], anchorId: string | null): AlignHandleStatus[] {
  if (selection.length < 2) {
    return [];
  }

  const boundsById = new Map(selection.map((shape) => [shape.id, meshAabb(shape)]));
  const anchorBounds = anchorId ? boundsById.get(anchorId) ?? null : null;
  const referenceBounds = anchorBounds ?? boundsForCuboids(Array.from(boundsById.values()));

  return ALIGN_AXES.flatMap((axis) =>
    ALIGN_TARGETS.map((target) => {
      const targetValue = alignCoordinate(referenceBounds, axis, target);
      const aligned = selection.every((shape) => {
        const bounds = boundsById.get(shape.id);
        return bounds ? Math.abs(alignCoordinate(bounds, axis, target) - targetValue) <= ALIGN_EPSILON : true;
      });
      const wouldMove = selection.some((shape) => {
        if (shape.locked || shape.id === anchorId) {
          return false;
        }
        const bounds = boundsById.get(shape.id);
        return bounds ? Math.abs(alignCoordinate(bounds, axis, target) - targetValue) > ALIGN_EPSILON : false;
      });
      const label = alignmentLabel(axis, target);
      return {
        axis,
        target,
        aligned,
        disabled: !wouldMove,
        title: aligned ? `Ya alineado ${label}` : `Alinear ${label}`,
      };
    }),
  );
}

type TopologyShapeLike = {
  faces: CadTopologyFace[];
  vertices: CadTopologyVertex[];
  edges: CadTopologyEdge[];
};

function coordinateForAxis(point: { x: number; y: number; z: number }, axis: AlignAxis) {
  return axis === "x" ? point.x : axis === "y" ? point.y : point.z;
}

/**
 * Representative points for the topology selection: vertex → its position,
 * edge → its center, face → its center. Returns `null` when any pick cannot be
 * resolved against the (possibly stale) topology.
 */
function topologySelectionReps(topology: TopologyShapeLike, selection: CadTopologyPick[]): { x: number; y: number; z: number }[] | null {
  const reps: { x: number; y: number; z: number }[] = [];
  for (const pick of selection) {
    if (pick.kind === "vertex") {
      const vertex = topology.vertices.find((entry) => entry.id === pick.id);
      if (!vertex) return null;
      reps.push({ x: vertex.x, y: vertex.y, z: vertex.z });
    } else if (pick.kind === "edge") {
      const edge = topology.edges.find((entry) => entry.id === pick.id);
      if (!edge) return null;
      reps.push({ x: edge.center.x, y: edge.center.y, z: edge.center.z });
    } else {
      const face = topology.faces.find((entry) => entry.id === pick.id);
      if (!face) return null;
      reps.push({ x: face.center.x, y: face.center.y, z: face.center.z });
    }
  }
  return reps;
}

function topologySelectionControlPoints(topology: TopologyShapeLike, selection: CadTopologyPick[]) {
  const unique = new Map<string, { x: number; y: number; z: number }>();
  const add = (point: { x: number; y: number; z: number }) => {
    const key = `${point.x.toFixed(5)}:${point.y.toFixed(5)}:${point.z.toFixed(5)}`;
    if (!unique.has(key)) unique.set(key, { x: point.x, y: point.y, z: point.z });
  };
  selection.forEach((pick) => {
    if (pick.kind === "vertex") {
      const vertex = topology.vertices.find((entry) => entry.id === pick.id);
      if (vertex) add(vertex);
    } else if (pick.kind === "edge") {
      topology.edges.find((entry) => entry.id === pick.id)?.endpoints.forEach(add);
    } else {
      const face = topology.faces.find((entry) => entry.id === pick.id);
      if (!face) return;
      for (let index = 0; index + 2 < face.points.length; index += 3) add({ x: face.points[index], y: face.points[index + 1], z: face.points[index + 2] });
    }
  });
  return [...unique.values()];
}

function topologyPointsCenter(points: Array<{ x: number; y: number; z: number }>) {
  const divisor = Math.max(1, points.length);
  return points.reduce((center, point) => ({ x: center.x + point.x / divisor, y: center.y + point.y / divisor, z: center.z + point.z / divisor }), { x: 0, y: 0, z: 0 });
}

function topologyWorldPointToShapeLocal(shape: WorkplaneShape, point: { x: number; y: number; z: number }) {
  const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  const inverseRotation = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation ?? 0),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ))
    .invert();
  const local = new THREE.Vector3(point.x, point.y, point.z).sub(center).applyQuaternion(inverseRotation);
  if (shape.mirrorX) local.x *= -1;
  if (shape.mirrorY) local.y *= -1;
  if (shape.mirrorZ) local.z *= -1;
  return { x: local.x, y: local.y, z: local.z };
}

function topologyShapeLocalPointToWorld(shape: WorkplaneShape, point: { x: number; y: number; z: number }) {
  const local = new THREE.Vector3(
    point.x * (shape.mirrorX ? -1 : 1),
    point.y * (shape.mirrorY ? -1 : 1),
    point.z * (shape.mirrorZ ? -1 : 1),
  );
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation ?? 0),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  ));
  local.applyQuaternion(rotation);
  local.add(new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z));
  return { x: local.x, y: local.y, z: local.z };
}

function constructionTopologyVertices(shape: WorkplaneShape): CadTopologyVertex[] {
  return (shape.constructionVertices ?? []).map((vertex) => {
    const world = topologyShapeLocalPointToWorld(shape, vertex.position);
    return { id: vertex.topologyId, x: world.x, y: world.y, z: world.z };
  });
}

function constructionEdgeTopologyId(edge: NonNullable<WorkplaneShape["constructionEdges"]>[number], index: number) {
  return edge.topologyId ?? (-1_000_001 - index);
}

function constructionTopologyEdges(shape: WorkplaneShape): CadTopologyEdge[] {
  return (shape.constructionEdges ?? []).map((edge, index) => ({ edge, index })).filter(({ edge }) => !edge.partition).map(({ edge, index }) => {
    const start = topologyShapeLocalPointToWorld(shape, edge.start);
    const end = topologyShapeLocalPointToWorld(shape, edge.end);
    return {
      id: constructionEdgeTopologyId(edge, index),
      center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, z: (start.z + end.z) / 2 },
      points: [start.x, start.y, start.z, end.x, end.y, end.z],
      endpoints: [start, end],
    };
  });
}

function constructionEdgeByTopologyId(shape: WorkplaneShape, topologyId: number) {
  const index = (shape.constructionEdges ?? []).findIndex((edge, edgeIndex) => constructionEdgeTopologyId(edge, edgeIndex) === topologyId);
  return index >= 0 ? { edge: shape.constructionEdges![index], index } : null;
}

function moveConstructionEdgeToWorldEndpoints(
  shape: WorkplaneShape,
  topologyId: number,
  endpoints: Array<{ to: { x: number; y: number; z: number } }>,
) {
  const match = constructionEdgeByTopologyId(shape, topologyId);
  if (!match || endpoints.length < 2) return null;
  const start = topologyWorldPointToShapeLocal(shape, endpoints[0].to);
  const end = topologyWorldPointToShapeLocal(shape, endpoints[1].to);
  const constructionEdges = (shape.constructionEdges ?? []).map((edge, index) => index === match.index ? { ...edge, start, end } : edge);
  const constructionVertices = (shape.constructionVertices ?? []).map((vertex) => {
    if (vertex.id === match.edge.startVertexId) return { ...vertex, position: start };
    if (vertex.id === match.edge.endVertexId) return { ...vertex, position: end };
    return vertex;
  });
  return { constructionEdges, constructionVertices, edge: match.edge };
}

function constructionVertexNearWorld(shape: WorkplaneShape, point: { x: number; y: number; z: number }, tolerance = 0.15) {
  return (shape.constructionVertices ?? []).find((vertex) => {
    const world = topologyShapeLocalPointToWorld(shape, vertex.position);
    return Math.hypot(world.x - point.x, world.y - point.y, world.z - point.z) <= tolerance;
  }) ?? null;
}

function topologyWithConstructionVertices(shape: WorkplaneShape, topology: TopologyShapeLike): TopologyShapeLike {
  return {
    ...topology,
    vertices: [...topology.vertices, ...constructionTopologyVertices(shape)],
    edges: [...topology.edges, ...constructionTopologyEdges(shape)],
  };
}

function transformSelectedConstructionVertices(
  shape: WorkplaneShape,
  selection: CadTopologyPick[],
  transform: (point: { x: number; y: number; z: number }) => { x: number; y: number; z: number },
) {
  const selectedVertexIds = new Set(selection.filter((pick) => pick.kind === "vertex").map((pick) => pick.id));
  const selectedEdgeIds = new Set(selection.filter((pick) => pick.kind === "edge").map((pick) => pick.id));
  const movedLocalById = new Map<string, { x: number; y: number; z: number }>();
  let constructionVertices = (shape.constructionVertices ?? []).map((vertex) => {
    if (!selectedVertexIds.has(vertex.topologyId)) return vertex;
    const world = topologyShapeLocalPointToWorld(shape, vertex.position);
    const nextWorld = transform(world);
    if (Math.hypot(nextWorld.x - world.x, nextWorld.y - world.y, nextWorld.z - world.z) <= ALIGN_EPSILON) return vertex;
    const position = topologyWorldPointToShapeLocal(shape, nextWorld);
    movedLocalById.set(vertex.id, position);
    return { ...vertex, position };
  });
  let movedEdges = 0;
  const constructionEdges = shape.constructionEdges?.map((edge, index) => {
    if (!selectedEdgeIds.has(constructionEdgeTopologyId(edge, index))) {
      return {
        ...edge,
        start: edge.startVertexId && movedLocalById.has(edge.startVertexId) ? movedLocalById.get(edge.startVertexId)! : edge.start,
        end: edge.endVertexId && movedLocalById.has(edge.endVertexId) ? movedLocalById.get(edge.endVertexId)! : edge.end,
      };
    }
    const startWorld = topologyShapeLocalPointToWorld(shape, edge.start);
    const endWorld = topologyShapeLocalPointToWorld(shape, edge.end);
    const nextStart = transform(startWorld);
    const nextEnd = transform(endWorld);
    const start = topologyWorldPointToShapeLocal(shape, nextStart);
    const end = topologyWorldPointToShapeLocal(shape, nextEnd);
    if (edge.startVertexId) movedLocalById.set(edge.startVertexId, start);
    if (edge.endVertexId) movedLocalById.set(edge.endVertexId, end);
    movedEdges += 1;
    return { ...edge, start, end };
  });
  if (movedLocalById.size > 0) {
    constructionVertices = constructionVertices.map((vertex) => movedLocalById.has(vertex.id) ? { ...vertex, position: movedLocalById.get(vertex.id)! } : vertex);
  }
  if (movedLocalById.size === 0 && movedEdges === 0) return { shape, moved: 0 };
  return {
    shape: { ...shape, constructionVertices, constructionEdges },
    moved: movedLocalById.size + movedEdges,
  };
}

/**
 * Points used to measure the extreme Y of a topology selection: vertex → its
 * position, edge → its endpoints, face → its sampled boundary polyline.
 * Returns `null` when any pick cannot be resolved.
 */
function topologyExtremePoints(topology: TopologyShapeLike, selection: CadTopologyPick[]): { x: number; y: number; z: number }[] | null {
  const points: { x: number; y: number; z: number }[] = [];
  for (const pick of selection) {
    if (pick.kind === "vertex") {
      const vertex = topology.vertices.find((entry) => entry.id === pick.id);
      if (!vertex) return null;
      points.push({ x: vertex.x, y: vertex.y, z: vertex.z });
    } else if (pick.kind === "edge") {
      const edge = topology.edges.find((entry) => entry.id === pick.id);
      if (!edge) return null;
      points.push(...edge.endpoints.map((endpoint) => ({ x: endpoint.x, y: endpoint.y, z: endpoint.z })));
    } else {
      const face = topology.faces.find((entry) => entry.id === pick.id);
      if (!face) return null;
      for (let index = 0; index + 2 < face.points.length; index += 3) {
        points.push({ x: face.points[index], y: face.points[index + 1], z: face.points[index + 2] });
      }
    }
  }
  return points;
}

/**
 * The nine alignment statuses for a topology selection (no anchor concept).
 * With fewer than two entities every handle is disabled.
 */
function topologyAlignmentStatuses(topology: TopologyShapeLike, selection: CadTopologyPick[]): AlignHandleStatus[] {
  const reps = topologySelectionReps(topology, selection);
  if (!reps || reps.length < 2) {
    return ALIGN_AXES.flatMap((axis) =>
      ALIGN_TARGETS.map((target) => ({
        axis,
        target,
        aligned: false,
        disabled: true,
        title: "Selecciona al menos dos entes para alinear",
      })),
    );
  }
  return ALIGN_AXES.flatMap((axis) =>
    ALIGN_TARGETS.map((target) => {
      const values = reps.map((point) => coordinateForAxis(point, axis));
      const targetValue = alignTargetValue(values, target);
      const aligned = values.every((value) => Math.abs(value - targetValue) <= ALIGN_EPSILON);
      const label = alignmentLabel(axis, target);
      return {
        axis,
        target,
        aligned,
        disabled: aligned,
        title: aligned ? `Ya alineado ${label}` : `Alinear ${label}`,
      };
    }),
  );
}

/**
 * Builds the reselect anchors for a topology selection displaced by `delta`.
 * Used after a nudge/transform commit so the (hash-instability-prone) ids can
 * be re-resolved by position once the fresh topology arrives.
 */
function topologyReselectAnchors(
  topology: TopologyShapeLike,
  selection: CadTopologyPick[],
  delta: { x: number; y: number; z: number },
): Array<{ kind: CadTopologyPickKind; anchor: { x: number; y: number; z: number } }> {
  const anchors: Array<{ kind: CadTopologyPickKind; anchor: { x: number; y: number; z: number } }> = [];
  for (const pick of selection) {
    if (pick.kind === "vertex") {
      const vertex = topology.vertices.find((entry) => entry.id === pick.id);
      if (!vertex) continue;
      anchors.push({ kind: "vertex", anchor: { x: vertex.x + delta.x, y: vertex.y + delta.y, z: vertex.z + delta.z } });
    } else if (pick.kind === "edge") {
      const edge = topology.edges.find((entry) => entry.id === pick.id);
      if (!edge) continue;
      anchors.push({ kind: "edge", anchor: { x: edge.center.x + delta.x, y: edge.center.y + delta.y, z: edge.center.z + delta.z } });
    } else {
      const face = topology.faces.find((entry) => entry.id === pick.id);
      if (!face) continue;
      anchors.push({ kind: "face", anchor: { x: face.center.x + delta.x, y: face.center.y + delta.y, z: face.center.z + delta.z } });
    }
  }
  return anchors;
}

function alignedShapesForSelection(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  selectedShapes: WorkplaneShape[],
  anchorId: string | null,
  axis: AlignAxis,
  target: AlignTarget,
) {
  const selected = new Set(selectedIds);
  const boundsById = new Map(selectedShapes.map((shape) => [shape.id, meshAabb(shape)]));
  const anchorBounds = anchorId ? boundsById.get(anchorId) ?? null : null;
  const referenceBounds = anchorBounds ?? boundsForCuboids(Array.from(boundsById.values()));
  const targetValue = alignCoordinate(referenceBounds, axis, target);
  let moved = 0;

  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked || shape.id === anchorId) {
      return shape;
    }
    const bounds = boundsById.get(shape.id);
    if (!bounds) {
      return shape;
    }
    const delta = targetValue - alignCoordinate(bounds, axis, target);
    if (Math.abs(delta) <= ALIGN_EPSILON) {
      return shape;
    }
    moved += 1;
    if (axis === "x") {
      return { ...shape, x: cleanNearZero(Number((shape.x + delta).toFixed(4)), ALIGN_EPSILON) };
    }
    if (axis === "z") {
      return { ...shape, z: cleanNearZero(Number((shape.z + delta).toFixed(4)), ALIGN_EPSILON) };
    }
    return { ...shape, elevation: cleanNearZero(Number(((shape.elevation ?? 0) + delta).toFixed(4)), ALIGN_EPSILON) };
  });

  return { nextShapes, moved };
}

function effectiveAlignmentAnchorId(selection: WorkplaneShape[], requestedAnchorId: string | null) {
  return selection.find((shape) => shape.locked)?.id
    ?? (requestedAnchorId && selection.some((shape) => shape.id === requestedAnchorId) ? requestedAnchorId : null);
}

function mirrorAxisLabel(axis: AlignAxis) {
  return axis === "x" ? "izquierda-derecha" : axis === "z" ? "adelante-atrás" : "arriba-abajo";
}

function mirrorFlagPatch(shape: WorkplaneShape, axis: AlignAxis) {
  if (axis === "x") {
    return { mirrorX: !shape.mirrorX };
  }
  if (axis === "z") {
    return { mirrorZ: !shape.mirrorZ };
  }
  return { mirrorY: !shape.mirrorY };
}

function reflectionMatrixForAxis(axis: AlignAxis) {
  return new THREE.Matrix4().makeScale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1, axis === "z" ? -1 : 1);
}

function mirroredShapePatch(shape: WorkplaneShape, axis: AlignAxis, pivot: number): Partial<WorkplaneShape> {
  const centerY = (shape.elevation ?? 0) + shape.height / 2;
  const nextCenter = axis === "x" ? 2 * pivot - shape.x : axis === "z" ? 2 * pivot - shape.z : 2 * pivot - centerY;
  const worldReflection = reflectionMatrixForAxis(axis);
  const localReflection = reflectionMatrixForAxis(axis);
  const currentRotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(shape));
  const nextRotationMatrix = worldReflection.multiply(currentRotation).multiply(localReflection);
  const nextQuaternion = new THREE.Quaternion().setFromRotationMatrix(nextRotationMatrix);
  const rotationPatch = rotationFromQuaternion(nextQuaternion);
  const positionPatch =
    axis === "x"
      ? { x: cleanNearZero(Number(nextCenter.toFixed(4)), ALIGN_EPSILON) }
      : axis === "z"
        ? { z: cleanNearZero(Number(nextCenter.toFixed(4)), ALIGN_EPSILON) }
        : { elevation: cleanNearZero(Number((nextCenter - shape.height / 2).toFixed(4)), ALIGN_EPSILON) };

  return {
    ...shape,
    ...positionPatch,
    ...rotationPatch,
    ...mirrorFlagPatch(shape, axis),
  };
}

function mirroredShapesForSelection(shapes: WorkplaneShape[], selectedIds: string[], selectedShapes: WorkplaneShape[], axis: AlignAxis) {
  if (selectedShapes.length === 0) {
    return { nextShapes: shapes, moved: 0 };
  }

  const selected = new Set(selectedIds);
  const selectionBounds = boundsForShapes(selectedShapes);
  const pivot = axis === "x" ? (selectionBounds.minX + selectionBounds.maxX) / 2 : axis === "z" ? (selectionBounds.minZ + selectionBounds.maxZ) / 2 : (selectionBounds.minY + selectionBounds.maxY) / 2;
  let moved = 0;
  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked) {
      return shape;
    }
    moved += 1;
    return {
      ...shape,
      ...mirroredShapePatch(shape, axis, pivot),
    };
  });

  return { nextShapes, moved };
}

function geometryFromMeshData(mesh: MeshData) {
  const positions: number[] = [];
  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x, y, z);
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function positionsFromGeometryDrawRange(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  if (!position) {
    return [];
  }

  const positions: number[] = [];
  const drawStart = Math.max(0, Math.floor(geometry.drawRange.start || 0));
  if (geometry.index) {
    const index = geometry.index;
    const drawCount = Number.isFinite(geometry.drawRange.count) ? Math.max(0, Math.floor(geometry.drawRange.count)) : index.count - drawStart;
    const end = Math.min(index.count, drawStart + drawCount);
    for (let i = drawStart; i + 2 < end; i += 3) {
      for (let offset = 0; offset < 3; offset += 1) {
        const vertexIndex = index.getX(i + offset);
        positions.push(position.getX(vertexIndex), position.getY(vertexIndex), position.getZ(vertexIndex));
      }
    }
    return positions;
  }

  const drawCount = Number.isFinite(geometry.drawRange.count) ? Math.max(0, Math.floor(geometry.drawRange.count)) : position.count - drawStart;
  const end = Math.min(position.count, drawStart + drawCount);
  for (let i = drawStart; i + 2 < end; i += 3) {
    positions.push(
      position.getX(i),
      position.getY(i),
      position.getZ(i),
      position.getX(i + 1),
      position.getY(i + 1),
      position.getZ(i + 1),
      position.getX(i + 2),
      position.getY(i + 2),
      position.getZ(i + 2),
    );
  }
  return positions;
}

function boundsForPositions(positions: number[]): Cuboid | null {
  if (positions.length < 9) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite) ? { minX, maxX, minY, maxY, minZ, maxZ } : null;
}

function quantizedPointKey([x, y, z]: Vec3, tolerance: number) {
  return [x, y, z].map((value) => Math.round(value / tolerance)).join(",");
}

function triangleSignature(points: Vec3[], tolerance: number) {
  return points.map((point) => quantizedPointKey(point, tolerance)).sort().join("|");
}

function addSignature(signatures: Map<string, number>, signature: string) {
  signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
}

function meshSignatureMap(mesh: MeshData, tolerance: number) {
  const signatures = new Map<string, number>();
  mesh.faces.forEach(([ai, bi, ci]) => {
    addSignature(signatures, triangleSignature([mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]], tolerance));
  });
  return signatures;
}

function positionsSignatureMap(positions: number[], tolerance: number) {
  const signatures = new Map<string, number>();
  for (let i = 0; i + 8 < positions.length; i += 9) {
    addSignature(
      signatures,
      triangleSignature(
        [
          [positions[i], positions[i + 1], positions[i + 2]],
          [positions[i + 3], positions[i + 4], positions[i + 5]],
          [positions[i + 6], positions[i + 7], positions[i + 8]],
        ],
        tolerance,
      ),
    );
  }
  return signatures;
}

function signatureMapsDiffer(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) {
    return true;
  }
  for (const [signature, count] of a) {
    if (b.get(signature) !== count) {
      return true;
    }
  }
  return false;
}

function positionsDifferFromMeshData(positions: number[], mesh: MeshData, tolerance = 0.0005) {
  if (Math.floor(positions.length / 9) !== mesh.faces.length) {
    return true;
  }
  return signatureMapsDiffer(positionsSignatureMap(positions, tolerance), meshSignatureMap(mesh, tolerance));
}

function geometryDiffersFromMeshData(geometry: THREE.BufferGeometry, mesh: MeshData, tolerance = 0.0005) {
  return positionsDifferFromMeshData(positionsFromGeometryDrawRange(geometry), mesh, tolerance);
}

function sortedEdgeKey(a: Vec3, b: Vec3, tolerance: number) {
  const ak = quantizedPointKey(a, tolerance);
  const bk = quantizedPointKey(b, tolerance);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function edgeMidpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function addBoundaryEdge(edges: Map<string, { count: number; midpoint: Vec3 }>, a: Vec3, b: Vec3, tolerance: number) {
  const key = sortedEdgeKey(a, b, tolerance);
  const existing = edges.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    edges.set(key, { count: 1, midpoint: edgeMidpoint(a, b) });
  }
}

function positionsBoundaryEdges(positions: number[], tolerance = 0.0005) {
  const edges = new Map<string, { count: number; midpoint: Vec3 }>();
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const a: Vec3 = [positions[i], positions[i + 1], positions[i + 2]];
    const b: Vec3 = [positions[i + 3], positions[i + 4], positions[i + 5]];
    const c: Vec3 = [positions[i + 6], positions[i + 7], positions[i + 8]];
    addBoundaryEdge(edges, a, b, tolerance);
    addBoundaryEdge(edges, b, c, tolerance);
    addBoundaryEdge(edges, c, a, tolerance);
  }
  return Array.from(edges.values()).filter((edge) => edge.count === 1);
}

function meshDataPositions(mesh: MeshData) {
  const positions: number[] = [];
  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x, y, z);
    });
  });
  return positions;
}

function meshFaceComponents(mesh: MeshData, tolerance = SEPARATE_PARTS_VERTEX_TOLERANCE) {
  if (mesh.faces.length === 0) return [];
  const keysByFace = mesh.faces.map((face) => face.map((vertexIndex) => quantizedPointKey(mesh.vertices[vertexIndex], tolerance)));
  const facesByVertex = new Map<string, number[]>();
  keysByFace.forEach((keys, faceIndex) => {
    keys.forEach((key) => {
      const current = facesByVertex.get(key);
      if (current) {
        current.push(faceIndex);
      } else {
        facesByVertex.set(key, [faceIndex]);
      }
    });
  });

  const visited = new Uint8Array(mesh.faces.length);
  const components: number[][] = [];
  for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex += 1) {
    if (visited[faceIndex]) continue;
    const component: number[] = [];
    const queue = [faceIndex];
    visited[faceIndex] = 1;
    while (queue.length > 0) {
      const current = queue.pop() as number;
      component.push(current);
      keysByFace[current].forEach((key) => {
        const neighbors = facesByVertex.get(key);
        if (!neighbors) return;
        facesByVertex.delete(key);
        neighbors.forEach((neighbor) => {
          if (visited[neighbor]) return;
          visited[neighbor] = 1;
          queue.push(neighbor);
        });
      });
    }
    components.push(component);
  }
  return components;
}

function meshComponentShape(source: WorkplaneShape, mesh: MeshData, faceIndices: number[], partIndex: number, totalParts: number): WorkplaneShape | null {
  const worldPositions: number[] = [];
  faceIndices.forEach((faceIndex) => {
    const face = mesh.faces[faceIndex];
    if (!face) return;
    face.forEach((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      if (vertex) worldPositions.push(vertex[0], vertex[1], vertex[2]);
    });
  });

  const bounds = boundsForPositions(worldPositions);
  if (!bounds) return null;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxX - bounds.minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, bounds.maxY - bounds.minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxZ - bounds.minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions = worldPositions.map((value, index) => {
    if (index % 3 === 0) return value - centerX;
    if (index % 3 === 1) return value - bounds.minY;
    return value - centerZ;
  });

  return canonicalizeShape({
    id: createLocalId(`${source.id}-part`),
    name: totalParts > 1 ? `${source.name} Part ${partIndex + 1}` : source.name,
    kind: "mesh",
    color: source.color,
    hole: source.hole || undefined,
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(bounds.minY, 0.0005),
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    locked: false,
    hidden: source.hidden,
  });
}

function separateMeshParts(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  const components = meshFaceComponents(mesh).filter((component) => component.length > 0);
  if (components.length <= 1) return [];
  return components
    .map((component, index) => meshComponentShape(shape, mesh, component, index, components.length))
    .filter((part): part is WorkplaneShape => Boolean(part));
}

function separablePartCount(shape: WorkplaneShape) {
  if (shape.locked || shape.hole) return 0;
  if (shape.groupedShapes?.length && !shape.importedMesh) return shape.groupedShapes.length;
  const mesh = meshForShape(shape);
  return meshFaceComponents(mesh).length;
}

function separateShapeParts(shape: WorkplaneShape) {
  if (shape.locked || shape.hole) return [];
  if (shape.groupedShapes?.length && !shape.importedMesh) {
    const restored = restoreGroupedChildren(shape);
    return restored.length > 1 ? restored : [];
  }
  return separateMeshParts(shape);
}

function cutBoundaryEdgeCount(positions: number[], cutters: WorkplaneShape[]) {
  if (cutters.length === 0) {
    return 0;
  }
  return positionsBoundaryEdges(positions).filter((edge) => cutters.some((cutter) => pointInsideHoleShape(edge.midpoint, cutter))).length;
}

function introducesOpenCutBoundary(resultPositions: number[], sourceMesh: MeshData, cutters: WorkplaneShape[]) {
  const resultCutBoundaries = cutBoundaryEdgeCount(resultPositions, cutters);
  if (resultCutBoundaries === 0) {
    return false;
  }

  const sourceCutBoundaries = cutBoundaryEdgeCount(meshDataPositions(sourceMesh), cutters);
  return resultCutBoundaries > sourceCutBoundaries + Math.max(4, Math.floor(sourceCutBoundaries * 0.25));
}

function cuboidFromBox3(box: THREE.Box3): Cuboid {
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minY: box.min.y,
    maxY: box.max.y,
    minZ: box.min.z,
    maxZ: box.max.z,
  };
}

function paddedCutterShape(shape: WorkplaneShape): WorkplaneShape {
  const width = shapeWidth(shape) + CUTTER_PADDING * 2;
  const depth = shapeDepth(shape) + CUTTER_PADDING * 2;
  const height = shape.height + CUTTER_PADDING * 2;
  return {
    ...shape,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    elevation: (shape.elevation ?? 0) - CUTTER_PADDING,
    baseRadius: shape.baseRadius ? shape.baseRadius + CUTTER_PADDING : shape.baseRadius,
  };
}

function brushFromShape(shape: WorkplaneShape, cutter = false) {
  const brush = new Brush(geometryFromMeshData(meshForShape(cutter ? paddedCutterShape(shape) : shape)));
  brush.updateMatrixWorld(true);
  return brush;
}

function positiveCuboid(cuboid: Cuboid) {
  return cuboid.maxX - cuboid.minX > 0.01 && cuboid.maxY - cuboid.minY > 0.01 && cuboid.maxZ - cuboid.minZ > 0.01;
}

function subtractCuboid(source: Cuboid, cutter: Cuboid): Cuboid[] {
  const overlap = {
    minX: Math.max(source.minX, cutter.minX),
    maxX: Math.min(source.maxX, cutter.maxX),
    minY: Math.max(source.minY, cutter.minY),
    maxY: Math.min(source.maxY, cutter.maxY),
    minZ: Math.max(source.minZ, cutter.minZ),
    maxZ: Math.min(source.maxZ, cutter.maxZ),
  };

  if (!positiveCuboid(overlap)) {
    return [source];
  }

  return [
    { ...source, maxX: overlap.minX },
    { ...source, minX: overlap.maxX },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: source.maxY, minZ: source.minZ, maxZ: overlap.minZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: source.maxY, minZ: overlap.maxZ, maxZ: source.maxZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: overlap.minY, minZ: overlap.minZ, maxZ: overlap.maxZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: overlap.maxY, maxY: source.maxY, minZ: overlap.minZ, maxZ: overlap.maxZ },
  ].filter(positiveCuboid);
}

function cuboidsOverlap(a: Cuboid, b: Cuboid) {
  return (
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.01 &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > 0.01 &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.01
  );
}

function hasSolidHoleOverlap(solids: WorkplaneShape[], holes: WorkplaneShape[]) {
  const solidBounds = solids.map(meshAabb);
  const holeBounds = holes.map((hole) => meshAabb(paddedCutterShape(hole)));
  return solidBounds.some((solid) => holeBounds.some((hole) => cuboidsOverlap(solid, hole)));
}

function pointInsideCuboid(point: Vec3, cuboid: Cuboid, inset = -POINT_TOLERANCE) {
  const minX = cuboid.minX + inset;
  const maxX = cuboid.maxX - inset;
  const minY = cuboid.minY + inset;
  const maxY = cuboid.maxY - inset;
  const minZ = cuboid.minZ + inset;
  const maxZ = cuboid.maxZ - inset;
  return (
    minX <= maxX &&
    minY <= maxY &&
    minZ <= maxZ &&
    point[0] >= minX &&
    point[0] <= maxX &&
    point[1] >= minY &&
    point[1] <= maxY &&
    point[2] >= minZ &&
    point[2] <= maxZ
  );
}

function pointInsideHoleShape(point: Vec3, shape: WorkplaneShape, strictInterior = false) {
  if (shape.importedMesh || shape.groupedShapes?.length) {
    return pointInsideCuboid(point, meshAabb(shape), strictInterior ? CUTTER_RESIDUAL_INSET : -POINT_TOLERANCE);
  }

  const centerY = shape.height / 2;
  const inverse = new THREE.Matrix4()
    .makeRotationFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(shape.rotationX ?? 0),
        THREE.MathUtils.degToRad(shape.rotation),
        THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
        "XYZ",
      ),
    )
    .invert();
  const local = new THREE.Vector3(point[0] - shape.x, point[1] - (shape.elevation ?? 0) - centerY, point[2] - shape.z).applyMatrix4(inverse);
  const localY = local.y + centerY;
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  if (strictInterior) {
    const yInset = Math.min(CUTTER_RESIDUAL_INSET, shape.height * 0.25);
    const xInset = Math.min(CUTTER_RESIDUAL_INSET, halfWidth * 0.25);
    const zInset = Math.min(CUTTER_RESIDUAL_INSET, halfDepth * 0.25);
    const innerHalfWidth = halfWidth - xInset;
    const innerHalfDepth = halfDepth - zInset;
    if (innerHalfWidth <= 0 || innerHalfDepth <= 0 || localY <= yInset || localY >= shape.height - yInset) {
      return false;
    }

    if (shape.kind === "cylinder" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
      const nx = local.x / Math.max(POINT_TOLERANCE, innerHalfWidth);
      const nz = local.z / Math.max(POINT_TOLERANCE, innerHalfDepth);
      return nx * nx + nz * nz < 1;
    }

    return Math.abs(local.x) < innerHalfWidth && Math.abs(local.z) < innerHalfDepth;
  }

  const insideHeight = localY >= -POINT_TOLERANCE && localY <= shape.height + POINT_TOLERANCE;
  if (!insideHeight) {
    return false;
  }

  if (shape.kind === "cylinder" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
    const nx = local.x / Math.max(POINT_TOLERANCE, halfWidth);
    const nz = local.z / Math.max(POINT_TOLERANCE, halfDepth);
    return nx * nx + nz * nz <= 1.0001;
  }

  return Math.abs(local.x) <= halfWidth + POINT_TOLERANCE && Math.abs(local.z) <= halfDepth + POINT_TOLERANCE;
}

function triangleCentroid([a, b, c]: Vec3[]): Vec3 {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function triangleAabb([a, b, c]: Vec3[]): Cuboid {
  return {
    minX: Math.min(a[0], b[0], c[0]),
    maxX: Math.max(a[0], b[0], c[0]),
    minY: Math.min(a[1], b[1], c[1]),
    maxY: Math.max(a[1], b[1], c[1]),
    minZ: Math.min(a[2], b[2], c[2]),
    maxZ: Math.max(a[2], b[2], c[2]),
  };
}

function polygonAabb(points: Vec3[]): Cuboid {
  return points.reduce<Cuboid>(
    (bounds, [x, y, z]) => ({
      minX: Math.min(bounds.minX, x),
      maxX: Math.max(bounds.maxX, x),
      minY: Math.min(bounds.minY, y),
      maxY: Math.max(bounds.maxY, y),
      minZ: Math.min(bounds.minZ, z),
      maxZ: Math.max(bounds.maxZ, z),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  );
}

function cuboidsTouch(a: Cuboid, b: Cuboid, tolerance = 0.0001) {
  return (
    Math.min(a.maxX, b.maxX) + tolerance >= Math.max(a.minX, b.minX) &&
    Math.min(a.maxY, b.maxY) + tolerance >= Math.max(a.minY, b.minY) &&
    Math.min(a.maxZ, b.maxZ) + tolerance >= Math.max(a.minZ, b.minZ)
  );
}

function triangleTouchesHoleShape(triangle: Vec3[], hole: WorkplaneShape, holeBounds: Cuboid) {
  const bounds = triangleAabb(triangle);
  if (!cuboidsTouch(bounds, holeBounds)) {
    return false;
  }

  const [a, b, c] = triangle;
  const samples = [a, b, c, triangleCentroid(triangle), midpoint(a, b), midpoint(b, c), midpoint(c, a)];
  if (samples.some((point) => pointInsideHoleShape(point, hole))) {
    return true;
  }

  // Imported STLs are often open triangle soups. A cutter can cross a small triangle
  // without catching any sampled point, so tiny overlapping triangles are clipped too.
  const triangleSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ);
  const cutterSpan = Math.max(holeBounds.maxX - holeBounds.minX, holeBounds.maxY - holeBounds.minY, holeBounds.maxZ - holeBounds.minZ);
  return triangleSpan <= cutterSpan * 0.35;
}

function cutterTouchedTriangleCount(mesh: MeshData, cutters: WorkplaneShape[]) {
  const cutterInfo = cutters.map((cutter) => ({ shape: cutter, bounds: meshAabb(cutter) }));
  return mesh.faces.reduce((total, [ai, bi, ci]) => {
    const triangle = [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]];
    return total + (cutterInfo.some((cutter) => triangleTouchesHoleShape(triangle, cutter.shape, cutter.bounds)) ? 1 : 0);
  }, 0);
}

function isAxisAlignedBoxCutter(shape: WorkplaneShape) {
  const rotation = Math.abs(normalizeDegrees(shape.rotation));
  const rotationX = Math.abs(normalizeDegrees(shape.rotationX ?? 0));
  const rotationZ = Math.abs(normalizeDegrees(shape.rotationZ ?? 0));
  const straightY = rotation < 0.001 || Math.abs(rotation - 180) < 0.001 || Math.abs(rotation - 360) < 0.001;
  const straightX = rotationX < 0.001 || Math.abs(rotationX - 180) < 0.001 || Math.abs(rotationX - 360) < 0.001;
  const straightZ = rotationZ < 0.001 || Math.abs(rotationZ - 180) < 0.001 || Math.abs(rotationZ - 360) < 0.001;
  return shape.kind === "box" && straightX && straightY && straightZ;
}

type ClipPlane = { axis: 0 | 1 | 2; value: number; keepGreater: boolean };

function clipDistance(point: Vec3, plane: ClipPlane) {
  return plane.keepGreater ? point[plane.axis] - plane.value : plane.value - point[plane.axis];
}

function interpolateVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function clipPolygonByPlane(polygon: Vec3[], plane: ClipPlane, keepInside: boolean) {
  if (polygon.length < 3) {
    return [];
  }

  const clipped: Vec3[] = [];
  const isKept = (distance: number) => (keepInside ? distance >= -0.0001 : distance <= 0.0001);

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentDistance = clipDistance(current, plane);
    const nextDistance = clipDistance(next, plane);
    const currentKept = isKept(currentDistance);
    const nextKept = isKept(nextDistance);

    if (currentKept) {
      clipped.push(current);
    }

    if (currentKept !== nextKept) {
      const denom = currentDistance - nextDistance;
      const t = Math.abs(denom) > 0.000001 ? currentDistance / denom : 0;
      clipped.push(interpolateVec3(current, next, t));
    }
  }

  return clipped;
}

function subtractCuboidFromPolygon(polygon: Vec3[], cuboid: Cuboid) {
  const planes: ClipPlane[] = [
    { axis: 0, value: cuboid.minX, keepGreater: true },
    { axis: 0, value: cuboid.maxX, keepGreater: false },
    { axis: 1, value: cuboid.minY, keepGreater: true },
    { axis: 1, value: cuboid.maxY, keepGreater: false },
    { axis: 2, value: cuboid.minZ, keepGreater: true },
    { axis: 2, value: cuboid.maxZ, keepGreater: false },
  ];
  let pending = [polygon];
  const outsidePieces: Vec3[][] = [];

  for (const plane of planes) {
    const nextPending: Vec3[][] = [];
    pending.forEach((piece) => {
      const outside = clipPolygonByPlane(piece, plane, false);
      if (outside.length >= 3) {
        outsidePieces.push(outside);
      }

      const inside = clipPolygonByPlane(piece, plane, true);
      if (inside.length >= 3) {
        nextPending.push(inside);
      }
    });
    pending = nextPending;
    if (pending.length === 0) {
      break;
    }
  }

  return outsidePieces;
}

function triangulatePolygonToPositions(polygon: Vec3[], positions: number[]) {
  if (polygon.length < 3) {
    return;
  }

  const first = polygon[0];
  for (let i = 1; i < polygon.length - 1; i += 1) {
    const b = polygon[i];
    const c = polygon[i + 1];
    positions.push(first[0], first[1], first[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
}

function addQuadToPositions(positions: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
  positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  positions.push(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}

type HoleWallSide = "minX" | "maxX" | "minZ" | "maxZ";
type HoleWallSegment = { a: Vec3; b: Vec3; minCross: number; maxCross: number; avgY: number; key: string };

function localCutWallBaseY(segments: HoleWallSegment[], minY: number, maxY: number) {
  const ys = segments
    .flatMap((segment) => [segment.a[1], segment.b[1], segment.avgY])
    .filter((value) => value >= minY - 0.001 && value <= maxY + 0.001)
    .sort((a, b) => a - b);
  if (ys.length < 2) {
    return minY;
  }

  let largestGap = 0;
  let gapIndex = -1;
  const minimumGap = Math.max(0.25, (maxY - minY) * 0.08);
  for (let i = 1; i < ys.length; i += 1) {
    const gap = ys[i] - ys[i - 1];
    if (gap > largestGap) {
      largestGap = gap;
      gapIndex = i;
    }
  }

  if (gapIndex > 0 && largestGap > minimumGap) {
    return ys[gapIndex - 1];
  }

  return ys[Math.max(0, Math.floor(ys.length * 0.12))];
}

function clipSegmentToRect(a: Vec3, b: Vec3, crossAxis: 0 | 1 | 2, crossMin: number, crossMax: number, minY: number, maxY: number): [Vec3, Vec3] | null {
  let t0 = 0;
  let t1 = 1;
  const clipRange = (start: number, end: number, min: number, max: number) => {
    const delta = end - start;
    if (Math.abs(delta) < 0.000001) {
      return start >= min - 0.0001 && start <= max + 0.0001;
    }
    const ta = (min - start) / delta;
    const tb = (max - start) / delta;
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
    return t0 <= t1 + 0.0001;
  };

  if (!clipRange(a[crossAxis], b[crossAxis], crossMin, crossMax) || !clipRange(a[1], b[1], minY, maxY)) {
    return null;
  }

  const start = interpolateVec3(a, b, Math.max(0, Math.min(1, t0)));
  const end = interpolateVec3(a, b, Math.max(0, Math.min(1, t1)));
  return Math.hypot(start[0] - end[0], start[1] - end[1], start[2] - end[2]) > 0.01 ? [start, end] : null;
}

function trianglePlaneSegment(triangle: Vec3[], axis: 0 | 1 | 2, plane: number): [Vec3, Vec3] | null {
  const points: Vec3[] = [];
  const addPoint = (point: Vec3) => {
    if (!points.some((existing) => Math.hypot(existing[0] - point[0], existing[1] - point[1], existing[2] - point[2]) < 0.0001)) {
      points.push(point);
    }
  };

  for (let i = 0; i < 3; i += 1) {
    const a = triangle[i];
    const b = triangle[(i + 1) % 3];
    const da = a[axis] - plane;
    const db = b[axis] - plane;

    if (Math.abs(da) <= 0.0001) {
      addPoint(a);
    }
    if (Math.abs(db) <= 0.0001) {
      addPoint(b);
    }
    if (da * db < -0.00000001) {
      addPoint(interpolateVec3(a, b, da / (da - db)));
    }
  }

  if (points.length < 2) {
    return null;
  }

  let best: [Vec3, Vec3] = [points[0], points[1]];
  let bestDistance = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1], points[i][2] - points[j][2]);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = [points[i], points[j]];
      }
    }
  }

  return bestDistance > 0.01 ? best : null;
}

function addLocalHoleWallSegments(positions: number[], sourceMesh: MeshData, hole: Cuboid, solidBounds: Cuboid, side: HoleWallSide) {
  const axis = side === "minX" || side === "maxX" ? 0 : 2;
  const crossAxis = axis === 0 ? 2 : 0;
  const plane =
    side === "minX"
      ? Math.max(hole.minX, solidBounds.minX)
      : side === "maxX"
        ? Math.min(hole.maxX, solidBounds.maxX)
        : side === "minZ"
          ? Math.max(hole.minZ, solidBounds.minZ)
          : Math.min(hole.maxZ, solidBounds.maxZ);
  const crossMin = axis === 0 ? Math.max(hole.minZ, solidBounds.minZ) : Math.max(hole.minX, solidBounds.minX);
  const crossMax = axis === 0 ? Math.min(hole.maxZ, solidBounds.maxZ) : Math.min(hole.maxX, solidBounds.maxX);
  const minY = Math.max(hole.minY, solidBounds.minY);
  const maxY = Math.min(hole.maxY, solidBounds.maxY);
  const crossLength = crossMax - crossMin;
  if (crossLength <= 0.01 || maxY - minY <= 0.01) {
    return;
  }

  const sideTolerance = Math.max(0.0001, Math.min(hole.maxX - hole.minX, hole.maxZ - hole.minZ) * 0.0001);
  const seen = new Set<string>();
  const segmentKey = (a: Vec3, b: Vec3) => {
    const toKey = (point: Vec3) => `${Math.round(point[0] * 1000)},${Math.round(point[1] * 1000)},${Math.round(point[2] * 1000)}`;
    const ak = toKey(a);
    const bk = toKey(b);
    return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
  };
  const segments: HoleWallSegment[] = [];

  sourceMesh.faces.forEach(([ai, bi, ci]) => {
    const triangle = [sourceMesh.vertices[ai], sourceMesh.vertices[bi], sourceMesh.vertices[ci]];
    const bounds = polygonAabb(triangle);
    const minSide = axis === 0 ? bounds.minX : bounds.minZ;
    const maxSide = axis === 0 ? bounds.maxX : bounds.maxZ;
    const minCross = crossAxis === 0 ? bounds.minX : bounds.minZ;
    const maxCross = crossAxis === 0 ? bounds.maxX : bounds.maxZ;
    if (maxSide < plane - sideTolerance || minSide > plane + sideTolerance || maxCross < crossMin || minCross > crossMax || bounds.maxY < hole.minY || bounds.minY > hole.maxY) {
      return;
    }

    const rawSegment = trianglePlaneSegment(triangle, axis, plane);
    if (!rawSegment) {
      return;
    }
    const clipped = clipSegmentToRect(rawSegment[0], rawSegment[1], crossAxis, crossMin, crossMax, minY, maxY);
    if (!clipped) {
      return;
    }
    const [a, b] = clipped;
    if (Math.max(a[1], b[1]) <= minY + 0.01) {
      return;
    }
    const key = segmentKey(a, b);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    segments.push({
      a,
      b,
      minCross: Math.min(a[crossAxis], b[crossAxis]),
      maxCross: Math.max(a[crossAxis], b[crossAxis]),
      avgY: (a[1] + b[1]) / 2,
      key,
    });
  });

  const yTolerance = Math.max(0.03, (maxY - minY) * 0.01);
  const baseY = Math.max(minY, Math.min(maxY, localCutWallBaseY(segments, minY, maxY)));
  const minimumCrossSpan = Math.max(0.04, crossLength * 0.002);

  segments.forEach((segment) => {
    if (segment.maxCross - segment.minCross < minimumCrossSpan || Math.max(segment.a[1], segment.b[1]) - baseY <= yTolerance) {
      return;
    }
    const baseA: Vec3 = [segment.a[0], baseY, segment.a[2]];
    const baseB: Vec3 = [segment.b[0], baseY, segment.b[2]];
    addQuadToPositions(positions, segment.a, segment.b, baseB, baseA);
  });
}

function addBoxHoleInteriorFaces(positions: number[], hole: Cuboid, sourceMesh: MeshData, solidBounds: Cuboid) {
  const x0 = Math.max(hole.minX, solidBounds.minX);
  const x1 = Math.min(hole.maxX, solidBounds.maxX);
  const z0 = Math.max(hole.minZ, solidBounds.minZ);
  const z1 = Math.min(hole.maxZ, solidBounds.maxZ);
  if (x1 - x0 <= 0.01 || z1 - z0 <= 0.01) {
    return;
  }

  addLocalHoleWallSegments(positions, sourceMesh, hole, solidBounds, "minX");
  addLocalHoleWallSegments(positions, sourceMesh, hole, solidBounds, "maxX");
  addLocalHoleWallSegments(positions, sourceMesh, hole, solidBounds, "minZ");
  addLocalHoleWallSegments(positions, sourceMesh, hole, solidBounds, "maxZ");
}

function cuboidsToMesh(name: string, cuboids: Cuboid[], centerX: number, centerZ: number, baseY = 0): MeshData {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];

  const uniqueSorted = (values: number[]) =>
    values
      .slice()
      .sort((a, b) => a - b)
      .filter((value, index, sorted) => index === 0 || Math.abs(value - sorted[index - 1]) > 0.0001);

  const xs = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minX, cuboid.maxX]));
  const ys = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minY, cuboid.maxY]));
  const zs = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minZ, cuboid.maxZ]));
  const filled = new Set<string>();
  const cellKey = (x: number, y: number, z: number) => `${x}:${y}:${z}`;

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      for (let zi = 0; zi < zs.length - 1; zi += 1) {
        const cx = (xs[xi] + xs[xi + 1]) / 2;
        const cy = (ys[yi] + ys[yi + 1]) / 2;
        const cz = (zs[zi] + zs[zi + 1]) / 2;
        const inside = cuboids.some(
          (cuboid) =>
            cx > cuboid.minX + 0.0001 &&
            cx < cuboid.maxX - 0.0001 &&
            cy > cuboid.minY + 0.0001 &&
            cy < cuboid.maxY - 0.0001 &&
            cz > cuboid.minZ + 0.0001 &&
            cz < cuboid.maxZ - 0.0001,
        );
        if (inside) {
          filled.add(cellKey(xi, yi, zi));
        }
      }
    }
  }

  const isFilled = (x: number, y: number, z: number) => filled.has(cellKey(x, y, z));
  const addQuad = (points: Vec3[]) => {
    const offset = vertices.length;
    vertices.push(...points);
    faces.push([offset, offset + 1, offset + 2], [offset, offset + 2, offset + 3]);
  };

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      for (let zi = 0; zi < zs.length - 1; zi += 1) {
        if (!isFilled(xi, yi, zi)) {
          continue;
        }

        const x0 = xs[xi] - centerX;
        const x1 = xs[xi + 1] - centerX;
        const y0 = ys[yi] - baseY;
        const y1 = ys[yi + 1] - baseY;
        const z0 = zs[zi] - centerZ;
        const z1 = zs[zi + 1] - centerZ;

        if (!isFilled(xi - 1, yi, zi)) addQuad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]);
        if (!isFilled(xi + 1, yi, zi)) addQuad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]);
        if (!isFilled(xi, yi - 1, zi)) addQuad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]);
        if (!isFilled(xi, yi + 1, zi)) addQuad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]);
        if (!isFilled(xi, yi, zi - 1)) addQuad([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]);
        if (!isFilled(xi, yi, zi + 1)) addQuad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
      }
    }
  }

  return { name, vertices, faces };
}

function booleanMeshShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  try {
    const sourceTriangleCount = solids.reduce((total, solid) => total + meshForShape(solid).faces.length, 0);
    const overlappingCut = hasSolidHoleOverlap(solids, holes);
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    let result = brushFromShape(solids[0]);

    solids.slice(1).forEach((solid) => {
      result = evaluator.evaluate(result, brushFromShape(solid), ADDITION);
    });

    holes.forEach((hole) => {
      result = evaluator.evaluate(result, brushFromShape(hole, true), SUBTRACTION);
    });

    const resultPositions = positionsFromGeometryDrawRange(result.geometry);
    const groupBounds = boundsForPositions(resultPositions);
    if (!groupBounds) {
      return null;
    }

    const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
    const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
    const minY = groupBounds.minY;
    const rawWidth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
    const rawHeight = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
    const rawDepth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
    const width = cleanModelDimension(rawWidth);
    const height = cleanModelDimension(rawHeight);
    const depth = cleanModelDimension(rawDepth);
    const positions: number[] = [];

    for (let i = 0; i < resultPositions.length; i += 3) {
      positions.push(resultPositions[i] - centerX, resultPositions[i + 1] - minY, resultPositions[i + 2] - centerZ);
    }

    const firstSolid = solids[0];
    const nextTriangleCount = Math.floor(positions.length / 9);
    if (overlappingCut && Math.abs(nextTriangleCount - sourceTriangleCount) <= 1) {
      return null;
    }

    return {
      id: createLocalId("grouped-boolean"),
      name: "Group",
      kind: "mesh",
      color: firstSolid.color,
      x: centerX,
      z: centerZ,
      elevation: minY,
      size: Math.max(width, depth),
      width,
      depth,
      height,
      rotation: 0,
      importedMesh: {
        positions,
        baseWidth: rawWidth,
        baseDepth: rawDepth,
        baseHeight: rawHeight,
        triangleCount: nextTriangleCount,
        sourceFormat: "json",
      },
      groupedBaseWidth: width,
      groupedBaseDepth: depth,
      groupedBaseHeight: height,
      groupedShapes: selection.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
      locked: false,
      hidden: false,
    };
  } catch {
    return null;
  }
}

function resultGeometryToMeshShape(
  selection: WorkplaneShape[],
  solids: WorkplaneShape[],
  geometry: THREE.BufferGeometry,
  idPrefix: string,
): WorkplaneShape | null {
  const resultPositions = positionsFromGeometryDrawRange(geometry);
  const groupBounds = boundsForPositions(resultPositions);
  if (!groupBounds) {
    return null;
  }

  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const minY = groupBounds.minY;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];

  for (let i = 0; i < resultPositions.length; i += 3) {
    positions.push(resultPositions[i] - centerX, resultPositions[i + 1] - minY, resultPositions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];

  return {
    id: createLocalId(idPrefix),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: selection.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function isUsableBooleanGroup(group: WorkplaneShape | null, sourceTriangleCount = 0, enforceMinimumTriangles = true) {
  if (!group?.importedMesh) {
    return false;
  }

  const positions = group.importedMesh.positions;
  const triangleCount = group.importedMesh.triangleCount;
  const dimensions = [group.width, group.height, group.depth, group.size, group.x, group.z, group.elevation ?? 0];
  if (positions.length < 9 || triangleCount < 1 || positions.some((value) => !Number.isFinite(value)) || dimensions.some((value) => !Number.isFinite(value))) {
    return false;
  }

  const minTriangles = enforceMinimumTriangles && sourceTriangleCount > 0 ? Math.max(2, Math.min(48, Math.floor(sourceTriangleCount * 0.004))) : 2;
  return triangleCount >= minTriangles && group.width > 0.01 && group.height > 0.01 && group.depth > 0.01;
}

function looksLikeUnchangedBooleanResult(group: WorkplaneShape | null, sourceTriangleCount: number, requireChanged = true) {
  if (!group?.importedMesh) {
    return true;
  }

  if (!requireChanged) {
    return false;
  }

  const sameTriangles = Math.abs(group.importedMesh.triangleCount - sourceTriangleCount) <= 1;
  return sameTriangles;
}

function shapeContainsImportedMesh(shape: WorkplaneShape): boolean {
  return Boolean(shape.importedMesh) || Boolean(shape.groupedShapes?.some(shapeContainsImportedMesh));
}

function shapeIsImportedHole(shape: WorkplaneShape): boolean {
  return Boolean(shape.hole) && shapeContainsImportedMesh(shape);
}

function coplanarRescueCutterShape(shape: WorkplaneShape): WorkplaneShape {
  if (!shapeIsImportedHole(shape) || hasNonZeroRotation(shape)) {
    return shape;
  }
  return {
    ...shape,
    rotation: shape.rotation + COPLANAR_BOOLEAN_RESCUE_DEGREES,
    rotationZ: (shape.rotationZ ?? 0) + COPLANAR_BOOLEAN_RESCUE_DEGREES,
  };
}

function cloneAsGroupChild(shape: WorkplaneShape, centerX: number, centerZ: number, minY: number): WorkplaneShape {
  return {
    ...shape,
    id: createLocalId(`${shape.id}-group-child`),
    x: shape.x - centerX,
    z: shape.z - centerZ,
    elevation: (shape.elevation ?? 0) - minY,
  };
}

function mergedSolidMeshData(solids: WorkplaneShape[]) {
  const mergedSolidMesh: MeshData = { name: "ImportedBooleanSource", vertices: [], faces: [] };

  solids.forEach((solid) => {
    appendMeshData(mergedSolidMesh.vertices, mergedSolidMesh.faces, meshForShape(solid));
  });

  return mergedSolidMesh;
}

function meshDataToManifoldMesh(runtime: ManifoldToplevel, mesh: MeshData) {
  const vertProperties = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach(([x, y, z], index) => {
    vertProperties[index * 3] = x;
    vertProperties[index * 3 + 1] = y;
    vertProperties[index * 3 + 2] = z;
  });

  const triVerts = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach(([a, b, c], index) => {
    triVerts[index * 3] = a;
    triVerts[index * 3 + 1] = b;
    triVerts[index * 3 + 2] = c;
  });

  const manifoldMesh = new runtime.Mesh({
    numProp: 3,
    vertProperties,
    triVerts,
    tolerance: 0.0001,
  });
  manifoldMesh.merge();
  return manifoldMesh;
}

function boxBoundsToManifold(runtime: ManifoldToplevel, bounds: Cuboid, created: ManifoldSolid[]) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const depth = bounds.maxZ - bounds.minZ;
  if (width <= 0.0001 || height <= 0.0001 || depth <= 0.0001) {
    return null;
  }

  const box = runtime.Manifold.cube([width, height, depth]);
  created.push(box);
  const moved = box.translate([bounds.minX, bounds.minY, bounds.minZ]);
  if (moved !== box && moved) {
    created.push(moved);
  }
  return moved;
}

function trackManifold<T extends ManifoldSolid | null>(created: ManifoldSolid[], value: T): T {
  if (value) {
    created.push(value);
  }
  return value;
}

function manifoldTransformFromMatrix(matrix: THREE.Matrix4) {
  return matrix.elements as unknown as Parameters<ManifoldSolid["transform"]>[0];
}

function shapeRotationQuaternion(shape: WorkplaneShape) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(meshYawDegrees(shape)),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

function primitiveTransformMatrix(shape: WorkplaneShape, scale: THREE.Vector3, alignRotation?: THREE.Euler) {
  const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  const matrix = new THREE.Matrix4().compose(center, shapeRotationQuaternion(shape), new THREE.Vector3(1, 1, 1));
  if (alignRotation) {
    matrix.multiply(new THREE.Matrix4().makeRotationFromEuler(alignRotation));
  }
  matrix.multiply(new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z));
  return matrix;
}

function transformedPrimitiveManifold(runtime: ManifoldToplevel, primitive: ManifoldSolid, matrix: THREE.Matrix4, created: ManifoldSolid[]) {
  trackManifold(created, primitive);
  return trackManifold(created, primitive.transform(manifoldTransformFromMatrix(matrix)));
}

function primitiveManifoldForShape(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[]) {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  if (width <= 0.0001 || depth <= 0.0001 || height <= 0.0001) {
    return null;
  }

  if (shape.kind === "box") {
    return transformedPrimitiveManifold(runtime, runtime.Manifold.cube(1, true), primitiveTransformMatrix(shape, new THREE.Vector3(width, height, depth)), created);
  }

  if (shape.kind === "sphere") {
    const { widthSegments } = sphereTessellation(shape.steps);
    return transformedPrimitiveManifold(
      runtime,
      runtime.Manifold.sphere(1, widthSegments),
      primitiveTransformMatrix(shape, new THREE.Vector3(width / 2, height / 2, depth / 2)),
      created,
    );
  }

  if (shape.kind === "cylinder" || shape.kind === "cone") {
    const sides = shape.sides ?? 96;
    const topRadiusScale =
      shape.kind === "cone"
        ? shape.baseRadius
          ? (shape.topRadius ?? 0) / shape.baseRadius
          : 0
        : 1;
    return transformedPrimitiveManifold(
      runtime,
      runtime.Manifold.cylinder(1, 1, topRadiusScale, sides, true),
      primitiveTransformMatrix(shape, new THREE.Vector3(width / 2, depth / 2, height), new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ")),
      created,
    );
  }

  return null;
}

function shapeToManifoldSolid(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[], useBoxPrimitive = false) {
  if (useBoxPrimitive && isAxisAlignedBoxCutter(shape)) {
    return primitiveManifoldForShape(runtime, shape, created) ?? boxBoundsToManifold(runtime, meshAabb(shape), created);
  }

  const primitive = primitiveManifoldForShape(runtime, shape, created);
  if (primitive) {
    return primitive;
  }

  const mesh = meshDataToManifoldMesh(runtime, meshForShape(shape));
  try {
    return runtime.Manifold.ofMesh(mesh);
  } finally {
    disposeManifold(mesh);
  }
}

function shapesToManifoldUnion(runtime: ManifoldToplevel, shapes: WorkplaneShape[], created: ManifoldSolid[], useBoxPrimitive = false) {
  const parts: ManifoldSolid[] = [];
  for (const shape of shapes) {
    const part = shapeToManifoldSolid(runtime, shape, created, useBoxPrimitive);
    if (!part || part.status() !== "NoError" || part.numTri() < 1) {
      disposeManifold(part);
      return null;
    }
    parts.push(part);
    created.push(part);
  }

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const union = runtime.Manifold.union(parts);
  created.push(union);
  return union.status() === "NoError" && union.numTri() > 0 ? union : null;
}

function manifoldMeshToPositions(mesh: InstanceType<ManifoldToplevel["Mesh"]>) {
  const positions: number[] = [];
  const numProp = mesh.numProp;
  for (let i = 0; i < mesh.triVerts.length; i += 1) {
    const vertexIndex = mesh.triVerts[i];
    const offset = vertexIndex * numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

function positionsInteriorTriangleCount(positions: number[], cutters: WorkplaneShape[], strictInterior = false) {
  let count = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const centroid: Vec3 = [
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    ];
    if (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter, strictInterior))) {
      count += 1;
    }
  }
  return count;
}

function meshPositionsToGroupShape(selection: WorkplaneShape[], solids: WorkplaneShape[], positions: number[], idPrefix: string): WorkplaneShape | null {
  if (positions.length < 9) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const normalizedPositions: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    normalizedPositions.push(positions[i] - centerX, positions[i + 1] - minY, positions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];
  return {
    id: createLocalId(idPrefix),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions: normalizedPositions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(normalizedPositions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: selection.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function disposeManifold(value: unknown) {
  (value as { delete?: () => void } | null)?.delete?.();
}

async function manifoldBooleanMeshShape(selection: WorkplaneShape[], options: { requireImported?: boolean; idPrefix?: string } = {}): Promise<WorkplaneShape | null> {
  // GROUPING SAFETY NOTE FOR FUTURE AGENTS:
  // Imported STL + hole grouping stays on exact boolean first. Rotated cutters
  // are validated against their real oriented volume, not their broad AABB.
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0 || (options.requireImported !== false && !selection.some((shape) => Boolean(shape.importedMesh)))) {
    return null;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  const cutterTriangleCount = holes.reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceMesh.faces.length + cutterTriangleCount > IMPORTED_EXACT_BOOLEAN_TRIANGLE_LIMIT) {
    return null;
  }
  const cutterShapes = holes.map(paddedCutterShape);
  const residualValidationShapes = holes;
  const sourceInteriorTriangles = cutterInteriorTriangleCount(sourceMesh, cutterShapes);
  const sourceTouchedTriangles = cutterTouchedTriangleCount(sourceMesh, cutterShapes);
  const sourceCutTriangles = Math.max(sourceInteriorTriangles, sourceTouchedTriangles);

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;

  try {
    const runtime = await getManifoldRuntime();
    const solid = shapesToManifoldUnion(runtime, solids, created, true);
    const cutterSolid = shapesToManifoldUnion(runtime, holes.map(paddedCutterShape), created, true);
    if (!solid || !cutterSolid) {
      return null;
    }

    result = solid.subtract(cutterSolid);
    created.push(result);
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const resultChanged = positionsDifferFromMeshData(positions, sourceMesh);
    if (!resultChanged) {
      return null;
    }
    const hasImportedOperand = selection.some((shape) => Boolean(shape.importedMesh));
    const canUseResidualInteriorValidation =
      !hasImportedOperand && holes.every((hole) => hole.kind === "box" && !hole.importedMesh && !hole.groupedShapes?.length);
    if (canUseResidualInteriorValidation) {
      const remainingInteriorTriangles = positionsInteriorTriangleCount(positions, residualValidationShapes, true);
      if (sourceCutTriangles > 0 && remainingInteriorTriangles > Math.max(12, Math.floor(sourceCutTriangles * 0.35))) {
        return null;
      }
    }

    const group = meshPositionsToGroupShape(selection, solids, positions, options.idPrefix ?? "grouped-manifold-cut");
    const usable = isUsableBooleanGroup(group, sourceMesh.faces.length);
    const changedEnough = sourceCutTriangles > 0 || !looksLikeUnchangedBooleanResult(group, sourceMesh.faces.length, true);
    if (!usable || !changedEnough) {
      return null;
    }
    return group;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

async function manifoldUnionMeshShape(selection: WorkplaneShape[]): Promise<WorkplaneShape | null> {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  if (solids.length < 2 || !selection.some((shape) => Boolean(shape.importedMesh))) {
    return null;
  }

  const mergedSourceMesh = mergedSolidMeshData(solids);
  if (mergedSourceMesh.faces.length > IMPORTED_EXACT_BOOLEAN_TRIANGLE_LIMIT) {
    return null;
  }

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;
  try {
    const runtime = await getManifoldRuntime();
    result = shapesToManifoldUnion(runtime, solids, created, true);
    if (!result) {
      return null;
    }
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const group = meshPositionsToGroupShape(selection, solids, positions, "grouped-manifold-union");
    return isUsableBooleanGroup(group, mergedSourceMesh.faces.length, false) ? group : null;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

function asIntersectionGroup(group: WorkplaneShape): WorkplaneShape {
  return {
    ...group,
    name: "Intersection",
    hole: false,
  };
}

async function manifoldIntersectionMeshShape(selection: WorkplaneShape[]): Promise<IntersectionAttempt> {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole && !shape.locked);
  if (solids.length === 0 || holes.length === 0) {
    return { status: "unsupported" };
  }

  const sourceTriangleCount = selection.reduce((total, shape) => total + meshForShape(shape).faces.length, 0);
  if (sourceTriangleCount > IMPORTED_EXACT_BOOLEAN_TRIANGLE_LIMIT) {
    return { status: "unsupported" };
  }

  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const solid = shapesToManifoldUnion(runtime, solids, created, true);
    const hole = shapesToManifoldUnion(runtime, holes, created, true);
    if (!solid || !hole) {
      return { status: "unsupported" };
    }

    const result = solid.intersect(hole);
    created.push(result);
    if (result.status() !== "NoError") {
      return { status: "unsupported" };
    }
    if (result.numTri() < 1) {
      return { status: "empty" };
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const group = meshPositionsToGroupShape(selection, solids, positions, "grouped-manifold-intersection");
    return group && isUsableBooleanGroup(group, sourceTriangleCount, false)
      ? { status: "success", group: asIntersectionGroup(group) }
      : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

function bvhIntersectionMeshShape(selection: WorkplaneShape[], operation: CSGOperation, idPrefix: string): IntersectionAttempt {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole && !shape.locked);
  if (solids.length === 0 || holes.length === 0) {
    return { status: "unsupported" };
  }

  try {
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    (evaluator as Evaluator & { useCDTClipping: boolean }).useCDTClipping = true;

    let solidResult = brushFromShape(solids[0]);
    solids.slice(1).forEach((solid) => {
      solidResult = evaluator.evaluate(solidResult, brushFromShape(solid), ADDITION);
      solidResult.updateMatrixWorld(true);
    });

    let holeResult = brushFromShape(holes[0]);
    holes.slice(1).forEach((hole) => {
      holeResult = evaluator.evaluate(holeResult, brushFromShape(hole), ADDITION);
      holeResult.updateMatrixWorld(true);
    });

    const result = evaluator.evaluate(solidResult, holeResult, operation);
    result.updateMatrixWorld(true);
    if (positionsFromGeometryDrawRange(result.geometry).length < 9) {
      return { status: "empty" };
    }

    const sourceTriangleCount = solids.reduce((total, solid) => total + meshForShape(solid).faces.length, 0);
    const group = resultGeometryToMeshShape(selection, solids, result.geometry, idPrefix);
    return group && isUsableBooleanGroup(group, sourceTriangleCount, false)
      ? { status: "success", group: asIntersectionGroup(group) }
      : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  }
}

async function buildIntersectionShapeFromSelection(groupable: WorkplaneShape[]): Promise<IntersectionBuildResult> {
  const booleanSelection = expandGroupsForBoolean(groupable);
  const solids = booleanSelection.filter((shape) => !shape.hole && !shape.locked);
  const holes = booleanSelection.filter((shape) => shape.hole && !shape.locked);
  if (solids.length === 0 || holes.length === 0) {
    return {
      group: null,
      empty: false,
      failureNotice: "Selecciona al menos un sólido y un agujero para la Intersección",
    };
  }

  if (!hasSolidHoleOverlap(solids, holes)) {
    return { group: null, empty: true, failureNotice: "" };
  }

  const manifoldAttempt = await manifoldIntersectionMeshShape(booleanSelection);
  if (manifoldAttempt.status === "success") {
    return { group: manifoldAttempt.group, empty: false, failureNotice: "" };
  }
  if (manifoldAttempt.status === "empty") {
    return { group: null, empty: true, failureNotice: "" };
  }

  const exactAttempt = bvhIntersectionMeshShape(booleanSelection, INTERSECTION, "grouped-intersection");
  if (exactAttempt.status === "success") {
    return { group: exactAttempt.group, empty: false, failureNotice: "" };
  }
  const hasImportedMesh = booleanSelection.some((shape) => Boolean(shape.importedMesh));
  if (exactAttempt.status === "empty" && !hasImportedMesh) {
    return { group: null, empty: true, failureNotice: "" };
  }

  const hollowAttempt = bvhIntersectionMeshShape(booleanSelection, HOLLOW_INTERSECTION, "grouped-hollow-intersection");
  if (hollowAttempt.status === "success") {
    return { group: hollowAttempt.group, empty: false, failureNotice: "" };
  }
  if (hollowAttempt.status === "empty" || exactAttempt.status === "empty") {
    return { group: null, empty: true, failureNotice: "" };
  }

  return {
    group: null,
    empty: false,
    failureNotice: "No se pudo calcular esta Intersección correctamente",
  };
}

function cutterInteriorTriangleCount(mesh: MeshData, cutters: WorkplaneShape[]) {
  return mesh.faces.reduce((total, [ai, bi, ci]) => {
    const centroid = triangleCentroid([mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]);
    return total + (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter)) ? 1 : 0);
  }, 0);
}

function geometryInteriorTriangleCount(geometry: THREE.BufferGeometry, cutters: WorkplaneShape[], strictInterior = false) {
  const positions = positionsFromGeometryDrawRange(geometry);
  let count = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const centroid: Vec3 = [
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    ];
    if (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter, strictInterior))) {
      count += 1;
    }
  }
  return count;
}

function clearsImportedCutVolume(geometry: THREE.BufferGeometry, sourceInteriorTriangles: number, cutters: WorkplaneShape[]) {
  if (sourceInteriorTriangles <= 0 || cutters.length === 0) {
    return true;
  }

  const remainingInteriorTriangles = geometryInteriorTriangleCount(geometry, cutters, true);
  return remainingInteriorTriangles <= Math.max(4, Math.floor(sourceInteriorTriangles * 0.05));
}

function importedBooleanMeshShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0 || !selection.some((shape) => Boolean(shape.importedMesh))) {
    return null;
  }

  const mergedSolidMesh = mergedSolidMeshData(solids);
  const sourceTriangleCount = mergedSolidMesh.faces.length;
  const cutterTriangleCount = holes.reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceTriangleCount + cutterTriangleCount > IMPORTED_EXACT_BOOLEAN_TRIANGLE_LIMIT) {
    return null;
  }

  const cutterShapes = holes.map(paddedCutterShape);
  const hasImportedHole = holes.some(shapeIsImportedHole);
  const hasStraightImportedHole = holes.some((hole) => shapeIsImportedHole(hole) && !hasNonZeroRotation(hole));
  const sourceInteriorTriangles = cutterInteriorTriangleCount(mergedSolidMesh, cutterShapes);
  const sourceTouchedTriangles = cutterTouchedTriangleCount(mergedSolidMesh, cutterShapes);
  const sourceCutTriangles = Math.max(sourceInteriorTriangles, sourceTouchedTriangles);
  const baseAttempts: Array<{ operation: CSGOperation; idPrefix: string; rescueCoplanar?: boolean }> = [
    // Imported STLs are often not watertight. Hollow subtraction still lets the hole bite into triangle meshes.
    { operation: HOLLOW_SUBTRACTION, idPrefix: "grouped-import-hollow-cut" },
    { operation: SUBTRACTION, idPrefix: "grouped-import-cut" },
  ];
  const attempts = hasStraightImportedHole
    ? [
        ...baseAttempts,
        { operation: HOLLOW_SUBTRACTION, idPrefix: "grouped-import-rescue-hollow-cut", rescueCoplanar: true },
        { operation: SUBTRACTION, idPrefix: "grouped-import-rescue-cut", rescueCoplanar: true },
      ]
    : baseAttempts;

  for (const attempt of attempts) {
    try {
      const evaluator = new Evaluator();
      evaluator.useGroups = false;
      evaluator.attributes = ["position", "normal"];
      (evaluator as Evaluator & { useCDTClipping: boolean }).useCDTClipping = true;
      let result = new Brush(geometryFromMeshData(mergedSolidMesh));
      result.updateMatrixWorld(true);

      const operationHoles = attempt.rescueCoplanar ? holes.map(coplanarRescueCutterShape) : holes;
      operationHoles.forEach((hole) => {
        result = evaluator.evaluate(result, brushFromShape(hole, true), attempt.operation);
        result.updateMatrixWorld(true);
      });

      const group = resultGeometryToMeshShape(selection, solids, result.geometry, attempt.idPrefix);
      const resultPositions = positionsFromGeometryDrawRange(result.geometry);
      const resultChanged = geometryDiffersFromMeshData(result.geometry, mergedSolidMesh);
      const hasOpenCutBoundary = hasImportedHole && introducesOpenCutBoundary(resultPositions, mergedSolidMesh, operationHoles.map(paddedCutterShape));
      if (
        isUsableBooleanGroup(group, sourceTriangleCount) &&
        (sourceCutTriangles > 0 ? resultChanged : !looksLikeUnchangedBooleanResult(group, sourceTriangleCount, true)) &&
        !hasOpenCutBoundary &&
        clearsImportedCutVolume(result.geometry, sourceCutTriangles, operationHoles)
      ) {
        return group;
      }
    } catch {
      // Try the next boolean operation before giving up.
    }
  }

  return null;
}

function boxedBooleanMeshShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && shape.kind === "box" && !shape.locked);
  const holes = selection.filter((shape) => shape.hole && shape.kind === "box");
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  const cutters = holes.map((hole) => shapeAabb(paddedCutterShape(hole)));
  const cuboids = solids.flatMap((solid) => cutters.reduce<Cuboid[]>((parts, cutter) => parts.flatMap((part) => subtractCuboid(part, cutter)), [shapeAabb(solid)]));
  if (cuboids.length === 0) {
    return null;
  }

  const groupBounds = boundsForCuboids(cuboids);
  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const width = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const minY = groupBounds.minY;
  const height = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const depth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const mesh = cuboidsToMesh("Group", cuboids, centerX, centerZ, minY);
  const positions = mesh.faces.flatMap(([ai, bi, ci]) => [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]).flat();
  const firstSolid = solids[0];

  return {
    id: createLocalId("grouped-boolean"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: selection.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function aabbBooleanMeshShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  const solidBounds = solids.map(meshAabb);
  const cutterBounds = holes.map((hole) => meshAabb(paddedCutterShape(hole)));
  const cuboids = solidBounds.flatMap((solid) => cutterBounds.reduce<Cuboid[]>((parts, cutter) => parts.flatMap((part) => subtractCuboid(part, cutter)), [solid]));
  if (cuboids.length === 0) {
    return null;
  }

  const groupBounds = boundsForCuboids(cuboids);
  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const width = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const minY = groupBounds.minY;
  const height = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const depth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const mesh = cuboidsToMesh("Group", cuboids, centerX, centerZ, minY);
  const positions = mesh.faces.flatMap(([ai, bi, ci]) => [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]).flat();
  const firstSolid = solids[0];

  return {
    id: createLocalId("grouped-boolean"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: selection.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function hollowClipMeshShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection
    .filter((shape) => shape.hole)
    .map(paddedCutterShape)
    .map((shape) => ({ shape, bounds: meshAabb(shape) }));
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  const sourceBounds = boundsForCuboids(solids.map(meshAabb));
  const canPlaneClip = holes.every((hole) => isAxisAlignedBoxCutter(hole.shape));
  const positions: number[] = [];
  let removedTriangles = 0;

  if (canPlaneClip) {
    sourceMesh.faces.forEach(([ai, bi, ci]) => {
      let fragments: Vec3[][] = [[sourceMesh.vertices[ai], sourceMesh.vertices[bi], sourceMesh.vertices[ci]]];
      holes.forEach((hole) => {
        const nextFragments: Vec3[][] = [];
        fragments.forEach((fragment) => {
          if (!cuboidsTouch(polygonAabb(fragment), hole.bounds)) {
            nextFragments.push(fragment);
            return;
          }

          const clipped = subtractCuboidFromPolygon(fragment, hole.bounds);
          if (
            clipped.length !== 1 ||
            clipped[0].length !== fragment.length ||
            clipped[0].some((point, index) => point.some((value, axis) => Math.abs(value - fragment[index][axis]) > 0.0001))
          ) {
            removedTriangles += 1;
          }
          clipped.forEach((piece) => nextFragments.push(piece));
        });
        fragments = nextFragments;
      });

      fragments.forEach((fragment) => triangulatePolygonToPositions(fragment, positions));
    });

    holes.forEach((hole) => addBoxHoleInteriorFaces(positions, hole.bounds, sourceMesh, sourceBounds));
  } else {
    sourceMesh.faces.forEach(([ai, bi, ci]) => {
      const triangle = [sourceMesh.vertices[ai], sourceMesh.vertices[bi], sourceMesh.vertices[ci]];

      if (holes.some((hole) => triangleTouchesHoleShape(triangle, hole.shape, hole.bounds))) {
        removedTriangles += 1;
        return;
      }

      triangle.forEach(([x, y, z]) => {
        positions.push(x, y, z);
      });
    });
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  if (removedTriangles === 0 || positions.length < 9 || ![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const normalizedPositions: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    normalizedPositions.push(positions[i] - centerX, positions[i + 1] - minY, positions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];
  return {
    id: createLocalId("grouped-import-clip"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions: normalizedPositions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(normalizedPositions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: selection.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function cutFullyConsumesSolids(selection: WorkplaneShape[]) {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole).map(paddedCutterShape);
  if (solids.length === 0 || holes.length === 0) {
    return false;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  if (sourceMesh.faces.length === 0 || !hasSolidHoleOverlap(solids, holes)) {
    return false;
  }

  return sourceMesh.faces.every(([ai, bi, ci]) => {
    const triangle = [sourceMesh.vertices[ai], sourceMesh.vertices[bi], sourceMesh.vertices[ci]];
    const centroid: Vec3 = [
      (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3,
      (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3,
      (triangle[0][2] + triangle[1][2] + triangle[2][2]) / 3,
    ];
    return holes.some((hole) => pointInsideHoleShape(centroid, hole));
  });
}

function mergedMeshShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  // Keep imported STL/SVG groups as a baked mesh. The viewport child-group path rescales children to a wrapper box.
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  groupable.map(meshForShape).forEach((mesh) => {
    appendMeshData(vertices, faces, mesh);
  });

  if (vertices.length < 3 || faces.length < 1) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];

  faces.forEach(([ai, bi, ci]) => {
    [vertices[ai], vertices[bi], vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - minY, z - centerZ);
    });
  });

  const firstSolid = groupable.find((shape) => !shape.hole) ?? groupable[0];
  const holeOnly = groupable.every((shape) => shape.hole);

  return {
    id: createLocalId("grouped-mesh"),
    name: "Group",
    kind: "mesh",
    color: holeOnly ? "#b8c2cc" : firstSolid.color,
    hole: holeOnly,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: faces.length,
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: groupable.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function groupedShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  const groupBounds = boundsForShapes(groupable);
  const minX = groupBounds.minX;
  const maxX = groupBounds.maxX;
  const minY = groupBounds.minY;
  const maxY = groupBounds.maxY;
  const minZ = groupBounds.minZ;
  const maxZ = groupBounds.maxZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxX - minX));
  const depth = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ));
  const height = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxY - minY));
  const firstSolid = groupable.find((shape) => !shape.hole) ?? groupable[0];
  const holeOnly = groupable.every((shape) => shape.hole);

  return {
    id: createLocalId("group"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    hole: holeOnly,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: groupable.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function localGroupBounds(children: WorkplaneShape[]): Cuboid {
  return boundsForShapes(children);
}

function quaternionForShape(shape: WorkplaneShape) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

function rotationFromQuaternion(quaternion: THREE.Quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    rotationX: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.x)),
    rotation: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.y)),
    rotationZ: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.z)),
  };
}

function cleanShapePatch(patch: ShapeUpdatePatch): Partial<WorkplaneShape> {
  const { bakeTransform: _bakeTransform, ...rest } = patch;
  const next = { ...rest };
  if (typeof next.rotation === "number") {
    next.rotation = cleanRotationDegrees(next.rotation, 1);
  }
  if (typeof next.rotationX === "number") {
    next.rotationX = cleanRotationDegrees(next.rotationX, 1);
  }
  if (typeof next.rotationZ === "number") {
    next.rotationZ = cleanRotationDegrees(next.rotationZ, 1);
  }
  return next;
}

function restoreGroupedChildren(group: WorkplaneShape): WorkplaneShape[] {
  const children = group.groupedShapes ?? [];
  if (children.length === 0) {
    return [];
  }

  const bounds = localGroupBounds(children);
  const baseWidth = group.groupedBaseWidth ?? Math.max(0.001, bounds.maxX - bounds.minX);
  const baseHeight = group.groupedBaseHeight ?? Math.max(0.001, bounds.maxY - bounds.minY);
  const baseDepth = group.groupedBaseDepth ?? Math.max(0.001, bounds.maxZ - bounds.minZ);
  const sx = shapeWidth(group) / Math.max(0.001, baseWidth);
  const sy = group.height / Math.max(0.001, baseHeight);
  const sz = shapeDepth(group) / Math.max(0.001, baseDepth);
  const groupQuaternion = quaternionForShape(group);
  const groupReflection = new THREE.Matrix4().makeScale(mirrorSign(group.mirrorX), mirrorSign(group.mirrorY), mirrorSign(group.mirrorZ));
  const groupCenter = new THREE.Vector3(group.x, (group.elevation ?? 0) + group.height / 2, group.z);

  return children.map((child) => {
    const width = shapeWidth(child) * sx;
    const depth = shapeDepth(child) * sz;
    const height = child.height * sy;
    const localCenter = new THREE.Vector3(
      child.x * sx * mirrorSign(group.mirrorX),
      (((child.elevation ?? 0) + child.height / 2) * sy - group.height / 2) * mirrorSign(group.mirrorY),
      child.z * sz * mirrorSign(group.mirrorZ),
    ).applyQuaternion(groupQuaternion);
    const worldCenter = groupCenter.clone().add(localCenter);
    const childRotationMatrix = new THREE.Matrix4()
      .makeRotationFromQuaternion(groupQuaternion)
      .multiply(groupReflection)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(child)))
      .multiply(groupReflection);
    const childRotation = rotationFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(childRotationMatrix));
    const restored: WorkplaneShape = {
      ...child,
      id: createLocalId(`${child.id}-ungroup`),
      x: worldCenter.x,
      z: worldCenter.z,
      elevation: worldCenter.y - height / 2,
      width,
      depth,
      height,
      size: (width + depth) / 2,
      rotation: childRotation.rotation,
      rotationX: childRotation.rotationX,
      rotationZ: childRotation.rotationZ,
      mirrorX: Boolean(child.mirrorX) !== Boolean(group.mirrorX) || undefined,
      mirrorY: Boolean(child.mirrorY) !== Boolean(group.mirrorY) || undefined,
      mirrorZ: Boolean(child.mirrorZ) !== Boolean(group.mirrorZ) || undefined,
      hidden: group.hidden ? true : child.hidden,
    };
    return canonicalizeShape(group.hole ? withHoleMode(restored, true) : restored);
  });
}

function expandGroupsForBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => {
    if (shape.importedMesh) {
      return [shape];
    }
    return shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
  });
}

function expandGroupsForBoxBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => (shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape]));
}

function canUseBoxBoolean(selection: WorkplaneShape[]) {
  return selection.every(isAxisAlignedBoxCutter);
}

function hasNonZeroRotation(shape: WorkplaneShape) {
  const rotation = Math.abs(normalizeDegrees(shape.rotation));
  const rotationX = Math.abs(normalizeDegrees(shape.rotationX ?? 0));
  const rotationZ = Math.abs(normalizeDegrees(shape.rotationZ ?? 0));
  return [rotation, rotationX, rotationZ].some((value) => value > 0.001 && Math.abs(value - 360) > 0.001);
}

async function buildGroupedShapeFromSelection(groupable: WorkplaneShape[]): Promise<GroupBuildResult> {
  const booleanSelection = expandGroupsForBoolean(groupable);
  const hasSolid = booleanSelection.some((shape) => !shape.hole);
  const hasHole = booleanSelection.some((shape) => shape.hole);
  const hasImportedMesh = booleanSelection.some((shape) => Boolean(shape.importedMesh));
  const boxBooleanSelection = hasSolid && hasHole ? expandGroupsForBoxBoolean(groupable) : [];
  const cleanBoxGroup = canUseBoxBoolean(boxBooleanSelection) ? boxedBooleanMeshShape(boxBooleanSelection) : null;
  const manifoldCutGroup = hasSolid && hasHole ? await manifoldBooleanMeshShape(booleanSelection, { requireImported: false }) : null;
  const manifoldImportedMerge = hasImportedMesh && hasSolid && !hasHole ? await manifoldUnionMeshShape(booleanSelection) : null;
  const exactImportedGroup = hasImportedMesh && hasSolid && hasHole ? manifoldCutGroup ?? importedBooleanMeshShape(booleanSelection) : null;
  const bakedImportedMerge = hasImportedMesh && !(hasSolid && hasHole) ? manifoldImportedMerge ?? mergedMeshShape(booleanSelection) : null;
  const group = hasSolid && hasHole
    ? cleanBoxGroup ??
      exactImportedGroup ??
      (hasImportedMesh
        ? null
        : manifoldCutGroup ?? booleanMeshShape(booleanSelection))
    : hasImportedMesh
      ? bakedImportedMerge ?? groupedShape(groupable)
      : groupedShape(groupable);
  const consumed = !group && hasSolid && hasHole && cutFullyConsumesSolids(booleanSelection);
  return {
    group,
    booleanSelection,
    hasSolid,
    hasHole,
    hasImportedMesh,
    consumed,
    failureNotice: hasImportedMesh && hasSolid && hasHole ? "No se pudo cortar esta malla importada correctamente" : hasSolid && hasHole ? "No se pudo cortar esta selección" : "No se pudo agrupar esta selección",
  };
}

function debugShapeSummary(shape: WorkplaneShape): Record<string, unknown> {
  return {
    id: shape.id,
    name: shape.name,
    kind: shape.kind,
    hole: Boolean(shape.hole),
    x: Number(shape.x.toFixed(3)),
    z: Number(shape.z.toFixed(3)),
    elevation: Number((shape.elevation ?? 0).toFixed(3)),
    width: Number(shapeWidth(shape).toFixed(3)),
    depth: Number(shapeDepth(shape).toFixed(3)),
    height: Number(shape.height.toFixed(3)),
    rotation: Number(shape.rotation.toFixed(3)),
    rotationX: Number((shape.rotationX ?? 0).toFixed(3)),
    rotationZ: Number((shape.rotationZ ?? 0).toFixed(3)),
    mirrorX: Boolean(shape.mirrorX),
    mirrorY: Boolean(shape.mirrorY),
    mirrorZ: Boolean(shape.mirrorZ),
    importedTriangles: shape.importedMesh?.triangleCount ?? 0,
    imagePlate: shape.imagePlate ? `${shape.imagePlate.pixelWidth}x${shape.imagePlate.pixelHeight}` : null,
    edgeTreatments: shape.edgeTreatments ?? [],
    cadDisplayEdgeCount: shape.cadDisplayEdges?.length ?? null,
    cadDisplayEdgesVersion: shape.cadDisplayEdgesVersion ?? null,
    edgeResizeMode: shape.edgeResizeMode ?? "scale",
    cadBrepLength: shape.cadBrep?.length ?? 0,
    cadPrimitiveKind: shape.cadPrimitiveFrame?.kind ?? null,
    groupedCount: shape.groupedShapes?.length ?? 0,
    children: shape.groupedShapes?.map(debugShapeSummary) ?? [],
  };
}

function compactShapeSummary(shape: WorkplaneShape, index: number) {
  const childSummary = shape.groupedShapes
    ?.map((child) => `${child.kind}${child.hole ? "H" : "S"}${child.importedMesh ? "I" : ""}`)
    .join("+");
  return [
    `${index}:${shape.kind}${shape.hole ? "H" : "S"}${shape.importedMesh ? "I" : ""}${shape.imagePlate ? "P" : ""}`,
    `g${shape.groupedShapes?.length ?? 0}`,
    `tri${shape.importedMesh?.triangleCount ?? 0}`,
    `edge${shape.edgeTreatments?.map((feature) => `${feature.kind}:${feature.amount}:${feature.edgeCount}:${feature.chamferAngle ?? ""}`).join("|") ?? ""}`,
    `viewEdges${shape.cadDisplayEdges?.length ?? "auto"}v${shape.cadDisplayEdgesVersion ?? 0}`,
    `edgeResize${shape.edgeResizeMode ?? "scale"}`,
    `brep${shape.cadBrep?.length ?? 0}`,
    `prim${shape.cadPrimitiveFrame ? `${shape.cadPrimitiveFrame.kind}:${shape.cadPrimitiveFrame.width}:${shape.cadPrimitiveFrame.depth}:${shape.cadPrimitiveFrame.height}` : ""}`,
    `p${Number(shape.x.toFixed(2))},${Number(shape.z.toFixed(2))},${Number((shape.elevation ?? 0).toFixed(2))}`,
    `d${Number(shapeWidth(shape).toFixed(2))}x${Number(shapeDepth(shape).toFixed(2))}x${Number(shape.height.toFixed(2))}`,
    `r${Number((shape.rotationX ?? 0).toFixed(1))},${Number(shape.rotation.toFixed(1))},${Number((shape.rotationZ ?? 0).toFixed(1))}`,
    `m${shape.mirrorX ? "x" : ""}${shape.mirrorY ? "y" : ""}${shape.mirrorZ ? "z" : ""}`,
    childSummary ? `c[${childSummary}]` : "c[]",
  ].join(",");
}

function mcpShapeSummary(shape: WorkplaneShape): SketchForgeMcpShapeSummary {
  return {
    id: shape.id,
    name: shape.name,
    kind: shape.kind,
    color: shape.color,
    hole: Boolean(shape.hole),
    locked: Boolean(shape.locked),
    hidden: Boolean(shape.hidden),
    position: {
      x: shape.x,
      z: shape.z,
      elevation: shape.elevation ?? 0,
    },
    dimensions: {
      width: shapeWidth(shape),
      depth: shapeDepth(shape),
      height: shape.height,
      size: shape.size,
    },
    rotation: {
      x: shape.rotationX ?? 0,
      y: shape.rotation,
      z: shape.rotationZ ?? 0,
    },
    mirror: {
      x: Boolean(shape.mirrorX),
      y: Boolean(shape.mirrorY),
      z: Boolean(shape.mirrorZ),
    },
    edgeTreatments: shape.edgeTreatments ?? [],
    groupedCount: shape.groupedShapes?.length ?? 0,
    importedTriangles: shape.importedMesh?.triangleCount ?? 0,
    cadDisplayEdgeCount: shape.cadDisplayEdges?.length ?? null,
    sketchPointCount: shape.sketchProfile?.points.length ?? 0,
    sketchSegmentCount: shape.sketchProfile?.segments.length ?? 0,
    children: shape.groupedShapes?.map(mcpShapeSummary),
  };
}

function defaultMcpSketchProfile(width: number, depth: number): SketchProfile {
  const halfWidth = Math.max(0.01, width) / 2;
  const halfDepth = Math.max(0.01, depth) / 2;
  const pointIds = ["mcp-sketch-a", "mcp-sketch-b", "mcp-sketch-c", "mcp-sketch-d"].map((prefix) => createLocalId(prefix));
  return {
    points: [
      { id: pointIds[0], x: -halfWidth, z: -halfDepth, mode: "corner" },
      { id: pointIds[1], x: halfWidth, z: -halfDepth, mode: "corner" },
      { id: pointIds[2], x: halfWidth, z: halfDepth, mode: "corner" },
      { id: pointIds[3], x: -halfWidth, z: halfDepth, mode: "corner" },
    ],
    segments: [
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[0], endId: pointIds[1], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[1], endId: pointIds[2], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[2], endId: pointIds[3], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[3], endId: pointIds[0], kind: "line" },
    ],
    images: [],
  };
}

function mcpNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mcpString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function mcpStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function mcpNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry)) : [];
}

function mcpFiniteNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry)) : [];
}

function readMcpEditorIdentity() {
  const storageKey = "sketchforge.mcp.editorIdentity";
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null") as { editorId?: unknown; editorNumber?: unknown } | null;
    if (typeof existing?.editorId === "string" && typeof existing.editorNumber === "number") {
      return { editorId: existing.editorId, editorNumber: existing.editorNumber };
    }
  } catch {
    // Session identity is best-effort; fall through and create a new one.
  }

  const randomValues = new Uint32Array(1);
  window.crypto?.getRandomValues?.(randomValues);
  const editorNumber = 10000 + ((randomValues[0] || Math.floor(Math.random() * 90000)) % 90000);
  const editorId = window.crypto?.randomUUID?.() ?? `sketchforge-editor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const identity = { editorId, editorNumber };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(identity));
  } catch {
    // Private browsing can block sessionStorage; the in-memory identity is enough for this tab.
  }
  return identity;
}

export function SketchForgeEditor({
  initialAssets = [],
  initialShapes = [],
  initialHistory,
  initialHistoryIndex,
  initialSnap,
  initialWorkspace,
  initialPlacementElevation = 0,
  initialCap,
  onHome,
  onOpenSkfProjectFile,
  onSaveSharedProject,
  onProjectShapesChange,
  onProjectSnapshot,
  onProjectWorkspaceChange,
  projectId,
  projectName = "Diseño de SketchForge",
  projectCreatedAt = Date.now(),
  projectModifiedAt = Date.now(),
  projectRevision = 0,
  sharedProjectsEnabled = false,
  themePreference = "system",
  resolvedTheme = "light",
  onThemePreferenceChange,
}: {
  initialAssets?: ProjectAsset[];
  initialShapes?: WorkplaneShape[];
  initialHistory?: EditorHistoryEntry[];
  initialHistoryIndex?: number;
  initialSnap?: GridSize;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  initialPlacementElevation?: number;
  initialCap?: CapDocument | null;
  onHome?: () => void;
  onOpenSkfProjectFile?: (file: File) => Promise<{ ok: boolean; message: string } | void> | { ok: boolean; message: string } | void;
  onSaveSharedProject?: (request: { exportName: string; bytes: Uint8Array }) => Promise<string>;
  onProjectShapesChange?: (snapshot: {
    projectId: string;
    shapes: WorkplaneShape[];
    history: EditorHistoryEntry[];
    historyIndex: number;
    assets: ProjectAsset[];
    projectName: string;
    projectCreatedAt: number;
    workspace: WorkplaneWorkspaceSettings;
    snapGrid: GridSize;
    placementElevation: number;
    cap?: CapDocument | null;
  }) => void;
  onProjectSnapshot?: (snapshot: { image: string; projectId: string; shapes: number }) => void;
  onProjectWorkspaceChange?: (snapshot: { projectId: string; workspace: WorkplaneWorkspaceSettings; snap: GridSize; placementElevation?: number }) => void;
  projectId?: string | null;
  projectName?: string;
  projectCreatedAt?: number;
  projectModifiedAt?: number;
  projectRevision?: number;
  sharedProjectsEnabled?: boolean;
  themePreference?: AppThemePreference;
  resolvedTheme?: ResolvedAppTheme;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
} = {}) {
  const initialSceneRef = useRef<WorkplaneShape[] | null>(null);
  if (initialSceneRef.current === null) {
    initialSceneRef.current = initialShapes.map(canonicalizeShape);
  }
  const initialHistoryStateRef = useRef<EditorHistoryState | null>(null);
  if (initialHistoryStateRef.current === null) {
    initialHistoryStateRef.current = hydrateEditorHistoryState(
      initialSceneRef.current,
      initialHistory,
      initialHistoryIndex,
      normalizeWorkspaceSettings(initialWorkspace).historyLimit,
    );
  }
  const [shapes, setShapes] = useState<WorkplaneShape[]>(() => initialSceneRef.current as WorkplaneShape[]);
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>(() => dedupeProjectAssets(initialAssets));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [capDocument, setCapDocument] = useState<CapDocument | null>(() => initialCap ? normalizeCapDocument(initialCap) : emptyCapDocument());
  const [capSketchActive, setCapSketchActive] = useState(false);
  const [clipboard, setClipboard] = useState<WorkplaneShape[]>([]);
  const [geometryDrawTool, setGeometryDrawTool] = useState<Direct2DDrawTool | null>(null);
  const [geometryProfileSectionId, setGeometryProfileSectionId] = useState<string | null>(null);
  const [geometryPlaneMode, setGeometryPlaneMode] = useState<"auto" | "base" | "offset">("auto");
  const [geometryPlaneOffset, setGeometryPlaneOffset] = useState("20");
  const [systemClipboardSupported, setSystemClipboardSupported] = useState(false);
  const [history, setHistory] = useState<EditorHistoryEntry[]>(() => (initialHistoryStateRef.current as EditorHistoryState).entries);
  const [historyIndex, setHistoryIndex] = useState(() => (initialHistoryStateRef.current as EditorHistoryState).index);
  const [placementElevation, setPlacementElevation] = useState(() => Number.isFinite(initialPlacementElevation) ? initialPlacementElevation : 0);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkplaneWorkspaceSettings>(() => normalizeWorkspaceSettings(initialWorkspace));
  const [snapGrid, setSnapGrid] = useState<GridSize>(() => normalizeSnapGrid(initialSnap));
  const [workplaneMode, setWorkplaneMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Librería de formas del modo Diseño 3D: sidebar derecho plegable, expandido
  // por defecto. Solo se muestra en modo geometry.
  const [shapeLibraryOpen, setShapeLibraryOpen] = useState(true);
  const [topPanel, setTopPanel] = useState<TopPanel>(null);
  const [stepExporting, setStepExporting] = useState(false);
  const [skfExporting, setSkfExporting] = useState(false);
  const [alignMode, setAlignMode] = useState(false);
  const [alignAnchorId, setAlignAnchorId] = useState<string | null>(null);
  const [alignPreview, setAlignPreview] = useState<{ axis: AlignAxis; target: AlignTarget } | null>(null);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [mirrorPreviewAxis, setMirrorPreviewAxis] = useState<AlignAxis | null>(null);
  const [activeMode, setActiveMode] = useState("3D Design");
  const [notice, setNotice] = useState("Ready");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const sketchImageInputRef = useRef<HTMLInputElement | null>(null);
  const sketchVectorInputRef = useRef<HTMLInputElement | null>(null);
  const booleanAutomationRunRef = useRef<string | null>(null);
  const projectHydratingRef = useRef(false);
  const projectInteractionActiveRef = useRef(false);
  const pendingProjectShapesRef = useRef<WorkplaneShape[] | null>(null);
  const projectSyncTimerRef = useRef<number | null>(null);
  const lastProjectShapesSyncRef = useRef("");
  const lastProjectShapesEchoRef = useRef<string | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const projectSnapshotRunRef = useRef(0);
  const shapesRef = useRef(shapes);
  const projectAssetsRef = useRef(projectAssets);
  const selectedIdsRef = useRef(selectedIds);
  const workspaceSettingsRef = useRef(workspaceSettings);
  const snapGridRef = useRef(snapGrid);
  const placementElevationRef = useRef(placementElevation);
  const noticeRef = useRef(notice);
  const projectInfoRef = useRef({ projectId: projectId ?? null, projectName, projectCreatedAt });
  const historyIndexRef = useRef(historyIndex);
  const historyRef = useRef(history);
  const historyLimitRef = useRef(workspaceSettings.historyLimit);
  const capDocumentRef = useRef<CapDocument | null>(capDocument);
  const capSketchSectionIdRef = useRef<string | null>(null);
  const capSketchOperationRef = useRef<SketchOperation>("extrude");
  const interactionHistoryStartRef = useRef("");
  const interactionHistoryChangedRef = useRef(false);
  const interactionHistoryTimerRef = useRef<number | null>(null);
  const [projectInteractionActive, setProjectInteractionActive] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>("geometry");
  const [sketchActive, setSketchActive] = useState(false);
  const [sketchOperation, setSketchOperation] = useState<SketchOperation>("extrude");
  const [sketchRevolveSettings, setSketchRevolveSettings] = useState<SketchRevolveSettings>(() => ({ ...DEFAULT_SKETCH_REVOLVE_SETTINGS }));
  const [sketchRevolvePreview, setSketchRevolvePreview] = useState<SketchRevolveMesh | null>(null);
  const sketchRevolvePreviewRequestRef = useRef(0);
  const sketchRevolveUpdateRequestRef = useRef(new Map<string, number>());
  const sketchRevolveUpdateTimerRef = useRef(new Map<string, number>());
  const [sketchTool, setSketchTool] = useState<SketchTool>("line");
  const [sketchProfile, setSketchProfile] = useState<SketchProfile>(() => emptySketchProfile());
  const [sketchHistory, setSketchHistory] = useState<SketchProfile[]>([emptySketchProfile()]);
  const [sketchHistoryIndex, setSketchHistoryIndex] = useState(0);
  const sketchHistoryRef = useRef(sketchHistory);
  const sketchHistoryIndexRef = useRef(sketchHistoryIndex);
  const [sketchActivePointId, setSketchActivePointId] = useState<string | null>(null);
  const [sketchSelection, setSketchSelection] = useState<SketchSelection>(null);
  const [sketchMeasureStart, setSketchMeasureStart] = useState<SketchPoint | null>(null);
  const [sketchMeasurement, setSketchMeasurement] = useState<SketchMeasurement>(null);
  const [editingSketchShapeId, setEditingSketchShapeId] = useState<string | null>(null);
  const [edgeModifier, setEdgeModifier] = useState<EdgeModifierSession | null>(null);
  const edgeModifierRef = useRef<EdgeModifierSession | null>(null);
  const cadModifierWorkerRef = useRef<Worker | null>(null);
  const cadModifierPendingRef = useRef(new Map<number, {
    resolve: (message: CadModifierWorkerResponse) => void;
    reject: (error: Error) => void;
    timer: number;
  }>());
  const cadModifierRequestRef = useRef(0);
  const cadModifierPrepareRef = useRef(0);
  const cadModifierLatestPreviewRef = useRef(0);
  const cadModifierBaseShapeRef = useRef<WorkplaneShape | null>(null);
  const cadModifierBaseFingerprintRef = useRef("");
  const cadModifierSourcePartsRef = useRef<WorkplaneShape[]>([]);
  const cadModifierWatchdogRef = useRef<{ requestId: number; phase: CadModifierRequestPhase; timer: number } | null>(null);
  const [topologyMode, setTopologyMode] = useState<"shape" | "face" | "vertex" | "edge">("shape");
  const [topologyVertexPlacementActive, setTopologyVertexPlacementActive] = useState(false);
  const [shapeTopology, setShapeTopology] = useState<{
    shapeId: string;
    signature: string;
    mode: "occt" | "mesh";
    faces: CadTopologyFace[];
    vertices: CadTopologyVertex[];
    edges: CadTopologyEdge[];
  } | null>(null);
  const [topologySelection, setTopologySelection] = useState<CadTopologyPick[]>([]);
  const topologySelectionRef = useRef<CadTopologyPick[]>([]);
  const primaryTopologyPick = topologySelection.at(-1) ?? null;
  const [topologyAlignPreview, setTopologyAlignPreview] = useState<{ axis: AlignAxis; target: AlignTarget } | null>(null);
  const [topologyMirrorPreviewAxis, setTopologyMirrorPreviewAxis] = useState<AlignAxis | null>(null);
  const [pushPullDistance, setPushPullDistance] = useState("");
  const [topologyEditPreview, setTopologyEditPreview] = useState<{ positions: Float32Array; normals: Float32Array; indices: Uint32Array } | null>(null);
  const [topologyInspectorPreviewActive, setTopologyInspectorPreviewActive] = useState(false);
  const topologyEditSessionRef = useRef(0);
  const constructionVertexDragIdRef = useRef<string | null>(null);
  const topologyEditInFlightRef = useRef(false);
  const topologyEditPendingRef = useRef<{
    request: CadModifierWorkerPayload;
    transfer: Transferable[];
    commit: boolean;
    label: string;
    session: number;
    shape?: WorkplaneShape;
  } | null>(null);
  const cadModifierWorkerRestartRef = useRef<() => Worker | null>(() => null);
  const topologyNudgeRef = useRef<{
    kind: "vertex" | "edge" | "face";
    vertices: CadTopologyVertex[];
    edges: CadTopologyEdge[];
    faces: CadTopologyFace[];
    deltaX: number;
    deltaZ: number;
    timer: number;
  } | null>(null);
  // After a nudge commit the topology is re-collected and the hash-based ids
  // change, so the selection is re-resolved by matching each entity's new
  // position/center against its anchor once the fresh topology arrives.
  const topologyReselectRef = useRef<Array<{ kind: CadTopologyPickKind; anchor: { x: number; y: number; z: number } }> | null>(null);

  useEffect(() => {
    if (topologyMode !== "vertex") setTopologyVertexPlacementActive(false);
  }, [topologyMode]);
  // Tracks whether the current topology came from OCCT or the approximate mesh
  // fallback, so the "topología en modo malla" notice fires only on the
  // occt -> mesh transition (not on every re-collection in mesh mode).
  const shapeTopologyModeRef = useRef<"occt" | "mesh" | null>(null);
  const lastMcpErrorRef = useRef<string | null>(null);
  const executeMcpCommandRef = useRef<((command: SketchForgeMcpCommand) => Promise<unknown>) | null>(null);

  const clearCadModifierWatchdog = useCallback((requestId?: number) => {
    const active = cadModifierWatchdogRef.current;
    if (!active || (requestId !== undefined && active.requestId !== requestId)) return;
    window.clearTimeout(active.timer);
    cadModifierWatchdogRef.current = null;
  }, []);

  const armCadModifierWatchdog = useCallback((requestId: number, phase: CadModifierRequestPhase) => {
    clearCadModifierWatchdog();
    const timer = window.setTimeout(() => {
      const active = cadModifierWatchdogRef.current;
      if (!active || active.requestId !== requestId) return;
      cadModifierWatchdogRef.current = null;
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
      cadModifierWorkerRestartRef.current();
      const message = cadModifierTimeoutMessage(phase);
      setEdgeModifier((current) => current ? {
        ...current,
        busy: false,
        prepared: false,
        preview: null,
        error: message,
      } : current);
      setNotice(message);
    }, CAD_MODIFIER_REQUEST_TIMEOUT_MS);
    cadModifierWatchdogRef.current = { requestId, phase, timer };
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    let disposed = false;
    const rejectPendingRequests = (message: string) => {
      cadModifierPendingRef.current.forEach((pending) => {
        window.clearTimeout(pending.timer);
        pending.reject(new Error(message));
      });
      cadModifierPendingRef.current.clear();
    };
    const reportWorkerFailure = (worker: Worker | null) => {
      if (worker && cadModifierWorkerRef.current !== worker) return;
      clearCadModifierWatchdog();
      worker?.terminate();
      cadModifierWorkerRef.current = null;
      rejectPendingRequests("El worker de CAD no pudo iniciar");
      const requestId = cadModifierRequestRef.current + 1;
      cadModifierRequestRef.current = requestId;
      cadModifierPrepareRef.current = requestId;
      cadModifierLatestPreviewRef.current = requestId;
      if (cadModifierBaseShapeRef.current) {
        const message = cadModifierWorkerFailureMessage();
        setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, preview: null, error: message } : current);
        setNotice(message);
      }
    };
    const createWorker = () => {
      if (disposed) return null;
      cadModifierWorkerRef.current?.terminate();
      try {
        const worker = new Worker(new URL("../workers/cadModifier.worker.ts", import.meta.url), { type: "module" });
        cadModifierWorkerRef.current = worker;
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (event) => {
          event.preventDefault();
          reportWorkerFailure(worker);
        };
        worker.onmessageerror = () => reportWorkerFailure(worker);
        return worker;
      } catch {
        reportWorkerFailure(null);
        return null;
      }
    };
    function handleWorkerMessage(event: MessageEvent<CadModifierWorkerResponse>) {
      const message = event.data;
      clearCadModifierWatchdog(message.requestId);
      const pending = cadModifierPendingRef.current.get(message.requestId);
      if (pending) {
        window.clearTimeout(pending.timer);
        cadModifierPendingRef.current.delete(message.requestId);
        if (message.type === "error") {
          pending.reject(new Error(message.message));
        } else {
          pending.resolve(message);
        }
        return;
      }
      if (message.type === "ready") {
        if (message.requestId !== cadModifierPrepareRef.current) return;
        setEdgeModifier((current) => current ? {
          ...current,
          edges: message.edges,
          selectedEdgeIds: [],
          busy: false,
          prepared: true,
          preview: null,
          componentPreviews: [],
          error: message.selectableEdgeIds.length ? null : "No se encontraron bordes marcados en este umbral",
        } : current);
        if (message.selectableEdgeIds.length) setNotice("Selecciona los bordes resaltados y luego ajusta la vista previa");
        return;
      }
      if (message.type === "preview") {
        if (message.requestId !== cadModifierLatestPreviewRef.current) return;
        const base = cadModifierBaseShapeRef.current;
        const sourceParts = cadModifierSourcePartsRef.current.length ? cadModifierSourcePartsRef.current : (base ? [base] : []);
        const rawPreview = base ? shapeFromCadMesh(base, message.positions, message.normals, message.indices, message.brep) : null;
        const preview = rawPreview ? {
          ...rawPreview,
          cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, message.displayEdges),
          cadDisplayEdgesVersion: 2 as const,
        } : null;
        const componentPreviews = cadModifierComponentPreviews(sourceParts, message.components);
        setEdgeModifier((current) => current ? {
          ...current,
          preview,
          componentPreviews,
          busy: false,
          error: preview ? null : "El kernel de CAD devolvió un tratamiento de bordes vacío",
        } : current);
        if (preview) setNotice("Vista previa del tratamiento de bordes lista");
        return;
      }
      if (message.type === "error") {
        if (message.requestId < cadModifierLatestPreviewRef.current) return;
        if (message.resetSession) {
          const requestId = cadModifierRequestRef.current + 1;
          cadModifierRequestRef.current = requestId;
          cadModifierLatestPreviewRef.current = requestId;
          cadModifierPrepareRef.current = requestId;
          cadModifierBaseShapeRef.current = null;
          cadModifierBaseFingerprintRef.current = "";
          cadModifierSourcePartsRef.current = [];
          setEdgeModifier(null);
          setNotice(message.message);
          return;
        }
        setEdgeModifier((current) => current ? { ...current, busy: false, preview: null, error: message.message } : current);
        setNotice("El tratamiento de bordes necesita ajustes");
      }
    }
    cadModifierWorkerRestartRef.current = createWorker;
    createWorker();
    return () => {
      disposed = true;
      clearCadModifierWatchdog();
      cadModifierWorkerRestartRef.current = () => null;
      rejectPendingRequests("The CAD worker was closed");
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
    };
  }, [clearCadModifierWatchdog]);

  const invalidateCadModifierSession = useCallback(() => {
    const wasActive = cadModifierBaseShapeRef.current !== null;
    if (!wasActive) return false;
    const hadInFlightRequest = cadModifierWatchdogRef.current !== null;
    clearCadModifierWatchdog();
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    cadModifierLatestPreviewRef.current = requestId;
    cadModifierPrepareRef.current = requestId;
    if (hadInFlightRequest) {
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
      cadModifierWorkerRestartRef.current();
    } else {
      cadModifierWorkerRef.current?.postMessage({ type: "dispose", requestId } satisfies CadModifierWorkerRequest);
    }
    cadModifierBaseShapeRef.current = null;
    cadModifierBaseFingerprintRef.current = "";
    cadModifierSourcePartsRef.current = [];
    setEdgeModifier(null);
    return true;
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    const warmBooleanRuntime = () => {
      void getManifoldRuntime().catch(() => {
        // Allow a real grouping action to retry if an idle preload was interrupted.
        manifoldRuntimePromise = null;
      });
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmBooleanRuntime, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = globalThis.setTimeout(warmBooleanRuntime, 250);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const applyTitles = () => {
      document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (button.title) {
          return;
        }
        const label = button.getAttribute("aria-label") ?? button.textContent?.trim();
        if (label) {
          button.title = label.replace(/\s+/g, " ");
        }
      });
    };

    applyTitles();
    const observer = new MutationObserver(applyTitles);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSystemClipboardSupported(Boolean(navigator.clipboard));
    setClipboard(readSharedClipboard());
    const onStorage = (event: StorageEvent) => {
      if (event.key === SHARED_CLIPBOARD_STORAGE_KEY) {
        setClipboard(readSharedClipboard());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    projectAssetsRef.current = projectAssets;
  }, [projectAssets]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    const currentHistory = historyRef.current;
    const currentIndex = Math.min(historyIndexRef.current, Math.max(0, currentHistory.length - 1));
    const currentEntry = currentHistory[currentIndex];
    if (currentEntry && currentEntry.selectedIds.join("\0") !== selectedIds.join("\0")) {
      const updated = currentHistory.map((entry, index) => index === currentIndex ? { ...entry, selectedIds: [...selectedIds] } : entry);
      historyRef.current = updated;
      setHistory(updated);
    }
  }, [selectedIds]);

  useEffect(() => {
    workspaceSettingsRef.current = workspaceSettings;
  }, [workspaceSettings]);

  useEffect(() => {
    snapGridRef.current = snapGrid;
  }, [snapGrid]);

  useEffect(() => {
    placementElevationRef.current = placementElevation;
  }, [placementElevation]);

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  useEffect(() => {
    projectInfoRef.current = { projectId: projectId ?? null, projectName, projectCreatedAt };
  }, [projectCreatedAt, projectId, projectName]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    capDocumentRef.current = capDocument;
  }, [capDocument]);

  useEffect(() => {
    sketchHistoryRef.current = sketchHistory;
  }, [sketchHistory]);

  useEffect(() => {
    sketchHistoryIndexRef.current = sketchHistoryIndex;
  }, [sketchHistoryIndex]);

  useEffect(() => {
    edgeModifierRef.current = edgeModifier;
  }, [edgeModifier]);

  useEffect(() => {
    const requestId = sketchRevolvePreviewRequestRef.current + 1;
    sketchRevolvePreviewRequestRef.current = requestId;
    if (!sketchActive || sketchOperation !== "revolve" || sketchProfile.segments.length === 0) {
      setSketchRevolvePreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void getManifoldRuntime()
        .then((runtime) => buildSketchRevolveMesh(runtime, sketchProfile, sketchRevolveSettings))
        .then((mesh) => {
          if (sketchRevolvePreviewRequestRef.current === requestId) setSketchRevolvePreview(mesh);
        })
        .catch(() => {
          if (sketchRevolvePreviewRequestRef.current === requestId) setSketchRevolvePreview(null);
        });
    }, 90);
    return () => window.clearTimeout(timer);
  }, [sketchActive, sketchOperation, sketchProfile, sketchRevolveSettings]);

  useEffect(() => {
    const nextWorkspace = normalizeWorkspaceSettings(initialWorkspace);
    workspaceSettingsRef.current = nextWorkspace;
    setWorkspaceSettings((current) => (
      workplaneSettingsFingerprint(current, snapGridRef.current) === workplaneSettingsFingerprint(nextWorkspace, snapGridRef.current)
        ? current
        : nextWorkspace
    ));
  }, [initialWorkspace]);

  useEffect(() => {
    const nextSnap = normalizeSnapGrid(initialSnap);
    snapGridRef.current = nextSnap;
    setSnapGrid((current) => (current === nextSnap ? current : nextSnap));
  }, [initialSnap]);

  const selectedShapes = useMemo(() => shapes.filter((shape) => selectedIds.includes(shape.id)), [selectedIds, shapes]);
  const selectedShape = selectedShapes.at(-1) ?? null;
  const hasSelection = selectedShapes.length > 0;
  const selectedTopologyShape = topologyMode === "shape" || selectedShapes.length !== 1 ? null : selectedShapes[0];
  const activeCapSection = capDocument?.sections.find((section) => section.id === capDocument.activeSectionId) ?? null;
  const modifierAvailableEdgeIds = useMemo(
    () => edgeModifier ? edgeModifier.edges.filter((edge) => selectableCadModifierEdge(edge, edgeModifier.sharpAngle)).map((edge) => edge.id) : [],
    [edgeModifier?.edges, edgeModifier?.sharpAngle],
  );
  const edgeModifierMaxAmount = useMemo(() => {
    const source = cadModifierBaseShapeRef.current ?? selectedShape;
    if (!source) return 10;
    const smallestDimension = Math.min(shapeWidth(source), shapeDepth(source), source.height);
    return Math.max(MIN_EDGE_MODIFIER_AMOUNT, smallestDimension * 0.99);
  }, [edgeModifier, selectedShape]);
  const selectedEdgeFeatureCount = useMemo(() => selectedShape ? edgeTreatmentFeatureCount(selectedShape) : 0, [selectedShape]);
  const selectedReversibleEdgeFeatureCount = useMemo(() => selectedShape ? reversibleEdgeTreatmentCount(selectedShape) : 0, [selectedShape]);
  const selectedEdgeHistoryOptions = useMemo(() => selectedShape ? edgeTreatmentHistoryOptions(selectedShape) : [], [selectedShape]);
  const canSeparateSelectedParts = useMemo(
    () => selectedShapes.length === 1 && Boolean(selectedShape && separablePartCount(selectedShape) > 1),
    [selectedShape, selectedShapes.length],
  );
  const toggleModifierEdge = useCallback((id: number, singleEdge = false) => {
    setEdgeModifier((current) => {
      if (!current || current.busy) return current;
      const allowed = new Set(current.edges.filter((edge) => selectableCadModifierEdge(edge, current.sharpAngle)).map((edge) => edge.id));
      if (!allowed.has(id)) return current;
      const ids = current.tangentChain && !singleEdge ? tangentCadEdgeChain(current.edges, id, allowed) : [id];
      const next = new Set(current.selectedEdgeIds);
      const remove = ids.every((edgeId) => next.has(edgeId));
      ids.forEach((edgeId) => remove ? next.delete(edgeId) : next.add(edgeId));
      return { ...current, selectedEdgeIds: [...next], preview: null, busy: next.size > 0, error: next.size ? null : "Selecciona al menos un borde resaltado" };
    });
  }, []);
  const exportableShapeCount = useMemo(() => (hasSelection ? selectedShapes : shapes).filter((shape) => !shape.hole).length, [hasSelection, selectedShapes, shapes]);
  const exportScopeLabel = hasSelection ? "seleccionado" : "total";
  const effectiveAlignAnchorId = useMemo(
    () => effectiveAlignmentAnchorId(selectedShapes, alignAnchorId),
    [alignAnchorId, selectedShapes],
  );
  const alignHandleStatuses = useMemo(() => (alignMode ? alignmentStatuses(selectedShapes, effectiveAlignAnchorId) : []), [alignMode, effectiveAlignAnchorId, selectedShapes]);
  const topologyAlignActive = topologyMode !== "shape" && topologySelection.length > 0;
  const canTopologyAlign = topologyAlignActive && topologySelection.length >= 2;
  const hasTopologySelection = topologyAlignActive;
  // While a topology align/mirror overlay is active the bodies must NOT be
  // ghosted by the body alignment preview (the orange preview is the mesh).
  const viewportShapes = useMemo(
    () =>
      topologyAlignActive
        ? shapes
        : edgeModifier?.preview && cadModifierBaseShapeRef.current
          ? shapes.map((shape) => shape.id === cadModifierBaseShapeRef.current?.id ? edgeModifier.preview as WorkplaneShape : shape)
          : alignMode && alignPreview
            ? alignedShapesForSelection(shapes, selectedIds, selectedShapes, effectiveAlignAnchorId, alignPreview.axis, alignPreview.target).nextShapes
            : mirrorMode && mirrorPreviewAxis
              ? mirroredShapesForSelection(shapes, selectedIds, selectedShapes, mirrorPreviewAxis).nextShapes
              : shapes,
    [alignMode, alignPreview, edgeModifier?.preview, effectiveAlignAnchorId, mirrorMode, mirrorPreviewAxis, selectedIds, selectedShapes, shapes, topologyAlignActive],
  );
  const debugState = useMemo(
    () =>
      JSON.stringify({
        notice,
        selectedIds,
        shapeCount: shapes.length,
        shapes: shapes.map(debugShapeSummary),
      }),
    [notice, selectedIds, shapes],
  );
  const compactDebugState = useMemo(
    () => `notice=${notice};selected=${selectedIds.length};count=${shapes.length};${shapes.map(compactShapeSummary).join(";")}`,
    [notice, selectedIds, shapes],
  );

  useEffect(() => {
    if (!projectId || !onProjectSnapshot || typeof window === "undefined") {
      return;
    }
    if (projectInteractionActive) {
      return;
    }

    const runId = projectSnapshotRunRef.current + 1;
    projectSnapshotRunRef.current = runId;
    const capture = async () => {
      if (projectSnapshotRunRef.current !== runId) {
        return true;
      }
      const image = window.sketchforgeCaptureCanvasAsync
        ? await window.sketchforgeCaptureCanvasAsync()
        : window.sketchforgeCaptureCanvas?.() ?? "";
      if (projectSnapshotRunRef.current !== runId) {
        return true;
      }
      if (image && image.length > 100) {
        onProjectSnapshot({ image, projectId, shapes: shapes.length });
        return true;
      }
      return false;
    };

    let idleId: number | null = null;
    let retryTimer: number | null = null;
    const runCapture = () => {
      void capture().then((captured) => {
        if (!captured) {
          retryTimer = window.setTimeout(() => void capture(), 650);
        }
      });
    };
    const captureTimer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(runCapture, { timeout: 1200 });
      } else {
        runCapture();
      }
    }, 850);
    return () => {
      window.clearTimeout(captureTimer);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [onProjectSnapshot, projectId, projectInteractionActive, shapes]);

  useEffect(() => {
    if (selectedShapes.length < 2) {
      setAlignMode(false);
      setAlignAnchorId(null);
      setAlignPreview(null);
    }
    if (alignAnchorId && !selectedIds.includes(alignAnchorId)) {
      setAlignAnchorId(null);
      setAlignPreview(null);
    }
    if (selectedShapes.length === 0) {
      setMirrorMode(false);
      setMirrorPreviewAxis(null);
    }
  }, [alignAnchorId, selectedIds, selectedShapes.length]);

  const syncProjectShapes = useCallback(
    (nextShapes: WorkplaneShape[], force = false) => {
      if (!projectId || !onProjectShapesChange) {
        return;
      }
      if (projectInteractionActiveRef.current) {
        pendingProjectShapesRef.current = canonicalizeShapes(nextShapes);
        if (projectSyncTimerRef.current !== null) {
          window.clearTimeout(projectSyncTimerRef.current);
          projectSyncTimerRef.current = null;
        }
        return;
      }
      const canonicalNext = canonicalizeShapes(nextShapes);
      if (projectSyncTimerRef.current !== null) {
        window.clearTimeout(projectSyncTimerRef.current);
      }
      projectSyncTimerRef.current = window.setTimeout(() => {
        const serialized = projectShapesFingerprint(canonicalNext);
        if (!force && lastProjectShapesSyncRef.current === serialized) {
          projectSyncTimerRef.current = null;
          return;
        }
        lastProjectShapesSyncRef.current = serialized;
        lastProjectShapesEchoRef.current = serialized;
        // Avisar a la app anfitriona (STBlock) para que refresque su caché del .skf.
        window.parent?.postMessage({ type: "SKETCHFORGE_PROJECT_CHANGED" }, "*");
        onProjectShapesChange({
          projectId,
          shapes: canonicalNext,
          history: historyRef.current,
          historyIndex: historyIndexRef.current,
          assets: projectAssetsRef.current,
          projectName: projectInfoRef.current.projectName,
          projectCreatedAt: projectInfoRef.current.projectCreatedAt,
          workspace: workspaceSettingsRef.current,
          snapGrid: snapGridRef.current,
          placementElevation: placementElevationRef.current,
          ...(capDocumentRef.current !== undefined ? { cap: capDocumentRef.current ?? null } : {}),
        });
        projectSyncTimerRef.current = null;
      }, 180);
    },
    [onProjectShapesChange, projectId],
  );

  useEffect(() => {
    const limitChanged = historyLimitRef.current !== workspaceSettings.historyLimit;
    historyLimitRef.current = workspaceSettings.historyLimit;
    const bounded = boundedEditorHistoryState(
      historyRef.current,
      historyIndexRef.current,
      workspaceSettings.historyLimit,
    );
    if (bounded.entries !== historyRef.current || bounded.index !== historyIndexRef.current) {
      historyRef.current = bounded.entries;
      historyIndexRef.current = bounded.index;
      setHistory(bounded.entries);
      setHistoryIndex(bounded.index);
    }
    if (limitChanged) syncProjectShapes(shapesRef.current, true);
  }, [syncProjectShapes, workspaceSettings.historyLimit]);

  const appendHistoryEntry = useCallback((entry: EditorHistoryEntry) => {
    const result = appendEditorHistorySnapshot(
      historyRef.current,
      historyIndexRef.current,
      entry,
      workspaceSettingsRef.current.historyLimit,
    );
    if (result.entries !== historyRef.current) {
      historyRef.current = result.entries;
      setHistory(result.entries);
    }
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    return result.changed;
  }, []);

  const appendHistorySnapshot = useCallback(
    (nextShapes: WorkplaneShape[], nextSelection: string[], cap?: CapDocument | null) =>
      appendHistoryEntry(editorHistoryEntry(nextShapes, nextSelection, cap)),
    [appendHistoryEntry],
  );

  const finalizeInteractionHistory = useCallback(() => {
    const startFingerprint = interactionHistoryStartRef.current;
    const hadChanges = interactionHistoryChangedRef.current;
    interactionHistoryStartRef.current = "";
    interactionHistoryChangedRef.current = false;
    if (!hadChanges) {
      return;
    }

    const entry = editorHistoryEntry(shapesRef.current, selectedIdsRef.current, capDocumentRef.current);
    if (!startFingerprint || startFingerprint === entry.fingerprint) {
      return;
    }

    appendHistoryEntry(entry);
  }, [appendHistoryEntry]);

  useEffect(() => {
    if (projectInteractionActive || !pendingProjectShapesRef.current) {
      return;
    }
    pendingProjectShapesRef.current = null;
    const timer = window.setTimeout(() => syncProjectShapes(shapesRef.current), 180);
    return () => window.clearTimeout(timer);
  }, [projectInteractionActive, syncProjectShapes]);

  const updateProjectInteractionActive = useCallback(
    (active: boolean) => {
      if (active) {
        if (interactionHistoryTimerRef.current !== null) {
          window.clearTimeout(interactionHistoryTimerRef.current);
          interactionHistoryTimerRef.current = null;
          finalizeInteractionHistory();
        }
        if (!projectInteractionActiveRef.current) {
          interactionHistoryStartRef.current = projectShapesFingerprint(shapesRef.current);
          interactionHistoryChangedRef.current = false;
        }
        projectInteractionActiveRef.current = true;
        setProjectInteractionActive((current) => (current ? current : true));
        return;
      }

      projectInteractionActiveRef.current = false;
      setProjectInteractionActive((current) => (current ? false : current));
      if (interactionHistoryTimerRef.current !== null) {
        window.clearTimeout(interactionHistoryTimerRef.current);
      }
      interactionHistoryTimerRef.current = window.setTimeout(() => {
        interactionHistoryTimerRef.current = null;
        finalizeInteractionHistory();
      }, 0);
    },
    [finalizeInteractionHistory],
  );

  const updateProjectWorkspaceSettings = useCallback(
    (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => {
      const nextWorkspace = normalizeWorkspaceSettings(settings.workspace);
      workspaceSettingsRef.current = nextWorkspace;
      snapGridRef.current = settings.snap;
      setWorkspaceSettings((current) => (
        workplaneSettingsFingerprint(current, settings.snap) === workplaneSettingsFingerprint(nextWorkspace, settings.snap)
          ? current
          : nextWorkspace
      ));
      setSnapGrid(settings.snap);
      if (!projectId || !onProjectWorkspaceChange) {
        return;
      }
      onProjectWorkspaceChange({ projectId, workspace: nextWorkspace, snap: settings.snap, placementElevation });
    },
    [onProjectWorkspaceChange, placementElevation, projectId],
  );

  useEffect(() => {
    if (!projectId || !onProjectWorkspaceChange) return;
    onProjectWorkspaceChange({
      projectId,
      workspace: workspaceSettingsRef.current,
      snap: snapGrid,
      placementElevation,
    });
  }, [onProjectWorkspaceChange, placementElevation, projectId, snapGrid]);

  const commitShapes = useCallback(
    (next: WorkplaneShape[], nextSelection: string | string[] | null = selectedIds, message?: string) => {
      const canonicalNext = canonicalizeShapes(next);
      const requestedSelection = Array.isArray(nextSelection) ? nextSelection : nextSelection ? [nextSelection] : [];
      const validSelection = requestedSelection.filter((id, index) => requestedSelection.indexOf(id) === index && canonicalNext.some((shape) => shape.id === id));
      // Keep the CAP document consistent: drop resultShapeId references whose
      // piece no longer exists, without creating an extra history entry.
      const reconciledCap = reconcileCapDocument(capDocumentRef.current ?? emptyCapDocument(), canonicalNext);
      if (reconciledCap !== capDocumentRef.current) {
        capDocumentRef.current = reconciledCap;
        setCapDocument(reconciledCap);
      }
      shapesRef.current = canonicalNext;
      selectedIdsRef.current = validSelection;
      setShapes(canonicalNext);
      setSelectedIds(validSelection);
      const changed = appendHistorySnapshot(canonicalNext, validSelection, capDocumentRef.current);
      if (message) {
        setNotice(message);
      }
      if (changed) {
        syncProjectShapes(canonicalNext);
      }
    },
    [appendHistorySnapshot, selectedIds, syncProjectShapes],
  );

  const commitCap = useCallback(
    (next: CapDocument, message?: string) => {
      const canonical = normalizeCapDocument(next);
      capDocumentRef.current = canonical;
      setCapDocument(canonical);
      const changed = appendHistoryEntry(editorHistoryEntry(shapesRef.current, selectedIdsRef.current, canonical));
      if (message) {
        setNotice(message);
      }
      if (changed) {
        syncProjectShapes(shapesRef.current, true);
      }
    },
    [appendHistoryEntry, syncProjectShapes],
  );

  const removeEdgeTreatment = useCallback(async (optionId: string) => {
    if (!selectedShape) {
      setNotice("Selecciona una forma con un tratamiento de bordes primero");
      return;
    }
    if (selectedShape.locked) {
      setNotice("Desbloquea la forma antes de quitar un tratamiento de bordes");
      return;
    }
    const option = selectedEdgeHistoryOptions.find((candidate) => candidate.id === optionId);
    if (!option) {
      setNotice("Elige un tratamiento de bordes para quitar");
      return;
    }
    const sourceFingerprint = projectShapesFingerprint([selectedShape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const restored = await restoreEdgeTreatmentInShape(selectedShape, option.path, option.entryId);
    if (!restored) {
      setNotice(selectedEdgeFeatureCount > 0 ? "Este tratamiento de bordes no tiene historial de deshacer guardado" : "No hay tratamiento de bordes para quitar");
      return;
    }
    const currentTarget = shapesRef.current.find((shape) => shape.id === selectedShape.id);
    if (projectInfoRef.current.projectId !== sourceProjectId || !currentTarget || projectShapesFingerprint([currentTarget]) !== sourceFingerprint) {
      setNotice("El objeto cambió mientras se quitaba el tratamiento de bordes; inténtalo de nuevo");
      return;
    }
    invalidateCadModifierSession();
    commitShapes(
      shapesRef.current.map((shape) => shape.id === selectedShape.id ? restored.shape : shape),
      restored.shape.id,
      `Se quitó ${restored.label}`,
    );
    setNotice(`Se quitó ${restored.label}`);
  }, [commitShapes, invalidateCadModifierSession, selectedEdgeFeatureCount, selectedEdgeHistoryOptions, selectedShape]);

  const commitSketchProfile = useCallback(
    (next: SketchProfile, message?: string) => {
      const snapshot = cloneSketchProfile(next);
      const current = sketchHistoryRef.current;
      const currentIndex = Math.min(sketchHistoryIndexRef.current, Math.max(0, current.length - 1));
      const trimmed = current.slice(0, currentIndex + 1);
      const latest = trimmed.at(-1);
      setSketchProfile(snapshot);
      if (latest && JSON.stringify(latest) === JSON.stringify(snapshot)) {
        return;
      }
      const nextHistory = [...trimmed, cloneSketchProfile(snapshot)].slice(-MAX_SKETCH_HISTORY_ENTRIES);
      sketchHistoryRef.current = nextHistory;
      sketchHistoryIndexRef.current = nextHistory.length - 1;
      setSketchHistory(nextHistory);
      setSketchHistoryIndex(sketchHistoryIndexRef.current);
      if (message) setNotice(message);
    },
    [],
  );

  const beginSketch = useCallback((operation: SketchOperation, profile?: SketchProfile, editingId: string | null = null, revolveSettings?: Partial<SketchRevolveSettings>) => {
    const initial = cloneSketchProfile(profile ?? emptySketchProfile());
    setToolbarMode("sketch");
    setSketchActive(true);
    setSketchOperation(operation);
    setSketchRevolveSettings(normalizeSketchRevolveSettings(revolveSettings));
    setSketchRevolvePreview(null);
    setSketchTool(profile?.segments.length ? "select" : "line");
    setSketchProfile(initial);
    const initialHistory = [cloneSketchProfile(initial)];
    sketchHistoryRef.current = initialHistory;
    sketchHistoryIndexRef.current = 0;
    setSketchHistory(initialHistory);
    setSketchHistoryIndex(0);
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(editingId);
    setNotice(editingId ? `Editando el perfil de boceto de ${operation === "revolve" ? "revolución" : "extrusión"}` : operation === "revolve" ? "Boceto de revolución iniciado: dibuja al lado izquierdo del eje" : "Boceto iniciado: coloca el primer punto");
  }, []);

  const beginSketchEdit = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShape?.sketchProfile) {
      setNotice("Selecciona una forma creada a partir de un boceto para editarla");
      return;
    }
    const operation = selectedShape.sketchOperation ?? (selectedShape.sketchRevolve ? "revolve" : "extrude");
    beginSketch(operation, selectedShape.sketchProfile, selectedShape.id, selectedShape.sketchRevolve);
  }, [beginSketch, selectedShape, selectedShapes.length]);

  const cancelSketch = useCallback(() => {
    setSketchActive(false);
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(null);
    setSketchRevolvePreview(null);
    setNotice("Boceto cancelado");
  }, []);

  const sketchUndo = useCallback(() => {
    const currentHistory = sketchHistoryRef.current;
    const currentIndex = sketchHistoryIndexRef.current;
    if (currentIndex <= 0) {
      setNotice("No hay nada que deshacer en este boceto");
      return;
    }
    const nextIndex = currentIndex - 1;
    sketchHistoryIndexRef.current = nextIndex;
    setSketchHistoryIndex(nextIndex);
    setSketchProfile(cloneSketchProfile(currentHistory[nextIndex] ?? emptySketchProfile()));
    setSketchActivePointId(null);
    setSketchSelection(null);
    setNotice("Deshacer boceto");
  }, []);

  const sketchRedo = useCallback(() => {
    const currentHistory = sketchHistoryRef.current;
    const currentIndex = sketchHistoryIndexRef.current;
    if (currentIndex >= currentHistory.length - 1) {
      setNotice("No hay nada que rehacer en este boceto");
      return;
    }
    const nextIndex = currentIndex + 1;
    sketchHistoryIndexRef.current = nextIndex;
    setSketchHistoryIndex(nextIndex);
    setSketchProfile(cloneSketchProfile(currentHistory[nextIndex] ?? emptySketchProfile()));
    setSketchActivePointId(null);
    setSketchSelection(null);
    setNotice("Rehacer boceto");
  }, []);

  const setActiveSketchTool = useCallback((tool: SketchTool) => {
    setSketchTool(tool);
    setSketchActivePointId(null);
    setSketchSelection(null);
    if (tool !== "measure") setSketchMeasureStart(null);
    const messages: Record<SketchTool, string> = {
      line: "Línea: haz clic en los puntos para dibujar segmentos rectos",
      construction: "Construcción: haz clic para dibujar geometría guía que no forma parte del perfil",
      bezier: "Bézier: haz clic y arrastra los puntos para tirar de los controles de la curva",
      smooth: "Curva suave: haz clic en los puntos para construir un trayecto fluido",
      select: "Seleccionar: edita la geometría del boceto o coloca y escala imágenes de referencia",
      refine: "Refinar: haz clic en un segmento para agregar un punto, o en un punto para eliminarlo",
      erase: "Borrar: haz clic en un punto o segmento para eliminarlo",
      measure: "Medir: elige dos puntos",
      circle: "Círculo: haz clic y arrastra desde el centro para trazar un círculo paramétrico",
      semicircle: "Semicírculo: haz clic y arrastra para trazar un semicírculo cerrado",
      arc: "Arco: haz clic y arrastra para trazar un arco de 90°",
      rectangle: "Rectángulo: haz clic y arrastra para trazar un rectángulo centrado",
      ellipse: "Elipse: arrastra desde el centro para definir sus dos radios",
      polygon: "Polígono: arrastra desde el centro; ajusta lados y rotación en Propiedades",
      slot: "Ranura: arrastra para definir longitud y orientación; ajusta el ancho en Propiedades",
    };
    setNotice(messages[tool]);
  }, []);

  const measureSketchPoint = useCallback(
    (point: SketchPoint) => {
      if (!sketchMeasureStart) {
        setSketchMeasureStart({ ...point });
        setSketchMeasurement(null);
        setNotice("Elige el segundo punto de medición");
        return;
      }
      const measurement = { start: { ...sketchMeasureStart }, end: { ...point } };
      setSketchMeasurement(measurement);
      setSketchMeasureStart(null);
      setNotice(`Medido: ${Number(Math.hypot(measurement.end.x - measurement.start.x, measurement.end.z - measurement.start.z).toFixed(2))} mm`);
    },
    [sketchMeasureStart],
  );

  const clearSketchMeasurement = useCallback(() => {
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setNotice("Medición de boceto eliminada");
  }, []);

  const connectSketchPoint = useCallback(
    (pointId: string, profile = sketchProfile) => {
      if (!["line", "bezier", "smooth"].includes(sketchTool)) return profile;
      const curveKind = sketchTool as NonNullable<SketchSegment["kind"]>;
      if (!sketchActivePointId) {
        setSketchActivePointId(pointId);
        setSketchSelection({ kind: "point", id: pointId });
        return profile;
      }
      if (sketchActivePointId === pointId) return profile;
      const duplicate = profile.segments.some(
        (segment) =>
          (segment.startId === sketchActivePointId && segment.endId === pointId) ||
          (segment.startId === pointId && segment.endId === sketchActivePointId),
      );
      const next = duplicate
        ? profile
        : {
            ...profile,
            segments: [...profile.segments, { id: createLocalId("sketch-segment"), startId: sketchActivePointId, endId: pointId, kind: curveKind }],
          };
      const smoothed = sketchTool === "smooth" ? withSmoothSketchHandles(next) : next;
      const closed = orderedSketchPaths(smoothed).some((path) => path.closed && path.steps.some((step) => step.segment.startId === sketchActivePointId || step.segment.endId === sketchActivePointId));
      if (!duplicate) commitSketchProfile(smoothed, closed ? "Perfil cerrado: edita el trayecto o finaliza el boceto" : "Segmento de boceto agregado");
      setSketchActivePointId(closed ? null : pointId);
      setSketchSelection({ kind: "point", id: pointId });
      if (closed) setSketchTool("select");
      return smoothed;
    },
    [commitSketchProfile, sketchActivePointId, sketchProfile, sketchTool],
  );

  const addSketchPlanePoint = useCallback(
    (position: { x: number; z: number }, handles?: { handleIn: { x: number; z: number }; handleOut: { x: number; z: number } }) => {
      if (sketchTool === "measure") {
        measureSketchPoint({ id: "measure", ...position });
        return;
      }
      if (!["line", "bezier", "smooth"].includes(sketchTool)) return;
      const curveKind = sketchTool as NonNullable<SketchSegment["kind"]>;
      const existing = sketchProfile.points.find((point) => Math.hypot(point.x - position.x, point.z - position.z) < 0.0001);
      if (existing) {
        connectSketchPoint(existing.id);
        return;
      }
      const point: SketchPoint = {
        id: createLocalId("sketch-point"),
        ...position,
        ...(handles ?? {}),
        mode: sketchTool === "line" ? "corner" : sketchTool === "smooth" ? "smooth" : handles ? "smooth" : "corner",
      };
      const next: SketchProfile = { ...sketchProfile, points: [...sketchProfile.points, point] };
      if (sketchActivePointId) {
        next.segments = [...next.segments, { id: createLocalId("sketch-segment"), startId: sketchActivePointId, endId: point.id, kind: curveKind }];
      }
      const prepared = sketchTool === "smooth" ? withSmoothSketchHandles(next) : next;
      commitSketchProfile(prepared, sketchActivePointId ? "Punto y segmento de boceto agregados" : "Punto de boceto agregado");
      setSketchActivePointId(point.id);
      setSketchSelection({ kind: "point", id: point.id });
    },
    [commitSketchProfile, connectSketchPoint, measureSketchPoint, sketchActivePointId, sketchProfile, sketchTool],
  );

  const pressSketchPoint = useCallback(
    (id: string) => {
      const point = sketchProfile.points.find((entry) => entry.id === id);
      if (!point) return;
      if (sketchTool === "measure") {
        measureSketchPoint(point);
        setSketchSelection({ kind: "point", id });
        return;
      }
      if (sketchTool === "select") {
        setSketchSelection({ kind: "point", id });
        setSketchActivePointId(null);
        return;
      }
      connectSketchPoint(id);
    },
    [connectSketchPoint, measureSketchPoint, sketchProfile.points, sketchTool],
  );

  const deleteSketchPoint = useCallback(
    (id: string) => {
      const connected = sketchProfile.segments.filter((segment) => segment.startId === id || segment.endId === id);
      const neighboringIds = connected.map((segment) => segment.startId === id ? segment.endId : segment.startId);
      const remainingSegments = sketchProfile.segments.filter((segment) => segment.startId !== id && segment.endId !== id);
      if (neighboringIds.length === 2 && neighboringIds[0] !== neighboringIds[1]) {
        const duplicate = remainingSegments.some((segment) =>
          (segment.startId === neighboringIds[0] && segment.endId === neighboringIds[1]) ||
          (segment.startId === neighboringIds[1] && segment.endId === neighboringIds[0]),
        );
        if (!duplicate) {
          remainingSegments.push({
            id: createLocalId("sketch-segment"),
            startId: neighboringIds[0],
            endId: neighboringIds[1],
            kind: connected.every((segment) => segment.kind === "line") ? "line" : connected.some((segment) => segment.kind === "smooth") ? "smooth" : "bezier",
          });
        }
      }
      const next = {
        ...sketchProfile,
        points: sketchProfile.points.filter((point) => point.id !== id),
        segments: remainingSegments,
      };
      commitSketchProfile(next.segments.some((segment) => segment.kind === "smooth") ? withSmoothSketchHandles(next) : next, "Punto de boceto eliminado");
      if (sketchActivePointId === id) setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchActivePointId, sketchProfile],
  );

  const deleteSketchSegment = useCallback(
    (id: string) => {
      commitSketchProfile({ ...sketchProfile, segments: sketchProfile.segments.filter((segment) => segment.id !== id) }, "Línea de boceto eliminada");
      setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchProfile],
  );

  const setSketchSegmentDimensions = useCallback((id: string, length: number, angle: number) => {
    const segment = sketchProfile.segments.find((entry) => entry.id === id && !entry.sourceEntityId);
    if (!segment) return;
    const start = sketchProfile.points.find((point) => point.id === segment.startId);
    if (!start) return;
    const radians = angle * Math.PI / 180;
    const nextLength = Math.max(0.05, Math.abs(length));
    const endPoint = { x: start.x + Math.cos(radians) * nextLength, z: start.z + Math.sin(radians) * nextLength };
    commitSketchProfile({
      ...sketchProfile,
      points: sketchProfile.points.map((point) => point.id === segment.endId ? {
        ...point,
        ...endPoint,
        handleIn: point.handleIn ? { x: point.handleIn.x + endPoint.x - point.x, z: point.handleIn.z + endPoint.z - point.z } : undefined,
        handleOut: point.handleOut ? { x: point.handleOut.x + endPoint.x - point.x, z: point.handleOut.z + endPoint.z - point.z } : undefined,
      } : point),
    }, `Segmento ajustado a ${nextLength.toFixed(workspaceSettings.accuracy)} mm / ${angle.toFixed(1)}°`);
    setSketchSelection({ kind: "segment", id });
  }, [commitSketchProfile, sketchProfile, workspaceSettings.accuracy]);

  const bevelSketchPoint = useCallback((id: string, kind: "chamfer" | "fillet") => {
    const corner = sketchProfile.points.find((point) => point.id === id && !point.sourceEntityId);
    const incident = sketchProfile.segments.filter((segment) => !segment.sourceEntityId && (segment.startId === id || segment.endId === id));
    if (!corner || incident.length !== 2 || incident.some((segment) => (segment.kind ?? "line") !== "line")) {
      setNotice("Elige un vértice unido exactamente a dos líneas rectas");
      return;
    }
    const neighborFor = (segment: SketchSegment) => sketchProfile.points.find((point) => point.id === (segment.startId === id ? segment.endId : segment.startId));
    const neighborA = neighborFor(incident[0]);
    const neighborB = neighborFor(incident[1]);
    if (!neighborA || !neighborB) return;
    const vectorA = { x: neighborA.x - corner.x, z: neighborA.z - corner.z };
    const vectorB = { x: neighborB.x - corner.x, z: neighborB.z - corner.z };
    const lengthA = Math.hypot(vectorA.x, vectorA.z);
    const lengthB = Math.hypot(vectorB.x, vectorB.z);
    if (lengthA < 0.2 || lengthB < 0.2) {
      setNotice("Las líneas son demasiado cortas para modificar la esquina");
      return;
    }
    const cut = Math.min(2, lengthA * 0.45, lengthB * 0.45);
    const unitA = { x: vectorA.x / lengthA, z: vectorA.z / lengthA };
    const unitB = { x: vectorB.x / lengthB, z: vectorB.z / lengthB };
    const pointA: SketchPoint = { id: createLocalId("sketch-bevel"), x: corner.x + unitA.x * cut, z: corner.z + unitA.z * cut, mode: kind === "fillet" ? "smooth" : "corner" };
    const pointB: SketchPoint = { id: createLocalId("sketch-bevel"), x: corner.x + unitB.x * cut, z: corner.z + unitB.z * cut, mode: kind === "fillet" ? "smooth" : "corner" };
    if (kind === "fillet") {
      const handle = cut * 0.55;
      pointA.handleOut = { x: pointA.x - unitA.x * handle, z: pointA.z - unitA.z * handle };
      pointB.handleIn = { x: pointB.x - unitB.x * handle, z: pointB.z - unitB.z * handle };
    }
    const rewire = (segment: SketchSegment, pointId: string): SketchSegment => segment.startId === id ? { ...segment, startId: pointId } : { ...segment, endId: pointId };
    const incidentIds = new Set(incident.map((segment) => segment.id));
    const connector: SketchSegment = { id: createLocalId("sketch-bevel-segment"), startId: pointA.id, endId: pointB.id, kind: kind === "fillet" ? "bezier" : "line" };
    commitSketchProfile({
      ...sketchProfile,
      points: [...sketchProfile.points.filter((point) => point.id !== id), pointA, pointB],
      segments: [...sketchProfile.segments.filter((segment) => !incidentIds.has(segment.id)), rewire(incident[0], pointA.id), rewire(incident[1], pointB.id), connector],
    }, kind === "fillet" ? "Esquina redondeada" : "Chaflán creado");
    setSketchSelection({ kind: "segment", id: connector.id });
    setSketchTool("select");
  }, [commitSketchProfile, sketchProfile]);

  const addSketchEntity = useCallback((entity: SketchEntity) => {
    const entities = [...(sketchProfile.entities ?? []), entity];
    const next = materializeSketchEntities({ ...sketchProfile, entities });
    commitSketchProfile(next, "Entidad paramétrica agregada");
    setSketchSelection({ kind: "entity", id: entity.id });
    setSketchActivePointId(null);
  }, [commitSketchProfile, sketchProfile]);

  const updateSketchEntity = useCallback((id: string, patch: Partial<SketchEntity>, message = "Entidad paramétrica actualizada") => {
    const entities = (sketchProfile.entities ?? []).map((entry) => entry.id === id ? { ...entry, ...patch } as SketchEntity : entry);
    const next = materializeSketchEntities({ ...sketchProfile, entities });
    commitSketchProfile(next, message);
    setSketchSelection({ kind: "entity", id });
    setSketchActivePointId(null);
  }, [commitSketchProfile, sketchProfile]);

  const deleteSketchEntity = useCallback((id: string) => {
    if (!(sketchProfile.entities ?? []).some((entity) => entity.id === id)) return;
    const entities = (sketchProfile.entities ?? []).filter((entity) => entity.id !== id);
    const next = materializeSketchEntities({ ...sketchProfile, entities });
    commitSketchProfile(next, "Entidad paramétrica eliminada");
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  const deriveSketchEntity = useCallback((id: string, action: "offset" | "mirror-x" | "mirror-y" | "pattern-linear" | "pattern-circular") => {
    const source = (sketchProfile.entities ?? []).find((entity) => entity.id === id);
    if (!source) return;
    const clone = <T extends SketchEntity>(entity: T): T => ({ ...entity, id: createLocalId(`sketch-${entity.kind}`) });
    const rotate = (entity: SketchEntity, degrees: number): SketchEntity => {
      const radians = degrees * Math.PI / 180;
      const cx = entity.cx * Math.cos(radians) - entity.cz * Math.sin(radians);
      const cz = entity.cx * Math.sin(radians) + entity.cz * Math.cos(radians);
      if (entity.kind === "arc") return { ...clone(entity), cx, cz, startAngle: entity.startAngle + degrees, endAngle: entity.endAngle + degrees };
      if (entity.kind === "semicircle") return { ...clone(entity), cx, cz, startAngle: entity.startAngle + degrees };
      if (["ellipse", "polygon", "slot", "text", "vector"].includes(entity.kind)) {
        return { ...clone(entity), cx, cz, rotation: (entity as Extract<SketchEntity, { rotation: number }>).rotation + degrees } as SketchEntity;
      }
      return { ...clone(entity), cx, cz };
    };
    const mirror = (entity: SketchEntity, axis: "x" | "y"): SketchEntity => {
      const cx = axis === "x" ? -entity.cx : entity.cx;
      const cz = axis === "y" ? -entity.cz : entity.cz;
      if (entity.kind === "arc") return axis === "x"
        ? { ...clone(entity), cx, cz, startAngle: 180 - entity.endAngle, endAngle: 180 - entity.startAngle }
        : { ...clone(entity), cx, cz, startAngle: -entity.endAngle, endAngle: -entity.startAngle };
      if (entity.kind === "semicircle") return { ...clone(entity), cx, cz, startAngle: axis === "x" ? -entity.startAngle : 180 - entity.startAngle };
      if (entity.kind === "text" || entity.kind === "vector") return { ...clone(entity), cx, cz, [axis === "x" ? "scaleX" : "scaleZ"]: -(axis === "x" ? entity.scaleX : entity.scaleZ) } as SketchEntity;
      if (entity.kind === "ellipse" || entity.kind === "polygon" || entity.kind === "slot") return { ...clone(entity), cx, cz, rotation: axis === "x" ? 180 - entity.rotation : -entity.rotation };
      return { ...clone(entity), cx, cz };
    };
    const offset = (entity: SketchEntity): SketchEntity => {
      const derived = clone(entity);
      if (derived.kind === "circle" || derived.kind === "semicircle" || derived.kind === "arc" || derived.kind === "polygon") return { ...derived, radius: derived.radius + 2 };
      if (derived.kind === "rectangle") return { ...derived, width: derived.width + 4, depth: derived.depth + 4 };
      if (derived.kind === "ellipse") return { ...derived, radiusX: derived.radiusX + 2, radiusZ: derived.radiusZ + 2 };
      if (derived.kind === "slot") return { ...derived, length: derived.length + 4, width: derived.width + 4 };
      if (derived.kind === "text" || derived.kind === "vector") return { ...derived, scaleX: derived.scaleX * 1.1, scaleZ: derived.scaleZ * 1.1 };
      return derived;
    };

    let copies: SketchEntity[];
    if (action === "offset") copies = [offset(source)];
    else if (action === "mirror-x") copies = [mirror(source, "x")];
    else if (action === "mirror-y") copies = [mirror(source, "y")];
    else if (action === "pattern-circular") copies = [90, 180, 270].map((angle) => rotate(source, angle));
    else {
      const points = tessellateSketchEntity(source).points;
      const width = points.length ? Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)) : 10;
      const spacing = Math.max(5, width + 5);
      copies = [1, 2].map((index) => ({ ...clone(source), cx: source.cx + spacing * index }));
    }
    const entities = [...(sketchProfile.entities ?? []), ...copies];
    commitSketchProfile(materializeSketchEntities({ ...sketchProfile, entities }), action === "offset" ? "Offset paramétrico creado" : action.startsWith("mirror") ? "Espejo paramétrico creado" : "Patrón paramétrico creado");
    setSketchSelection({ kind: "entity", id: copies.at(-1)?.id ?? source.id });
    setSketchTool("select");
  }, [commitSketchProfile, sketchProfile]);

  const updateSketchImage = useCallback((id: string, patch: Partial<SketchImage>, message = "Imagen de boceto actualizada") => {
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === id);
    if (!image) return;
    commitSketchProfile({
      ...sketchProfile,
      images: (sketchProfile.images ?? []).map((entry) => entry.id === id ? { ...entry, ...patch } : entry),
    }, message);
    setSketchSelection({ kind: "image", id });
    setSketchActivePointId(null);
  }, [commitSketchProfile, sketchProfile]);

  const deleteSketchImage = useCallback((id: string) => {
    if (!(sketchProfile.images ?? []).some((image) => image.id === id)) return;
    commitSketchProfile({
      ...sketchProfile,
      images: (sketchProfile.images ?? []).filter((image) => image.id !== id),
    }, "Imagen de boceto eliminada");
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  const addSketchImageFile = useCallback(async (file: File) => {
    if (!sketchActive || sketchTool !== "select") {
      setNotice("Elige Seleccionar antes de agregar una imagen de boceto");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setNotice("Elige un archivo PNG, JPG, WebP, GIF u otra imagen");
      return;
    }
    try {
      const prepared = await prepareImportedImage(file);
      const dimensions = imagePlateDimensions(prepared.pixelWidth, prepared.pixelHeight);
      const image: SketchImage = {
        id: createLocalId("sketch-image"),
        name: file.name.replace(/\.[^.]+$/, "") || "Imagen de boceto",
        ...prepared,
        x: 0,
        z: 0,
        width: dimensions.width,
        depth: dimensions.depth,
        opacity: 0.55,
        lockAspect: true,
      };
      commitSketchProfile({ ...sketchProfile, images: [...(sketchProfile.images ?? []), image] }, `${file.name} agregado al boceto`);
      setSketchSelection({ kind: "image", id: image.id });
      setSketchActivePointId(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo agregar la imagen de boceto");
    }
  }, [commitSketchProfile, sketchActive, sketchProfile, sketchTool]);

  const addSketchTextEntity = useCallback(() => {
    if (!sketchActive && !capSketchActive) {
      setNotice("Inicia un boceto antes de agregar texto 3D");
      return;
    }
    const entity: SketchEntity = {
      id: createLocalId("sketch-text"),
      kind: "text",
      cx: 0,
      cz: 0,
      text: "Texto",
      font: "Sans",
      size: 12,
      scaleX: 1,
      scaleZ: 1,
      rotation: 0,
    };
    addSketchEntity(entity);
    setSketchTool("select");
    setSketchSelection({ kind: "entity", id: entity.id });
    setNotice("Texto 3D agregado: escribe el contenido en Propiedades y finaliza el boceto para extruirlo");
  }, [addSketchEntity, capSketchActive, sketchActive]);

  const addSketchVectorFile = useCallback(async (file: File) => {
    if (!sketchActive && !capSketchActive) {
      setNotice("Inicia un boceto antes de importar una imagen o SVG 3D");
      return;
    }
    try {
      const entity = await vectorEntityFromFile(file);
      addSketchEntity(entity);
      setSketchTool("select");
      setSketchSelection({ kind: "entity", id: entity.id });
      setNotice(entity.sourceFormat === "svg"
        ? `${file.name} convertido en contornos editables y extruibles`
        : `${file.name} vectorizado localmente; ajusta sus propiedades antes de extruir`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo convertir la imagen en geometría");
    }
  }, [addSketchEntity, capSketchActive, sketchActive]);

  const projectSelectedShapesToSketch = useCallback(() => {
    const sources = selectedShapes.filter((shape) => shape.id !== editingSketchShapeId && !shape.hidden);
    if (!sources.length) {
      setNotice("Selecciona una o más piezas antes de proyectar su silueta al boceto");
      return;
    }
    const projected = sources.map((shape): SketchEntity => {
      const isRound = ["cylinder", "cone", "sphere", "torus", "tube"].includes(shape.kind);
      if (isRound && Math.abs(shape.width - shape.depth) < 0.001) {
        return { id: createLocalId("sketch-projection"), kind: "circle", cx: shape.x, cz: shape.z, radius: Math.max(0.05, shape.width / 2) };
      }
      if (isRound) {
        return { id: createLocalId("sketch-projection"), kind: "ellipse", cx: shape.x, cz: shape.z, radiusX: Math.max(0.05, shape.width / 2), radiusZ: Math.max(0.05, shape.depth / 2), rotation: shape.rotation ?? 0 };
      }
      const halfWidth = Math.max(0.05, shape.width / 2);
      const halfDepth = Math.max(0.05, shape.depth / 2);
      return {
        id: createLocalId("sketch-projection"),
        kind: "vector",
        cx: shape.x,
        cz: shape.z,
        name: `Proyección de ${shape.name}`,
        loops: [[{ x: -halfWidth, z: -halfDepth }, { x: halfWidth, z: -halfDepth }, { x: halfWidth, z: halfDepth }, { x: -halfWidth, z: halfDepth }]],
        scaleX: 1,
        scaleZ: 1,
        rotation: shape.rotation ?? 0,
        sourceFormat: "trace",
      };
    });
    const entities = [...(sketchProfile.entities ?? []), ...projected];
    commitSketchProfile(materializeSketchEntities({ ...sketchProfile, entities }), `${projected.length} silueta${projected.length === 1 ? "" : "s"} proyectada${projected.length === 1 ? "" : "s"}`);
    setSketchSelection({ kind: "entity", id: projected.at(-1)?.id ?? "" });
    setSketchTool("select");
    setNotice("Geometría proyectada como contorno asociable y extruible");
  }, [commitSketchProfile, editingSketchShapeId, selectedShapes, sketchProfile]);

  const deleteSelectedSketchEntity = useCallback(() => {
    if (!sketchSelection) {
      setNotice("Selecciona un punto, segmento o entidad de boceto para eliminarlo");
      return;
    }
    if (sketchSelection.kind === "point") deleteSketchPoint(sketchSelection.id);
    else if (sketchSelection.kind === "segment") deleteSketchSegment(sketchSelection.id);
    else if (sketchSelection.kind === "image") deleteSketchImage(sketchSelection.id);
    else if (sketchSelection.kind === "entity") deleteSketchEntity(sketchSelection.id);
    else {
      const pointIds = new Set(sketchSelection.pointIds);
      const segmentIds = new Set(sketchSelection.segmentIds);
      const imageIds = new Set(sketchSelection.imageIds ?? []);
      commitSketchProfile({
        ...sketchProfile,
        points: sketchProfile.points.filter((point) => !pointIds.has(point.id)),
        segments: sketchProfile.segments.filter((segment) => !segmentIds.has(segment.id) && !pointIds.has(segment.startId) && !pointIds.has(segment.endId)),
        images: (sketchProfile.images ?? []).filter((image) => !imageIds.has(image.id)),
      }, "Geometría de boceto seleccionada eliminada");
      setSketchActivePointId(null);
      setSketchSelection(null);
    }
  }, [commitSketchProfile, deleteSketchEntity, deleteSketchImage, deleteSketchPoint, deleteSketchSegment, sketchProfile, sketchSelection]);

  const moveSketchPoint = useCallback((id: string, position: { x: number; z: number }) => {
    const current = sketchProfile.points.find((point) => point.id === id);
    if (!current) return;
    const deltaX = position.x - current.x;
    const deltaZ = position.z - current.z;
    const next = {
      ...sketchProfile,
      points: sketchProfile.points.map((point) => point.id === id ? {
        ...point,
        ...position,
        handleIn: point.handleIn ? { x: point.handleIn.x + deltaX, z: point.handleIn.z + deltaZ } : undefined,
        handleOut: point.handleOut ? { x: point.handleOut.x + deltaX, z: point.handleOut.z + deltaZ } : undefined,
      } : point),
    };
    commitSketchProfile(next, "Punto de boceto movido");
  }, [commitSketchProfile, sketchProfile]);

  const moveSketchHandle = useCallback((id: string, handle: "in" | "out", position: { x: number; z: number }) => {
    const next = cloneSketchProfile(sketchProfile);
    const point = next.points.find((entry) => entry.id === id);
    if (!point) return;
    if (handle === "in") point.handleIn = { ...position };
    else point.handleOut = { ...position };
    if (point.mode === "smooth") {
      const opposite = { x: point.x * 2 - position.x, z: point.z * 2 - position.z };
      if (handle === "in") point.handleOut = opposite;
      else point.handleIn = opposite;
    }
    commitSketchProfile(next, "Control de curva ajustado");
  }, [commitSketchProfile, sketchProfile]);

  const setSketchPointMode = useCallback((id: string, mode: "corner" | "smooth" | "split") => {
    let next = cloneSketchProfile(sketchProfile);
    const point = next.points.find((entry) => entry.id === id);
    if (!point) return;
    point.mode = mode;
    if (mode === "corner") {
      point.handleIn = undefined;
      point.handleOut = undefined;
      next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "line" } : segment);
    } else {
      next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "bezier" } : segment);
      if (!point.handleIn || !point.handleOut) next = withSmoothSketchHandles(next);
      const updated = next.points.find((entry) => entry.id === id);
      if (updated) updated.mode = mode;
    }
    commitSketchProfile(next, mode === "corner" ? "Hecho en esquina" : mode === "smooth" ? "Hecho suave" : "Controles de curva divididos");
  }, [commitSketchProfile, sketchProfile]);

  const insertSketchPoint = useCallback((segmentId: string, position: { x: number; z: number }) => {
    const segment = sketchProfile.segments.find((entry) => entry.id === segmentId);
    if (!segment) return;
    const point: SketchPoint = { id: createLocalId("sketch-point"), ...position, mode: segment.kind === "line" ? "corner" : "smooth" };
    let next: SketchProfile = {
      ...sketchProfile,
      points: [...sketchProfile.points, point],
      segments: sketchProfile.segments.flatMap((entry) => entry.id === segmentId ? [
        { ...entry, id: createLocalId("sketch-segment"), endId: point.id },
        { ...entry, id: createLocalId("sketch-segment"), startId: point.id },
      ] : [entry]),
    };
    if (segment.kind === "smooth") next = withSmoothSketchHandles(next);
    commitSketchProfile(next, "Punto agregado al trayecto");
    setSketchSelection({ kind: "point", id: point.id });
    setSketchTool("select");
  }, [commitSketchProfile, sketchProfile]);

  const finishSketch = useCallback(async () => {
    const existing = editingSketchShapeId ? shapes.find((shape) => shape.id === editingSketchShapeId) ?? null : null;
    const height = existing?.height ?? 10;
    let resolved: WorkplaneShape | null;
    try {
      resolved = sketchOperation === "revolve"
        ? await shapeFromRevolvedSketchProfile(sketchProfile, sketchRevolveSettings, existing)
        : await shapeFromSketchProfile(sketchProfile, height, existing);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `No se puede ${sketchOperation === "revolve" ? "revolucionar" : "extruir"} el perfil del boceto a 3D`);
      return;
    }
    if (!resolved) {
      setNotice("Cierra al menos un perfil antes de finalizar el boceto");
      return;
    }
    if (existing?.capSectionId && !resolved.capSectionId) {
      resolved = { ...resolved, capSectionId: existing.capSectionId };
    }
    // Keep the owning CAP section in sync when the sketch belongs to one.
    const resolvedCapSectionId = resolved.capSectionId;
    if (resolvedCapSectionId) {
      const currentCap = normalizeCapDocument(capDocumentRef.current);
      const section = currentCap.sections.find((candidate) => candidate.id === resolvedCapSectionId);
      if (section) {
        const nextSection: CapSection = { ...section, sketchProfile: cloneSketchProfile(sketchProfile), resultShapeId: resolved.id };
        const nextCap = appendCapTimelineEntry(
          {
            ...currentCap,
            sections: currentCap.sections.map((candidate) => candidate.id === section.id ? nextSection : candidate),
          },
          {
            id: createLocalId("cap-entry"),
            kind: "section-edit",
            sectionId: section.id,
            shapeId: resolved.id,
            label: `Boceto de «${section.name}» actualizado`,
            timestamp: Date.now(),
          },
        );
        capDocumentRef.current = nextCap;
        setCapDocument(nextCap);
      }
    }
    const nextShapes = existing ? shapes.map((shape) => (shape.id === existing.id ? resolved : shape)) : [...shapes, resolved];
    const action = sketchOperation === "revolve" ? "Boceto de revolución" : "Boceto";
    commitShapes(nextShapes, resolved.id, existing ? `${action} actualizado` : sketchOperation === "revolve" ? "Boceto de revolución creado" : "Boceto creado a 10 mm de altura");
    setSketchActive(false);
    setSketchRevolvePreview(null);
    setEditingSketchShapeId(null);
    setToolbarMode("geometry");
  }, [commitShapes, editingSketchShapeId, shapes, sketchOperation, sketchProfile, sketchRevolveSettings]);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = null;
      lastProjectShapesSyncRef.current = "";
      lastProjectShapesEchoRef.current = null;
      return;
    }
    if (projectInteractionActiveRef.current) {
      return;
    }
    const projectChanged = lastProjectIdRef.current !== projectId;
    if (projectChanged) {
      lastProjectIdRef.current = projectId;
      lastProjectShapesSyncRef.current = "";
      lastProjectShapesEchoRef.current = null;
      const nextAssets = dedupeProjectAssets(initialAssets);
      projectAssetsRef.current = nextAssets;
      setProjectAssets(nextAssets);
      setPlacementElevation(Number.isFinite(initialPlacementElevation) ? initialPlacementElevation : 0);
      const nextCap = initialCap ? normalizeCapDocument(initialCap) : emptyCapDocument();
      capDocumentRef.current = nextCap;
      setCapDocument(nextCap);
    }
    const incoming = initialShapes.map(canonicalizeShape);
    const incomingSerialized = projectShapesFingerprint(incoming);
    // The parent echoes shapes after a local save; rehydrating that echo can reset active transform state.
    if (!projectChanged && lastProjectShapesEchoRef.current !== null && incomingSerialized === lastProjectShapesEchoRef.current) {
      lastProjectShapesSyncRef.current = incomingSerialized;
      return;
    }
    lastProjectShapesSyncRef.current = incomingSerialized;
    if (projectSyncTimerRef.current !== null) {
      window.clearTimeout(projectSyncTimerRef.current);
      projectSyncTimerRef.current = null;
    }
    if (!projectChanged && incomingSerialized === projectShapesFingerprint(shapes)) {
      return;
    }
    const hydratedHistory = hydrateEditorHistoryState(
      incoming,
      initialHistory,
      initialHistoryIndex,
      normalizeWorkspaceSettings(initialWorkspace).historyLimit,
    );
    projectHydratingRef.current = true;
    shapesRef.current = incoming;
    selectedIdsRef.current = [];
    historyRef.current = hydratedHistory.entries;
    historyIndexRef.current = hydratedHistory.index;
    setShapes(incoming);
    setSelectedIds([]);
    setHistory(hydratedHistory.entries);
    setHistoryIndex(hydratedHistory.index);
    setNotice("Listo");
  }, [initialAssets, initialHistory, initialHistoryIndex, initialPlacementElevation, initialShapes, projectId, projectRevision]);

  useEffect(() => {
    if (!projectId || !onProjectShapesChange) {
      return;
    }
    if (projectHydratingRef.current) {
      projectHydratingRef.current = false;
      return;
    }
    syncProjectShapes(shapes);
  }, [onProjectShapesChange, projectId, shapes, syncProjectShapes]);

  useEffect(() => {
    return () => {
      if (projectSyncTimerRef.current !== null) {
        window.clearTimeout(projectSyncTimerRef.current);
      }
      if (interactionHistoryTimerRef.current !== null) {
        window.clearTimeout(interactionHistoryTimerRef.current);
      }
      sketchRevolveUpdateTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      sketchRevolveUpdateTimerRef.current.clear();
    };
  }, []);

  const addLibraryAsset = useCallback(
    async (asset: ShapeAsset, point?: { x: number; z: number; elevation?: number }) => {
      const full = findLibraryAsset(asset.id) ?? asset;
      const nextShape = await buildLibraryShape(full, point ?? { x: 0, z: 0, elevation: placementElevation });
      commitShapes([...shapes, nextShape], nextShape.id, `${full.name} agregado`);
    },
    [commitShapes, placementElevation, shapes],
  );

  const handleImportStlFile = useCallback(
    async (file: File) => {
      try {
        const buffer = await file.arrayBuffer();
        const imported = importedShapeFromStl(file.name, buffer);
        const placed = canonicalizeShape({
          ...imported,
          x: 0,
          z: 0,
          elevation: placementElevation,
        });
        commitShapes([...shapes, placed], placed.id, `STL importado: ${placed.name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "error desconocido";
        setNotice(`No se pudo importar el STL: ${message}`);
      }
    },
    [commitShapes, placementElevation, shapes],
  );

  const handleImportStlUrl = useCallback(
    async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const fileName = url.split("/").pop()?.split("?")[0] || "descarga.stl";
        const imported = importedShapeFromStl(fileName, buffer);
        const placed = canonicalizeShape({
          ...imported,
          x: 0,
          z: 0,
          elevation: placementElevation,
        });
        commitShapes([...shapes, placed], placed.id, `STL descargado: ${placed.name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "error desconocido";
        setNotice(`No se pudo descargar el STL. La URL debe permitir CORS. (${message})`);
      }
    },
    [commitShapes, placementElevation, shapes],
  );

  const scheduleRevolveShapeUpdate = useCallback((id: string, settings: SketchRevolveSettings) => {
    const previousTimer = sketchRevolveUpdateTimerRef.current.get(id);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const requestId = (sketchRevolveUpdateRequestRef.current.get(id) ?? 0) + 1;
    sketchRevolveUpdateRequestRef.current.set(id, requestId);
    const timer = window.setTimeout(() => {
      sketchRevolveUpdateTimerRef.current.delete(id);
      const source = shapesRef.current.find((shape) => shape.id === id);
      if (!source?.sketchProfile || source.sketchOperation !== "revolve") return;
      setNotice("Actualizando vista previa de revolución…");
      void shapeFromRevolvedSketchProfile(source.sketchProfile, settings, source)
        .then((generated) => {
          if (sketchRevolveUpdateRequestRef.current.get(id) !== requestId) return;
          const current = shapesRef.current.find((shape) => shape.id === id);
          if (!current?.importedMesh || current.sketchOperation !== "revolve") return;
          const widthScale = current.width / Math.max(0.001, current.importedMesh.baseWidth);
          const depthScale = current.depth / Math.max(0.001, current.importedMesh.baseDepth);
          const heightScale = current.height / Math.max(0.001, current.importedMesh.baseHeight);
          const width = generated.width * widthScale;
          const depth = generated.depth * depthScale;
          const height = generated.height * heightScale;
          const updated = canonicalizeShape({
            ...generated,
            id: current.id,
            name: current.name,
            color: current.color,
            hole: current.hole,
            x: current.x,
            z: current.z,
            elevation: current.elevation,
            width,
            depth,
            height,
            size: Math.max(width, depth),
            rotation: current.rotation,
            rotationX: current.rotationX,
            rotationZ: current.rotationZ,
            mirrorX: current.mirrorX,
            mirrorY: current.mirrorY,
            mirrorZ: current.mirrorZ,
            locked: current.locked,
            hidden: current.hidden,
            sketchRevolve: settings,
          });
          commitShapes(shapesRef.current.map((shape) => shape.id === id ? updated : shape), selectedIdsRef.current, "Revolución actualizada");
        })
        .catch((error) => {
          if (sketchRevolveUpdateRequestRef.current.get(id) === requestId) {
            setNotice(error instanceof Error ? error.message : "No se pudieron aplicar los ajustes de revolución");
          }
        });
    }, 120);
    sketchRevolveUpdateTimerRef.current.set(id, timer);
  }, [commitShapes]);

  const updateShape = useCallback(
    (id: string, patch: ShapeUpdatePatch) => {
      const bakeTransform = Boolean(patch.bakeTransform);
      const cleanedPatch = cleanShapePatch(patch);
      if (cleanedPatch.sketchRevolve) {
        const source = shapesRef.current.find((shape) => shape.id === id);
        if (source?.sketchOperation === "revolve" && source.sketchProfile) {
          scheduleRevolveShapeUpdate(id, normalizeSketchRevolveSettings(cleanedPatch.sketchRevolve));
          return;
        }
      }
      const applyPatch = (current: WorkplaneShape[]) => {
        let changed = false;
        const next = current.map((shape) => {
          if (shape.id !== id) {
            return shape;
          }

          const patched = { ...shape, ...cleanedPatch };
          const canonicalBase = canonicalizeShape("hole" in cleanedPatch ? withHoleMode(patched, Boolean(cleanedPatch.hole), cleanedPatch.color) : patched);
          const canonical = bakeTransform ? canonicalizeShape(bakeShapeTransformIntoMesh(canonicalBase)) : canonicalBase;
          if (workplaneShapesEqual(shape, canonical)) {
            return shape;
          }
          changed = true;
          return canonical;
        });
        return { changed, next };
      };

      if (projectInteractionActiveRef.current) {
        setShapes((current) => {
          const { changed, next } = applyPatch(current);
          if (!changed) {
            return current;
          }
          interactionHistoryChangedRef.current = true;
          shapesRef.current = next;
          return next;
        });
        return;
      }

      const { changed, next } = applyPatch(shapes);
      if (changed) {
        commitShapes(next, selectedIds);
      }
    },
    [commitShapes, scheduleRevolveShapeUpdate, selectedIds, shapes],
  );

  const deleteSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const selected = new Set(selectedIds);
    commitShapes(
      shapes.filter((shape) => !selected.has(shape.id)),
      [],
      `Se eliminó ${selected.size} forma${selected.size === 1 ? "" : "s"} seleccionada${selected.size === 1 ? "" : "s"}`,
    );
  }, [commitShapes, hasSelection, selectedIds, shapes]);

  const duplicateSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const duplicates = selectedShapes.map((shape) => ({
      ...shape,
      id: createLocalId(`${shape.id}-copy`),
      x: Math.min(110, shape.x + 8),
      z: Math.min(110, shape.z + 8),
    }));
    commitShapes([...shapes, ...duplicates], duplicates.map((shape) => shape.id), `Se duplicó ${duplicates.length} forma${duplicates.length === 1 ? "" : "s"}`);
  }, [commitShapes, hasSelection, selectedShapes, shapes]);

  const copySelected = useCallback(() => {
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    setClipboard(selectedShapes);
    writeSharedClipboard(selectedShapes);
    setNotice(`Se copió ${selectedShapes.length} forma${selectedShapes.length === 1 ? "" : "s"}`);
  }, [hasSelection, selectedShapes]);

  const pasteShape = useCallback(async () => {
    const sourceProjectId = projectInfoRef.current.projectId;
    const systemClipboard = await readSystemClipboard();
    const sharedClipboard = readSharedClipboard();
    const sourceClipboard = systemClipboard.length > 0 ? systemClipboard : sharedClipboard.length > 0 ? sharedClipboard : clipboard;
    if (sourceClipboard.length === 0) {
      setNotice("El portapapeles de SketchForge está vacío");
      return;
    }
    if (projectInfoRef.current.projectId !== sourceProjectId) {
      setNotice("Se canceló el pegado porque el proyecto cambió");
      return;
    }
    if (serializeShapesForSync(sourceClipboard) !== serializeShapesForSync(clipboard)) {
      setClipboard(sourceClipboard);
    }
    const pasted = sourceClipboard.map((shape) => ({
      ...shape,
      id: createLocalId(`${shape.id}-paste`),
      x: Math.min(110, shape.x + 12),
      z: Math.min(110, shape.z + 12),
    }));
    commitShapes([...shapesRef.current, ...pasted], pasted.map((shape) => shape.id), `Se pegó ${pasted.length} forma${pasted.length === 1 ? "" : "s"}`);
  }, [clipboard, commitShapes]);

  const undo = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice("Termina el arrastre o la transformación actual antes de deshacer");
      return;
    }
    const modifierCancelled = invalidateCadModifierSession();
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex <= 0) {
      setNotice(modifierCancelled ? "Modificador de bordes cancelado" : "No hay nada que deshacer");
      return;
    }
    const nextIndex = currentIndex - 1;
    const entry = currentHistory[nextIndex];
    const nextShapes = (entry?.shapes ?? []).map(canonicalizeShape);
    const nextSelection = (entry?.selectedIds ?? []).filter((id) => nextShapes.some((shape) => shape.id === id));
    const nextCap = entry?.cap !== undefined ? (entry.cap ?? emptyCapDocument()) : capDocumentRef.current;
    historyIndexRef.current = nextIndex;
    shapesRef.current = nextShapes;
    selectedIdsRef.current = nextSelection;
    capDocumentRef.current = nextCap;
    setHistoryIndex(nextIndex);
    setShapes(nextShapes);
    setSelectedIds(nextSelection);
    setCapDocument(nextCap);
    syncProjectShapes(nextShapes);
    setNotice(modifierCancelled ? "Modificador de bordes cancelado · Deshacer" : "Deshacer");
  }, [invalidateCadModifierSession, syncProjectShapes]);

  const redo = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice("Termina el arrastre o la transformación actual antes de rehacer");
      return;
    }
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex >= currentHistory.length - 1) {
      setNotice("No hay nada que rehacer");
      return;
    }
    const modifierCancelled = invalidateCadModifierSession();
    const nextIndex = currentIndex + 1;
    const entry = currentHistory[nextIndex];
    const nextShapes = (entry?.shapes ?? []).map(canonicalizeShape);
    const nextSelection = (entry?.selectedIds ?? []).filter((id) => nextShapes.some((shape) => shape.id === id));
    const nextCap = entry?.cap !== undefined ? (entry.cap ?? emptyCapDocument()) : capDocumentRef.current;
    historyIndexRef.current = nextIndex;
    shapesRef.current = nextShapes;
    selectedIdsRef.current = nextSelection;
    capDocumentRef.current = nextCap;
    setHistoryIndex(nextIndex);
    setShapes(nextShapes);
    setSelectedIds(nextSelection);
    setCapDocument(nextCap);
    syncProjectShapes(nextShapes);
    setNotice(modifierCancelled ? "Modificador de bordes cancelado · Rehacer" : "Rehacer");
  }, [invalidateCadModifierSession, syncProjectShapes]);

  const toggleAlignMode = useCallback(() => {
    const topologyActive = topologyMode !== "shape" && topologySelection.length > 0;
    if (!topologyActive && selectedShapes.length < 2) {
      setNotice("Selecciona al menos dos formas para alinear");
      return;
    }
    setAlignMode((active) => {
      const next = !active;
      setAlignPreview(null);
      setTopologyAlignPreview(null);
      if (next) {
        setMirrorMode(false);
        setMirrorPreviewAxis(null);
        setTopologyMirrorPreviewAxis(null);
      }
      setNotice(next ? "Alinear: elige un punto de los nueve" : "Alineación cancelada");
      return next;
    });
  }, [selectedShapes.length, topologyMode, topologySelection.length]);

  const chooseAlignAnchor = useCallback(
    (id: string) => {
      if (!selectedIds.includes(id)) {
        return;
      }
      const shape = shapes.find((entry) => entry.id === id);
      const lockedAnchor = selectedShapes.find((entry) => entry.locked);
      if (lockedAnchor && lockedAnchor.id !== id) {
        setNotice(`Ancla de alineación: ${lockedAnchor.name} (bloqueada)`);
        return;
      }
      setAlignAnchorId(id);
      setAlignPreview(null);
      setNotice(shape ? `Ancla de alineación: ${shape.name}` : "Ancla de alineación establecida");
    },
    [selectedIds, selectedShapes, shapes],
  );

  const alignSelectionTo = useCallback(
    (axis: AlignAxis, target: AlignTarget) => {
      if (selectedShapes.length < 2) {
        setNotice("Selecciona al menos dos formas para alinear");
        return;
      }

      const { nextShapes, moved } = alignedShapesForSelection(shapes, selectedIds, selectedShapes, effectiveAlignAnchorId, axis, target);
      setAlignPreview(null);

      if (moved === 0) {
        setNotice("Ya está alineado");
        return;
      }

      commitShapes(nextShapes, selectedIds, `Se alineó ${moved} forma${moved === 1 ? "" : "s"} ${alignmentLabel(axis, target)}`);
    },
    [commitShapes, effectiveAlignAnchorId, selectedIds, selectedShapes, shapes],
  );

  const previewAlignSelection = useCallback((axis: AlignAxis, target: AlignTarget) => {
    setAlignPreview({ axis, target });
  }, []);

  const clearAlignPreview = useCallback(() => {
    setAlignPreview(null);
  }, []);

  const toggleMirrorMode = useCallback(() => {
    const topologyActive = topologyMode !== "shape" && topologySelection.length > 0;
    if (!topologyActive && !hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    setMirrorMode((active) => {
      const next = !active;
      setMirrorPreviewAxis(null);
      setTopologyMirrorPreviewAxis(null);
      if (next) {
        setAlignMode(false);
        setAlignAnchorId(null);
        setAlignPreview(null);
        setTopologyAlignPreview(null);
      }
      setNotice(next ? "Reflejar: elige una flecha de eje" : "Reflejo cancelado");
      return next;
    });
  }, [hasSelection, topologyMode, topologySelection.length]);

  const mirrorSelectionAcross = useCallback(
    (axis: AlignAxis) => {
      if (!hasSelection) {
        setNotice("Selecciona una forma primero");
        return;
      }
      const { nextShapes, moved } = mirroredShapesForSelection(shapes, selectedIds, selectedShapes, axis);
      setMirrorPreviewAxis(null);
      if (moved === 0) {
        setNotice("No hay nada que reflejar");
        return;
      }
      commitShapes(nextShapes, selectedIds, `Se reflejó ${moved} forma${moved === 1 ? "" : "s"} ${mirrorAxisLabel(axis)}`);
    },
    [commitShapes, hasSelection, selectedIds, selectedShapes, shapes],
  );

  const previewMirrorSelection = useCallback((axis: AlignAxis) => {
    setMirrorPreviewAxis(axis);
  }, []);

  const clearMirrorPreview = useCallback(() => {
    setMirrorPreviewAxis(null);
  }, []);

  const postCadModifierRequest = useCallback((request: CadModifierWorkerPayload, transfer: Transferable[] = []) => {
    const worker = cadModifierWorkerRef.current ?? cadModifierWorkerRestartRef.current();
    if (!worker) return null;
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    try {
      worker.postMessage({ ...request, requestId } as CadModifierWorkerRequest, transfer);
    } catch {
      worker.terminate();
      if (cadModifierWorkerRef.current === worker) cadModifierWorkerRef.current = null;
      return null;
    }
    return requestId;
  }, []);

  const postCadModifierRequestAsync = useCallback((request: CadModifierWorkerPayload, transfer: Transferable[] = [], timeoutMs = 20000) => {
    const worker = cadModifierWorkerRef.current ?? cadModifierWorkerRestartRef.current();
    if (!worker) {
      return Promise.reject(new Error("The CAD worker is not ready"));
    }
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    console.log(`[TopoEdit] post: reqId=${requestId} type=${(request as { type: string }).type}`);
    return new Promise<CadModifierWorkerResponse>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!cadModifierPendingRef.current.has(requestId)) return;
        const pendingRequests = [...cadModifierPendingRef.current.values()];
        cadModifierPendingRef.current.clear();
        pendingRequests.forEach((pending) => window.clearTimeout(pending.timer));
        cadModifierWorkerRef.current?.terminate();
        cadModifierWorkerRef.current = null;
        const invalidationId = cadModifierRequestRef.current + 1;
        cadModifierRequestRef.current = invalidationId;
        cadModifierLatestPreviewRef.current = invalidationId;
        cadModifierPrepareRef.current = invalidationId;
        cadModifierBaseShapeRef.current = null;
        cadModifierBaseFingerprintRef.current = "";
        cadModifierSourcePartsRef.current = [];
        setEdgeModifier(null);
        cadModifierWorkerRestartRef.current();
        pendingRequests.forEach((pending) => pending.reject(new Error("Timed out waiting for the CAD worker; the worker was restarted")));
      }, timeoutMs);
      cadModifierPendingRef.current.set(requestId, { resolve, reject, timer });
      try {
        worker.postMessage({ ...request, requestId } as CadModifierWorkerRequest, transfer);
      } catch (error) {
        window.clearTimeout(timer);
        cadModifierPendingRef.current.delete(requestId);
        reject(error instanceof Error ? error : new Error("The CAD worker rejected the request"));
      }
    });
  }, []);

  const collectShapeTopology = useCallback(async (shape: WorkplaneShape) => {
    if (shape.locked || shape.hole || edgeModifierRef.current) {
      setShapeTopology(null);
      return;
    }
    const sourceParts = shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
    const parts: CadModifierMeshPart[] = sourceParts.map((part) => {
      const partitionEdges = (part.constructionEdges ?? []).filter((edge) => edge.partition).map((edge) => ({
        id: edge.id,
        start: topologyShapeLocalPointToWorld(part, edge.start),
        end: topologyShapeLocalPointToWorld(part, edge.end),
      }));
      const common = { hole: Boolean(part.hole), preservePartitions: Boolean(part.cadPartitioned || partitionEdges.length), partitionEdges };
      if (part.cadBrep && part.cadBrepFrame) {
        return { ...common, brep: part.cadBrep, brepTransform: cadBrepTransformForShape(part) };
      }
      const primitive = cadModifierPrimitiveForShape(part);
      if (primitive) return { ...common, primitive };
      return { ...common, ...meshDataToCadTransfer(meshForShape(part)) };
    });
    if (parts.length === 0) {
      setShapeTopology(null);
      return;
    }
    try {
      const response = await postCadModifierRequestAsync(
        { type: "collectTopology", parts },
        parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []),
        30000,
      );
      if (response.type === "topology") {
        const previousMode = shapeTopologyModeRef.current;
        shapeTopologyModeRef.current = response.mode;
        if (response.mode === "mesh" && previousMode !== "mesh") {
          setNotice("Topología en modo malla: aproximada");
        }
        setShapeTopology({ shapeId: shape.id, signature: shapeTopologySignature(shape), mode: response.mode, faces: response.faces, vertices: response.vertices, edges: response.edges });
      } else {
        setShapeTopology(null);
      }
    } catch {
      setShapeTopology(null);
    }
  }, [postCadModifierRequestAsync]);

  useEffect(() => {
    if (!selectedTopologyShape) {
      setShapeTopology(null);
      return;
    }
    const signature = shapeTopologySignature(selectedTopologyShape);
    if (shapeTopology?.shapeId === selectedTopologyShape.id && shapeTopology.signature === signature) return;
    void collectShapeTopology(selectedTopologyShape);
  }, [collectShapeTopology, selectedTopologyShape, shapeTopology?.shapeId, shapeTopology?.signature]);
  useEffect(() => {
    if (!selectedTopologyShape || topologyMode === "shape") {
      setTopologyEditPreview(null);
    }
  }, [selectedTopologyShape, topologyMode]);
  const handleTopologyPick = useCallback((target: CadTopologyPick | null, additive?: boolean) => {
    const nudge = topologyNudgeRef.current;
    if (nudge) {
      window.clearTimeout(nudge.timer);
      topologyNudgeRef.current = null;
    }
    if (!target) {
      // A plain (non-additive) click on empty space clears the selection; a
      // Shift+click on empty space starts/continues a marquee instead.
      if (!additive) {
        setTopologySelection([]);
      }
      return;
    }
    setTopologySelection((current) => {
      if (additive) {
        const exists = current.some((pick) => pick.kind === target.kind && pick.id === target.id);
        const next = exists
          ? current.filter((pick) => !(pick.kind === target.kind && pick.id === target.id))
          : [...current, target];
        setNotice(next.length ? `${next.length} ente${next.length === 1 ? "" : "s"} de topología seleccionado${next.length === 1 ? "" : "s"}` : "Selección de topología borrada");
        return next;
      }
      const exists = current.some((pick) => pick.kind === target.kind && pick.id === target.id);
      if (exists) {
        // Keep the multi-selection so dragging the already-selected entity
        // moves the whole selection.
        setNotice(`${current.length} ente${current.length === 1 ? "" : "s"} de topología seleccionado${current.length === 1 ? "" : "s"}`);
        return current;
      }
      setNotice("Ente de topología seleccionado");
      return [target];
    });
  }, []);
  const handleTopologyPickMany = useCallback((targets: CadTopologyPick[], additive?: boolean) => {
    const nudge = topologyNudgeRef.current;
    if (nudge) {
      window.clearTimeout(nudge.timer);
      topologyNudgeRef.current = null;
    }
    setTopologySelection((current) => {
      if (!additive) {
        setNotice(targets.length ? `${targets.length} ente${targets.length === 1 ? "" : "s"} de topología seleccionado${targets.length === 1 ? "" : "s"}` : "Selección de topología borrada");
        return targets;
      }
      const existing = new Set(current.map((pick) => `${pick.kind}:${pick.id}`));
      const merged = [...current];
      for (const pick of targets) {
        const key = `${pick.kind}:${pick.id}`;
        if (!existing.has(key)) {
          merged.push(pick);
          existing.add(key);
        }
      }
      setNotice(`${merged.length} ente${merged.length === 1 ? "" : "s"} de topología seleccionado${merged.length === 1 ? "" : "s"}`);
      return merged;
    });
  }, []);
  const handleTopologyModeChange = useCallback((mode: "shape" | "face" | "vertex" | "edge") => {
    if (mode !== "shape" && (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole)) {
      setNotice("Selecciona una sola pieza desbloqueada para elegir caras, líneas o vértices");
      return;
    }
    setTopologyMode(mode);
    setTopologySelection([]);
    setTopologyAlignPreview(null);
    setTopologyMirrorPreviewAxis(null);
    const nudge = topologyNudgeRef.current;
    if (nudge) {
      window.clearTimeout(nudge.timer);
      topologyNudgeRef.current = null;
    }
    if (mode === "vertex") {
      setNotice("Vértice: arrastra un vértice para moverlo; clic en una arista inserta un vértice");
    } else if (mode === "face") {
      setNotice("Cara: arrastra para empujar/estirar; Alt+arrastra para deslizar la cara en su plano");
    } else if (mode === "edge") {
      setNotice("Líneas: arrastra una arista para moverla y estirar las caras adyacentes");
    } else {
      setNotice("Cuerpo seleccionado");
    }
  }, [selectedShape, selectedShapes.length]);
  const canTopologyPick = Boolean(selectedTopologyShape && !selectedTopologyShape.locked && !selectedTopologyShape.hole);
  const facePlaneDraft = useMemo<WorkplanePlane | null>(() => {
    if (!primaryTopologyPick || primaryTopologyPick.kind !== "face") return null;
    const face = shapeTopology?.faces.find((entry) => entry.id === primaryTopologyPick.id);
    if (!face || !selectedTopologyShape) return null;
    const normal: [number, number, number] = [face.normal.x, face.normal.y, face.normal.z];
    return {
      kind: "face",
      shapeId: selectedTopologyShape.id,
      topologyId: String(face.id),
      center: [face.center.x, face.center.y, face.center.z],
      normal,
      up: facePlaneUpFromNormal(normal),
    };
  }, [selectedTopologyShape, shapeTopology?.faces, primaryTopologyPick]);
  const pushPullTarget = useMemo(() => {
    if (topologyMode !== "face" || !primaryTopologyPick || primaryTopologyPick.kind !== "face") return null;
    const face = shapeTopology?.faces.find((entry) => entry.id === primaryTopologyPick.id);
    if (!face || !selectedTopologyShape || selectedTopologyShape.locked || selectedTopologyShape.hole) return null;
    return {
      shapeId: selectedTopologyShape.id,
      faceId: face.id,
      center: { x: face.center.x, y: face.center.y, z: face.center.z },
      normal: { x: face.normal.x, y: face.normal.y, z: face.normal.z },
    };
  }, [selectedTopologyShape, shapeTopology?.faces, topologyMode, primaryTopologyPick]);
  const canPushPull = Boolean(pushPullTarget);

  const applyPushPullFace = useCallback(async (distance: number) => {
    const shape = selectedShapes[0];
    if (!pushPullTarget || !shape || shape.id !== pushPullTarget.shapeId) {
      setNotice("Selecciona la cara que quieres empujar o estirar");
      return;
    }
    const magnitude = Math.abs(distance);
    if (magnitude < 0.01) {
      setNotice("Arrastra la cara más de 0.01 mm para empujarla o estirarla");
      return;
    }
    const sourceParts = shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
    const parts: CadModifierMeshPart[] = sourceParts.map((part) => ({ ...meshDataToCadTransfer(meshForShape(part)), hole: Boolean(part.hole) }));
    try {
      const response = await postCadModifierRequestAsync(
        { type: "extrudeFace", parts, faceCenter: pushPullTarget.center, distance },
        parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []),
        30000,
      );
      if (response.type !== "preview") {
        throw new Error("El empujado/estirado no devolvió un sólido");
      }
      const preview = shapeFromCadMesh(shape, response.positions, response.normals, response.indices, response.brep);
      if (!preview) {
        throw new Error("El sólido resultante no se pudo construir");
      }
      const combined = canonicalizeShape({
        ...preview,
        cadDisplayEdges: cadDisplayEdgesForShape(preview, response.displayEdges),
        cadDisplayEdgesVersion: 2 as const,
      });
      commitShapes(
        shapesRef.current.map((candidate) => candidate.id === shape.id ? combined : candidate),
        combined.id,
        distance > 0
          ? `Cara estirada ${magnitude.toFixed(1)} mm`
          : `Cara empujada ${magnitude.toFixed(1)} mm`,
      );
      setTopologySelection([]);
      setTopologyMode("shape");
      setPushPullDistance("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo empujar o estirar la cara");
    }
  }, [commitShapes, postCadModifierRequestAsync, pushPullTarget, selectedShapes]);

  const handlePushPullApply = useCallback(() => {
    const distance = Number.parseFloat(pushPullDistance);
    if (!Number.isFinite(distance)) {
      setNotice("Escribe una distancia en mm (negativa para empujar, positiva para estirar)");
      return;
    }
    void applyPushPullFace(distance);
  }, [applyPushPullFace, pushPullDistance]);

  const topologyEditPartsForShape = useCallback((shape: WorkplaneShape): CadModifierMeshPart[] => {
    const sourceParts = shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
    return sourceParts.map((part) => {
      const partitionEdges = (part.constructionEdges ?? []).filter((edge) => edge.partition).map((edge) => ({
        id: edge.id,
        start: topologyShapeLocalPointToWorld(part, edge.start),
        end: topologyShapeLocalPointToWorld(part, edge.end),
      }));
      const common = {
        hole: Boolean(part.hole),
        preservePartitions: Boolean(part.cadPartitioned || partitionEdges.length),
        partitionEdges,
      };
      if (part.cadBrep && part.cadBrepFrame) {
        return { ...common, brep: part.cadBrep, brepTransform: cadBrepTransformForShape(part) };
      }
      const primitive = cadModifierPrimitiveForShape(part);
      if (primitive) return { ...common, primitive };
      return { ...common, ...meshDataToCadTransfer(meshForShape(part)) };
    });
  }, []);

  const applyTopologyEditResult = useCallback(async (
    response: Extract<CadModifierWorkerResponse, { type: "preview" }>,
    shape: WorkplaneShape,
    label: string,
  ) => {
    const preview = shapeFromCadMesh(shape, response.positions, response.normals, response.indices, response.brep);
    if (!preview) throw new Error("El sólido resultante no se pudo construir");
    const guideEdges = (shape.constructionEdges ?? []).filter((edge) => !edge.partition);
    const partitionEdges = response.partitionEdges?.map((partition) => ({
      id: partition.id,
      partition: true as const,
      start: topologyWorldPointToShapeLocal(preview, partition.start),
      end: topologyWorldPointToShapeLocal(preview, partition.end),
    }));
    const combined = canonicalizeShape({
      ...preview,
      constructionEdges: partitionEdges ? [...guideEdges, ...partitionEdges] : preview.constructionEdges,
      cadPartitioned: partitionEdges ? partitionEdges.length > 0 : preview.cadPartitioned,
      cadDisplayEdges: cadDisplayEdgesForShape(preview, response.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    commitShapes(
      shapesRef.current.map((candidate) => candidate.id === shape.id ? combined : candidate),
      combined.id,
      label,
    );
    console.log(`[TopoEdit] COMMIT "${label}": pieza="${shape.name}" id=${shape.id} -> ${response.triangleCount} tris, brep=${(response.brep.length / 1024).toFixed(1)}KB`);
    // A nudge/transform commit re-resolves the selection once the fresh
    // topology arrives; any other edit clears the selection so the user has to
    // pick the entity again.
    if (!topologyReselectRef.current) {
      setTopologySelection([]);
    }
  }, [commitShapes]);

  const dispatchTopologyEdit = useCallback(async (
    request: CadModifierWorkerPayload,
    transfer: Transferable[],
    commit: boolean,
    label: string,
    session: number,
    shape?: WorkplaneShape,
  ) => {
    topologyEditInFlightRef.current = true;
    try {
      const response = await postCadModifierRequestAsync(request, transfer, 30000);
      if (session !== topologyEditSessionRef.current) {
        console.log(`[TopoEdit] dispatch: type=${request.type} session=${session} -> DESCARTADO (sesion ahora ${topologyEditSessionRef.current})`);
        return;
      }
      if (response.type !== "preview") {
        throw new Error("La edición de topología no devolvió un sólido");
      }
      if (commit) {
        if (!shape) throw new Error("Selecciona una pieza para editarla");
        await applyTopologyEditResult(response, shape, label);
        topologyEditSessionRef.current += 1;
        setTopologyEditPreview(null);
      } else {
        console.log(`[TopoEdit] dispatch: type=${request.type} session=${session} preview tris=${response.triangleCount}`);
        setTopologyEditPreview({
          positions: response.positions,
          normals: response.normals,
          indices: response.indices,
        });
      }
    } catch (error) {
      console.error(`[TopoEdit] dispatch error: type=${request.type} session=${session} commit=${commit}:`, error instanceof Error ? error.message : error);
      if (commit) {
        topologyReselectRef.current = null;
        setNotice(error instanceof Error ? error.message : "No se pudo editar la topología");
      }
    } finally {
      topologyEditInFlightRef.current = false;
      const pending = topologyEditPendingRef.current;
      topologyEditPendingRef.current = null;
      if (pending && pending.session === topologyEditSessionRef.current) {
        void dispatchTopologyEdit(pending.request, pending.transfer, pending.commit, pending.label, pending.session, pending.shape);
      }
    }
  }, [applyTopologyEditResult, postCadModifierRequestAsync]);

  const sendTopologyEdit = useCallback((
    request: CadModifierWorkerPayload,
    transfer: Transferable[] = [],
    commit = false,
    label = "",
    shape?: WorkplaneShape,
  ) => {
    const session = topologyEditSessionRef.current;
    if (topologyEditInFlightRef.current) {
      console.log(`[TopoEdit] send: type=${request.type} session=${session} commit=${commit} -> ENCOLADO (inFlight)`);
      topologyEditPendingRef.current = { request, transfer, commit, label, session, shape };
      return;
    }
    console.log(`[TopoEdit] send: type=${request.type} session=${session} commit=${commit} pieza="${shape?.name ?? "?"}"`);
    void dispatchTopologyEdit(request, transfer, commit, label, session, shape);
  }, [dispatchTopologyEdit]);

  /**
   * Sends a single topology edit request that displaces the whole current
   * selection by `delta` (vertices/edges → `moveTopologyVertices`, faces →
   * `moveTopologyFaces`). On commit it stores reselect anchors for every moved
   * entity so the selection survives the topology re-collection.
   */
  const topologyDeltaRequest = useCallback((
    shape: WorkplaneShape,
    delta: { x: number; y: number; z: number },
    commit: boolean,
    label: string,
  ) => {
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const customResult = commit
      ? transformSelectedConstructionVertices(shape, topologySelectionRef.current, (point) => ({ x: point.x + delta.x, y: point.y + delta.y, z: point.z + delta.z }))
      : { shape, moved: 0 };
    if (customResult.moved > 0) updateShape(shape.id, {
      constructionVertices: customResult.shape.constructionVertices,
      constructionEdges: customResult.shape.constructionEdges,
    });
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
    const selection = topologySelectionRef.current;
    const updates: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }> = [];
    const faces: Array<{ center: { x: number; y: number; z: number }; offset: { x: number; y: number; z: number } }> = [];
    for (const pick of selection) {
      if (pick.kind === "vertex") {
        const vertex = topology.vertices.find((entry) => entry.id === pick.id);
        if (!vertex) continue;
        const from = { x: vertex.x, y: vertex.y, z: vertex.z };
        updates.push({ from, to: { x: from.x + delta.x, y: from.y + delta.y, z: from.z + delta.z } });
      } else if (pick.kind === "edge") {
        const edge = topology.edges.find((entry) => entry.id === pick.id);
        if (!edge) continue;
        for (const endpoint of edge.endpoints) {
          const from = { x: endpoint.x, y: endpoint.y, z: endpoint.z };
          updates.push({ from, to: { x: from.x + delta.x, y: from.y + delta.y, z: from.z + delta.z } });
        }
      } else {
        const face = topology.faces.find((entry) => entry.id === pick.id);
        if (!face) continue;
        faces.push({ center: { x: face.center.x, y: face.center.y, z: face.center.z }, offset: { x: delta.x, y: delta.y, z: delta.z } });
      }
    }
    if (updates.length === 0 && faces.length === 0) {
      if (customResult.moved > 0) {
        setNotice(label);
        console.log("[TopoInspector] construction transform", { label, moved: customResult.moved, delta });
      }
      return;
    }
    if (commit) {
      const anchors = topologyReselectAnchors(topology, selection, delta);
      topologyReselectRef.current = anchors.length > 0 ? anchors : null;
    }
    if (updates.length > 0) {
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer, commit, label, customResult.shape);
    }
    if (faces.length > 0) {
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces }, transfer, commit, label, customResult.shape);
    }
  }, [sendTopologyEdit, shapeTopology, topologyEditPartsForShape, updateShape]);

  const applyTopologyInspectorTransform = useCallback((
    transform: (point: { x: number; y: number; z: number }, center: { x: number; y: number; z: number }) => { x: number; y: number; z: number },
    label: string,
    commit = true,
  ) => {
    const shape = selectedShapes[0];
    const topology = shapeTopology;
    const selection = topologySelectionRef.current;
    if (!shape || !topology || topology.shapeId !== shape.id || selection.length === 0) return;
    const effectiveTopology = topologyWithConstructionVertices(shape, topology);
    const points = topologySelectionControlPoints(effectiveTopology, selection);
    if (points.length === 0) return;
    const center = topologyPointsCenter(points);
    const constructionIds = new Set((shape.constructionVertices ?? []).map((vertex) => vertex.topologyId));
    const constructionEdgeIds = new Set((shape.constructionEdges ?? []).map(constructionEdgeTopologyId));
    const nativeSelection = selection.filter((pick) =>
      (pick.kind !== "vertex" || !constructionIds.has(pick.id))
      && (pick.kind !== "edge" || !constructionEdgeIds.has(pick.id)));
    const nativePoints = topologySelectionControlPoints(topology, nativeSelection);
    const updates = nativePoints.map((from) => ({ from, to: transform(from, center) }));
    const customResult = commit
      ? transformSelectedConstructionVertices(shape, selection, (point) => transform(point, center))
      : { shape, moved: 0 };
    if (customResult.moved > 0) updateShape(shape.id, {
      constructionVertices: customResult.shape.constructionVertices,
      constructionEdges: customResult.shape.constructionEdges,
    });
    if (updates.length === 0) {
      if (customResult.moved > 0) {
        setNotice(label);
        console.log("[TopoInspector] construction transform", { label, moved: customResult.moved, center });
      }
      return;
    }
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    if (commit) {
      const reps = topologySelectionReps(topology, nativeSelection);
      topologyReselectRef.current = reps?.map((point, index) => ({ kind: nativeSelection[index].kind, anchor: transform(point, center) })) ?? null;
    }
    console.log(`[TopoInspector] ${commit ? "commit" : "preview"} transform`, { mode: topologyMode, label, selected: selection.length, controlPoints: points.length, center, updates });
    sendTopologyEdit(
      { type: "moveTopologyVertices", parts, updates },
      parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []),
      commit,
      label,
      customResult.shape,
    );
  }, [selectedShapes, sendTopologyEdit, shapeTopology, topologyEditPartsForShape, topologyMode, updateShape]);

  const moveTopologyFromInspector = useCallback((delta: { x: number; y: number; z: number }) => {
    const shape = selectedShapes[0];
    if (!shape || Math.hypot(delta.x, delta.y, delta.z) < 1e-9) return;
    console.log("[TopoInspector] move", { mode: topologyMode, selected: topologySelectionRef.current.length, delta });
    topologyDeltaRequest(shape, delta, true, `${topologyMode === "vertex" ? "Vértices" : topologyMode === "edge" ? "Líneas" : "Caras"} desplazados`);
  }, [selectedShapes, topologyDeltaRequest, topologyMode]);

  const alignTopologyFromInspector = useCallback((axis: AlignAxis) => {
    applyTopologyInspectorTransform((point, center) => ({ ...point, [axis]: center[axis] }), `Selección alineada en ${axis.toUpperCase()}`);
  }, [applyTopologyInspectorTransform]);

  const scaleTopologyFromInspector = useCallback((factor: number, commit = true) => {
    applyTopologyInspectorTransform((point, center) => ({
      x: center.x + (point.x - center.x) * factor,
      y: center.y + (point.y - center.y) * factor,
      z: center.z + (point.z - center.z) * factor,
    }), `Selección escalada ${factor.toFixed(2)}×`, commit);
  }, [applyTopologyInspectorTransform]);

  const collapseTopologyVertices = useCallback(() => {
    applyTopologyInspectorTransform((_point, center) => ({ ...center }), "Vértices movidos al centro");
  }, [applyTopologyInspectorTransform]);

  const createTopologyApex = useCallback((height: number, commit = true) => {
    applyTopologyInspectorTransform((_point, center) => ({ x: center.x, y: center.y + height, z: center.z }), `Punta creada (${height.toFixed(1)} mm)`, commit);
  }, [applyTopologyInspectorTransform]);

  const moveFacesAlongNormal = useCallback((distance: number, commit = true) => {
    const selection = topologySelectionRef.current.filter((pick) => pick.kind === "face");
    const shape = selectedShapes[0];
    const topology = shapeTopology;
    if (!shape || !topology || selection.length === 0) return;
    const parts = topologyEditPartsForShape(shape);
    if (!parts.length) return;
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
    if (selection.length === 1) {
      const face = topology.faces.find((entry) => entry.id === selection[0].id);
      if (!face) return;
      if (commit) {
        topologyReselectRef.current = [{ kind: "face", anchor: {
          x: face.center.x + face.normal.x * distance,
          y: face.center.y + face.normal.y * distance,
          z: face.center.z + face.normal.z * distance,
        } }];
      }
      console.log(`[TopoInspector] ${commit ? "commit" : "preview"} face-extrude`, { distance, face: face.id });
      sendTopologyEdit(
        { type: "extrudeFace", parts, faceCenter: { ...face.center }, distance },
        transfer,
        commit,
        `Cara extruida ${distance.toFixed(1)} mm`,
        shape,
      );
      return;
    }
    const faces = selection.flatMap((pick) => {
      const face = topology.faces.find((entry) => entry.id === pick.id);
      return face ? [{ center: { ...face.center }, offset: { x: face.normal.x * distance, y: face.normal.y * distance, z: face.normal.z * distance } }] : [];
    });
    if (!faces.length) return;
    if (commit) {
      topologyReselectRef.current = selection.map((pick) => {
        const face = topology.faces.find((entry) => entry.id === pick.id)!;
        return { kind: "face" as const, anchor: { x: face.center.x + face.normal.x * distance, y: face.center.y + face.normal.y * distance, z: face.center.z + face.normal.z * distance } };
      });
    }
    console.log(`[TopoInspector] ${commit ? "commit" : "preview"} face-normal`, { selected: faces.length, distance, faces });
    sendTopologyEdit(
      { type: "moveTopologyFaces", parts, faces },
      transfer,
      commit,
      `Caras desplazadas ${distance.toFixed(1)} mm por normal`,
      shape,
    );
  }, [selectedShapes, sendTopologyEdit, shapeTopology, topologyEditPartsForShape]);

  const cancelTopologyInspectorPreview = useCallback(() => {
    topologyEditSessionRef.current += 1;
    topologyEditPendingRef.current = null;
    setTopologyEditPreview(null);
    setTopologyInspectorPreviewActive(false);
    console.log("[TopoInspector] preview cancelado");
  }, []);

  const previewTopologyScale = useCallback((factor: number) => {
    setTopologyInspectorPreviewActive(true);
    scaleTopologyFromInspector(factor, false);
  }, [scaleTopologyFromInspector]);

  const commitTopologyScale = useCallback((factor: number) => {
    scaleTopologyFromInspector(factor, true);
    setTopologyInspectorPreviewActive(false);
  }, [scaleTopologyFromInspector]);

  const rotateTopologyFromInspector = useCallback((axis: AlignAxis, degrees: number, commit: boolean) => {
    const radians = degrees * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    applyTopologyInspectorTransform((point, center) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const dz = point.z - center.z;
      if (axis === "x") return { x: point.x, y: center.y + dy * cosine - dz * sine, z: center.z + dy * sine + dz * cosine };
      if (axis === "y") return { x: center.x + dx * cosine + dz * sine, y: point.y, z: center.z - dx * sine + dz * cosine };
      return { x: center.x + dx * cosine - dy * sine, y: center.y + dx * sine + dy * cosine, z: point.z };
    }, `Selección rotada ${degrees.toFixed(1)}° en ${axis.toUpperCase()}`, commit);
  }, [applyTopologyInspectorTransform]);

  const previewTopologyRotation = useCallback((axis: AlignAxis, degrees: number) => {
    setTopologyInspectorPreviewActive(true);
    rotateTopologyFromInspector(axis, degrees, false);
  }, [rotateTopologyFromInspector]);

  const commitTopologyRotation = useCallback((axis: AlignAxis, degrees: number) => {
    rotateTopologyFromInspector(axis, degrees, true);
    setTopologyInspectorPreviewActive(false);
  }, [rotateTopologyFromInspector]);

  const previewTopologyApex = useCallback((height: number) => {
    setTopologyInspectorPreviewActive(true);
    createTopologyApex(height, false);
  }, [createTopologyApex]);

  const commitTopologyApex = useCallback((height: number) => {
    createTopologyApex(height, true);
    setTopologyInspectorPreviewActive(false);
  }, [createTopologyApex]);

  const previewFaceNormal = useCallback((distance: number) => {
    setTopologyInspectorPreviewActive(true);
    moveFacesAlongNormal(distance, false);
  }, [moveFacesAlongNormal]);

  const commitFaceNormal = useCallback((distance: number) => {
    moveFacesAlongNormal(distance, true);
    setTopologyInspectorPreviewActive(false);
  }, [moveFacesAlongNormal]);

  const handleTopologyVertexMoveLive = useCallback((from: { x: number; y: number; z: number }, position: { x: number; y: number; z: number }) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const constructionVertex = (constructionVertexDragIdRef.current
      ? shape.constructionVertices?.find((vertex) => vertex.id === constructionVertexDragIdRef.current)
      : null) ?? constructionVertexNearWorld(shape, from);
    if (constructionVertex) {
      constructionVertexDragIdRef.current = constructionVertex.id;
      const selectedCustomCount = topologySelectionRef.current.filter((pick) => pick.kind === "vertex" && shape.constructionVertices?.some((vertex) => vertex.topologyId === pick.id)).length;
      if (selectedCustomCount > 1) return;
      const local = topologyWorldPointToShapeLocal(shape, position);
      updateShape(shape.id, {
        constructionVertices: (shape.constructionVertices ?? []).map((vertex) => vertex.id === constructionVertex.id ? { ...vertex, position: local } : vertex),
        constructionEdges: shape.constructionEdges?.map((edge) => ({
          ...edge,
          start: edge.startVertexId === constructionVertex.id ? local : edge.start,
          end: edge.endVertexId === constructionVertex.id ? local : edge.end,
        })),
      });
      return;
    }
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const selection = topologySelectionRef.current;
    const draggedInSelection = selection.some((pick) => {
      if (pick.kind !== "vertex") return false;
      const vertex = topology.vertices.find((entry) => entry.id === pick.id);
      return vertex ? Math.hypot(vertex.x - from.x, vertex.y - from.y, vertex.z - from.z) < 0.1 : false;
    });
    if (draggedInSelection && selection.length > 1) {
      topologyDeltaRequest(shape, { x: position.x - from.x, y: position.y - from.y, z: position.z - from.z }, false, "");
    } else {
      const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates: [{ from, to: position }] }, transfer);
    }
  }, [selectedShapes, selectedTopologyShape, sendTopologyEdit, topologyDeltaRequest, topologyEditPartsForShape, shapeTopology, updateShape]);

  const handleTopologyVertexMoveApply = useCallback((from: { x: number; y: number; z: number }, position: { x: number; y: number; z: number }) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const constructionVertex = (constructionVertexDragIdRef.current
      ? shape.constructionVertices?.find((vertex) => vertex.id === constructionVertexDragIdRef.current)
      : null) ?? constructionVertexNearWorld(shape, from);
    if (constructionVertex) {
      constructionVertexDragIdRef.current = null;
      const selectedCustomCount = topologySelectionRef.current.filter((pick) => pick.kind === "vertex" && shape.constructionVertices?.some((vertex) => vertex.topologyId === pick.id)).length;
      if (selectedCustomCount > 1) {
        const delta = { x: position.x - from.x, y: position.y - from.y, z: position.z - from.z };
        const result = transformSelectedConstructionVertices(shape, topologySelectionRef.current, (point) => ({ x: point.x + delta.x, y: point.y + delta.y, z: point.z + delta.z }));
        updateShape(shape.id, { constructionVertices: result.shape.constructionVertices, constructionEdges: result.shape.constructionEdges });
        console.log("[TopoEdit] constructionVertex: grupo movido", { moved: result.moved, delta });
        setNotice(`${result.moved} vértices personalizados movidos`);
        return;
      }
      const local = topologyWorldPointToShapeLocal(shape, position);
      updateShape(shape.id, {
        constructionVertices: (shape.constructionVertices ?? []).map((vertex) => vertex.id === constructionVertex.id ? { ...vertex, position: local } : vertex),
        constructionEdges: shape.constructionEdges?.map((edge) => ({
          ...edge,
          start: edge.startVertexId === constructionVertex.id ? local : edge.start,
          end: edge.endVertexId === constructionVertex.id ? local : edge.end,
        })),
      });
      setTopologySelection([{ kind: "vertex", id: constructionVertex.topologyId }]);
      console.log("[TopoEdit] constructionVertex: movido", { vertexId: constructionVertex.id, topologyId: constructionVertex.topologyId, world: position, local });
      setNotice("Vértice personalizado movido");
      return;
    }
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const selection = topologySelectionRef.current;
    const draggedInSelection = selection.some((pick) => {
      if (pick.kind !== "vertex") return false;
      const vertex = topology.vertices.find((entry) => entry.id === pick.id);
      return vertex ? Math.hypot(vertex.x - from.x, vertex.y - from.y, vertex.z - from.z) < 0.1 : false;
    });
    if (draggedInSelection && selection.length > 1) {
      topologyDeltaRequest(shape, { x: position.x - from.x, y: position.y - from.y, z: position.z - from.z }, true, "Vértices movidos");
    } else {
      const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
      topologyReselectRef.current = [{ kind: "vertex", anchor: position }];
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates: [{ from, to: position }] }, transfer, true, "Vértice movido", shape);
    }
  }, [selectedShapes, selectedTopologyShape, sendTopologyEdit, topologyDeltaRequest, topologyEditPartsForShape, shapeTopology, updateShape]);

  const handleTopologyFaceMoveLive = useCallback((faceCenter: { x: number; y: number; z: number }, offset: { x: number; y: number; z: number }) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const selection = topologySelectionRef.current;
    const draggedInSelection = selection.some((pick) => {
      if (pick.kind !== "face") return false;
      const face = topology.faces.find((entry) => entry.id === pick.id);
      return face ? Math.hypot(face.center.x - faceCenter.x, face.center.y - faceCenter.y, face.center.z - faceCenter.z) < 0.1 : false;
    });
    if (draggedInSelection && selection.length > 1) {
      topologyDeltaRequest(shape, offset, false, "");
    } else {
      const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces: [{ center: faceCenter, offset }] }, transfer);
    }
  }, [selectedShapes, selectedTopologyShape, sendTopologyEdit, topologyDeltaRequest, topologyEditPartsForShape, shapeTopology]);

  const handleTopologyFaceMoveApply = useCallback((faceCenter: { x: number; y: number; z: number }, offset: { x: number; y: number; z: number }) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const selection = topologySelectionRef.current;
    const draggedInSelection = selection.some((pick) => {
      if (pick.kind !== "face") return false;
      const face = topology.faces.find((entry) => entry.id === pick.id);
      return face ? Math.hypot(face.center.x - faceCenter.x, face.center.y - faceCenter.y, face.center.z - faceCenter.z) < 0.1 : false;
    });
    if (draggedInSelection && selection.length > 1) {
      topologyDeltaRequest(shape, offset, true, "Caras deslizadas");
    } else {
      const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
      topologyReselectRef.current = [{ kind: "face", anchor: { x: faceCenter.x + offset.x, y: faceCenter.y + offset.y, z: faceCenter.z + offset.z } }];
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces: [{ center: faceCenter, offset }] }, transfer, true, "Cara deslizada", shape);
    }
  }, [selectedShapes, selectedTopologyShape, sendTopologyEdit, topologyDeltaRequest, topologyEditPartsForShape, shapeTopology]);

  const handleTopologyAddVertex = useCallback((position: { x: number; y: number; z: number }) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const usedIds = new Set([
      ...(shapeTopology?.vertices.map((vertex) => vertex.id) ?? []),
      ...(shape.constructionVertices?.map((vertex) => vertex.topologyId) ?? []),
    ]);
    let topologyId = -1;
    while (usedIds.has(topologyId)) topologyId -= 1;
    const vertex = {
      id: createLocalId("construction-vertex"),
      topologyId,
      position: topologyWorldPointToShapeLocal(shape, position),
    };
    updateShape(shape.id, { constructionVertices: [...(shape.constructionVertices ?? []), vertex] });
    setTopologySelection([{ kind: "vertex", id: topologyId }]);
    console.log("[TopoEdit] constructionVertex: creado", {
      shapeId: shape.id,
      vertexId: vertex.id,
      topologyId,
      world: position,
      local: vertex.position,
    });
    setNotice("Vértice creado; arrástralo con el mouse o continúa insertando");
  }, [selectedShapes, selectedTopologyShape, shapeTopology?.vertices, updateShape]);

  const insertSelectedEdgeAtRatio = useCallback((ratio: number) => {
    const selection = topologySelectionRef.current;
    if (selection.length !== 1 || selection[0].kind !== "edge") return;
    const shape = selectedShapes[0];
    const edge = [
      ...(shapeTopology?.edges ?? []),
      ...(shape ? constructionTopologyEdges(shape) : []),
    ].find((entry) => entry.id === selection[0].id);
    if (!edge) return;
    const amount = Math.min(0.95, Math.max(0.05, ratio));
    const polyline = edge.points.length >= 6
      ? Array.from({ length: edge.points.length / 3 }, (_, index) => ({ x: edge.points[index * 3], y: edge.points[index * 3 + 1], z: edge.points[index * 3 + 2] }))
      : edge.endpoints;
    const lengths = polyline.slice(1).map((point, index) => Math.hypot(point.x - polyline[index].x, point.y - polyline[index].y, point.z - polyline[index].z));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    if (total < 1e-6) return;
    let remaining = total * amount;
    let position = { ...polyline[0] };
    for (let index = 0; index < lengths.length; index += 1) {
      const segmentLength = lengths[index];
      if (remaining > segmentLength && index < lengths.length - 1) {
        remaining -= segmentLength;
        continue;
      }
      const segmentAmount = Math.min(1, remaining / Math.max(1e-9, segmentLength));
      const start = polyline[index];
      const end = polyline[index + 1];
      position = {
        x: start.x + (end.x - start.x) * segmentAmount,
        y: start.y + (end.y - start.y) * segmentAmount,
        z: start.z + (end.z - start.z) * segmentAmount,
      };
      break;
    }
    console.log("[TopoInspector] insert-edge-ratio", { edgeId: edge.id, ratio: amount, position });
    handleTopologyAddVertex(position);
  }, [handleTopologyAddVertex, selectedShapes, shapeTopology?.edges]);

  const insertSelectedEdgeCenter = useCallback(() => {
    insertSelectedEdgeAtRatio(0.5);
  }, [insertSelectedEdgeAtRatio]);

  const connectSelectedTopologyVertices = useCallback(() => {
    const shape = selectedShapes[0];
    const topology = shapeTopology;
    const selection = topologySelectionRef.current.filter((pick) => pick.kind === "vertex");
    if (!shape || !topology || topology.shapeId !== shape.id || selection.length !== 2) {
      setNotice("Selecciona exactamente dos vértices de la misma pieza");
      return;
    }
    const availableVertices = [...topology.vertices, ...constructionTopologyVertices(shape)];
    const vertices = selection.map((pick) => availableVertices.find((vertex) => vertex.id === pick.id)).filter((vertex): vertex is CadTopologyVertex => Boolean(vertex));
    if (vertices.length !== 2) {
      setNotice("Los vértices seleccionados ya no existen; vuelve a seleccionarlos");
      return;
    }
    const distance = Math.hypot(vertices[1].x - vertices[0].x, vertices[1].y - vertices[0].y, vertices[1].z - vertices[0].z);
    if (distance < 1e-4) {
      setNotice("Los dos vértices ocupan la misma posición");
      return;
    }
    const partitionId = createLocalId("partition-edge");
    const selectedConstructionIds = new Set(selection.map((pick) => pick.id));
    const sourceForCommit: WorkplaneShape = {
      ...shape,
      cadPartitioned: true,
      constructionVertices: (shape.constructionVertices ?? []).filter((vertex) => !selectedConstructionIds.has(vertex.topologyId)),
    };
    const parts = topologyEditPartsForShape(shape);
    topologyReselectRef.current = [{ kind: "edge", anchor: {
      x: (vertices[0].x + vertices[1].x) / 2,
      y: (vertices[0].y + vertices[1].y) / 2,
      z: (vertices[0].z + vertices[1].z) / 2,
    } }];
    setTopologyVertexPlacementActive(false);
    setTopologyMode("edge");
    setTopologySelection([]);
    console.log("[TopoInspector] partition-edge-create", {
      shapeId: shape.id,
      partitionId,
      worldStart: vertices[0],
      worldEnd: vertices[1],
      length: distance,
    });
    setNotice(`Dividiendo físicamente la cara con una línea de ${distance.toFixed(2)} mm…`);
    sendTopologyEdit(
      { type: "splitFaceBySegment", parts, partitionId, start: vertices[0], end: vertices[1] },
      parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []),
      true,
      "Cara dividida por nueva arista",
      sourceForCommit,
    );
  }, [selectedShapes, sendTopologyEdit, shapeTopology, topologyEditPartsForShape]);

  const removeLastConstructionEdge = useCallback(() => {
    const shape = selectedShapes[0];
    const guideEdges = shape?.constructionEdges?.filter((edge) => !edge.partition) ?? [];
    if (!shape || guideEdges.length === 0) return;
    const removed = guideEdges.at(-1);
    updateShape(shape.id, { constructionEdges: shape.constructionEdges?.filter((edge) => edge.partition || edge.id !== removed?.id) });
    console.log("[TopoInspector] construction-edge-remove", { shapeId: shape.id, edgeId: removed?.id });
    setNotice("Última línea guía eliminada");
  }, [selectedShapes, updateShape]);

  const handleTopologyEdgeMoveLive = useCallback((edgeId: number, endpoints: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }>) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const constructionMove = moveConstructionEdgeToWorldEndpoints(shape, edgeId, endpoints);
    if (constructionMove) {
      updateShape(shape.id, {
        constructionEdges: constructionMove.constructionEdges,
        constructionVertices: constructionMove.constructionVertices,
      });
      return;
    }
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const selection = topologySelectionRef.current;
    const firstFrom = endpoints[0]?.from;
    const draggedInSelection = Boolean(firstFrom) && selection.some((pick) => {
      if (pick.kind !== "edge") return false;
      const edge = topology.edges.find((entry) => entry.id === pick.id);
      return edge
        ? Math.hypot(edge.center.x - firstFrom.x, edge.center.y - firstFrom.y, edge.center.z - firstFrom.z) < 0.1
          || edge.endpoints.some((ep) => Math.hypot(ep.x - firstFrom.x, ep.y - firstFrom.y, ep.z - firstFrom.z) < 0.1)
        : false;
    });
    if (draggedInSelection && selection.length > 1) {
      const delta = {
        x: endpoints[0].to.x - endpoints[0].from.x,
        y: endpoints[0].to.y - endpoints[0].from.y,
        z: endpoints[0].to.z - endpoints[0].from.z,
      };
      topologyDeltaRequest(shape, delta, false, "");
    } else {
      const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates: endpoints }, transfer);
    }
  }, [selectedShapes, selectedTopologyShape, sendTopologyEdit, topologyDeltaRequest, topologyEditPartsForShape, shapeTopology, updateShape]);

  const handleTopologyEdgeMoveApply = useCallback((edgeId: number, endpoints: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }>) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id) return;
    const constructionMove = moveConstructionEdgeToWorldEndpoints(shape, edgeId, endpoints);
    if (constructionMove) {
      updateShape(shape.id, {
        constructionEdges: constructionMove.constructionEdges,
        constructionVertices: constructionMove.constructionVertices,
      });
      setTopologySelection([{ kind: "edge", id: edgeId }]);
      console.log("[TopoEdit] constructionEdge: movida", { edgeId: constructionMove.edge.id, topologyId: edgeId, endpoints: endpoints.map((endpoint) => endpoint.to) });
      setNotice("Línea personalizada movida");
      return;
    }
    const topology = shapeTopology;
    if (!topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const selection = topologySelectionRef.current;
    const firstFrom = endpoints[0]?.from;
    const draggedInSelection = Boolean(firstFrom) && selection.some((pick) => {
      if (pick.kind !== "edge") return false;
      const edge = topology.edges.find((entry) => entry.id === pick.id);
      return edge
        ? Math.hypot(edge.center.x - firstFrom.x, edge.center.y - firstFrom.y, edge.center.z - firstFrom.z) < 0.1
          || edge.endpoints.some((ep) => Math.hypot(ep.x - firstFrom.x, ep.y - firstFrom.y, ep.z - firstFrom.z) < 0.1)
        : false;
    });
    if (draggedInSelection && selection.length > 1) {
      const delta = {
        x: endpoints[0].to.x - endpoints[0].from.x,
        y: endpoints[0].to.y - endpoints[0].from.y,
        z: endpoints[0].to.z - endpoints[0].from.z,
      };
      topologyDeltaRequest(shape, delta, true, "Líneas movidas");
    } else {
      const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
      const center = { x: (endpoints[0].from.x + endpoints[1].from.x) / 2, y: (endpoints[0].from.y + endpoints[1].from.y) / 2, z: (endpoints[0].from.z + endpoints[1].from.z) / 2 };
      const delta = {
        x: endpoints[0].to.x - endpoints[0].from.x,
        y: endpoints[0].to.y - endpoints[0].from.y,
        z: endpoints[0].to.z - endpoints[0].from.z,
      };
      topologyReselectRef.current = [{ kind: "edge", anchor: { x: center.x + delta.x, y: center.y + delta.y, z: center.z + delta.z } }];
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates: endpoints }, transfer, true, "Línea movida", shape);
    }
  }, [selectedShapes, selectedTopologyShape, sendTopologyEdit, topologyDeltaRequest, topologyEditPartsForShape, shapeTopology, updateShape]);

  const sendNudgeLive = useCallback((session: NonNullable<typeof topologyNudgeRef.current>, shape: WorkplaneShape) => {
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
    if (session.kind === "vertex" && session.vertices.length > 0) {
      const updates = session.vertices.map((vertex) => {
        const from = { x: vertex.x, y: vertex.y, z: vertex.z };
        return { from, to: { x: from.x + session.deltaX, y: from.y, z: from.z + session.deltaZ } };
      });
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer);
    } else if (session.kind === "edge" && session.edges.length > 0) {
      const updates = session.edges.flatMap((edge) => edge.endpoints.map((ep) => ({
        from: { x: ep.x, y: ep.y, z: ep.z },
        to: { x: ep.x + session.deltaX, y: ep.y, z: ep.z + session.deltaZ },
      })));
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer);
    } else if (session.kind === "face" && session.faces.length > 0) {
      const faces = session.faces.map((face) => {
        const normal = face.normal;
        const dot = normal.x * session.deltaX + normal.z * session.deltaZ;
        const offset = { x: session.deltaX - normal.x * dot, y: -normal.y * dot, z: session.deltaZ - normal.z * dot };
        return { center: { x: face.center.x, y: face.center.y, z: face.center.z }, offset };
      });
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces }, transfer);
    }
  }, [sendTopologyEdit, topologyEditPartsForShape]);

  const commitNudge = useCallback((session: NonNullable<typeof topologyNudgeRef.current>, shape: WorkplaneShape) => {
    if (topologyNudgeRef.current !== session) return;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return;
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
    if (session.kind === "vertex" && session.vertices.length > 0) {
      const updates = session.vertices.map((vertex) => {
        const from = { x: vertex.x, y: vertex.y, z: vertex.z };
        return { from, to: { x: from.x + session.deltaX, y: from.y, z: from.z + session.deltaZ } };
      });
      topologyReselectRef.current = session.vertices.map((vertex) => ({
        kind: "vertex" as const,
        anchor: { x: vertex.x + session.deltaX, y: vertex.y, z: vertex.z + session.deltaZ },
      }));
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer, true, session.vertices.length > 1 ? "Vértices movidos" : "Vértice movido", shape);
    } else if (session.kind === "edge" && session.edges.length > 0) {
      const updates = session.edges.flatMap((edge) => edge.endpoints.map((ep) => ({
        from: { x: ep.x, y: ep.y, z: ep.z },
        to: { x: ep.x + session.deltaX, y: ep.y, z: ep.z + session.deltaZ },
      })));
      topologyReselectRef.current = session.edges.map((edge) => ({
        kind: "edge" as const,
        anchor: { x: edge.center.x + session.deltaX, y: edge.center.y, z: edge.center.z + session.deltaZ },
      }));
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer, true, session.edges.length > 1 ? "Líneas movidas" : "Línea movida", shape);
    } else if (session.kind === "face" && session.faces.length > 0) {
      const faces = session.faces.map((face) => {
        const normal = face.normal;
        const dot = normal.x * session.deltaX + normal.z * session.deltaZ;
        const offset = { x: session.deltaX - normal.x * dot, y: -normal.y * dot, z: session.deltaZ - normal.z * dot };
        return { center: { x: face.center.x, y: face.center.y, z: face.center.z }, offset };
      });
      topologyReselectRef.current = session.faces.map((face) => {
        const normal = face.normal;
        const dot = normal.x * session.deltaX + normal.z * session.deltaZ;
        const offset = { x: session.deltaX - normal.x * dot, y: -normal.y * dot, z: session.deltaZ - normal.z * dot };
        return { kind: "face" as const, anchor: { x: face.center.x + offset.x, y: face.center.y + offset.y, z: face.center.z + offset.z } };
      });
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces }, transfer, true, session.faces.length > 1 ? "Caras deslizadas" : "Cara deslizada", shape);
    }
    topologyNudgeRef.current = null;
  }, [sendTopologyEdit, topologyEditPartsForShape]);

  const handleTopologyNudge = useCallback((deltaX: number, deltaZ: number) => {
    const shape = selectedShapes[0];
    if (!shape || !selectedTopologyShape || shape.id !== selectedTopologyShape.id || !shapeTopology || shapeTopology.shapeId !== shape.id) return;
    if (shapeTopology.signature !== shapeTopologySignature(shape)) return;
    const selection = topologySelectionRef.current;
    if (selection.length === 0) return;
    const kind = selection[0].kind;
    let session = topologyNudgeRef.current;
    if (!session || session.kind !== kind) {
      if (kind === "vertex") {
        const vertices = shapeTopology.vertices.filter((v) => selection.some((pick) => pick.kind === "vertex" && pick.id === v.id));
        if (vertices.length === 0) return;
        session = { kind: "vertex", vertices, edges: [], faces: [], deltaX: 0, deltaZ: 0, timer: 0 };
      } else if (kind === "edge") {
        const edges = shapeTopology.edges.filter((e) => selection.some((pick) => pick.kind === "edge" && pick.id === e.id));
        if (edges.length === 0) return;
        session = { kind: "edge", vertices: [], edges, faces: [], deltaX: 0, deltaZ: 0, timer: 0 };
      } else {
        const faces = shapeTopology.faces.filter((f) => selection.some((pick) => pick.kind === "face" && pick.id === f.id));
        if (faces.length === 0) return;
        session = { kind: "face", vertices: [], edges: [], faces, deltaX: 0, deltaZ: 0, timer: 0 };
      }
      topologyNudgeRef.current = session;
    }
    session.deltaX += deltaX;
    session.deltaZ += deltaZ;
    window.clearTimeout(session.timer);
    session.timer = window.setTimeout(() => commitNudge(session, shape), 220);
    sendNudgeLive(session, shape);
  }, [commitNudge, selectedShapes, selectedTopologyShape, sendNudgeLive, shapeTopology]);

  // After a nudge/transform commit the shape is re-solidified and its topology
  // is re-collected with fresh (unstable) hash ids, so re-select every moved
  // entity by matching its new position against the anchors stored at commit.
  useEffect(() => {
    const reselect = topologyReselectRef.current;
    if (!reselect || reselect.length === 0 || !shapeTopology) return;
    const shape = selectedShapes[0];
    if (!shape || shapeTopology.shapeId !== shape.id) return;
    if (shapeTopology.signature !== shapeTopologySignature(shape)) return;
    const tolerance = 0.1;
    const picks: CadTopologyPick[] = [];
    for (const item of reselect) {
      if (item.kind === "vertex") {
        const vertex = shapeTopology.vertices.find((v) => Math.hypot(v.x - item.anchor.x, v.y - item.anchor.y, v.z - item.anchor.z) < tolerance);
        if (vertex) picks.push({ kind: "vertex", id: vertex.id });
      } else if (item.kind === "edge") {
        const edge = shapeTopology.edges.find((e) => Math.hypot(e.center.x - item.anchor.x, e.center.y - item.anchor.y, e.center.z - item.anchor.z) < tolerance);
        if (edge) picks.push({ kind: "edge", id: edge.id });
      } else {
        const face = shapeTopology.faces.find((f) => Math.hypot(f.center.x - item.anchor.x, f.center.y - item.anchor.y, f.center.z - item.anchor.z) < tolerance);
        if (face) picks.push({ kind: "face", id: face.id });
      }
    }
    topologyReselectRef.current = null;
    setTopologySelection(picks);
    console.log(`[TopoEdit] reselect: ${picks.length} ente${picks.length === 1 ? "" : "s"} resueltos de ${reselect.length} ancla${reselect.length === 1 ? "" : "s"}`);
  }, [selectedShapes, shapeTopology]);

  // Keep the ref mirror of the selection so the drag/nudge handlers always read
  // the latest selection even if their closures were created earlier.
  useEffect(() => {
    topologySelectionRef.current = topologySelection;
  }, [topologySelection]);

  /**
   * Applies a coordinate transform to every entity of the topology selection.
   * `moveRep` maps an entity's representative point to its target position;
   * vertex/edge endpoints become `moveTopologyVertices` updates and faces become
   * `moveTopologyFaces` offsets. On success it commits and stores reselect
   * anchors; returns `false` when nothing would actually move.
   */
  const applyTopologyTransform = useCallback((
    shape: WorkplaneShape,
    topology: TopologyShapeLike,
    selection: CadTopologyPick[],
    moveRep: (point: { x: number; y: number; z: number }) => { x: number; y: number; z: number },
    label: string,
  ) => {
    const constructionIds = new Set((shape.constructionVertices ?? []).map((vertex) => vertex.topologyId));
    const constructionEdgeIds = new Set((shape.constructionEdges ?? []).map(constructionEdgeTopologyId));
    const customResult = transformSelectedConstructionVertices(shape, selection, moveRep);
    const updates: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }> = [];
    const faces: Array<{ center: { x: number; y: number; z: number }; offset: { x: number; y: number; z: number } }> = [];
    const anchors: Array<{ kind: CadTopologyPickKind; anchor: { x: number; y: number; z: number } }> = [];
    for (const pick of selection) {
      if (pick.kind === "vertex") {
        const vertex = topology.vertices.find((entry) => entry.id === pick.id);
        if (!vertex) continue;
        const from = { x: vertex.x, y: vertex.y, z: vertex.z };
        const to = moveRep({ ...from });
        if (constructionIds.has(pick.id)) continue;
        updates.push({ from, to });
        anchors.push({ kind: "vertex", anchor: to });
      } else if (pick.kind === "edge") {
        const edge = topology.edges.find((entry) => entry.id === pick.id);
        if (!edge) continue;
        if (constructionEdgeIds.has(pick.id)) continue;
        const center = { x: edge.center.x, y: edge.center.y, z: edge.center.z };
        anchors.push({ kind: "edge", anchor: moveRep({ ...center }) });
        for (const endpoint of edge.endpoints) {
          const from = { x: endpoint.x, y: endpoint.y, z: endpoint.z };
          updates.push({ from, to: moveRep({ ...from }) });
        }
      } else {
        const face = topology.faces.find((entry) => entry.id === pick.id);
        if (!face) continue;
        const center = { x: face.center.x, y: face.center.y, z: face.center.z };
        const to = moveRep({ ...center });
        faces.push({ center, offset: { x: to.x - center.x, y: to.y - center.y, z: to.z - center.z } });
        anchors.push({ kind: "face", anchor: to });
      }
    }
    if (customResult.moved > 0) updateShape(shape.id, {
      constructionVertices: customResult.shape.constructionVertices,
      constructionEdges: customResult.shape.constructionEdges,
    });
    if (updates.length === 0 && faces.length === 0) {
      if (customResult.moved > 0) {
        setNotice(label);
        console.log("[TopoOrganizer] construction transform", { label, moved: customResult.moved });
        return true;
      }
      return false;
    }
    const totalMove = [...updates, ...faces.map((f) => ({
      from: f.center,
      to: { x: f.center.x + f.offset.x, y: f.center.y + f.offset.y, z: f.center.z + f.offset.z },
    }))].reduce((sum, u) => sum + Math.hypot(u.to.x - u.from.x, u.to.y - u.from.y, u.to.z - u.from.z), 0);
    if (totalMove <= ALIGN_EPSILON && customResult.moved === 0) return false;
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) return false;
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
    topologyReselectRef.current = anchors.length > 0 ? anchors : null;
    if (updates.length > 0) {
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer, true, label, customResult.shape);
    }
    if (faces.length > 0) {
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces }, transfer, true, label, customResult.shape);
    }
    return true;
  }, [sendTopologyEdit, topologyEditPartsForShape, updateShape]);

  const alignTopologySelection = useCallback((axis: AlignAxis, target: AlignTarget) => {
    const shape = selectedTopologyShape;
    const topology = shapeTopology;
    if (!shape || !topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) {
      setNotice("La topología está desactualizada; vuelve a seleccionar la pieza");
      return;
    }
    const selection = topologySelectionRef.current;
    if (selection.length === 0) return;
    const effectiveTopology = topologyWithConstructionVertices(shape, topology);
    const reps = topologySelectionReps(effectiveTopology, selection);
    if (!reps || reps.length < 2) {
      setNotice("Selecciona al menos dos entes de topología para alinear");
      return;
    }
    const targetValue = alignTargetValue(reps.map((point) => coordinateForAxis(point, axis)), target);
    const moved = applyTopologyTransform(
      shape,
      effectiveTopology,
      selection,
      (point) => {
        const next = { ...point };
        next[axis] = targetValue;
        return next;
      },
      `Se alinearon ${selection.length} ente${selection.length === 1 ? "" : "s"} ${alignmentLabel(axis, target)}`,
    );
    if (!moved) {
      setNotice("Ya está alineado");
    }
    setTopologyAlignPreview(null);
  }, [applyTopologyTransform, selectedTopologyShape, shapeTopology]);

  const mirrorTopologySelection = useCallback((axis: AlignAxis) => {
    const shape = selectedTopologyShape;
    const topology = shapeTopology;
    if (!shape || !topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) {
      setNotice("La topología está desactualizada; vuelve a seleccionar la pieza");
      return;
    }
    const selection = topologySelectionRef.current;
    if (selection.length === 0) return;
    const effectiveTopology = topologyWithConstructionVertices(shape, topology);
    const reps = topologySelectionReps(effectiveTopology, selection);
    if (!reps || reps.length === 0) return;
    const pivot = reps.reduce((sum, point) => sum + coordinateForAxis(point, axis), 0) / reps.length;
    const moved = applyTopologyTransform(
      shape,
      effectiveTopology,
      selection,
      (point) => {
        const next = { ...point };
        next[axis] = 2 * pivot - point[axis];
        return next;
      },
      `Se reflejaron ${selection.length} ente${selection.length === 1 ? "" : "s"} ${mirrorAxisLabel(axis)}`,
    );
    if (!moved) {
      setNotice("No hay nada que reflejar");
    }
    setTopologyMirrorPreviewAxis(null);
  }, [applyTopologyTransform, selectedTopologyShape, shapeTopology]);

  const snapTopologySelection = useCallback(() => {
    const shape = selectedTopologyShape;
    const topology = shapeTopology;
    if (!shape || !topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) {
      setNotice("La topología está desactualizada; vuelve a seleccionar la pieza");
      return;
    }
    const selection = topologySelectionRef.current;
    if (selection.length === 0) return;
    const step = visibleGridStep(workspaceSettings);
    const originX = -workspaceSettings.width / 2;
    const originZ = -workspaceSettings.depth / 2;
    const moved = applyTopologyTransform(
      shape,
      topology,
      selection,
      (point) => ({
        ...point,
        x: snapToGridValue(point.x, originX, step),
        z: snapToGridValue(point.z, originZ, step),
      }),
      `Se ajustaron ${selection.length} ente${selection.length === 1 ? "" : "s"} a la rejilla visible de ${step} mm`,
    );
    if (!moved) {
      setNotice("Los entes ya están en la rejilla");
    }
  }, [applyTopologyTransform, selectedTopologyShape, shapeTopology, workspaceSettings]);

  const dropTopologySelection = useCallback(() => {
    const shape = selectedTopologyShape;
    const topology = shapeTopology;
    if (!shape || !topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) {
      setNotice("La topología está desactualizada; vuelve a seleccionar la pieza");
      return;
    }
    const selection = topologySelectionRef.current;
    if (selection.length === 0) return;
    const effectiveTopology = topologyWithConstructionVertices(shape, topology);
    const extremes = topologyExtremePoints(effectiveTopology, selection);
    if (!extremes) return;
    const minY = Math.min(...extremes.map((point) => point.y));
    const deltaY = placementElevation - minY;
    if (Math.abs(deltaY) <= ALIGN_EPSILON) {
      setNotice("Los entes ya están en el plano de trabajo");
      return;
    }
    applyTopologyTransform(
      shape,
      effectiveTopology,
      selection,
      (point) => ({ ...point, y: point.y + deltaY }),
      placementElevation === 0 ? "Entes bajados al plano de trabajo" : `Entes bajados al plano de trabajo de ${placementElevation.toFixed(2)} mm`,
    );
  }, [applyTopologyTransform, placementElevation, selectedTopologyShape, shapeTopology]);

  const raiseTopologySelection = useCallback(() => {
    const shape = selectedTopologyShape;
    const topology = shapeTopology;
    if (!shape || !topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) {
      setNotice("La topología está desactualizada; vuelve a seleccionar la pieza");
      return;
    }
    const selection = topologySelectionRef.current;
    if (selection.length === 0) return;
    const effectiveTopology = topologyWithConstructionVertices(shape, topology);
    const extremes = topologyExtremePoints(effectiveTopology, selection);
    if (!extremes) return;
    const maxY = Math.max(...extremes.map((point) => point.y));
    const deltaY = placementElevation - maxY;
    if (Math.abs(deltaY) <= ALIGN_EPSILON) {
      setNotice("Los entes ya están en el plano de trabajo");
      return;
    }
    applyTopologyTransform(
      shape,
      effectiveTopology,
      selection,
      (point) => ({ ...point, y: point.y + deltaY }),
      placementElevation === 0 ? "Entes subidos al plano de trabajo" : `Entes subidos al plano de trabajo de ${placementElevation.toFixed(2)} mm`,
    );
  }, [applyTopologyTransform, placementElevation, selectedTopologyShape, shapeTopology]);

  // Live preview for the topology align/mirror overlays: while a handle is
  // hovered, send the transform with commit=false so the orange wireframe
  // previews it; clearing the preview also clears the wireframe.
  useEffect(() => {
    if (topologyMode === "shape" || topologySelection.length === 0) {
      setTopologyEditPreview(null);
      return;
    }
    const shape = selectedTopologyShape;
    const topology = shapeTopology;
    if (!shape || !topology || topology.shapeId !== shape.id || topology.signature !== shapeTopologySignature(shape)) {
      setTopologyEditPreview(null);
      return;
    }
    if (!topologyAlignPreview && !topologyMirrorPreviewAxis) {
      if (!topologyInspectorPreviewActive) setTopologyEditPreview(null);
      return;
    }
    const selection = topologySelectionRef.current;
    if (selection.length === 0) {
      setTopologyEditPreview(null);
      return;
    }
    const parts = topologyEditPartsForShape(shape);
    if (parts.length === 0) {
      setTopologyEditPreview(null);
      return;
    }
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []);
    const updates: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }> = [];
    const faces: Array<{ center: { x: number; y: number; z: number }; offset: { x: number; y: number; z: number } }> = [];
    if (topologyAlignPreview) {
      const { axis, target } = topologyAlignPreview;
      const reps = topologySelectionReps(topology, selection);
      if (!reps) {
        setTopologyEditPreview(null);
        return;
      }
      const targetValue = alignTargetValue(reps.map((point) => coordinateForAxis(point, axis)), target);
      for (const pick of selection) {
        if (pick.kind === "vertex") {
          const vertex = topology.vertices.find((entry) => entry.id === pick.id);
          if (!vertex) continue;
          const from = { x: vertex.x, y: vertex.y, z: vertex.z };
          const to = { ...from };
          to[axis] = targetValue;
          updates.push({ from, to });
        } else if (pick.kind === "edge") {
          const edge = topology.edges.find((entry) => entry.id === pick.id);
          if (!edge) continue;
          for (const endpoint of edge.endpoints) {
            const from = { x: endpoint.x, y: endpoint.y, z: endpoint.z };
            const to = { ...from };
            to[axis] = targetValue;
            updates.push({ from, to });
          }
        } else {
          const face = topology.faces.find((entry) => entry.id === pick.id);
          if (!face) continue;
          const center = { x: face.center.x, y: face.center.y, z: face.center.z };
          const offset = { x: 0, y: 0, z: 0 };
          offset[axis] = targetValue - coordinateForAxis(center, axis);
          faces.push({ center, offset });
        }
      }
    } else if (topologyMirrorPreviewAxis) {
      const axis = topologyMirrorPreviewAxis;
      const reps = topologySelectionReps(topology, selection);
      if (!reps) {
        setTopologyEditPreview(null);
        return;
      }
      const pivot = reps.reduce((sum, point) => sum + coordinateForAxis(point, axis), 0) / reps.length;
      for (const pick of selection) {
        if (pick.kind === "vertex") {
          const vertex = topology.vertices.find((entry) => entry.id === pick.id);
          if (!vertex) continue;
          const from = { x: vertex.x, y: vertex.y, z: vertex.z };
          const to = { ...from };
          to[axis] = 2 * pivot - coordinateForAxis(from, axis);
          updates.push({ from, to });
        } else if (pick.kind === "edge") {
          const edge = topology.edges.find((entry) => entry.id === pick.id);
          if (!edge) continue;
          for (const endpoint of edge.endpoints) {
            const from = { x: endpoint.x, y: endpoint.y, z: endpoint.z };
            const to = { ...from };
            to[axis] = 2 * pivot - coordinateForAxis(from, axis);
            updates.push({ from, to });
          }
        } else {
          const face = topology.faces.find((entry) => entry.id === pick.id);
          if (!face) continue;
          const center = { x: face.center.x, y: face.center.y, z: face.center.z };
          const offset = { x: 0, y: 0, z: 0 };
          offset[axis] = 2 * (pivot - coordinateForAxis(center, axis));
          faces.push({ center, offset });
        }
      }
    }
    if (updates.length > 0) {
      sendTopologyEdit({ type: "moveTopologyVertices", parts, updates }, transfer);
    }
    if (faces.length > 0) {
      sendTopologyEdit({ type: "moveTopologyFaces", parts, faces }, transfer);
    }
  }, [selectedTopologyShape, sendTopologyEdit, shapeTopology, topologyAlignPreview, topologyEditPartsForShape, topologyInspectorPreviewActive, topologyMirrorPreviewAxis, topologyMode, topologySelection.length]);

  const topologySelectionActive = topologyMode !== "shape" && topologySelection.length > 0;

  // Context-aware wrappers bound to the viewport overlays and toolbar: when a
  // topology selection is active the align/mirror/snap/drop actions operate on
  // the topology entities instead of the body shapes.
  const handleAlignSelection = useCallback((axis: AlignAxis, target: AlignTarget) => {
    if (topologySelectionActive) {
      alignTopologySelection(axis, target);
    } else {
      alignSelectionTo(axis, target);
    }
  }, [alignSelectionTo, alignTopologySelection, topologySelectionActive]);

  const handleAlignPreview = useCallback((axis: AlignAxis, target: AlignTarget) => {
    if (topologySelectionActive) {
      setAlignPreview(null);
      setTopologyAlignPreview({ axis, target });
    } else {
      setTopologyAlignPreview(null);
      setAlignPreview({ axis, target });
    }
  }, [topologySelectionActive]);

  const handleAlignPreviewClear = useCallback(() => {
    setAlignPreview(null);
    setTopologyAlignPreview(null);
  }, []);

  const handleMirrorSelection = useCallback((axis: AlignAxis) => {
    if (topologySelectionActive) {
      mirrorTopologySelection(axis);
    } else {
      mirrorSelectionAcross(axis);
    }
  }, [mirrorSelectionAcross, mirrorTopologySelection, topologySelectionActive]);

  const handleMirrorPreview = useCallback((axis: AlignAxis) => {
    if (topologySelectionActive) {
      setMirrorPreviewAxis(null);
      setTopologyMirrorPreviewAxis(axis);
    } else {
      setTopologyMirrorPreviewAxis(null);
      setMirrorPreviewAxis(axis);
    }
  }, [topologySelectionActive]);

  const handleMirrorPreviewClear = useCallback(() => {
    setMirrorPreviewAxis(null);
    setTopologyMirrorPreviewAxis(null);
  }, []);

  const cancelEdgeModifier = useCallback(() => {
    invalidateCadModifierSession();
    setNotice("Modificador de bordes cancelado");
  }, [invalidateCadModifierSession]);

  const startEdgeModifier = useCallback((kind: CadModifierKind) => {
    if (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole) {
      setNotice(`Selecciona un sólido desbloqueado para ${kind === "fillet" ? "redondear" : "achaflanar"}`);
      return;
    }
    invalidateCadModifierSession();
    const appliedEdgeTreatmentCount = edgeTreatmentFeatureCount(selectedShape);
    const hasAppliedEdgeTreatment = Boolean(selectedShape.importedMesh && selectedShape.edgeTreatments?.length);
    const sourceParts = selectedShape.groupedShapes?.length && !hasAppliedEdgeTreatment ? restoreGroupedChildren(selectedShape) : [selectedShape];
    const partInputs: Array<{ shape: WorkplaneShape; mesh?: MeshData; brep?: string; brepTransform?: number[]; primitive?: CadModifierPrimitivePart }> = sourceParts.map((shape) => {
      const frame = shape.cadBrepFrame;
      const preserveNeedsRetessellation = preservesEdgeTreatmentSize(shape) && Boolean(frame) && (
        Math.abs(shapeWidth(shape) - (frame?.width ?? shapeWidth(shape))) > 1e-6 ||
        Math.abs(shapeDepth(shape) - (frame?.depth ?? shapeDepth(shape))) > 1e-6 ||
        Math.abs(shape.height - (frame?.height ?? shape.height)) > 1e-6
      );
      const primitive = cadModifierPrimitiveForShape(shape);
      if (primitive) return { shape, primitive };
      return shape.cadBrep && frame && !preserveNeedsRetessellation
        ? { shape, brep: shape.cadBrep, brepTransform: cadBrepTransformForShape(shape) }
        : { shape, mesh: meshForShape(shape) };
    });
    const triangleCount = partInputs.reduce((total, part) => total + (part.mesh?.faces.length ?? 0), 0);
    if (triangleCount === 0 && partInputs.every((part) => !part.brep && !part.primitive)) {
      setNotice("El objeto seleccionado no tiene superficie imprimible");
      return;
    }
    if (triangleCount > 180_000) {
      setNotice("Esta malla es demasiado densa para el tratamiento de bordes interactivo. Simplifícala por debajo de 180 000 triángulos primero.");
      return;
    }
    const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(1, shapeWidth(selectedShape) / 6, shapeDepth(selectedShape) / 6, selectedShape.height / 6));
    cadModifierBaseShapeRef.current = selectedShape;
    cadModifierBaseFingerprintRef.current = projectShapesFingerprint([selectedShape]);
    cadModifierSourcePartsRef.current = sourceParts;
    setAlignMode(false);
    setMirrorMode(false);
    setEdgeModifier({
      kind,
      edges: [],
      selectedEdgeIds: [],
      amount,
      sharpAngle: 25,
      chamferAngle: 45,
      quality: "standard",
      tangentChain: defaultCadModifierTangentChain(appliedEdgeTreatmentCount),
      preserveEdgeSize: selectedShape.edgeResizeMode === "preserve",
      busy: true,
      prepared: false,
      error: null,
      preview: null,
      componentPreviews: [],
    });
    setNotice(`Preparando bordes de ${kind === "fillet" ? "redondeo" : "chaflán"} en el motor de CAD`);
    const parts: CadModifierMeshPart[] = partInputs.map((part) => {
      if (part.brep) return { brep: part.brep, brepTransform: part.brepTransform, hole: Boolean(part.shape.hole) };
      if (part.primitive) return { primitive: part.primitive, hole: Boolean(part.shape.hole) };
      return { ...meshDataToCadTransfer(part.mesh as MeshData), hole: Boolean(part.shape.hole) };
    });
    const prepareRequestId = postCadModifierRequest({
      type: "prepare",
      parts,
      sharpAngle: 25,
      suppressTreatmentDetailEdges: appliedEdgeTreatmentCount > 0,
    }, parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []));
    if (prepareRequestId === null) {
      const message = cadModifierWorkerFailureMessage();
      setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, error: message } : current);
      setNotice(message);
      return;
    }
    cadModifierPrepareRef.current = prepareRequestId;
    armCadModifierWatchdog(prepareRequestId, "prepare");
  }, [armCadModifierWatchdog, invalidateCadModifierSession, postCadModifierRequest, selectedShape, selectedShapes.length]);

  const prepareCadModifierForMcp = useCallback(async (shape: WorkplaneShape, sharpAngle: number) => {
    if (shape.locked || shape.hole) {
      throw new Error("Select one unlocked solid object for edge treatment");
    }
    const appliedEdgeTreatmentCount = edgeTreatmentFeatureCount(shape);
    const hasAppliedEdgeTreatment = Boolean(shape.importedMesh && shape.edgeTreatments?.length);
    const sourceParts = shape.groupedShapes?.length && !hasAppliedEdgeTreatment ? restoreGroupedChildren(shape) : [shape];
    const partInputs: Array<{ shape: WorkplaneShape; mesh?: MeshData; brep?: string; brepTransform?: number[]; primitive?: CadModifierPrimitivePart }> = sourceParts.map((partShape) => {
      const frame = partShape.cadBrepFrame;
      const preserveNeedsRetessellation = preservesEdgeTreatmentSize(partShape) && Boolean(frame) && (
        Math.abs(shapeWidth(partShape) - (frame?.width ?? shapeWidth(partShape))) > 1e-6 ||
        Math.abs(shapeDepth(partShape) - (frame?.depth ?? shapeDepth(partShape))) > 1e-6 ||
        Math.abs(partShape.height - (frame?.height ?? partShape.height)) > 1e-6
      );
      const primitive = cadModifierPrimitiveForShape(partShape);
      if (primitive) return { shape: partShape, primitive };
      return partShape.cadBrep && frame && !preserveNeedsRetessellation
        ? { shape: partShape, brep: partShape.cadBrep, brepTransform: cadBrepTransformForShape(partShape) }
        : { shape: partShape, mesh: meshForShape(partShape) };
    });
    const triangleCount = partInputs.reduce((total, part) => total + (part.mesh?.faces.length ?? 0), 0);
    if (triangleCount === 0 && partInputs.every((part) => !part.brep && !part.primitive)) {
      throw new Error("The selected object has no printable surface");
    }
    if (triangleCount > 180_000) {
      throw new Error("This mesh is too dense for interactive edge treatment. Simplify it below 180,000 triangles first.");
    }
    const parts: CadModifierMeshPart[] = partInputs.map((part) => {
      if (part.brep) return { brep: part.brep, brepTransform: part.brepTransform, hole: Boolean(part.shape.hole) };
      if (part.primitive) return { primitive: part.primitive, hole: Boolean(part.shape.hole) };
      return { ...meshDataToCadTransfer(part.mesh as MeshData), hole: Boolean(part.shape.hole) };
    });
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer as Transferable, part.indices.buffer as Transferable] : []);
    const response = await postCadModifierRequestAsync({
      type: "prepare",
      parts,
      sharpAngle,
      suppressTreatmentDetailEdges: appliedEdgeTreatmentCount > 0,
    }, transfer);
    if (response.type !== "ready") {
      throw new Error("The CAD worker did not return an edge list");
    }
    return { response, sourceParts };
  }, [postCadModifierRequestAsync]);

  const applyCadModifierForMcp = useCallback(async (
    shape: WorkplaneShape,
    params: Record<string, unknown>,
  ) => {
    invalidateCadModifierSession();
    const sourceFingerprint = projectShapesFingerprint([shape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const kind: CadModifierKind = params.kind === "fillet" ? "fillet" : "chamfer";
    const sharpAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, mcpNumber(params.sharpAngle, 25)));
    const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, mcpNumber(params.amount, 1));
    const chamferAngle = Math.max(5, Math.min(85, mcpNumber(params.chamferAngle, 45)));
    const quality: CadModifierQuality = params.quality === "draft" || params.quality === "fine" ? params.quality : "standard";
    const preserveEdgeSize = typeof params.preserveEdgeSize === "boolean" ? params.preserveEdgeSize : shape.edgeResizeMode === "preserve";
    const { response, sourceParts } = await prepareCadModifierForMcp(shape, sharpAngle);
    const selectableIds = response.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id);
    const requestedIds = mcpNumberArray(params.edgeIds);
    const selectedEdgeIds = params.edgeIds === "all" || params.allEdges === true ? selectableIds : requestedIds.filter((edgeId) => selectableIds.includes(edgeId));
    const missingIds = requestedIds.filter((edgeId) => !selectableIds.includes(edgeId));
    if (selectedEdgeIds.length === 0) {
      throw new Error("Select at least one valid highlighted edge ID");
    }
    if (missingIds.length > 0) {
      throw new Error(`These edge IDs are not selectable at the current threshold: ${missingIds.join(", ")}`);
    }
    const previewResponse = await postCadModifierRequestAsync({
      type: "preview",
      kind,
      edgeIds: selectedEdgeIds,
      amount,
      quality,
      chamferAngle,
    }, [], 30000);
    if (previewResponse.type !== "preview") {
      throw new Error("The CAD worker did not return an edge preview");
    }
    const rawPreview = shapeFromCadMesh(shape, previewResponse.positions, previewResponse.normals, previewResponse.indices, previewResponse.brep);
    if (!rawPreview) {
      throw new Error("The CAD kernel returned an empty edge treatment");
    }
    const preview = canonicalizeShape({
      ...rawPreview,
      cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, previewResponse.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    const feature = {
      kind,
      amount,
      edgeCount: selectedEdgeIds.length,
      ...(kind === "chamfer" ? { chamferAngle } : {}),
    } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const session: EdgeModifierSession = {
      kind,
      edges: response.edges,
      selectedEdgeIds,
      amount,
      sharpAngle,
      chamferAngle,
      quality,
      tangentChain: false,
      preserveEdgeSize,
      busy: false,
      prepared: true,
      error: null,
      preview,
      componentPreviews: cadModifierComponentPreviews(sourceParts, previewResponse.components),
    };
    const createdAt = Date.now();
    const groupedModifiedShape = groupedShapeWithComponentEdgeTreatment(shape, preview, sourceParts, session, feature, createdAt);
    const modifiedShape = groupedModifiedShape ?? shapeWithEdgeTreatmentRecord(
      bakedEdgeTreatmentPreview(preview, shape),
      shape,
      feature,
      preserveEdgeSize,
      createdAt,
    );
    const currentTarget = shapesRef.current.find((candidate) => candidate.id === shape.id);
    if (
      projectInfoRef.current.projectId !== sourceProjectId ||
      !currentTarget ||
      projectShapesFingerprint([currentTarget]) !== sourceFingerprint
    ) {
      throw new Error("The target object or project changed while the edge treatment was running; try again");
    }
    commitShapes(
      shapesRef.current.map((candidate) => candidate.id === shape.id ? modifiedShape : candidate),
      modifiedShape.id,
      `${kind === "fillet" ? "Filleted" : "Chamfered"} ${selectedEdgeIds.length} edge${selectedEdgeIds.length === 1 ? "" : "s"} by MCP`,
    );
    return {
      object: mcpShapeSummary(modifiedShape),
      selectedEdgeIds,
      selectableEdgeIds: selectableIds,
    };
  }, [commitShapes, invalidateCadModifierSession, prepareCadModifierForMcp, postCadModifierRequestAsync]);

  useEffect(() => {
    const base = cadModifierBaseShapeRef.current;
    if (!edgeModifier || !base) return;
    const current = shapes.find((shape) => shape.id === base.id);
    if (current && projectShapesFingerprint([current]) === cadModifierBaseFingerprintRef.current) return;
    invalidateCadModifierSession();
    setNotice("Modificador de bordes cancelado porque el objeto cambió");
  }, [edgeModifier, invalidateCadModifierSession, shapes]);

  const applyEdgeModifier = useCallback(() => {
    const base = cadModifierBaseShapeRef.current;
    if (!edgeModifier?.preview || !base) {
      setNotice("Espera una vista previa de bordes válida antes de aplicar");
      return;
    }
    const label = edgeModifier.kind === "fillet" ? "Se redondeó" : "Se achaflanó";
    const feature = {
      kind: edgeModifier.kind,
      amount: edgeModifier.amount,
      edgeCount: edgeModifier.selectedEdgeIds.length,
      ...(edgeModifier.kind === "chamfer" ? { chamferAngle: edgeModifier.chamferAngle } : {}),
    } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const createdAt = Date.now();
    const previewShape = canonicalizeShape({
      ...edgeModifier.preview,
      cadDisplayEdges: edgeModifier.preview.cadDisplayEdges?.length
        ? edgeModifier.preview.cadDisplayEdges
        : cadDisplayEdgesAfterTreatment(edgeModifier.preview, edgeModifier),
      cadDisplayEdgesVersion: 2,
    });
    const groupedModifiedShape = groupedShapeWithComponentEdgeTreatment(
      base,
      previewShape,
      cadModifierSourcePartsRef.current,
      edgeModifier,
      feature,
      createdAt,
    );
    const modifiedShape: WorkplaneShape = groupedModifiedShape ?? shapeWithEdgeTreatmentRecord(
      bakedEdgeTreatmentPreview(previewShape, base),
      base,
      feature,
      edgeModifier.preserveEdgeSize,
      createdAt,
    );
    commitShapes(
      shapes.map((shape) => shape.id === base.id ? modifiedShape : shape),
      base.id,
      `${label} ${edgeModifier.selectedEdgeIds.length} borde${edgeModifier.selectedEdgeIds.length === 1 ? "" : "s"}`,
    );
    invalidateCadModifierSession();
  }, [commitShapes, edgeModifier, invalidateCadModifierSession, shapes]);

  useEffect(() => {
    if (!edgeModifier) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdgeModifier();
      } else if (event.key === "Enter" && edgeModifier.preview && edgeModifier.selectedEdgeIds.length > 0 && !edgeModifier.busy && !edgeModifier.error) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest("input, select, textarea, button, [contenteditable='true']")) return;
        event.preventDefault();
        applyEdgeModifier();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyEdgeModifier, cancelEdgeModifier, edgeModifier]);

  useEffect(() => {
    if (!edgeModifier?.prepared || edgeModifier.selectedEdgeIds.length === 0) return;
    const timer = window.setTimeout(() => {
      const requestId = postCadModifierRequest({
        type: "preview",
        kind: edgeModifier.kind,
        edgeIds: edgeModifier.selectedEdgeIds,
        amount: edgeModifier.amount,
        quality: edgeModifier.quality,
        chamferAngle: edgeModifier.chamferAngle,
      });
      if (requestId === null) {
        const message = cadModifierWorkerFailureMessage();
        setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, preview: null, error: message } : current);
        setNotice(message);
        return;
      }
      cadModifierLatestPreviewRef.current = requestId;
      armCadModifierWatchdog(requestId, "preview");
      setEdgeModifier((current) => current ? { ...current, busy: true, error: null } : current);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [armCadModifierWatchdog, edgeModifier?.amount, edgeModifier?.chamferAngle, edgeModifier?.kind, edgeModifier?.prepared, edgeModifier?.quality, edgeModifier?.selectedEdgeIds, postCadModifierRequest]);

  const snapSelected = useCallback(() => {
    if (topologyMode !== "shape" && topologySelection.length > 0) {
      snapTopologySelection();
      return;
    }
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const selected = new Set(selectedIds);
    const grid = visibleGridStep(workspaceSettings);
    commitShapes(
      shapes.map((shape) =>
        selected.has(shape.id) && !shape.locked
          ? snapShapeFootprintToVisibleGrid(shape, meshAabb(shape), workspaceSettings)
          : shape,
      ),
      selectedIds,
      `Se ajustó ${selectedShapes.length} forma${selectedShapes.length === 1 ? "" : "s"} a la rejilla visible de ${grid} mm`,
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes.length, shapes, snapTopologySelection, topologyMode, topologySelection.length, workspaceSettings]);

  const toggleHidden = useCallback(() => {
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const selected = new Set(selectedIds);
    const shouldHide = selectedShapes.some((shape) => !shape.hidden);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) && !shape.locked ? { ...shape, hidden: shouldHide } : shape)),
      selectedIds,
      shouldHide ? "Selección oculta" : "Selección visible",
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const showHidden = useCallback(() => {
    const hiddenCount = shapes.filter((shape) => shape.hidden).length;
    if (hiddenCount === 0) {
      setNotice("No hay formas ocultas");
      return;
    }
    commitShapes(
      shapes.map((shape) => ({ ...shape, hidden: false })),
      selectedIds,
      `Se mostró ${hiddenCount} forma${hiddenCount === 1 ? "" : "s"} oculta${hiddenCount === 1 ? "" : "s"}`,
    );
  }, [commitShapes, selectedIds, shapes]);

  const toggleLocked = useCallback(() => {
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const selected = new Set(selectedIds);
    const shouldLock = selectedShapes.some((shape) => !shape.locked);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) ? { ...shape, locked: shouldLock } : shape)),
      selectedIds,
      shouldLock ? "Selección bloqueada" : "Selección desbloqueada",
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const setSelectionHoleMode = useCallback(
    (hole: boolean) => {
      if (!hasSelection) {
        setNotice("Selecciona una forma primero");
        return;
      }
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? withHoleMode(shape, hole)
            : shape,
        ),
        selectedIds,
        hole ? "Se cambió la selección a agujero" : "Se cambió la selección a sólido",
      );
    },
    [commitShapes, hasSelection, selectedIds, shapes],
  );

  const cutSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const selected = new Set(selectedIds);
    setClipboard(selectedShapes);
    writeSharedClipboard(selectedShapes);
    commitShapes(
      shapes.filter((shape) => !selected.has(shape.id)),
      [],
      `Se cortó ${selectedShapes.length} forma${selectedShapes.length === 1 ? "" : "s"}`,
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const raiseSelected = useCallback(
    (delta: number) => {
      if (!hasSelection) {
        return;
      }
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? {
                ...shape,
                elevation: Math.max(0, Math.min(180, (shape.elevation ?? 0) + delta)),
              }
            : shape,
        ),
        selectedIds,
        delta > 0 ? "Selección movida hacia arriba" : "Selección movida hacia abajo",
      );
    },
    [commitShapes, hasSelection, selectedIds, shapes],
  );

  const dropSelectedToWorkplane = useCallback(() => {
    if (topologyMode !== "shape" && topologySelection.length > 0) {
      dropTopologySelection();
      return;
    }
    if (!hasSelection) {
      setNotice("Selecciona una forma primero");
      return;
    }
    const selected = new Set(selectedIds);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) && !shape.locked ? { ...shape, ...dropPatchForShape(shape, placementElevation) } : shape)),
      selectedIds,
      placementElevation === 0 ? "Se bajó la selección al plano de trabajo" : `Se bajó la selección al plano de trabajo de ${placementElevation.toFixed(2)} mm`,
    );
  }, [commitShapes, dropTopologySelection, hasSelection, placementElevation, selectedIds, shapes, topologyMode, topologySelection.length]);

  const activateWorkplaneTool = useCallback(() => {
    setWorkplaneMode((active) => {
      const next = !active;
      setNotice(next ? "Herramienta de plano de trabajo: haz clic en la parte superior de una forma o en la rejilla vacía" : "Herramienta de plano de trabajo cancelada");
      return next;
    });
  }, []);

  const setPlacementWorkplane = useCallback((elevation: number, source: "shape" | "base") => {
    setPlacementElevation(elevation);
    setNotice(source === "shape" ? `Plano de trabajo establecido a ${elevation.toFixed(2)} mm` : "Plano de trabajo restablecido a la base");
  }, []);

  const groupSelected = useCallback(async () => {
    if (selectedShapes.length < 2) {
      setNotice("Selecciona al menos dos formas para agrupar");
      return;
    }

    if (selectedShapes.some((shape) => shape.locked)) {
      setNotice("Desbloquea todas las formas seleccionadas antes de agrupar");
      return;
    }

    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildGroupedShapeFromSelection(selectedShapes);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setNotice("La escena cambió mientras se agrupaba; selecciona los objetos e inténtalo de nuevo");
      return;
    }
    const { group } = result;
    if (!group) {
      if (result.consumed) {
        const selected = new Set(selectedIds);
        commitShapes(shapesRef.current.filter((shape) => !selected.has(shape.id)), null, "Agrupado: el agujero consumió el sólido");
        return;
      }
      setNotice(result.failureNotice);
      return;
    }
    const selected = new Set(selectedIds);
    const editableGroup = canonicalizeShape({ ...group, groupOperation: "group" });
    commitShapes([...shapesRef.current.filter((shape) => !selected.has(shape.id)), editableGroup], editableGroup.id, `Se agrupó ${selectedShapes.length} forma${selectedShapes.length === 1 ? "" : "s"}`);
  }, [commitShapes, selectedIds, selectedShapes]);

  const intersectSelected = useCallback(async () => {
    const groupable = selectedShapes.filter((shape) => !shape.locked);
    const hasSolid = groupable.some((shape) => !shape.hole);
    const hasHole = groupable.some((shape) => shape.hole);
    if (!hasSolid || !hasHole) {
      setNotice("Selecciona al menos un sólido y un agujero para la Intersección");
      return;
    }

    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildIntersectionShapeFromSelection(groupable);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setNotice("La escena cambió mientras se intersectaba; selecciona los objetos e inténtalo de nuevo");
      return;
    }
    if (!result.group && !result.empty) {
      setNotice(result.failureNotice);
      return;
    }

    const operandIds = new Set(groupable.map((shape) => shape.id));
    const remainingShapes = shapesRef.current.filter((shape) => !operandIds.has(shape.id));
    if (result.empty) {
      commitShapes(remainingShapes, null, "La intersección está vacía");
      return;
    }

    const intersection = result.group ? canonicalizeShape({ ...result.group, groupOperation: "intersection" }) : null;
    if (!intersection) {
      return;
    }
    commitShapes([...remainingShapes, intersection], intersection.id, `Se intersectó ${groupable.length} forma${groupable.length === 1 ? "" : "s"}`);
  }, [commitShapes, selectedShapes]);

  const ungroupSelected = useCallback(() => {
    const groups = selectedShapes.filter((shape) => shape.groupedShapes?.length);
    if (groups.length === 0) {
      setNotice("Selecciona un grupo primero");
      return;
    }
    const groupIds = new Set(groups.map((shape) => shape.id));
    const restored = groups.flatMap(restoreGroupedChildren);
    commitShapes([...shapes.filter((shape) => !groupIds.has(shape.id)), ...restored], restored.map((shape) => shape.id), `Se desagrupó ${groups.length} grupo${groups.length === 1 ? "" : "s"}`);
  }, [commitShapes, selectedShapes, shapes]);

  const separateSelectedParts = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShape) {
      setNotice("Selecciona un objeto para separar");
      return;
    }
    if (selectedShape.locked) {
      setNotice("Desbloquea el objeto antes de separar las partes");
      return;
    }
    const parts = separateShapeParts(selectedShape);
    if (parts.length <= 1) {
      setNotice("El objeto seleccionado solo tiene una parte conectada");
      return;
    }
    commitShapes(
      [...shapes.filter((shape) => shape.id !== selectedShape.id), ...parts],
      parts.map((shape) => shape.id),
      `Se separaron ${parts.length} partes`,
    );
  }, [commitShapes, selectedShape, selectedShapes.length, shapes]);

  const mcpSceneSnapshot = useCallback((includeRawShapes = false): SketchForgeMcpSceneSummary & { rawShapes?: WorkplaneShape[] } => {
    const projectInfo = projectInfoRef.current;
    const currentShapes = shapesRef.current;
    return {
      projectId: projectInfo.projectId,
      projectName: projectInfo.projectName,
      notice: noticeRef.current,
      selectedIds: selectedIdsRef.current,
      shapeCount: currentShapes.length,
      workspace: workspaceSettingsRef.current,
      snap: initialSnap ?? null,
      shapes: currentShapes.map(mcpShapeSummary),
      ...(includeRawShapes ? { rawShapes: currentShapes.map((shape) => canonicalizeShape(shape)) } : {}),
    };
  }, [initialSnap]);

  const executeMcpCommand = useCallback(async (command: SketchForgeMcpCommand): Promise<unknown> => {
    const params = command.params ?? {};
    const currentShapes = () => shapesRef.current;
    const findShape = (id: unknown) => (typeof id === "string" ? currentShapes().find((shape) => shape.id === id) ?? null : null);

    try {
      lastMcpErrorRef.current = null;
      if (command.action === "get_scene") {
        return mcpSceneSnapshot(params.includeRawShapes === true);
      }

      if (command.action === "list_objects") {
        return { objects: currentShapes().map(mcpShapeSummary) };
      }

      if (command.action === "select_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const validIds = requestedIds.filter((id) => currentShapes().some((shape) => shape.id === id));
        setSelectedIds(validIds);
        selectedIdsRef.current = validIds;
        setNotice(validIds.length ? `MCP selected ${validIds.length} object${validIds.length === 1 ? "" : "s"}` : "MCP cleared selection");
        return { selectedIds: validIds, objects: currentShapes().filter((shape) => validIds.includes(shape.id)).map(mcpShapeSummary) };
      }

      if (command.action === "delete_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? new Set(requestedIds) : new Set(selectedIdsRef.current);
        const deleted = currentShapes().filter((shape) => ids.has(shape.id));
        if (deleted.length === 0) throw new Error("No matching objects to delete");
        commitShapes(currentShapes().filter((shape) => !ids.has(shape.id)), [], `MCP deleted ${deleted.length} object${deleted.length === 1 ? "" : "s"}`);
        selectedIdsRef.current = [];
        return { deletedIds: deleted.map((shape) => shape.id), deletedCount: deleted.length };
      }

      if (command.action === "create_shape") {
        const rawKind = mcpString(params.kind, "box");
        const kind = rawKind === "cube" ? "box" : rawKind;
        const width = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.width ?? params.size, 20));
        const depth = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.depth ?? params.size, rawKind === "cube" ? width : 20));
        const height = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.height ?? params.size, rawKind === "cube" ? width : 20));
        const x = mcpNumber(params.x, 0);
        const z = mcpNumber(params.z, 0);
        const elevation = mcpNumber(params.elevation, placementElevation);
        const color = mcpString(params.color, kind === "cylinder" ? "#d97813" : "#d41721");
        const name = mcpString(params.name, kind === "cylinder" ? "Cylinder" : kind === "sketch" ? "Sketch extrusion" : rawKind === "cube" ? "Cube" : "Box");
        let shape: WorkplaneShape;
        if (kind === "sketch") {
          const profile = defaultMcpSketchProfile(width, depth);
          const extruded = await shapeFromSketchProfile(profile, height);
          if (!extruded) throw new Error("Could not create the sketch profile");
          shape = canonicalizeShape({
            ...extruded,
            name,
            color,
            x,
            z,
            elevation,
            rotation: mcpNumber(params.rotation, 0),
            rotationX: mcpNumber(params.rotationX, 0),
            rotationZ: mcpNumber(params.rotationZ, 0),
          });
        } else if (kind === "box" || kind === "cylinder") {
          shape = sceneShape({
            name,
            kind,
            color,
            x,
            z,
            elevation,
            width,
            depth,
            height,
            size: Math.max(width, depth),
            rotation: mcpNumber(params.rotation, 0),
            rotationX: mcpNumber(params.rotationX, 0),
            rotationZ: mcpNumber(params.rotationZ, 0),
            sides: kind === "cylinder" ? Math.max(3, Math.floor(mcpNumber(params.sides, 96))) : undefined,
          });
        } else {
          throw new Error("MCP create_shape currently supports box, cube, cylinder, and sketch");
        }
        const committedShape = canonicalizeShape(bakeShapeTransformIntoMesh(shape));
        commitShapes([...currentShapes(), committedShape], committedShape.id, `${committedShape.name} added by MCP`);
        return { object: mcpShapeSummary(committedShape) };
      }

      if (command.action === "import_mesh") {
        const positions = mcpFiniteNumberArray(params.positions);
        const normals = mcpFiniteNumberArray(params.normals);
        if (positions.length < 9 || positions.length % 9 !== 0) {
          throw new Error("import_mesh requires positions as triangle xyz values");
        }
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        for (let index = 0; index < positions.length; index += 3) {
          const x = positions[index];
          const y = positions[index + 1];
          const z = positions[index + 2];
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
        const width = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.width, maxX - minX));
        const depth = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.depth, maxZ - minZ));
        const height = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.height, maxY - minY));
        const shape = canonicalizeShape({
          id: createLocalId("mcp-imported-mesh"),
          name: mcpString(params.name, "Imported mesh"),
          kind: "mesh",
          color: mcpString(params.color, "#9bd7f0"),
          x: mcpNumber(params.x, 0),
          z: mcpNumber(params.z, 0),
          elevation: mcpNumber(params.elevation, 0),
          size: Math.max(width, depth),
          width,
          depth,
          height,
          rotation: mcpNumber(params.rotation, 0),
          rotationX: mcpNumber(params.rotationX, 0),
          rotationZ: mcpNumber(params.rotationZ, 0),
          importedMesh: {
            positions,
            normals: normals.length === positions.length ? normals : undefined,
            baseWidth: width,
            baseDepth: depth,
            baseHeight: height,
            triangleCount: Math.floor(positions.length / 9),
            sourceFormat: "json",
          },
          locked: false,
          hidden: false,
        } satisfies WorkplaneShape);
        commitShapes([...currentShapes(), shape], shape.id, `${shape.name} imported by MCP`);
        return { object: mcpShapeSummary(shape) };
      }

      if (command.action === "update_object") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        if (target.locked) throw new Error("Unlock the object before updating it");
        const patch: ShapeUpdatePatch = {};
        const rotationWasRequested = [params.rotation, params.rotationX, params.rotationZ].some(
          (value) => typeof value === "number" && Number.isFinite(value),
        );
        (["x", "z", "elevation", "width", "depth", "height", "size", "rotation", "rotationX", "rotationZ"] as const).forEach((key) => {
          if (typeof params[key] === "number" && Number.isFinite(params[key])) {
            patch[key] = params[key];
          }
        });
        if (typeof params.color === "string") patch.color = params.color;
        if (typeof params.name === "string") patch.name = params.name;
        if (typeof params.hole === "boolean") patch.hole = params.hole;
        const nextShapes = currentShapes().map((shape) => {
          if (shape.id !== target.id) return shape;
          const patched = { ...shape, ...cleanShapePatch(patch) };
          const width = shapeWidth(patched);
          const depth = shapeDepth(patched);
          const canonical = canonicalizeShape({ ...patched, size: Math.max(width, depth) });
          return rotationWasRequested ? canonicalizeShape(bakeShapeTransformIntoMesh(canonical)) : canonical;
        });
        const updated = nextShapes.find((shape) => shape.id === target.id) as WorkplaneShape;
        commitShapes(nextShapes, target.id, `${updated.name} updated by MCP`);
        return { object: mcpShapeSummary(updated) };
      }

      if (command.action === "align_objects") {
        const axis = params.axis === "x" || params.axis === "y" || params.axis === "z" ? params.axis : null;
        const target = params.target === "min" || params.target === "center" || params.target === "max" ? params.target : null;
        if (!axis || !target) throw new Error("align_objects requires axis x/y/z and target min/center/max");
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const selectedForAlign = currentShapes().filter((shape) => ids.includes(shape.id));
        if (selectedForAlign.length < 2) throw new Error("Select at least two objects to align");
        const validIds = selectedForAlign.map((shape) => shape.id);
        const requestedAnchorId = typeof params.anchorId === "string" ? params.anchorId : null;
        const anchorId = effectiveAlignmentAnchorId(selectedForAlign, requestedAnchorId);
        const { nextShapes, moved } = alignedShapesForSelection(currentShapes(), validIds, selectedForAlign, anchorId, axis, target);
        if (moved === 0) {
          setSelectedIds(validIds);
          selectedIdsRef.current = validIds;
          setNotice(`MCP alignment already ${alignmentLabel(axis, target)}`);
          return {
            moved,
            selectedIds: validIds,
            anchorId,
            objects: selectedForAlign.map(mcpShapeSummary),
          };
        }
        commitShapes(nextShapes, validIds, `MCP aligned ${moved} object${moved === 1 ? "" : "s"} ${alignmentLabel(axis, target)}`);
        return {
          moved,
          selectedIds: validIds,
          anchorId,
          objects: nextShapes.filter((shape) => validIds.includes(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "group_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const groupable = currentShapes().filter((shape) => ids.has(shape.id));
        if (groupable.length < 2) throw new Error("Select at least two objects to group");
        if (groupable.some((shape) => shape.locked)) throw new Error("Unlock every selected object before grouping");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection(groupable);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while grouping; run the command again");
        }
        if (!result.group) {
          if (result.consumed) {
            commitShapes(currentShapes().filter((shape) => !ids.has(shape.id)), null, "MCP group consumed solid");
            return { consumed: true, objects: currentShapes().filter((shape) => !ids.has(shape.id)).map(mcpShapeSummary) };
          }
          throw new Error(result.failureNotice);
        }
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...currentShapes().filter((shape) => !ids.has(shape.id)), editableGroup], editableGroup.id, `MCP grouped ${groupable.length} objects`);
        return { object: mcpShapeSummary(editableGroup) };
      }

      if (command.action === "ungroup_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? new Set(requestedIds) : new Set(selectedIdsRef.current);
        const groups = currentShapes().filter((shape) => ids.has(shape.id) && shape.groupedShapes?.length);
        if (groups.length === 0) throw new Error("Select at least one group to ungroup");
        const groupIds = new Set(groups.map((shape) => shape.id));
        const restored = groups.flatMap(restoreGroupedChildren);
        commitShapes([...currentShapes().filter((shape) => !groupIds.has(shape.id)), ...restored], restored.map((shape) => shape.id), `MCP ungrouped ${groups.length} group${groups.length === 1 ? "" : "s"}`);
        return { objects: restored.map(mcpShapeSummary) };
      }

      if (command.action === "boolean_cut") {
        const solidIds = new Set(mcpStringArray(params.solidIds ?? params.solids));
        const holeIds = new Set(mcpStringArray(params.holeIds ?? params.holes));
        const operandIds = new Set([...solidIds, ...holeIds]);
        const operands = currentShapes()
          .filter((shape) => operandIds.has(shape.id))
          .map((shape) => holeIds.has(shape.id) ? withHoleMode(shape, true) : withHoleMode(shape, false));
        if (!operands.some((shape) => !shape.hole) || !operands.some((shape) => shape.hole)) {
          throw new Error("Provide at least one solidId and one holeId for boolean_cut");
        }
        if (operands.some((shape) => shape.locked)) {
          throw new Error("Unlock every boolean operand before cutting");
        }
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection(operands);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while cutting; run the command again");
        }
        const remainingShapes = currentShapes().filter((shape) => !operandIds.has(shape.id));
        if (result.consumed) {
          commitShapes(remainingShapes, null, "MCP cut consumed solid");
          return { consumed: true };
        }
        if (!result.group) {
          throw new Error(result.failureNotice);
        }
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...remainingShapes, editableGroup], editableGroup.id, "MCP boolean cut complete");
        return { object: mcpShapeSummary(editableGroup) };
      }

      if (command.action === "separate_parts") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to separate");
        if (target.locked) throw new Error("Unlock the object before separating parts");
        const parts = separateShapeParts(target);
        if (parts.length <= 1) throw new Error("The selected object has only one connected part");
        commitShapes([...currentShapes().filter((shape) => shape.id !== target.id), ...parts], parts.map((shape) => shape.id), `MCP separated ${parts.length} parts`);
        return { objects: parts.map(mcpShapeSummary) };
      }

      if (command.action === "list_edges") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        invalidateCadModifierSession();
        const sharpAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, mcpNumber(params.sharpAngle, 25)));
        const { response } = await prepareCadModifierForMcp(target, sharpAngle);
        const selectableEdgeIds = response.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id);
        return { object: mcpShapeSummary(target), sharpAngle, selectableEdgeIds, edges: response.edges };
      }

      if (command.action === "apply_edge_treatment") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        return applyCadModifierForMcp(target, params);
      }

      if (command.action === "inspect_errors") {
        return {
          notice: noticeRef.current,
          edgeModifierError: edgeModifierRef.current?.error ?? null,
          lastMcpError: lastMcpErrorRef.current,
        };
      }

      if (command.action === "capture_image") {
        const face = mcpString(params.face, "current") as SketchForgeMcpViewFace;
        const image = await (window.sketchforgeCaptureView?.(face) ?? window.sketchforgeCaptureCanvas?.() ?? "");
        if (!image || image.length < 100) {
          throw new Error("The SketchForge viewport did not return an image");
        }
        return { face, dataUrl: image, bytesApprox: Math.floor(image.length * 0.75) };
      }

      throw new Error(`Unknown MCP command: ${command.action}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastMcpErrorRef.current = message;
      setNotice(message);
      throw error;
    }
  }, [
    applyCadModifierForMcp,
    commitShapes,
    initialSnap,
    invalidateCadModifierSession,
    mcpSceneSnapshot,
    placementElevation,
    prepareCadModifierForMcp,
  ]);

  useEffect(() => {
    executeMcpCommandRef.current = executeMcpCommand;
  }, [executeMcpCommand]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      return;
    }

    const identity = readMcpEditorIdentity();
    let stopped = false;
    let polling = false;

    const heartbeat = () => {
      const projectInfo = projectInfoRef.current;
      const currentShapes = shapesRef.current;
      void fetch(SKETCHFORGE_MCP_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "heartbeat",
          editor: {
            ...identity,
            projectId: projectInfo.projectId,
            projectName: projectInfo.projectName,
            url: window.location.href,
            focused: document.visibilityState === "visible" && document.hasFocus(),
            shapeCount: currentShapes.length,
            selectedCount: selectedIdsRef.current.length,
            notice: noticeRef.current,
            lastError: edgeModifierRef.current?.error ?? lastMcpErrorRef.current,
          },
        }),
      }).catch(() => undefined);
    };

    const submitResult = (commandId: string, ok: boolean, data?: unknown, error?: string) => {
      void fetch(SKETCHFORGE_MCP_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "result",
          editorId: identity.editorId,
          result: { commandId, ok, data, error, completedAt: Date.now() },
        }),
      }).catch(() => undefined);
    };

    const poll = async () => {
      if (polling || stopped) return;
      polling = true;
      try {
        const response = await fetch(SKETCHFORGE_MCP_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "poll", editorId: identity.editorId }),
        });
        const payload = (await response.json().catch(() => null)) as { command?: SketchForgeMcpCommand | null } | null;
        const command = payload?.command;
        if (command) {
          try {
            const data = await executeMcpCommandRef.current?.(command);
            submitResult(command.id, true, data);
          } catch (error) {
            submitResult(command.id, false, undefined, error instanceof Error ? error.message : String(error));
          }
        }
      } catch {
        // The local bridge may not exist while static builds or tests render the editor.
      } finally {
        polling = false;
      }
    };

    heartbeat();
    void poll();
    const heartbeatTimer = window.setInterval(heartbeat, 1000);
    const pollTimer = window.setInterval(() => void poll(), SKETCHFORGE_MCP_POLL_MS);
    window.addEventListener("focus", heartbeat);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      stopped = true;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", heartbeat);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("codexBooleanCase");
    if (!caseId) {
      return;
    }

    const modeParam = params.get("codexBooleanMode");
    const mode: BooleanAutomationMode = modeParam === "before" || modeParam === "ungroup" ? modeParam : "after";
    const runKey = `${caseId}:${mode}`;
    if (booleanAutomationRunRef.current === runKey) {
      return;
    }
    booleanAutomationRunRef.current = runKey;
    document.body.dataset.codexBooleanTestDone = "running";
    delete document.body.dataset.codexBooleanTestResult;
    delete document.body.dataset.codexBooleanTestImageReady;
    delete document.body.dataset.codexBooleanTestScreenshotPath;

    const finish = (detail: BooleanAutomationResult) => {
      window.__sketchforgeBooleanTest = detail;
      const captureCanvas = () => {
        try {
          const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
          const image = window.sketchforgeCaptureCanvas?.() ?? canvas?.toDataURL("image/png") ?? "";
          if (image.length > 100) {
            window.__sketchforgeBooleanTestImage = image;
            document.body.dataset.codexBooleanTestImageReady = "true";
            void fetch("/api/codex-screenshot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: `boolean-${detail.caseId}-${detail.mode}.png`, dataUrl: image }),
            })
              .then((response) => (response.ok ? response.json() : null))
              .then((payload: { path?: string } | null) => {
                if (payload?.path) {
                  document.body.dataset.codexBooleanTestScreenshotPath = payload.path;
                }
              })
              .catch(() => {
                document.body.dataset.codexBooleanTestImageReady = "false";
              });
          }
        } catch {
          document.body.dataset.codexBooleanTestImageReady = "false";
        }
      };
      const publish = () => {
        document.body.dataset.codexBooleanTestDone = detail.ok ? "true" : "false";
        document.body.dataset.codexBooleanTestResult = JSON.stringify(detail);
        window.dispatchEvent(new CustomEvent("sketchforge:boolean-test-done", { detail }));
      };
      publish();
      window.setTimeout(publish, 100);
      window.setTimeout(captureCanvas, 1000);
      window.setTimeout(captureCanvas, 1800);
    };

    const run = async () => {
      const testCase = booleanAutomationScene(caseId);
      if (!testCase) {
        finish({
          ok: false,
          caseId,
          label: "Unknown boolean test",
          mode,
          notice: "Unknown boolean automation case",
          shapeCount: 0,
          selectedCount: 0,
          error: `Unknown boolean automation case: ${caseId}`,
        });
        return;
      }

      const ids = testCase.shapes.map((shape) => shape.id);
      if (mode === "before") {
        const noticeText = `Boolean test before: ${testCase.label}`;
        commitShapes(testCase.shapes, ids, noticeText);
        finish({
          ok: true,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: testCase.shapes.length,
          selectedCount: ids.length,
        });
        return;
      }

      const result = await buildGroupedShapeFromSelection(testCase.shapes);
      if (!result.group) {
        const noticeText = result.consumed ? "Grouped: hole consumed solid" : result.failureNotice;
        commitShapes(result.consumed ? [] : testCase.shapes, result.consumed ? [] : ids, noticeText);
        finish({
          ok: result.consumed,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: result.consumed ? 0 : testCase.shapes.length,
          selectedCount: result.consumed ? 0 : ids.length,
          error: result.consumed ? undefined : result.failureNotice,
        });
        return;
      }

      const triangleCount = result.group.importedMesh?.triangleCount ?? meshForShape(result.group).faces.length;
      const groupedCount = result.group.groupedShapes?.length ?? 0;
      if (mode === "ungroup") {
        const restored = restoreGroupedChildren(result.group);
        const noticeText = `Boolean test ungrouped: ${testCase.label}`;
        commitShapes(restored, restored.map((shape) => shape.id), noticeText);
        finish({
          ok: restored.length === groupedCount,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: restored.length,
          selectedCount: restored.length,
          triangleCount,
          groupedCount,
          groupId: result.group.id,
        });
        return;
      }

      const noticeText = `Boolean test after: ${testCase.label}`;
      commitShapes([result.group], result.group.id, noticeText);
      finish({
        ok: true,
        caseId,
        label: testCase.label,
        mode,
        notice: noticeText,
        shapeCount: 1,
        selectedCount: 1,
        triangleCount,
        groupedCount,
        groupId: result.group.id,
      });
    };

    void run();
  }, [commitShapes]);

  const exportDesign = useCallback((format: DirectExportFormat, exportName: string) => {
    const sourceShapes = hasSelection ? selectedShapes : shapes;
    const exportable = sourceShapes.filter((shape) => !shape.hole);
    if (exportable.length === 0) {
      setNotice(hasSelection ? "Selecciona al menos una forma sólida antes de exportar" : "Agrega una forma sólida antes de exportar");
      return;
    }
    const invalidSvg = exportable.map(invalidSvgMeshReason).find((reason): reason is string => Boolean(reason));
    if (invalidSvg) {
      setNotice(`${invalidSvg}. Re-importa el SVG de origen después de corregir sus contornos`);
      return;
    }
    const selectedNotice = `Se exportó ${exportable.length} forma${exportable.length === 1 ? "" : "s"} seleccionada${exportable.length === 1 ? "" : "s"}`;
    const finishNotice = (label: string, result: DownloadResult) => {
      if (result.mode === "folder") {
        setNotice(`Guardado ${label} en ${result.path}`);
        return;
      }
      setNotice(hasSelection ? `${selectedNotice} como ${label}` : `Se exportó ${label}`);
    };
    const failNotice = (label: string, error: unknown) => {
      setNotice(error instanceof Error ? error.message : `No se pudo exportar ${label}`);
    };
    if (format === "svg") {
      setNotice("Generando proyección superior SVG…");
      void toSvg(exportable, exportName.trim() || projectName)
        .then((content) => downloadTextFile(projectExportFileName(exportName, "svg"), content, "image/svg+xml;charset=utf-8"))
        .then((result) => finishNotice("SVG", result))
        .catch((error: unknown) => failNotice("SVG", error));
      return;
    }
    const meshes = exportable.map(meshForShape);
    if (format === "stl") {
      void downloadTextFile(projectExportFileName(exportName, "stl"), toStl(meshes), "model/stl")
        .then((result) => finishNotice("STL", result))
        .catch((error: unknown) => failNotice("STL", error));
      return;
    }
    void downloadTextFile(projectExportFileName(exportName, "obj"), toObj(meshes), "text/plain")
      .then((result) => finishNotice("OBJ", result))
      .catch((error: unknown) => failNotice("OBJ", error));
  }, [hasSelection, projectName, selectedShapes, shapes]);

  const exportStepDesign = useCallback(async (exportName: string) => {
    if (stepExporting) {
      return;
    }
    const sourceShapes = hasSelection ? selectedShapes : shapes;
    if (sourceShapes.some((shape) => shape.hole) && !sourceShapes.some((shape) => !shape.hole)) {
      setNotice("Selecciona al menos una forma sólida antes de exportar STEP");
      return;
    }
    setStepExporting(true);
    setNotice("Generando B-Rep… la primera exportación STEP carga el kernel de OpenCascade (~22 MB), una vez por sesión");
    try {
      const { exportShapesToStep } = await import("@/lib/stepExport");
      const { blob, exportedCount, skipped } = await exportShapesToStep(sourceShapes);
      const text = await blob.text();
      const result = await downloadTextFile(projectExportFileName(exportName, "step"), text, "application/step");
      const skipNote = skipped.length > 0 ? `; se omitieron ${skipped.length} forma${skipped.length === 1 ? "" : "s"} no primitiva${skipped.length === 1 ? "" : "s"}` : "";
      if (result.mode === "folder") {
        setNotice(`STEP guardado (${exportedCount} cuerpo${exportedCount === 1 ? "" : "s"}) en ${result.path}${skipNote}`);
      } else {
        setNotice(`Se exportó STEP B-Rep con ${exportedCount} cuerpo${exportedCount === 1 ? "" : "s"}${skipNote}`);
      }
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "No se pudo exportar STEP");
    } finally {
      setStepExporting(false);
    }
  }, [hasSelection, projectName, selectedShapes, shapes, stepExporting]);

  const buildSkfBytes = useCallback(async (exportName: string, historyLimitArg: SkfHistoryLimit): Promise<Uint8Array> => {
    const exportedHistory = editorHistoryForExport(historyRef.current, historyIndexRef.current, historyLimitArg);
    return exportSkfProject({
      projectId: projectInfoRef.current.projectId,
      projectName: exportName.trim() || projectName,
      createdAt: projectCreatedAt,
      modifiedAt: projectModifiedAt,
      shapes: shapesRef.current,
      history: exportedHistory.entries,
      historyIndex: exportedHistory.index,
      assets: projectAssetsRef.current,
      workspace: workspaceSettingsRef.current,
      snapGrid,
      placementElevation,
    });
  }, [placementElevation, projectCreatedAt, projectModifiedAt, projectName, snapGrid]);

  const skfExportingRef = useRef(skfExporting);
  skfExportingRef.current = skfExporting;

  const exportSkfDesign = useCallback(async (exportName: string, historyLimit: SkfHistoryLimit, target: SkfExportTarget = "download") => {
    if (skfExporting) return;
    if (target === "shared" && !onSaveSharedProject) {
      setNotice("El almacenamiento de proyectos compartidos no está disponible en esta implementación");
      return;
    }
    if (projectInteractionActiveRef.current) {
      setNotice("Termina el arrastre o la transformación actual antes de guardar el archivo del proyecto");
      return;
    }
    setSkfExporting(true);
    setNotice(target === "shared" ? "Empaquetando proyecto para almacenamiento compartido de Docker…" : "Empaquetando proyecto editable, historial y recursos deduplicados…");
    try {
      const bytes = await buildSkfBytes(exportName, historyLimit);
      if (target === "shared" && onSaveSharedProject) {
        setNotice(await onSaveSharedProject({ exportName: exportName.trim() || projectName, bytes }));
      } else {
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const result = await downloadBlobFile(projectExportFileName(exportName, "skf"), new Blob([buffer], { type: SKF_MEDIA_TYPE }));
        setNotice(result.mode === "folder" ? `Proyecto editable de SketchForge guardado en ${result.path}` : "Proyecto editable de SketchForge guardado (.skf)");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el proyecto de SketchForge");
    } finally {
      setSkfExporting(false);
    }
  }, [buildSkfBytes, onSaveSharedProject, projectName, skfExporting]);

  // Bridge a la app anfitriona (STBlock): responde a peticiones de exportar el
  // proyecto editable .skf desde el flujo "Guardar en tu ordenador" y a la
  // importación de formas generadas por el intérprete 3D de la IA.
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      const data = (event.data ?? {}) as {
        type?: string;
        requestId?: number;
        bytes?: number[];
        fileName?: string;
        shapes?: AiImportShapeSpec[];
        clear?: boolean;
      };
      if (data.type === "SKETCHFORGE_IMPORT_SHAPES") {
        const source = event.source as Window | null;
        const requestId = data.requestId;
        try {
          const specs = Array.isArray(data.shapes) ? data.shapes : [];
          if (specs.length === 0) throw new Error("No se recibieron formas");
          const next = specs.map((spec) => sceneShape(spec));
          const ids = next.map((shape) => shape.id);
          const base = data.clear ? [] : shapesRef.current;
          commitShapes([...base, ...next], ids, `Generado por IA (${next.length} formas)`);
          source?.postMessage({ type: "SKETCHFORGE_IMPORT_SHAPES_RESULT", requestId, ok: true, count: next.length }, "*");
        } catch (error) {
          source?.postMessage(
            { type: "SKETCHFORGE_IMPORT_SHAPES_RESULT", requestId, ok: false, error: error instanceof Error ? error.message : "Import failed" },
            "*",
          );
        }
        return;
      }
      if (data.type !== "SKETCHFORGE_EXPORT_SKF") return;
      const source = event.source as Window | null;
      const requestId = data.requestId;
      void (async () => {
        try {
          if (skfExportingRef.current) throw new Error("SketchForge ya está empaquetando un proyecto");
          if (projectInteractionActiveRef.current) throw new Error("Termina el arrastre o la transformación actual antes de guardar");
          const bytes = await buildSkfBytes(projectName, workspaceSettingsRef.current.historyLimit);
          const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
          source?.postMessage({ type: "SKETCHFORGE_EXPORT_SKF_RESULT", requestId, bytes: Array.from(new Uint8Array(buffer)) }, "*");
        } catch (error) {
          source?.postMessage({ type: "SKETCHFORGE_EXPORT_SKF_RESULT", requestId, error: error instanceof Error ? error.message : "Export failed" }, "*");
        }
      })();
    };
    window.addEventListener("message", handleBridgeMessage);
    return () => window.removeEventListener("message", handleBridgeMessage);
  }, [buildSkfBytes, commitShapes, projectName]);

  // Anunciar a la app anfitriona (STBlock) que el editor está montado y puede
  // responder peticiones de exportación de .skf. page.tsx ya anuncia un
  // SKETCHFORGE_READY genérico; este distingue "shell listo" de "editor listo".
  useEffect(() => {
    window.parent?.postMessage({ type: "SKETCHFORGE_EDITOR_READY" }, "*");
  }, []);

  const clearDesign = useCallback(() => {
    commitShapes([], [], "Nuevo diseño vacío");
    setClipboard([]);
    setMenuOpen(false);
    setTopPanel(null);
  }, [commitShapes]);

  const createHouseScene = useCallback(
    (replace = true) => {
      const house = makeHouseScene();
      const next = replace ? house : [...shapes, ...house];
      commitShapes(next, house.map((shape) => shape.id), "Escena de casa creada");
      setMenuOpen(false);
      setTopPanel(null);
      return house;
    },
    [commitShapes, shapes],
  );

  const createPerfScene = useCallback(
    (count = 500) => {
      const scene = makeBlockPerfScene(count);
      commitShapes(scene, [], `Escena de rendimiento: ${scene.length} bloques`);
      setMenuOpen(false);
      setTopPanel(null);
      return scene;
    },
    [commitShapes],
  );

  const saveDesign = useCallback(() => {
    setNotice(`Diseño guardado con ${shapes.length} forma${shapes.length === 1 ? "" : "s"}`);
    setMenuOpen(false);
  }, [shapes.length]);

  const makeCopy = useCallback(() => {
    if (shapes.length === 0) {
      setNotice("Aún no hay nada para copiar");
      setMenuOpen(false);
      return;
    }
    const copies = shapes.map((shape) => ({
      ...shape,
      id: createLocalId(`${shape.id}-copy`),
      x: Math.min(110, shape.x + 12),
      z: Math.min(110, shape.z + 12),
    }));
    commitShapes([...shapes, ...copies], copies.map((shape) => shape.id), "Se hizo una copia del diseño");
    setMenuOpen(false);
  }, [commitShapes, shapes]);

  const importFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const projectFiles = files.filter((file) => /\.skf$/i.test(file.name));
    if (projectFiles.length) {
      if (files.length !== 1) {
        setNotice("Abre un proyecto .skf a la vez; importa la geometría STL, STEP y SVG por separado");
        return;
      }
      if (!onOpenSkfProjectFile) {
        setNotice("No se pueden abrir archivos de proyecto de SketchForge aquí");
        return;
      }
      setNotice(`Validando ${projectFiles[0].name} antes de abrirlo como un nuevo proyecto`);
      const result = await onOpenSkfProjectFile(projectFiles[0]);
      if (result?.message) setNotice(result.message);
      if (result?.ok !== false) setTopPanel(null);
      return;
    }
    const sourceProjectId = projectInfoRef.current.projectId;
    const importedShapes: WorkplaneShape[] = [];
    const importedAssets: ProjectAsset[] = [];
    const failures: Array<{ fileName: string; reason: string }> = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (projectInfoRef.current.projectId !== sourceProjectId) {
        setNotice(`Se canceló la importación de ${files.length} archivo${files.length === 1 ? "" : "s"} porque el proyecto cambió`);
        return;
      }

      const sourceFormat = sourceFormatForFileName(file.name) ?? (file.type === "image/svg+xml" ? "svg" : null);
      const isStep = sourceFormat === "step";
      const isSvg = sourceFormat === "svg";
      if (!sourceFormat || sourceFormat === "obj" || (!isStep && !isSvg && !importExtensionSupported(file.name))) {
        failures.push({ fileName: file.name, reason: "Tipo de archivo no compatible" });
        continue;
      }

      setNotice(`Importando ${index + 1} de ${files.length}: ${file.name}${isStep ? "… la primera importación STEP carga el kernel de OpenCascade (~22 MB)" : ""}`);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        let nextShape: WorkplaneShape;
        if (isStep) {
          const { importedShapeFromStep } = await import("@/lib/stepImport");
          nextShape = await importedShapeFromStep(file.name, buffer);
        } else if (isSvg) {
          nextShape = importedShapeFromSvg(file.name, new TextDecoder().decode(bytes));
        } else {
          nextShape = importedShapeFromStl(file.name, buffer);
        }
        const asset = await projectAssetFromBytes(file.name, sourceFormat, bytes, file.type);
        importedShapes.push(attachProjectAsset(nextShape, asset.id));
        importedAssets.push(asset);
      } catch (error) {
        failures.push({
          fileName: file.name,
          reason: error instanceof Error ? error.message : "No se pudo leer el archivo",
        });
      }
    }

    if (projectInfoRef.current.projectId !== sourceProjectId) {
      setNotice(`Se canceló la importación de ${files.length} archivo${files.length === 1 ? "" : "s"} porque el proyecto cambió`);
      return;
    }

    const failureDetails = failures
      .slice(0, 3)
      .map((failure) => `${failure.fileName}: ${failure.reason}`)
      .join("; ");
    const remainingFailureCount = Math.max(0, failures.length - 3);
    const failureSummary = failures.length
      ? ` Falló: ${failureDetails}${remainingFailureCount ? `; y ${remainingFailureCount} más` : ""}`
      : "";

    if (!importedShapes.length) {
      setNotice(files.length === 1 && failures[0] ? failures[0].reason : `No se pudo importar ninguno de los ${files.length} archivos seleccionados.${failureSummary}`);
      return;
    }

    const successSummary = importedShapes.length === 1 && files.length === 1
      ? `Se importó ${files[0].name}`
      : `Se importaron ${importedShapes.length} de ${files.length} archivos`;
    const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...importedAssets]);
    projectAssetsRef.current = nextAssets;
    setProjectAssets(nextAssets);
    commitShapes(
      [...shapesRef.current, ...importedShapes],
      importedShapes.map((shape) => shape.id),
      `${successSummary}.${failureSummary}`.trim(),
    );
    setTopPanel(null);
  }, [commitShapes, onOpenSkfProjectFile]);

  const selectFiles = useCallback(
    (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      if (selectedFiles.length) void importFiles(selectedFiles);
    },
    [importFiles],
  );

  const selectShape = useCallback((id: string | string[] | null, mode: "replace" | "toggle" = "replace") => {
    setSelectedIds((current) => {
      if (Array.isArray(id)) {
        const unique = id.filter((entry, index) => id.indexOf(entry) === index);
        return mode === "toggle" ? unique.reduce((next, entry) => (next.includes(entry) ? next.filter((selected) => selected !== entry) : [...next, entry]), current) : unique;
      }
      if (!id) {
        return mode === "toggle" ? current : [];
      }
      if (mode === "toggle") {
        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      }
      return [id];
    });
  }, []);

  const capPlacementFromShape = (shape: WorkplaneShape) => ({
    x: shape.x,
    z: shape.z,
    elevation: shape.elevation,
    rotation: shape.rotation,
    rotationX: shape.rotationX,
    rotationZ: shape.rotationZ,
    mirrorX: shape.mirrorX,
    mirrorY: shape.mirrorY,
    mirrorZ: shape.mirrorZ,
  });

  const combineCapShapeWithHost = useCallback(async (section: CapSection, tool: WorkplaneShape): Promise<WorkplaneShape> => {
    const hostId = section.plane.kind === "face" ? section.plane.shapeId : undefined;
    const host = hostId ? shapesRef.current.find((shape) => shape.id === hostId) : undefined;
    if (!host) {
      throw new Error(section.plane.kind !== "face"
        ? "El modo Añadir/Cortar requiere un plano sobre la cara de una pieza"
        : "La pieza anfitriona ya no existe");
    }
    if (host.locked || host.hole) {
      throw new Error("La pieza anfitriona está bloqueada o es un hueco");
    }
    const operation = section.unionMode === "cut" ? "cut" : "fuse";
    const baseSourceParts = host.groupedShapes?.length ? restoreGroupedChildren(host) : [host];
    const base: CadModifierMeshPart[] = baseSourceParts.map((part) => ({ ...meshDataToCadTransfer(meshForShape(part)), hole: Boolean(part.hole) }));
    const toolParts: CadModifierMeshPart[] = [{ ...meshDataToCadTransfer(meshForShape(tool)), hole: false }];
    const response = await postCadModifierRequestAsync(
      { type: "boolean", base, tool: toolParts, operation },
      [...base, ...toolParts].flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []),
      30000,
    );
    if (response.type !== "preview") {
      throw new Error("La operación de unión no devolvió un sólido");
    }
    const combined = shapeFromCadMesh(host, response.positions, response.normals, response.indices, response.brep);
    if (!combined) {
      throw new Error("La pieza combinada no se pudo construir");
    }
    return canonicalizeShape({
      ...combined,
      cadDisplayEdges: cadDisplayEdgesForShape(combined, response.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
  }, [postCadModifierRequestAsync]);

  const buildCapSectionShape = useCallback(async (section: CapSection, profile: SketchProfile, existingShape: WorkplaneShape | null) => {
    const isUnionMode = section.unionMode === "add" || section.unionMode === "cut";
    // In "Cortar" mode the tool plane is shifted inward along the face normal so
    // the extrusion penetrates the host and the boolean cut opens a pocket.
    const toolPlane = section.plane.kind === "face"
      ? capSectionToolPlane(section, section.extrusionDepth) as Extract<WorkplanePlane, { kind: "face" }>
      : null;
    const facePlane = toolPlane
      ? { normal: toolPlane.normal, up: toolPlane.up, origin: toolPlane.center }
      : undefined;
    // In add/cut mode the tool is always rebuilt fresh from the profile against
    // the current host; the combined shape never becomes the tool's basis.
    const toolExisting = isUnionMode ? null : existingShape;
    const options: SketchShapeBuildOptions = {
      capSectionId: section.id,
      elevation: toolExisting ? toolExisting.elevation : planeElevation(section.plane),
      placement: toolExisting ? capPlacementFromShape(toolExisting) : undefined,
      ...(facePlane ? { plane: facePlane } : {}),
    };
    const toolHeight = capSectionToolHeight(section, CAP_CUT_OVERHANG);
    const tool = section.operation === "revolve"
      ? await shapeFromRevolvedSketchProfile(profile, section.revolveSettings ?? {}, toolExisting, options)
      : await shapeFromSketchProfile(profile, toolExisting?.height ?? toolHeight, toolExisting, options);
    if (!tool) return null;
    if (isUnionMode) return combineCapShapeWithHost(section, tool);
    return tool;
  }, [combineCapShapeWithHost]);

  const beginCapSectionDrawing = useCallback((sectionId: string) => {
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    capSketchSectionIdRef.current = sectionId;
    capSketchOperationRef.current = section.operation;
    beginSketch(section.operation, section.sketchProfile, null, section.revolveSettings);
    const nextCap = { ...current, activeSectionId: sectionId };
    capDocumentRef.current = nextCap;
    setCapDocument(nextCap);
    setToolbarMode("geometry");
    setCapSketchActive(true);
    setNotice(`Dibujando en el plano de la sección «${section.name}»`);
  }, [beginSketch]);

  const createCapSection = useCallback((plane: WorkplanePlane, operation: SketchOperation, extrusionDepth: number, unionMode: CapSectionUnionMode = "floating") => {
    const current = normalizeCapDocument(capDocumentRef.current);
    const base = newCapSection(plane, current.sections.length);
    const section: CapSection = {
      ...base,
      operation,
      extrusionDepth: Math.max(0.1, extrusionDepth),
      unionMode,
      revolveSettings: operation === "revolve" ? { ...normalizeSketchRevolveSettings(sketchRevolveSettings) } : undefined,
    };
    const nextCap: CapDocument = appendCapTimelineEntry(
      {
        ...current,
        sections: [...current.sections, section],
        activeSectionId: section.id,
      },
      {
        id: createLocalId("cap-entry"),
        kind: "section-create",
        sectionId: section.id,
        label: `Sección «${section.name}» creada`,
        timestamp: Date.now(),
      },
    );
    commitCap(nextCap, `Sección «${section.name}» creada`);
    beginCapSectionDrawing(section.id);
    if (plane.kind === "face" && operation === "extrude" && unionMode === "cut") {
      setActiveSketchTool("circle");
      setNotice("Agujero: marca el centro y arrastra para definir el diámetro; después aplica la sección");
    }
  }, [beginCapSectionDrawing, commitCap, setActiveSketchTool, sketchRevolveSettings]);

  const applyCapSectionDrawing = useCallback(async () => {
    const sectionId = capSketchSectionIdRef.current;
    if (!sectionId) {
      setNotice("No hay una sección CAP activa para aplicar");
      return;
    }
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === sectionId);
    if (!section) {
      setNotice("La sección CAP ya no existe");
      return;
    }
    const existingShape = section.resultShapeId ? shapesRef.current.find((shape) => shape.id === section.resultShapeId) ?? null : null;
    let resolved: WorkplaneShape | null;
    try {
      resolved = await buildCapSectionShape(section, sketchProfile, existingShape);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo generar la pieza de la sección");
      return;
    }
    if (!resolved) {
      setNotice("Cierra al menos un perfil antes de aplicar la sección");
      return;
    }
    const isNewPiece = !section.resultShapeId;
    const nextSection: CapSection = { ...section, sketchProfile: cloneSketchProfile(sketchProfile), resultShapeId: resolved.id };
    const nextCap: CapDocument = appendCapTimelineEntry(
      {
        ...current,
        sections: current.sections.map((candidate) => candidate.id === section.id ? nextSection : candidate),
      },
      {
        id: createLocalId("cap-entry"),
        kind: isNewPiece ? "piece-generate" : "section-edit",
        sectionId: section.id,
        shapeId: resolved.id,
        label: isNewPiece ? `Pieza generada para «${section.name}»` : `Boceto de «${section.name}» actualizado`,
        timestamp: Date.now(),
      },
    );
    capDocumentRef.current = nextCap;
    setCapDocument(nextCap);
    const nextShapes = capResultShapes(shapesRef.current, section, existingShape, resolved);
    commitShapes(nextShapes, resolved.id, isNewPiece ? `Pieza CAP «${section.name}» generada` : `Pieza CAP «${section.name}» actualizada`);
    setCapSketchActive(false);
    setSketchActive(false);
    setSketchRevolvePreview(null);
    setEditingSketchShapeId(null);
    setSketchSelection(null);
    setSketchActivePointId(null);
  }, [buildCapSectionShape, commitShapes, sketchProfile]);

  const cancelCapDrawing = useCallback(() => {
    capSketchSectionIdRef.current = null;
    setCapSketchActive(false);
    setSketchActive(false);
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(null);
    setSketchRevolvePreview(null);
    setNotice("Boceto de sección cancelado");
  }, []);

  const generateCapPiece = useCallback(async (sectionId: string) => {
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    if (!capSectionHasUsableProfile(section)) {
      setNotice("Cierra al menos un perfil para generar la pieza");
      return;
    }
    const existingShape = section.resultShapeId ? shapesRef.current.find((shape) => shape.id === section.resultShapeId) ?? null : null;
    let resolved: WorkplaneShape | null;
    try {
      resolved = await buildCapSectionShape(section, section.sketchProfile, existingShape);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo generar la pieza de la sección");
      return;
    }
    if (!resolved) {
      setNotice("No se pudo generar la pieza de la sección");
      return;
    }
    const isNewPiece = !section.resultShapeId;
    const nextCap: CapDocument = appendCapTimelineEntry(
      {
        ...current,
        sections: current.sections.map((candidate) => candidate.id === section.id ? { ...candidate, resultShapeId: resolved.id } : candidate),
      },
      {
        id: createLocalId("cap-entry"),
        kind: isNewPiece ? "piece-generate" : "section-edit",
        sectionId: section.id,
        shapeId: resolved.id,
        label: isNewPiece ? `Pieza generada para «${section.name}»` : `Pieza de «${section.name}» regenerada`,
        timestamp: Date.now(),
      },
    );
    capDocumentRef.current = nextCap;
    setCapDocument(nextCap);
    const nextShapes = capResultShapes(shapesRef.current, section, existingShape, resolved);
    commitShapes(nextShapes, resolved.id, isNewPiece ? `Pieza CAP «${section.name}» generada` : `Pieza CAP «${section.name}» regenerada`);
  }, [buildCapSectionShape, commitShapes]);

  const handleGeometryDrawCommit = useCallback((gesture: SketchProfile, detectedPlane: WorkplanePlane, tool: Direct2DDrawTool) => {
    const plane = detectedPlane;
    const current = normalizeCapDocument(capDocumentRef.current);
    const previous = geometryProfileSectionId
      ? current.sections.find((section) => section.id === geometryProfileSectionId) ?? null
      : null;
    const samePlane = previous && JSON.stringify(previous.plane) === JSON.stringify(plane);
    const section = samePlane ? previous : newCapSection(plane, current.sections.length);
    const profile = materializeSketchEntities({
      ...section.sketchProfile,
      points: [...section.sketchProfile.points, ...gesture.points],
      segments: [...section.sketchProfile.segments, ...gesture.segments],
      entities: [...(section.sketchProfile.entities ?? []), ...(gesture.entities ?? [])],
    });
    const nextSection: CapSection = {
      ...section,
      name: section.name.startsWith("Sección") ? `Perfil 3D ${current.sections.length + 1}` : section.name,
      sketchProfile: profile,
      operation: "extrude",
      extrusionDepth: Math.max(0.1, Math.abs(Number.parseFloat(pushPullDistance) || 10)),
      unionMode: plane.kind === "face" ? "add" : "floating",
    };
    const nextSections = samePlane
      ? current.sections.map((candidate) => candidate.id === nextSection.id ? nextSection : candidate)
      : [...current.sections, nextSection];
    const nextCap = appendCapTimelineEntry(
      { ...current, sections: nextSections, activeSectionId: nextSection.id },
      {
        id: createLocalId("cap-entry"),
        kind: samePlane ? "section-edit" : "section-create",
        sectionId: nextSection.id,
        label: `${tool === "pencil" ? "Trazo libre" : tool === "semicircle" ? "Semicírculo" : tool === "triangle" ? "Triángulo" : tool === "hexagon" ? "Hexágono" : tool === "circle" ? "Círculo" : tool === "arc" ? "Arco" : "Rectángulo"} creado directamente en Geometría`,
        timestamp: Date.now(),
      },
    );
    commitCap(nextCap, "Perfil creado en el viewport 3D; usa Extruir o Cortar");
    setGeometryProfileSectionId(nextSection.id);
    console.log("[Direct2D] profile-stored", {
      sectionId: nextSection.id,
      plane: nextSection.plane,
      entityCount: nextSection.sketchProfile.entities?.length ?? 0,
      depth: nextSection.extrusionDepth,
      unionMode: nextSection.unionMode,
    });
  }, [commitCap, geometryProfileSectionId, pushPullDistance]);

  const applyGeometryProfile = useCallback(async (mode: "add" | "cut" | "floating") => {
    if (!geometryProfileSectionId) {
      setNotice("Dibuja primero un círculo o rectángulo en el plano o cara activa");
      return;
    }
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === geometryProfileSectionId);
    if (!section) return;
    const unionMode: CapSectionUnionMode = section.plane.kind === "face" ? mode : "floating";
    const updated: CapSection = {
      ...section,
      operation: "extrude",
      extrusionDepth: Math.max(0.1, Math.abs(Number.parseFloat(pushPullDistance) || section.extrusionDepth || 10)),
      unionMode,
    };
    console.log("[Direct2D] operation-apply", {
      sectionId: updated.id,
      mode: unionMode,
      depth: updated.extrusionDepth,
      plane: updated.plane,
    });
    commitCap({ ...current, sections: current.sections.map((candidate) => candidate.id === updated.id ? updated : candidate) }, unionMode === "cut" ? "Preparando corte" : "Preparando extrusión");
    await generateCapPiece(updated.id);
    console.log("[Direct2D] operation-complete", { sectionId: updated.id, mode: unionMode });
    setGeometryDrawTool(null);
    setGeometryProfileSectionId(null);
  }, [commitCap, generateCapPiece, geometryProfileSectionId, pushPullDistance]);

  const renameCapSection = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === id);
    if (!section || section.name === trimmed) return;
    const nextCap: CapDocument = appendCapTimelineEntry(
      {
        ...current,
        sections: current.sections.map((candidate) => candidate.id === id ? { ...candidate, name: trimmed } : candidate),
      },
      {
        id: createLocalId("cap-entry"),
        kind: "section-rename",
        sectionId: id,
        label: `Sección renombrada a «${trimmed}»`,
        timestamp: Date.now(),
      },
    );
    commitCap(nextCap, `Sección renombrada a «${trimmed}»`);
  }, [commitCap]);

  const deleteCapSection = useCallback((id: string) => {
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === id);
    if (!section) return;
    const existingShape = section.resultShapeId ? shapesRef.current.find((shape) => shape.id === section.resultShapeId) ?? null : null;
    const inGroup = existingShape ? shapesRef.current.some((shape) => shape.groupedShapes?.some((child) => child.id === existingShape.id)) : false;
    // For Añadir/Cortar sections the result shape is the host the user picked;
    // deleting the section must not remove that host from the scene.
    const isUnionMode = section.unionMode === "add" || section.unionMode === "cut";
    const removeResult = existingShape && !inGroup && !isUnionMode;
    const nextShapes = removeResult
      ? shapesRef.current.filter((shape) => shape.id !== existingShape.id)
      : shapesRef.current;
    const nextCap: CapDocument = appendCapTimelineEntry(
      {
        ...current,
        sections: current.sections.filter((candidate) => candidate.id !== id),
        activeSectionId: current.activeSectionId === id ? undefined : current.activeSectionId,
      },
      {
        id: createLocalId("cap-entry"),
        kind: "section-delete",
        sectionId: id,
        shapeId: section.resultShapeId,
        label: `Sección «${section.name}» eliminada`,
        timestamp: Date.now(),
      },
    );
    if (capSketchSectionIdRef.current === id) {
      capSketchSectionIdRef.current = null;
      setCapSketchActive(false);
      setSketchActive(false);
    }
    if (removeResult) {
      capDocumentRef.current = nextCap;
      setCapDocument(nextCap);
      commitShapes(nextShapes, null, `Sección «${section.name}» y su pieza eliminadas`);
    } else {
      commitCap(nextCap, `Sección «${section.name}» eliminada`);
    }
  }, [commitCap, commitShapes]);

  const selectCapSection = useCallback((id: string) => {
    const current = normalizeCapDocument(capDocumentRef.current);
    const section = current.sections.find((candidate) => candidate.id === id);
    if (!section) return;
    const nextCap = current.activeSectionId === id ? current : { ...current, activeSectionId: id };
    capDocumentRef.current = nextCap;
    setCapDocument(nextCap);
    if (section.resultShapeId) {
      selectShape(section.resultShapeId, "replace");
    }
  }, [selectShape]);

  const nudgeSelected = useCallback(
    (deltaX: number, deltaZ: number) => {
      if (!hasSelection) {
        return;
      }
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? {
                ...shape,
                x: Math.max(-110, Math.min(110, shape.x + deltaX)),
                z: Math.max(-110, Math.min(110, shape.z + deltaZ)),
              }
            : shape,
        ),
        selectedIds,
        `Se movió ${selectedShapes.length} forma${selectedShapes.length === 1 ? "" : "s"}`,
      );
    },
    [commitShapes, hasSelection, selectedIds, selectedShapes.length, shapes],
  );

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const shortcut = event.ctrlKey || event.metaKey;

      if (sketchActive && toolbarMode === "sketch") {
        if (event.key === "Escape") {
          event.preventDefault();
          setSketchActivePointId(null);
          setSketchSelection(null);
          setNotice("Cadena de boceto actual borrada");
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          if (sketchSelection) deleteSelectedSketchEntity();
          else if (sketchMeasurement) clearSketchMeasurement();
          else deleteSelectedSketchEntity();
        } else if (shortcut && key === "z") {
          event.preventDefault();
          if (event.shiftKey) sketchRedo();
          else sketchUndo();
        } else if (shortcut && key === "y") {
          event.preventDefault();
          sketchRedo();
        }
        return;
      }

      if (event.key === "Escape") {
        if (topologyMode !== "shape" && topologySelection.length > 0) {
          setTopologySelection([]);
          setNotice("Selección de topología borrada");
          return;
        }
        setSelectedIds([]);
        setNotice("Selección borrada");
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (shortcut && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (shortcut && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (shortcut && key === "c") {
        event.preventDefault();
        copySelected();
        return;
      }

      if (shortcut && key === "x") {
        event.preventDefault();
        cutSelected();
        return;
      }

      if (shortcut && key === "v") {
        event.preventDefault();
        pasteShape();
        return;
      }

      if (shortcut && key === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (shortcut && key === "a") {
        event.preventDefault();
        setSelectedIds(shapes.filter((shape) => !shape.hidden).map((shape) => shape.id));
        setNotice("Se seleccionaron todas las formas visibles");
        return;
      }

      if (shortcut && key === "g") {
        event.preventDefault();
        if (event.shiftKey) {
          ungroupSelected();
        } else {
          groupSelected();
        }
        return;
      }

      if (shortcut && key === "l") {
        event.preventDefault();
        toggleLocked();
        return;
      }

      if (shortcut && key === "h") {
        event.preventDefault();
        if (event.shiftKey) {
          showHidden();
        } else {
          toggleHidden();
        }
        return;
      }

      const step = event.shiftKey ? 5 : 1;
      if (!shortcut && topologyMode !== "shape" && topologySelection.length > 0) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handleTopologyNudge(-step, 0);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          handleTopologyNudge(step, 0);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          handleTopologyNudge(0, -step);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          handleTopologyNudge(0, step);
          return;
        }
      }
      if (shortcut && event.key === "ArrowUp") {
        event.preventDefault();
        raiseSelected(step);
      } else if (shortcut && event.key === "ArrowDown") {
        event.preventDefault();
        raiseSelected(-step);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, step);
      } else if (key === "d" && (hasSelection || topologySelection.length > 0)) {
        event.preventDefault();
        dropSelectedToWorkplane();
      } else if (key === "h") {
        event.preventDefault();
        setSelectionHoleMode(true);
      } else if (key === "s") {
        event.preventDefault();
        setSelectionHoleMode(false);
      } else if (key === "m") {
        event.preventDefault();
        toggleMirrorMode();
      } else if (key === "k") {
        event.preventDefault();
        handleTopologyModeChange("shape");
      } else if (key === "c" && canTopologyPick) {
        event.preventDefault();
        handleTopologyModeChange("face");
      } else if (key === "v" && canTopologyPick) {
        event.preventDefault();
        handleTopologyModeChange("vertex");
      } else if (key === "l" && canTopologyPick) {
        event.preventDefault();
        handleTopologyModeChange("edge");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canTopologyPick,
    commitShapes,
    clearSketchMeasurement,
    copySelected,
    cutSelected,
    deleteSelected,
    deleteSelectedSketchEntity,
    duplicateSelected,
    dropSelectedToWorkplane,
    groupSelected,
    handleTopologyModeChange,
    handleTopologyNudge,
    hasSelection,
    nudgeSelected,
    pasteShape,
    raiseSelected,
    redo,
    sketchActive,
    sketchRedo,
    sketchMeasurement,
    sketchSelection,
    sketchUndo,
    setSelectionHoleMode,
    showHidden,
    toggleHidden,
    toggleMirrorMode,
    toggleLocked,
    toolbarMode,
    topologyMode,
    topologySelection.length,
    undo,
    ungroupSelected,
  ]);

  const sketchWorkspaceElement = (
    <SketchWorkspace
      profile={sketchProfile}
      operation={sketchOperation}
      revolvePreviewPositions={sketchRevolvePreview?.positions ?? null}
      referenceShapes={shapes.filter((shape) => shape.id !== editingSketchShapeId)}
      tool={sketchTool}
      activePointId={sketchActivePointId}
      selected={sketchSelection}
      measurement={sketchMeasurement}
      pendingMeasurementStart={sketchMeasureStart}
      initialSnap={snapGrid}
      initialWorkspace={workspaceSettings}
      onPlanePoint={addSketchPlanePoint}
      onPointPress={pressSketchPoint}
      onSelectSegment={(id) => {
        setSketchSelection({ kind: "segment", id });
        setSketchActivePointId(null);
      }}
      onSelectMany={(pointIds, segmentIds, imageIds) => {
        setSketchSelection(pointIds.length || segmentIds.length || imageIds.length ? { kind: "multiple", pointIds, segmentIds, imageIds } : null);
        setSketchActivePointId(null);
        const count = pointIds.length + segmentIds.length + imageIds.length;
        setNotice(count ? `Se seleccionaron ${count} elemento${count === 1 ? "" : "s"} de boceto` : "Selección de boceto borrada");
      }}
      onSelectImage={(id) => {
        setSketchSelection({ kind: "image", id });
        setSketchActivePointId(null);
        setNotice("Imagen de boceto seleccionada");
      }}
      onUpdateImage={updateSketchImage}
      onDeleteImage={deleteSketchImage}
      onDeletePoint={deleteSketchPoint}
      onDeleteSegment={deleteSketchSegment}
      onSetSegmentDimensions={setSketchSegmentDimensions}
      onMovePoint={moveSketchPoint}
      onMoveHandle={moveSketchHandle}
      onInsertPoint={insertSketchPoint}
      onSetPointMode={setSketchPointMode}
      onBevelPoint={bevelSketchPoint}
      onClearMeasurement={clearSketchMeasurement}
      onAddEntity={addSketchEntity}
      onUpdateEntity={updateSketchEntity}
      onDeleteEntity={deleteSketchEntity}
      onDeriveEntity={deriveSketchEntity}
      onSelectEntity={(id) => {
        setSketchSelection({ kind: "entity", id });
        setSketchActivePointId(null);
        setNotice("Entidad paramétrica seleccionada");
      }}
      badgeLabel={capSketchActive && activeCapSection?.name ? `Boceto de «${activeCapSection.name}»` : undefined}
    />
  );

  const geometryProfileSection = geometryProfileSectionId
    ? capDocument?.sections.find((section) => section.id === geometryProfileSectionId) ?? null
    : null;
  const geometryDrawPlane: WorkplanePlane = geometryProfileSection?.plane
    ?? (geometryPlaneMode === "offset"
      ? { kind: "offset", elevation: Number.parseFloat(geometryPlaneOffset) || 0 }
      : geometryPlaneMode === "base"
        ? { kind: "base" }
        : facePlaneDraft ?? { kind: "base" });
  const viewportTopologyVertices = selectedShapes[0]
    ? [
        ...(shapeTopology && shapeTopology.shapeId === selectedShapes[0].id ? shapeTopology.vertices : []),
        ...constructionTopologyVertices(selectedShapes[0]),
      ]
    : [];
  const viewportTopologyEdges = selectedShapes[0]
    ? [
        ...(shapeTopology && shapeTopology.shapeId === selectedShapes[0].id ? shapeTopology.edges : []),
        ...constructionTopologyEdges(selectedShapes[0]),
      ]
    : [];

  const viewportElement = (
    <WorkplaneViewport
      shapes={viewportShapes}
      selectedIds={selectedIds}
      alignMode={alignMode}
      alignAnchorId={effectiveAlignAnchorId}
      alignHandles={alignHandleStatuses}
      alignReferenceShapes={shapes}
      mirrorMode={mirrorMode}
      mirrorReferenceShapes={shapes}
      placementElevation={placementElevation}
      workplaneMode={workplaneMode}
      initialSnap={snapGrid}
      initialWorkspace={workspaceSettings}
      workspaceSettingsKey={projectId ?? "local-workplane"}
      onAddShape={addLibraryAsset}
      onAlignAnchorChange={chooseAlignAnchor}
      onAlignPreview={handleAlignPreview}
      onAlignPreviewClear={handleAlignPreviewClear}
      onAlignSelection={handleAlignSelection}
      onMirrorPreview={handleMirrorPreview}
      onMirrorPreviewClear={handleMirrorPreviewClear}
      onMirrorSelection={handleMirrorSelection}
      onSelectShape={selectShape}
      onSetPlacementElevation={setPlacementWorkplane}
      onInteractionActiveChange={updateProjectInteractionActive}
      onEditSketch={beginSketchEdit}
      canSeparateParts={canSeparateSelectedParts}
      onSeparateParts={separateSelectedParts}
      onUpdateShape={updateShape}
      onWorkspaceSettingsChange={updateProjectWorkspaceSettings}
      onWorkplaneModeChange={setWorkplaneMode}
      modifierActive={Boolean(edgeModifier)}
      modifierPreviewActive={Boolean(edgeModifier?.preview)}
      modifierEdges={edgeModifier?.edges.filter((edge) => modifierAvailableEdgeIds.includes(edge.id)) ?? []}
      selectedModifierEdgeIds={edgeModifier?.selectedEdgeIds ?? []}
      onModifierEdgeToggle={toggleModifierEdge}
      selectionMode={topologyMode}
      topologyFaces={shapeTopology && shapeTopology.shapeId === selectedShapes[0]?.id ? shapeTopology.faces : []}
      topologyVertices={viewportTopologyVertices}
      topologyEdges={viewportTopologyEdges}
      topologySelection={topologySelection}
      onTopologyPick={handleTopologyPick}
      onTopologyPickMany={handleTopologyPickMany}
      onTopologyVertexMoveLive={handleTopologyVertexMoveLive}
      onTopologyVertexMoveApply={handleTopologyVertexMoveApply}
      onTopologyFaceMoveLive={handleTopologyFaceMoveLive}
      onTopologyFaceMoveApply={handleTopologyFaceMoveApply}
      topologyVertexPlacementActive={topologyVertexPlacementActive}
      onTopologyAddVertex={handleTopologyAddVertex}
      onTopologyEdgeMoveLive={handleTopologyEdgeMoveLive}
      onTopologyEdgeMoveApply={handleTopologyEdgeMoveApply}
      topologyEditPreviewMesh={topologyEditPreview}
      pushPullFace={pushPullTarget}
      onPushPullApply={applyPushPullFace}
      geometryDrawTool={geometryDrawTool}
      geometryDrawPlane={geometryDrawPlane}
      geometryDrawAutoSurface={geometryPlaneMode === "auto"}
      geometrySketchProfile={geometryProfileSection?.sketchProfile ?? null}
      onGeometryDrawCommit={handleGeometryDrawCommit}
      themePreference={themePreference}
      resolvedTheme={resolvedTheme}
      onThemePreferenceChange={onThemePreferenceChange}
    />
  );

  return (
    <div className="sketchforge-editor">
      <SecondaryToolbar
        toolbarMode={toolbarMode}
        onToolbarModeChange={(mode) => {
          setToolbarMode(mode);
          setTopPanel(null);
          setMenuOpen(false);
        }}
        canUndo={!projectInteractionActive && (historyIndex > 0 || Boolean(edgeModifier))}
        canRedo={!projectInteractionActive && historyIndex < history.length - 1}
        canGroup={selectedShapes.length > 1 && selectedShapes.every((shape) => !shape.locked)}
        canIntersect={selectedShapes.some((shape) => !shape.locked && !shape.hole) && selectedShapes.some((shape) => !shape.locked && Boolean(shape.hole))}
        canUngroup={selectedShapes.some((shape) => Boolean(shape.groupedShapes?.length))}
        hasClipboard={clipboard.length > 0 || systemClipboardSupported}
        hasSelection={hasSelection}
        alignMode={alignMode}
        canAlign={selectedShapes.length > 1}
        canEdgeModify={selectedShapes.length === 1 && Boolean(selectedShape && !selectedShape.locked && !selectedShape.hole)}
        edgeModifierKind={edgeModifier?.kind ?? null}
        mirrorMode={mirrorMode}
        sketchActive={sketchActive}
        sketchOperation={sketchOperation}
        sketchTool={sketchTool}
        sketchCanUndo={sketchHistoryIndex > 0}
        sketchCanRedo={sketchHistoryIndex < sketchHistory.length - 1}
        canEditSketch={selectedShapes.length === 1 && Boolean(selectedShape?.sketchProfile)}
        onNewSketch={() => beginSketch("extrude")}
        geometryDrawTool={geometryDrawTool}
        hasGeometryProfile={Boolean(geometryProfileSection && capSectionHasUsableProfile(geometryProfileSection))}
        geometryPlaneMode={geometryPlaneMode}
        geometryPlaneOffset={geometryPlaneOffset}
        onGeometryPlaneMode={setGeometryPlaneMode}
        onGeometryPlaneOffset={setGeometryPlaneOffset}
        onGeometryDrawTool={(tool) => {
          setGeometryDrawTool((current) => current === tool ? null : tool);
          const label = tool === "pencil" ? "Lápiz" : tool === "semicircle" ? "Semicírculo" : tool === "triangle" ? "Triángulo" : tool === "hexagon" ? "Hexágono" : tool === "circle" ? "Círculo" : tool === "arc" ? "Arco" : "Rectángulo";
          setNotice(`${label} 3D: arrastra directamente sobre ${geometryPlaneMode === "auto" ? "la superficie bajo el cursor" : "el plano activo"}`);
        }}
        onGeometryExtrude={() => void applyGeometryProfile("add")}
        onGeometryCut={() => void applyGeometryProfile("cut")}
        onGeometryProfileCancel={() => {
          setGeometryDrawTool(null);
          setGeometryProfileSectionId(null);
          setNotice("Dibujo 3D cancelado");
        }}
        onEditSketch={beginSketchEdit}
        onSketchTool={setActiveSketchTool}
        onSketchImage={() => {
          if (sketchTool !== "select") {
            setNotice("Elige Seleccionar antes de agregar una imagen de boceto");
            return;
          }
          sketchImageInputRef.current?.click();
        }}
        onSketchText={addSketchTextEntity}
        onSketchVector={() => {
          sketchVectorInputRef.current?.click();
        }}
        onSketchProject={projectSelectedShapesToSketch}
        onSketchUndo={sketchUndo}
        onSketchRedo={sketchRedo}
        onSketchFinish={finishSketch}
        onSketchCancel={cancelSketch}
        capSketchActive={capSketchActive}
        capSectionName={activeCapSection?.name ?? ""}
        onApplyCapDrawing={applyCapSectionDrawing}
        onCancelCapDrawing={cancelCapDrawing}
        onHome={onHome}
        onAlign={toggleAlignMode}
        onChamfer={() => edgeModifier?.kind === "chamfer" ? cancelEdgeModifier() : startEdgeModifier("chamfer")}
        onCopy={copySelected}
        onDelete={deleteSelected}
        onDuplicate={duplicateSelected}
        onDropToWorkplane={dropSelectedToWorkplane}
        onGroup={groupSelected}
        onIntersect={intersectSelected}
        onFillet={() => edgeModifier?.kind === "fillet" ? cancelEdgeModifier() : startEdgeModifier("fillet")}
        onMirror={toggleMirrorMode}
        onPaste={pasteShape}
        onRedo={redo}
        onSnap={snapSelected}
        onTips={() => {
          setTopPanel(topPanel === "tips" ? null : "tips");
          setMenuOpen(false);
        }}
        onToggleHidden={toggleHidden}
        onUngroup={ungroupSelected}
        onUndo={undo}
        onWorkplaneTool={activateWorkplaneTool}
        workplaneMode={workplaneMode}
        topologyMode={topologyMode}
        canTopologyPick={canTopologyPick}
        canTopologyAlign={canTopologyAlign}
        hasTopologySelection={hasTopologySelection}
        onTopologyModeChange={handleTopologyModeChange}
        onRaiseToWorkplane={raiseTopologySelection}
        canPushPull={canPushPull}
        pushPullDistance={pushPullDistance}
        onPushPullDistanceChange={setPushPullDistance}
        onPushPullApply={handlePushPullApply}
        onTopPanel={(panel) => {
          setTopPanel((current) => (current === panel ? null : panel));
          setMenuOpen(false);
        }}
      />
      <div className="editor-body">
        {toolbarMode === "geometry" ? (
          <>
            {viewportElement}
            <ShapeLibrary
              open={shapeLibraryOpen}
              onToggle={() => setShapeLibraryOpen((open) => !open)}
              onAddAsset={(asset) => addLibraryAsset(asset)}
              onImportStlFile={handleImportStlFile}
              onImportStlUrl={handleImportStlUrl}
            />
          </>
        ) : sketchActive || capSketchActive ? sketchWorkspaceElement : viewportElement}
      </div>
      {toolbarMode === "geometry" && topologyMode !== "shape" && selectedShapes.length === 1 && (topologyMode === "vertex" || topologySelection.length > 0) ? (
        <TopologyInspector
          mode={topologyMode}
          count={topologySelection.length}
          onClose={() => {
            setTopologyVertexPlacementActive(false);
            setTopologySelection([]);
            setTopologyMode("shape");
          }}
          onMove={moveTopologyFromInspector}
          onAlign={alignTopologyFromInspector}
          onScalePreview={previewTopologyScale}
          onScaleCommit={commitTopologyScale}
          onRotatePreview={previewTopologyRotation}
          onRotateCommit={commitTopologyRotation}
          onCollapse={collapseTopologyVertices}
          vertexPlacementActive={topologyVertexPlacementActive}
          onVertexPlacementChange={(active) => {
            setTopologyVertexPlacementActive(active);
            setNotice(active ? "Insertar vértices: haz clic sobre cualquier punto de una arista; pulsa Escape para terminar" : "Inserción de vértices finalizada");
            console.log("[TopoInspector] vertex-placement", { active });
          }}
          constructionEdgeCount={selectedShapes[0]?.constructionEdges?.filter((edge) => !edge.partition).length ?? 0}
          onConnectVertices={connectSelectedTopologyVertices}
          onRemoveLastConstructionEdge={removeLastConstructionEdge}
          onApexPreview={previewTopologyApex}
          onApexCommit={commitTopologyApex}
          onFaceNormalPreview={previewFaceNormal}
          onFaceNormalCommit={commitFaceNormal}
          onCancelPreview={cancelTopologyInspectorPreview}
          onInsertEdgeCenter={insertSelectedEdgeCenter}
          onInsertEdgeAtRatio={insertSelectedEdgeAtRatio}
        />
      ) : null}
      {edgeModifier ? (
        <EdgeModifierPanel
          kind={edgeModifier.kind}
          amount={edgeModifier.amount}
          maxAmount={edgeModifierMaxAmount}
          chamferAngle={edgeModifier.chamferAngle}
          quality={edgeModifier.quality}
          sharpAngle={edgeModifier.sharpAngle}
          workspace={workspaceSettings}
          tangentChain={edgeModifier.tangentChain}
          preserveEdgeSize={edgeModifier.preserveEdgeSize}
          targetName={selectedShape?.name ?? "Objeto"}
          groupedCount={selectedShape?.groupedShapes?.length ?? 0}
          appliedFeatureCount={selectedEdgeFeatureCount}
          reversibleFeatureCount={selectedReversibleEdgeFeatureCount}
          historyOptions={selectedEdgeHistoryOptions}
          selectedCount={edgeModifier.selectedEdgeIds.length}
          availableCount={modifierAvailableEdgeIds.length}
          busy={edgeModifier.busy}
          prepared={edgeModifier.prepared}
          error={edgeModifier.error}
          onAmountChange={(value) => setEdgeModifier((current) => current?.prepared ? { ...current, amount: Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(edgeModifierMaxAmount, value)), preview: null, busy: true, error: null } : current)}
          onChamferAngleChange={(value) => setEdgeModifier((current) => current?.prepared ? { ...current, chamferAngle: Math.max(5, Math.min(85, value)), preview: null, busy: true, error: null } : current)}
          onQualityChange={(quality) => setEdgeModifier((current) => current?.prepared ? { ...current, quality, preview: null, busy: true, error: null } : current)}
          onSharpAngleChange={(sharpAngle) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const nextAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, sharpAngle));
            const availableIds = new Set(current.edges
              .filter((edge) => selectableCadModifierEdge(edge, nextAngle))
              .map((edge) => edge.id));
            const selectedEdgeIds = current.selectedEdgeIds.filter((edgeId) => availableIds.has(edgeId));
            return {
              ...current,
              sharpAngle: nextAngle,
              selectedEdgeIds,
              preview: null,
              busy: selectedEdgeIds.length > 0,
              error: availableIds.size === 0 ? "Ningún borde afilado coincide con este umbral" : selectedEdgeIds.length ? null : "Selecciona al menos un borde resaltado",
            };
          })}
          onTangentChainChange={(tangentChain) => setEdgeModifier((current) => current?.prepared ? { ...current, tangentChain } : current)}
          onPreserveEdgeSizeChange={(preserveEdgeSize) => setEdgeModifier((current) => current?.prepared ? { ...current, preserveEdgeSize } : current)}
          onSelectAll={() => setEdgeModifier((current) => current?.prepared ? { ...current, selectedEdgeIds: modifierAvailableEdgeIds, preview: null, busy: modifierAvailableEdgeIds.length > 0, error: modifierAvailableEdgeIds.length ? null : current.error } : current)}
          onClear={() => setEdgeModifier((current) => current?.prepared ? { ...current, selectedEdgeIds: [], preview: null, busy: false, error: "Selecciona al menos un borde resaltado" } : current)}
          onRemoveFeature={removeEdgeTreatment}
          onApply={applyEdgeModifier}
          onCancel={cancelEdgeModifier}
        />
      ) : null}
      {topPanel ? (
        <TopActionPanel
          panel={topPanel}
          projectName={projectName}
          shapeCount={exportableShapeCount}
          scopeLabel={exportScopeLabel}
          onClose={() => setTopPanel(null)}
          onExport={exportDesign}
          onExportSkf={exportSkfDesign}
          onExportStep={exportStepDesign}
          sharedProjectsEnabled={sharedProjectsEnabled}
          skfExporting={skfExporting}
          stepExporting={stepExporting}
          onImportFiles={selectFiles}
          onPickFile={() => fileInputRef.current?.click()}
          onPickProjectFile={() => projectFileInputRef.current?.click()}
          onNotice={setNotice}
        />
      ) : null}
      <input
        ref={sketchImageInputRef}
        className="hidden-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void addSketchImageFile(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={sketchVectorInputRef}
        className="hidden-file-input"
        type="file"
        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/bmp"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void addSketchVectorFile(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={projectFileInputRef}
        className="hidden-file-input"
        type="file"
        accept=".skf"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) selectFiles([file]);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept=".stl,.step,.stp,.svg,image/svg+xml"
        onChange={(event) => {
          if (event.currentTarget.files) {
            selectFiles(event.currentTarget.files);
          }
          event.currentTarget.value = "";
        }}
      />
      <div className="editor-toast" role="status">
        {notice}
      </div>
      <pre data-codex-state hidden>
        {debugState}
      </pre>
      <pre data-codex-summary hidden>
        {compactDebugState}
      </pre>
    </div>
  );
}

const sketchReferenceIcons = {
  line: "sketch-tool-line.png",
  bezier: "sketch-tool-bezier-curve.png",
  smooth: "sketch-tool-smooth-curve.png",
  select: "sketch-tool-select.png",
  image: "sketch-tool-add-image.png",
  refine: "sketch-tool-add-or-remove-points.png",
  erase: "sketch-tool-erase.png",
  measure: "sketch-tool-measure.png",
  sketchTo3d: "sketch-tool-sketch-to-3d.png",
  editSketchTo3d: "sketch-tool-edit-sketch-to-3d.png",
} as const;

type SketchReferenceIconName = keyof typeof sketchReferenceIcons;

function SketchReferenceIcon({ name }: { name: SketchReferenceIconName }) {
  return (
    <img
      aria-hidden="true"
      className="sketch-reference-icon"
      data-sketch-icon={name}
      draggable={false}
      src={`/assets/sketchforge/${sketchReferenceIcons[name]}`}
      alt=""
    />
  );
}

function SecondaryToolbar({
  toolbarMode,
  onToolbarModeChange,
  alignMode,
  canAlign,
  canEdgeModify,
  edgeModifierKind,
  canGroup,
  canIntersect,
  canRedo,
  canUngroup,
  canUndo,
  hasClipboard,
  hasSelection,
  mirrorMode,
  sketchActive,
  sketchOperation,
  sketchTool,
  sketchCanUndo,
  sketchCanRedo,
  canEditSketch,
  onNewSketch,
  geometryDrawTool,
  hasGeometryProfile,
  geometryPlaneMode,
  geometryPlaneOffset,
  onGeometryPlaneMode,
  onGeometryPlaneOffset,
  onGeometryDrawTool,
  onGeometryExtrude,
  onGeometryCut,
  onGeometryProfileCancel,
  onEditSketch,
  onSketchTool,
  onSketchImage,
  onSketchText,
  onSketchVector,
  onSketchProject,
  onSketchUndo,
  onSketchRedo,
  onSketchFinish,
  onSketchCancel,
  capSketchActive,
  capSectionName,
  onApplyCapDrawing,
  onCancelCapDrawing,
  onHome,
  onAlign,
  onChamfer,
  onCopy,
  onDelete,
  onDuplicate,
  onDropToWorkplane,
  onGroup,
  onIntersect,
  onFillet,
  onMirror,
  onPaste,
  onRedo,
  onSnap,
  onTips,
  onToggleHidden,
  onUngroup,
  onUndo,
  onWorkplaneTool,
  workplaneMode,
  topologyMode,
  canTopologyPick,
  canTopologyAlign,
  hasTopologySelection,
  onTopologyModeChange,
  onRaiseToWorkplane,
  canPushPull,
  pushPullDistance,
  onPushPullDistanceChange,
  onPushPullApply,
  onTopPanel,
}: {
  toolbarMode: ToolbarMode;
  onToolbarModeChange: (mode: ToolbarMode) => void;
  alignMode: boolean;
  canAlign: boolean;
  canEdgeModify: boolean;
  edgeModifierKind: CadModifierKind | null;
  canGroup: boolean;
  canIntersect: boolean;
  canRedo: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  hasClipboard: boolean;
  hasSelection: boolean;
  mirrorMode: boolean;
  sketchActive: boolean;
  sketchOperation: SketchOperation;
  sketchTool: SketchTool;
  sketchCanUndo: boolean;
  sketchCanRedo: boolean;
  canEditSketch: boolean;
  onNewSketch: () => void;
  geometryDrawTool: Direct2DDrawTool | null;
  hasGeometryProfile: boolean;
  geometryPlaneMode: "auto" | "base" | "offset";
  geometryPlaneOffset: string;
  onGeometryPlaneMode: (mode: "auto" | "base" | "offset") => void;
  onGeometryPlaneOffset: (value: string) => void;
  onGeometryDrawTool: (tool: Direct2DDrawTool) => void;
  onGeometryExtrude: () => void;
  onGeometryCut: () => void;
  onGeometryProfileCancel: () => void;
  onEditSketch: () => void;
  onSketchTool: (tool: SketchTool) => void;
  onSketchImage: () => void;
  onSketchText: () => void;
  onSketchVector: () => void;
  onSketchProject: () => void;
  onSketchUndo: () => void;
  onSketchRedo: () => void;
  onSketchFinish: () => void;
  onSketchCancel: () => void;
  capSketchActive: boolean;
  capSectionName: string;
  onApplyCapDrawing: () => void;
  onCancelCapDrawing: () => void;
  onHome?: () => void;
  onAlign: () => void;
  onChamfer: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDropToWorkplane: () => void;
  onGroup: () => void;
  onIntersect: () => void;
  onFillet: () => void;
  onMirror: () => void;
  onPaste: () => void;
  onRedo: () => void;
  onSnap: () => void;
  onTips: () => void;
  onToggleHidden: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onWorkplaneTool: () => void;
  workplaneMode: boolean;
  topologyMode: "shape" | "face" | "vertex" | "edge";
  canTopologyPick: boolean;
  canTopologyAlign: boolean;
  hasTopologySelection: boolean;
  onTopologyModeChange: (mode: "shape" | "face" | "vertex" | "edge") => void;
  onRaiseToWorkplane: () => void;
  canPushPull: boolean;
  pushPullDistance: string;
  onPushPullDistanceChange: (value: string) => void;
  onPushPullApply: () => void;
  onTopPanel: (panel: TopPanel) => void;
}) {
  const [geometry2dOpen, setGeometry2dOpen] = useState(false);

  useEffect(() => {
    if (!geometry2dOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".geometry-create-section")) setGeometry2dOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGeometry2dOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [geometry2dOpen]);

  const selectToolbarMode = (mode: ToolbarMode) => {
    setGeometry2dOpen(false);
    onTopPanel(null);
    onToolbarModeChange(mode);
  };
  const leftTools = [
    { label: "Copiar", icon: ToolbarCopyIcon, action: onCopy, enabled: hasSelection },
    { label: "Pegar", icon: ToolbarPasteIcon, action: onPaste, enabled: hasClipboard },
    { label: "Duplicar", icon: ToolbarDuplicateIcon, action: onDuplicate, enabled: hasSelection },
    { label: "Eliminar", icon: ToolbarTrashIcon, action: onDelete, enabled: hasSelection },
    { label: "Deshacer", icon: ToolbarUndoIcon, action: onUndo, enabled: canUndo },
    { label: "Rehacer", icon: ToolbarRedoIcon, action: onRedo, enabled: canRedo },
  ];
  const visibilityTools = [
    { label: "Ocultar selección", icon: ToolbarHideSelectedIcon, action: onToggleHidden, enabled: hasSelection },
    { label: "Opciones de visibilidad", icon: ToolbarCaretDownIcon, action: onTips, enabled: hasSelection },
  ];
  const combineTools = [
    { label: "Agrupar", icon: ToolbarGroupIcon, action: onGroup, enabled: canGroup },
    { label: "Desagrupar", icon: ToolbarUngroupIcon, action: onUngroup, enabled: canUngroup },
    { label: "Intersección booleana", icon: ToolbarIntersectionIcon, action: onIntersect, enabled: canIntersect },
  ];
  const modifyTools = [
    { label: "Alinear", icon: ToolbarAlignIcon, action: onAlign, enabled: canAlign || canTopologyAlign, active: alignMode },
    { label: "Reflejar", icon: ToolbarMirrorIcon, action: onMirror, enabled: hasSelection || hasTopologySelection, active: mirrorMode },
    { label: "Ajustar a la rejilla", icon: ToolbarSnapGridIcon, action: onSnap, enabled: hasSelection || hasTopologySelection },
    { label: "Chaflán", icon: ToolbarChamferIcon, action: onChamfer, enabled: canEdgeModify, active: edgeModifierKind === "chamfer" },
    { label: "Redondeo", icon: ToolbarFilletIcon, action: onFillet, enabled: canEdgeModify, active: edgeModifierKind === "fillet" },
  ];
  const arrangeTools = [
    { label: "Plano de trabajo", icon: ToolbarWorkplaneIcon, action: onWorkplaneTool, enabled: true, active: workplaneMode },
    { label: "Bajar al plano de trabajo", icon: ToolbarDropToWorkplaneIcon, action: onDropToWorkplane, enabled: hasSelection || hasTopologySelection },
    { label: "Subir al plano de trabajo", icon: ToolbarRaiseToWorkplaneIcon, action: onRaiseToWorkplane, enabled: hasTopologySelection },
  ];
  const renderToolButton = (tool: (typeof leftTools)[number] | (typeof visibilityTools)[number] | (typeof combineTools)[number] | (typeof modifyTools)[number] | (typeof arrangeTools)[number]) => {
    const { icon: Icon, action, enabled, label } = tool;
    const active = "active" in tool && Boolean(tool.active);
    return (
      <button className={`toolbar-icon ${enabled ? "" : "disabled"} ${active ? "active" : ""}`} key={label} aria-label={label} title={label} onClick={action} disabled={!enabled}>
        <Icon />
      </button>
    );
  };

  const renderSketchDrawingTools = (onFinish: () => void, finishLabel: string, onCancel: () => void) => (
    <>
      <div className="toolbar-section sketch-create-section">
        <div className="toolbar-section-label">Dibujar</div>
        <div className="toolbar-section-tools">
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "line" ? "active" : ""}`} type="button" aria-label="Línea" title="Línea" onClick={() => onSketchTool("line")}>
            <SketchReferenceIcon name="line" />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "bezier" ? "active" : ""}`} type="button" aria-label="Curva Bézier" title="Curva Bézier" onClick={() => onSketchTool("bezier")}>
            <SketchReferenceIcon name="bezier" />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "smooth" ? "active" : ""}`} type="button" aria-label="Curva suave" title="Curva suave" onClick={() => onSketchTool("smooth")}>
            <SketchReferenceIcon name="smooth" />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "circle" ? "active" : ""}`} type="button" aria-label="Círculo" title="Círculo paramétrico" onClick={() => onSketchTool("circle")}>
            <SketchEntityCircleIcon />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "semicircle" ? "active" : ""}`} type="button" aria-label="Semicírculo" title="Semicírculo cerrado" onClick={() => onSketchTool("semicircle")}>
            <SketchEntitySemicircleIcon />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "arc" ? "active" : ""}`} type="button" aria-label="Arco" title="Arco de 90°" onClick={() => onSketchTool("arc")}>
            <SketchEntityArcIcon />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "rectangle" ? "active" : ""}`} type="button" aria-label="Rectángulo" title="Rectángulo centrado" onClick={() => onSketchTool("rectangle")}>
            <SketchEntityRectangleIcon />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "ellipse" ? "active" : ""}`} type="button" aria-label="Elipse" title="Elipse paramétrica" onClick={() => onSketchTool("ellipse")}>
            <SketchEntityCircleIcon />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "polygon" ? "active" : ""}`} type="button" aria-label="Polígono regular" title="Polígono regular paramétrico" onClick={() => onSketchTool("polygon")}>
            <Hexagon />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "slot" ? "active" : ""}`} type="button" aria-label="Ranura" title="Ranura mecánica paramétrica" onClick={() => onSketchTool("slot")}>
            <Minus />
          </button>
          <button
            className="toolbar-icon sketch-tool-icon"
            type="button"
            aria-label="Agregar texto 3D"
            title="Escribir texto y convertirlo en contornos 3D extruibles"
            onClick={onSketchText}
          >
            <Type />
          </button>
          <button
            className="toolbar-icon sketch-tool-icon"
            type="button"
            aria-label="Importar imagen o SVG 3D"
            title="Importar SVG o vectorizar una imagen como contornos 3D extruibles"
            onClick={onSketchVector}
          >
            <FileImage />
          </button>
          <button className="toolbar-icon sketch-tool-icon" type="button" aria-label="Proyectar silueta" title="Proyectar la silueta de las piezas seleccionadas" onClick={onSketchProject}>
            <Pencil />
          </button>
        </div>
      </div>
      <div className="toolbar-section sketch-edit-section">
        <div className="toolbar-section-label">Seleccionar</div>
        <div className="toolbar-section-tools">
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "active" : ""}`} type="button" aria-label="Seleccionar" title="Seleccionar" onClick={() => onSketchTool("select")}>
            <SketchReferenceIcon name="select" />
          </button>
          <button
            className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "" : "disabled"}`}
            type="button"
            aria-label="Agregar imagen"
            title={sketchTool === "select" ? "Agregar imagen" : "Elige Seleccionar para agregar una imagen"}
            onClick={onSketchImage}
            disabled={sketchTool !== "select"}
          >
            <SketchReferenceIcon name="image" />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "refine" ? "active" : ""}`} type="button" aria-label="Agregar o quitar puntos" title="Agregar o quitar puntos" onClick={() => onSketchTool("refine")}>
            <SketchReferenceIcon name="refine" />
          </button>
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "erase" ? "active" : ""}`} type="button" aria-label="Borrar" title="Borrar" onClick={() => onSketchTool("erase")}>
            <SketchReferenceIcon name="erase" />
          </button>
        </div>
      </div>
      <div className="toolbar-section sketch-history-section">
        <div className="toolbar-section-label">Historial</div>
        <div className="toolbar-section-tools">
          <button className={`toolbar-icon ${sketchCanUndo ? "" : "disabled"}`} type="button" aria-label="Deshacer boceto" title="Deshacer" onClick={onSketchUndo} disabled={!sketchCanUndo}>
            <ToolbarUndoIcon />
          </button>
          <button className={`toolbar-icon ${sketchCanRedo ? "" : "disabled"}`} type="button" aria-label="Rehacer boceto" title="Rehacer" onClick={onSketchRedo} disabled={!sketchCanRedo}>
            <ToolbarRedoIcon />
          </button>
        </div>
      </div>
      <div className="toolbar-section sketch-measure-section">
        <div className="toolbar-section-label">Inspeccionar</div>
        <div className="toolbar-section-tools">
          <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "measure" ? "active" : ""}`} type="button" aria-label="Medir" title="Medir" onClick={() => onSketchTool("measure")}>
            <SketchReferenceIcon name="measure" />
          </button>
        </div>
      </div>
      <div className="toolbar-spacer" />
      <div className="toolbar-section sketch-finish-section">
        <div className="toolbar-section-label">Finalizar</div>
        <div className="toolbar-section-tools">
          <button className="sketch-command-button primary" type="button" onClick={onFinish}>
            <Check />
            <span>{finishLabel}</span>
          </button>
          <button className="sketch-command-button cancel" type="button" onClick={onCancel}>
            <X />
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="secondary-toolbar">
      <div className={`toolbar-mode-content ${toolbarMode}`}>
        {toolbarMode === "geometry" && capSketchActive ? (
          renderSketchDrawingTools(
            onApplyCapDrawing,
            capSectionName ? `Aplicar sección «${capSectionName}»` : "Aplicar sección",
            onCancelCapDrawing,
          )
        ) : toolbarMode === "geometry" ? (
          <>
      {onHome ? (
        <div className="tool-group editor-nav-group">
          <div className="toolbar-section toolbar-home-section">
            <div className="toolbar-section-label">Inicio</div>
            <div className="toolbar-section-tools">
              <button className="toolbar-icon editor-home-control" aria-label="Panel de inicio" title="Panel de inicio" onClick={onHome}>
                <ToolbarHomeIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="tool-group left">
        <div className="toolbar-section">
          <div className="toolbar-section-label">Portapapeles</div>
          <div className="toolbar-section-tools">{leftTools.slice(0, 4).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section">
          <div className="toolbar-section-label">Historial</div>
          <div className="toolbar-section-tools">{leftTools.slice(4).map(renderToolButton)}</div>
        </div>
      </div>
      <div className="toolbar-section toolbar-selection-mode-section">
        <div className="toolbar-section-label">Seleccionar</div>
        <div className="toolbar-section-tools">
          <button
            className={`toolbar-icon selection-mode-chip ${topologyMode === "shape" ? "active" : ""}`}
            type="button"
            aria-label="Seleccionar cuerpo"
            title="Seleccionar cuerpo completo (K)"
            onClick={() => onTopologyModeChange("shape")}
          >
            <span>Cuerpo (K)</span>
          </button>
          <button
            className={`toolbar-icon selection-mode-chip ${topologyMode === "face" ? "active" : ""} ${canTopologyPick ? "" : "disabled"}`}
            type="button"
            aria-label="Seleccionar cara"
            title={canTopologyPick ? "Cara (C) — arrastra para empujar/estirar; Alt+arrastra para deslizar la cara en su plano" : "Selecciona una sola pieza desbloqueada"}
            onClick={() => onTopologyModeChange("face")}
          >
            <span>Cara (C)</span>
          </button>
          <button
            className={`toolbar-icon selection-mode-chip ${topologyMode === "vertex" ? "active" : ""} ${canTopologyPick ? "" : "disabled"}`}
            type="button"
            aria-label="Seleccionar vértice"
            title={canTopologyPick ? "Vértice (V) — arrastra un vértice para moverlo; clic en una arista inserta un vértice" : "Selecciona una sola pieza desbloqueada"}
            onClick={() => onTopologyModeChange("vertex")}
          >
            <span>Vértice (V)</span>
          </button>
          <button
            className={`toolbar-icon selection-mode-chip ${topologyMode === "edge" ? "active" : ""} ${canTopologyPick ? "" : "disabled"}`}
            type="button"
            aria-label="Seleccionar línea"
            title={canTopologyPick ? "Líneas (L) — arrastra una arista para moverla y estirar las caras adyacentes" : "Selecciona una sola pieza desbloqueada"}
            onClick={() => onTopologyModeChange("edge")}
          >
            <span>Líneas (L)</span>
          </button>
          {canPushPull ? (
            <form
              className="push-pull-control"
              onSubmit={(event) => {
                event.preventDefault();
                onPushPullApply();
              }}
            >
              <input
                className="push-pull-input"
                type="number"
                step="0.1"
                aria-label="Distancia de empujar/estirar"
                title="Distancia en mm (positiva estira hacia afuera, negativa empuja hacia adentro)"
                value={pushPullDistance}
                onChange={(event) => onPushPullDistanceChange(event.currentTarget.value)}
              />
              <button className="action-icon-button" type="submit" aria-label="Aplicar empujar/estirar" title="Aplicar empujar/estirar">
                <ToolbarPushPullIcon />
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="toolbar-section geometry-create-section">
        <div className="toolbar-section-label">Crear</div>
        <div className="toolbar-section-tools">
          <button
            className={`geometry-2d-trigger ${geometry2dOpen || geometryDrawTool || hasGeometryProfile ? "active" : ""}`}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={geometry2dOpen}
            onClick={() => setGeometry2dOpen((open) => !open)}
            title="Planos y dibujo 2D directo sobre el espacio 3D"
          >
            <SketchEntityRectangleIcon />
            <span>2D</span>
          </button>
          {geometry2dOpen ? (
            <div className="geometry-2d-popover" role="dialog" aria-label="Dibujo 2D en geometría" onPointerDown={(event) => event.stopPropagation()}>
              <div className="geometry-2d-popover-header">
                <div><strong>Dibujo 2D</strong><span>Directo sobre el viewport 3D</span></div>
                <button type="button" onClick={() => setGeometry2dOpen(false)} aria-label="Cerrar herramientas 2D"><X size={16} /></button>
              </div>
              <div className="geometry-2d-popover-group">
                <span className="geometry-2d-popover-label">Plano</span>
                <div className="geometry-2d-popover-row">
                  <button className={geometryPlaneMode === "auto" ? "active" : ""} type="button" onClick={() => onGeometryPlaneMode("auto")} title="Detectar automáticamente la superficie bajo el cursor"><span>Superficie</span></button>
                  <button className={geometryPlaneMode === "base" ? "active" : ""} type="button" onClick={() => onGeometryPlaneMode("base")}><span>Base</span></button>
                  <button className={geometryPlaneMode === "offset" ? "active" : ""} type="button" onClick={() => onGeometryPlaneMode("offset")}><span>Offset</span></button>
                  {geometryPlaneMode === "offset" ? <input type="number" step="0.1" aria-label="Elevación del plano" value={geometryPlaneOffset} onChange={(event) => onGeometryPlaneOffset(event.currentTarget.value)} /> : null}
                </div>
              </div>
              <div className="geometry-2d-popover-group">
                <span className="geometry-2d-popover-label">Dibujar</span>
                <div className="geometry-2d-popover-row geometry-2d-tool-row">
                  <button className={geometryDrawTool === "pencil" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("pencil"); setGeometry2dOpen(false); }}><Pencil /><span>Lápiz</span></button>
                  <button className={geometryDrawTool === "circle" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("circle"); setGeometry2dOpen(false); }}><SketchEntityCircleIcon /><span>Círculo</span></button>
                  <button className={geometryDrawTool === "semicircle" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("semicircle"); setGeometry2dOpen(false); }}><SketchEntitySemicircleIcon /><span>Semicírculo</span></button>
                  <button className={geometryDrawTool === "arc" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("arc"); setGeometry2dOpen(false); }}><SketchEntityArcIcon /><span>Arco</span></button>
                  <button className={geometryDrawTool === "rectangle" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("rectangle"); setGeometry2dOpen(false); }}><SketchEntityRectangleIcon /><span>Rectángulo</span></button>
                  <button className={geometryDrawTool === "triangle" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("triangle"); setGeometry2dOpen(false); }}><Triangle /><span>Triángulo</span></button>
                  <button className={geometryDrawTool === "hexagon" ? "active" : ""} type="button" onClick={() => { onGeometryDrawTool("hexagon"); setGeometry2dOpen(false); }}><Hexagon /><span>Hexágono</span></button>
                </div>
              </div>
              <div className="geometry-2d-popover-group">
                <span className="geometry-2d-popover-label">Operación</span>
                <div className="geometry-2d-popover-row geometry-2d-operation-row">
                  <label><span>Profundidad</span><input type="number" step="0.1" min="0.1" value={pushPullDistance} onChange={(event) => onPushPullDistanceChange(event.currentTarget.value)} /></label>
                  <button className="primary" type="button" onClick={() => { onGeometryExtrude(); setGeometry2dOpen(false); }} disabled={!hasGeometryProfile}><ToolbarPushPullIcon /><span>Extruir</span></button>
                  <button type="button" onClick={() => { onGeometryCut(); setGeometry2dOpen(false); }} disabled={!hasGeometryProfile}><Minus /><span>Cortar</span></button>
                  <button type="button" onClick={() => { onGeometryProfileCancel(); setGeometry2dOpen(false); }} disabled={!geometryDrawTool && !hasGeometryProfile}><X /><span>Cancelar</span></button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="toolbar-spacer" />
      <div className="tool-group right">
        <div className="toolbar-section compact">
          <div className="toolbar-section-label">Visibilidad</div>
          <div className="toolbar-section-tools">{visibilityTools.map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section">
          <div className="toolbar-section-label">Combinar</div>
          <div className="toolbar-section-tools">{combineTools.map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section">
          <div className="toolbar-section-label">Modificar</div>
          <div className="toolbar-section-tools">{modifyTools.map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section">
          <div className="toolbar-section-label">Organizar</div>
          <div className="toolbar-section-tools">{arrangeTools.map(renderToolButton)}</div>
        </div>
      </div>
      <div className="toolbar-section toolbar-actions-section">
        <div className="toolbar-section-label">Gestionar</div>
        <div className="action-buttons">
          <button className="action-icon-button" aria-label="Importar" title="Importar" onClick={() => onTopPanel("import")}>
            <ToolbarImportIcon />
          </button>
          <button className="action-icon-button" aria-label="Exportar" title="Exportar" onClick={() => onTopPanel("export")}>
            <ToolbarVectorExportIcon />
          </button>
          <button className="action-icon-button" aria-label="Configuración del espacio de trabajo" title="Configuración del espacio de trabajo" onClick={() => window.dispatchEvent(new Event("sketchforge:open-workspace-settings"))}>
            <ToolbarSettingsIcon />
          </button>
        </div>
      </div>
          </>
        ) : (
          <div className="sketch-toolbar-ribbon" aria-label="Barra de herramientas de boceto">
            {sketchActive || capSketchActive ? (
              renderSketchDrawingTools(
                capSketchActive ? onApplyCapDrawing : onSketchFinish,
                capSketchActive
                  ? (capSectionName ? `Aplicar sección «${capSectionName}»` : "Aplicar sección")
                  : (sketchOperation === "revolve" ? "Crear sólido revolucionado" : "Crear sólido 3D"),
                capSketchActive ? onCancelCapDrawing : onSketchCancel,
              )
            ) : (
              <div className="toolbar-section sketch-start-section">
                <div className="toolbar-section-label">Crear</div>
                <div className="toolbar-section-tools">
                  <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label="Nuevo boceto"
                    title="Crear un boceto 2D independiente"
                    onClick={onNewSketch}
                  >
                    <SketchReferenceIcon name="sketchTo3d" />
                    <span>Nuevo boceto</span>
                  </button>
                  <button className={`sketch-command-button ${canEditSketch ? "" : "disabled"}`} type="button" aria-label="Editar boceto a 3D" title="Editar boceto a 3D" onClick={onEditSketch} disabled={!canEditSketch}>
                    <SketchReferenceIcon name="editSketchTo3d" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="toolbar-workspace-tabs" role="tablist" aria-label="Modo de editor">
        <button
          className={toolbarMode === "geometry" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={toolbarMode === "geometry"}
          onClick={() => selectToolbarMode("geometry")}
        >
          Geometría
        </button>
        <button
          className={toolbarMode === "sketch" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={toolbarMode === "sketch"}
          onClick={() => selectToolbarMode("sketch")}
        >
          Boceto
        </button>
      </div>
    </div>
  );
}

function TopActionPanel({
  panel,
  projectName,
  shapeCount,
  scopeLabel,
  onClose,
  onExport,
  onExportSkf,
  onExportStep,
  sharedProjectsEnabled,
  skfExporting,
  stepExporting,
  onImportFiles,
  onPickFile,
  onPickProjectFile,
  onNotice,
}: {
  panel: Exclude<TopPanel, null>;
  projectName: string;
  shapeCount: number;
  scopeLabel: "seleccionado" | "total";
  onClose: () => void;
  onExport: (format: DirectExportFormat, exportName: string) => void;
  onExportSkf: (exportName: string, historyLimit: SkfHistoryLimit, target?: SkfExportTarget) => void;
  onExportStep: (exportName: string) => void;
  sharedProjectsEnabled: boolean;
  skfExporting: boolean;
  stepExporting: boolean;
  onImportFiles: (files: FileList | File[]) => void;
  onPickFile: () => void;
  onPickProjectFile: () => void;
  onNotice: (message: string) => void;
}) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("stl");
  const [exportName, setExportName] = useState(projectName);
  const [skfHistoryLimit, setSkfHistoryLimit] = useState<SkfHistoryLimit>("unlimited");
  const skfHistoryLimits: readonly SkfHistoryLimit[] = ["unlimited", 100, 50, 30];
  const skfHistoryLimitIndex = skfHistoryLimits.indexOf(skfHistoryLimit);
  const title =
    panel === "profile"
      ? "Perfil"
      : panel === "settings"
        ? "Configuración"
        : panel === "tips"
          ? "Consejos"
          : panel === "export"
            ? "Exportar"
            : "Importar";

  const exportDetails: Record<ExportFormat, { label: string; description: string; note: string }> = {
    stl: {
      label: "STL",
      description: "Malla para impresión 3D",
      note: "Ideal para laminadores e impresión 3D. La geometría se exporta como una malla triangulada.",
    },
    obj: {
      label: "OBJ",
      description: "Malla 3D universal",
      note: "Un formato de malla ampliamente compatible para modelado, renderizado e intercambio.",
    },
    step: {
      label: "STEP",
      description: "CAD / B-Rep",
      note: "Conserva las cajas, cilindros, esferas y conos compatibles como geometría CAD precisa.",
    },
    svg: {
      label: "SVG",
      description: "Vector en vista superior",
      note: "Exporta una silueta limpia en vista superior en milímetros, incluyendo agujeros y contornos curvos.",
    },
    skf: {
      label: "SKF",
      description: "Proyecto editable",
      note: "Conserva el proyecto editable, el historial de deshacer/rehacer, bocetos, grupos, datos CAD y fuentes importadas.",
    },
  };
  const selectedExport = exportDetails[exportFormat];
  const runSelectedExport = () => {
    if (exportFormat === "step") onExportStep(exportName);
    else if (exportFormat === "skf") onExportSkf(exportName, skfHistoryLimit);
    else onExport(exportFormat, exportName);
  };

  return (
    <div
      className={`top-action-panel ${panel === "export" ? "export-action-panel" : panel === "import" ? "import-action-panel" : ""}`}
      role="dialog"
      aria-label={title}
    >
      <header>
        <div className="top-action-heading">
          <strong>{title}</strong>
        </div>
        <button aria-label={`Cerrar ${title}`} onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {panel === "import" ? (
        <div className="top-action-body">
          <button className="open-skf-project-button" type="button" onClick={onPickProjectFile}>
            <span className="open-skf-project-icon"><FolderOpen size={18} /></span>
            <span>
              <strong>Abrir proyecto de SketchForge</strong>
              <small>Restaurar un archivo .skf editable como un nuevo proyecto local</small>
            </span>
          </button>
          <div className="import-kind-divider"><span>o agregar geometría</span></div>
          <button
            className="import-drop-zone"
            onClick={onPickFile}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length > 0) {
                onImportFiles(event.dataTransfer.files);
              }
            }}
          >
            <ToolbarImportIcon />
            <strong>Suelta archivos STL, STEP o SVG</strong>
            <span>o haz clic para elegir desde tu computadora</span>
          </button>
        </div>
      ) : null}
      {panel === "export" ? (
        <div className="export-dialog-body">
          <section className="export-setting-section export-file-section">
            <label htmlFor="export-file-name">Nombre del archivo</label>
            <div className="export-file-input-wrap">
              <input
                id="export-file-name"
                className="export-file-input"
                value={exportName}
                maxLength={120}
                spellCheck={false}
                onChange={(event) => setExportName(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (shapeCount > 0 || exportFormat === "skf") && !stepExporting && !skfExporting) runSelectedExport();
                }}
              />
              <span>.{exportFormat}</span>
            </div>
          </section>

          <section className="export-setting-section">
            <div className="export-section-heading">
              <div>
                <strong>Formato</strong>
              </div>
              <span className="export-scope-badge">{exportFormat === "skf" ? "Proyecto completo" : `${shapeCount} ${scopeLabel}`}</span>
            </div>
            <div className="export-format-slider" data-format={exportFormat} role="radiogroup" aria-label="Formato de exportación">
              {(["stl", "obj", "step", "svg", "skf"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="radio"
                  aria-checked={exportFormat === format}
                  aria-label={`${exportDetails[format].label}: ${exportDetails[format].description}`}
                  onClick={() => setExportFormat(format)}
                >
                  {exportDetails[format].label}
                </button>
              ))}
            </div>
          </section>

          {exportFormat === "skf" ? (
            <section className="export-setting-section skf-history-section">
              <div className="export-section-heading">
                <div>
                  <strong>Historial de acciones guardadas</strong>
                  <span>Elige cuántas acciones de deshacer recientes se incluyen con el proyecto</span>
                </div>
              </div>
              <div className="skf-history-range-control" data-limit={String(skfHistoryLimit)}>
                <input
                  className="skf-history-range"
                  type="range"
                  min={0}
                  max={skfHistoryLimits.length - 1}
                  step={1}
                  value={skfHistoryLimitIndex}
                  aria-label="Historial de acciones SKF guardadas"
                  aria-valuetext={skfHistoryLimit === "unlimited" ? "Ilimitado" : `${skfHistoryLimit} acciones`}
                  onChange={(event) => setSkfHistoryLimit(skfHistoryLimits[Number(event.currentTarget.value)] ?? "unlimited")}
                />
              </div>
              <div className="skf-history-range-labels" aria-hidden="true">
                {skfHistoryLimits.map((limit) => (
                  <span key={limit} className={skfHistoryLimit === limit ? "active" : undefined}>
                    {limit === "unlimited" ? "Ilimitado" : limit}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="export-format-summary">
            <div>
              <strong>{selectedExport.label}</strong>
              <span>{selectedExport.description}</span>
            </div>
            <p>{selectedExport.note}</p>
          </div>

          <footer className="export-dialog-footer">
            <div>
              {exportFormat === "skf" && sharedProjectsEnabled ? (
                <button
                  className="export-shared-button"
                  type="button"
                  onClick={() => onExportSkf(exportName, skfHistoryLimit, "shared")}
                  disabled={skfExporting || stepExporting}
                >
                  <CloudUpload />
                  <span>Guardar en compartido</span>
                </button>
              ) : null}
              <button className="export-primary-button" onClick={runSelectedExport} disabled={(shapeCount === 0 && exportFormat !== "skf") || stepExporting || skfExporting}>
                <Download />
                {exportFormat === "skf" ? (skfExporting ? "Guardando proyecto…" : "Guardar proyecto de SketchForge") : null}
                <span hidden={exportFormat === "skf"}>
                {stepExporting && exportFormat === "step" ? "Generando STEP…" : `Exportar ${selectedExport.label}`}
                </span>
              </button>
            </div>
          </footer>
        </div>
      ) : null}
      {panel === "tips" ? (
        <div className="top-action-body">
          <p>Haz clic en una forma para seleccionarla. Usa el inspector para dimensiones, rotación, sólido/agujero, color, duplicar y eliminar.</p>
        </div>
      ) : null}
      {panel === "settings" ? (
        <div className="top-action-body">
          <p>Preferencias del espacio de trabajo</p>
          <button onClick={() => onNotice("La visualización de la rejilla se controla desde el diálogo de Configuración en la esquina inferior derecha")}>Rejilla y ajuste</button>
          <button onClick={() => onNotice("Las unidades están configuradas en milímetros")}>Unidades: Milímetros</button>
          <button onClick={() => onNotice("Las sombras y la iluminación con trazado de rayos están activadas")}>Iluminación y sombras</button>
        </div>
      ) : null}
      {panel === "profile" ? (
        <div className="top-action-body">
          <button onClick={() => onNotice("Menú de cuenta abierto")}>Cuenta</button>
          <button onClick={() => onNotice("Panel abierto")}>Panel</button>
          <button onClick={() => onNotice("Cierre de sesión seleccionado")}>Cerrar sesión</button>
        </div>
      ) : null}
    </div>
  );
}
