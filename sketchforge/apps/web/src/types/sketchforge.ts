export type ShapeKind =
  | "box"
  | "cylinder"
  | "sphere"
  | "sketch"
  | "scribble"
  | "cone"
  | "pyramid"
  | "roof"
  | "text"
  | "roundRoof"
  | "halfSphere"
  | "torus"
  | "tube"
  | "gear"
  | "ring"
  | "wedge"
  | "polygon"
  | "icosahedron"
  | "mesh"
  | "assembly";

export type ShapeAsset = {
  id: string;
  name: string;
  src: string;
  kind: ShapeKind;
  color: string;
  hole?: boolean;
};

export type ProjectAssetSourceFormat = "stl" | "obj" | "svg" | "step";

export type ProjectAsset = {
  id: string;
  name: string;
  mediaType: string;
  sourceFormat: ProjectAssetSourceFormat;
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
};

export type GridSize = "Desactivado" | "0.1 mm" | "0.25 mm" | "0.5 mm" | "1.0 mm" | "2.0 mm" | "5.0 mm" | "Ladrillo";
export type MeasurementAccuracy = 1 | 2 | 3;
export type HistoryRetentionLimit = "unlimited" | number;

export type WorkplaneWorkspaceSettings = {
  width: number;
  depth: number;
  sizePreset: string;
  gridBlockSize: number;
  gridBlockPreset: string;
  gridColor: string;
  background: string;
  showShadows: boolean;
  showGrid: boolean;
  cruiseShapes: boolean;
  zoomSpeed: number;
  units: string;
  scale: string;
  accuracy: MeasurementAccuracy;
  historyLimit: HistoryRetentionLimit;
};

export type AlignAxis = "x" | "y" | "z";
export type AlignTarget = "min" | "center" | "max";
export type AlignHandleStatus = {
  axis: AlignAxis;
  target: AlignTarget;
  disabled: boolean;
  aligned: boolean;
  title: string;
};

export type SketchPoint = {
  id: string;
  x: number;
  z: number;
  handleIn?: { x: number; z: number };
  handleOut?: { x: number; z: number };
  mode?: "corner" | "smooth" | "split";
  // Id of the parametric sketch entity that generated this point. Points with
  // this field are "generated" and are filtered from direct editing.
  sourceEntityId?: string;
};

export type SketchSegment = {
  id: string;
  startId: string;
  endId: string;
  kind?: "line" | "bezier" | "smooth";
  // Reference-only geometry: visible and editable but ignored by solid builders.
  construction?: boolean;
  // Id of the parametric sketch entity that generated this segment.
  sourceEntityId?: string;
};

export type SketchImage = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  pixelWidth: number;
  pixelHeight: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  opacity?: number;
  lockAspect?: boolean;
};

export type SketchProfile = {
  points: SketchPoint[];
  segments: SketchSegment[];
  images?: SketchImage[];
  // Parametric 2D primitives (drawn in the CAP plane X/Z; angles in degrees,
  // 0° = +X). They tessellate into points/segments tagged with sourceEntityId.
  entities?: SketchEntity[];
};

// Parametric 2D primitives on the CAP work plane (X/Z).
// Angles are in degrees, 0° points along +X.
export type SketchEntity =
  | { id: string; kind: "circle"; cx: number; cz: number; radius: number }
  | { id: string; kind: "semicircle"; cx: number; cz: number; radius: number; startAngle: number }
  | { id: string; kind: "arc"; cx: number; cz: number; radius: number; startAngle: number; endAngle: number }
  | { id: string; kind: "rectangle"; cx: number; cz: number; width: number; depth: number }
  | { id: string; kind: "ellipse"; cx: number; cz: number; radiusX: number; radiusZ: number; rotation: number }
  | { id: string; kind: "polygon"; cx: number; cz: number; radius: number; sides: number; rotation: number }
  | { id: string; kind: "slot"; cx: number; cz: number; length: number; width: number; rotation: number }
  | { id: string; kind: "text"; cx: number; cz: number; text: string; font: SketchTextFont; size: number; scaleX: number; scaleZ: number; rotation: number }
  | { id: string; kind: "vector"; cx: number; cz: number; name: string; loops: SketchVectorLoop[]; scaleX: number; scaleZ: number; rotation: number; sourceFormat: "svg" | "trace" };

export type SketchTextFont = "Multilanguage" | "Sans" | "Serif" | "Script" | "Monospace" | "Rounded" | "Stencil";
export type SketchVectorPoint = { x: number; z: number };
export type SketchVectorLoop = SketchVectorPoint[];
export type SketchOperation = "extrude" | "revolve" | "sweep";

// Union behavior of a CAP section's generated piece against its host shape
// (the shape owning the face work plane). "floating" keeps the piece
// independent (legacy behavior); "add" fuses the piece into the host; "cut"
// removes the piece's volume from the host (hole/negative space).
export type CapSectionUnionMode = "floating" | "add" | "cut";

export type GearType = "spur" | "helical" | "bevel";

export type SketchRevolveSettings = {
  startAngle: number;
  sweepAngle: number;
  sides: number;
  quality: number;
  thickness: number;
};

export type SketchSweepSettings = {
  radius: number;
  thickness: number;
  quality: number;
};

// Construction planes used by geometry profile operations. Face planes retain
// both a stable topology id (when available) and a geometric fallback so older
// projects remain usable after the source body is edited.
export type WorkplanePlane =
  | { kind: "base" }
  | { kind: "offset"; elevation: number }
  | { kind: "face"; shapeId: string; topologyId?: string; center: [number, number, number]; normal: [number, number, number]; up: [number, number, number] };

export type CapTimelineEntryKind =
  | "section-create"
  | "section-edit"
  | "section-rename"
  | "section-delete"
  | "piece-generate";

export type CapTimelineEntry = {
  id: string;
  kind: CapTimelineEntryKind;
  sectionId?: string;
  shapeId?: string;
  label: string;
  timestamp: number;
};

export type CapSection = {
  id: string;
  name: string;
  plane: WorkplanePlane;
  sketchProfile: SketchProfile;
  operation: SketchOperation;
  extrusionDepth: number;
  // How the generated piece combines with the host shape when the section's
  // plane is a face work plane. Defaults to "floating" when absent.
  unionMode?: CapSectionUnionMode;
  revolveSettings?: SketchRevolveSettings;
  sweepSettings?: SketchSweepSettings;
  resultShapeId?: string;
  createdAt: number;
};

export type CapDocument = {
  sections: CapSection[];
  timeline: CapTimelineEntry[];
  activeSectionId?: string;
};

// Construction options for shapes generated by CAP sections.
export type SketchShapeBuildOptions = {
  elevation?: number;
  capSectionId?: string;
  // Face work plane: the sketch is built in the local +Y frame and the
  // resulting shape is re-oriented so its base lands on this plane. When set,
  // `placement` below is derived from the plane rather than applied directly.
  plane?: {
    normal: [number, number, number];
    up: [number, number, number];
    origin: [number, number, number];
  };
  placement?: {
    x?: number;
    z?: number;
    elevation?: number;
    rotation?: number;
    rotationX?: number;
    rotationZ?: number;
    mirrorX?: boolean;
    mirrorY?: boolean;
    mirrorZ?: boolean;
  };
};

export type EdgeTreatmentFeature = {
  kind: "fillet" | "chamfer";
  amount: number;
  edgeCount: number;
  chamferAngle?: number;
};

export type EdgeTreatmentHistoryEntry = {
  id: string;
  createdAt: number;
  feature: EdgeTreatmentFeature;
  before: WorkplaneShape;
  appliedFrame?: {
    x: number;
    z: number;
    elevation: number;
    width: number;
    depth: number;
    height: number;
    rotation: number;
    rotationX: number;
    rotationZ: number;
    mirrorX: boolean;
    mirrorY: boolean;
    mirrorZ: boolean;
  };
};

export type CadDisplayEdge = {
  points: number[];
};

export type CadBrepFrame = {
  x: number;
  z: number;
  elevation: number;
  width: number;
  depth: number;
  height: number;
  sourceTransform?: number[];
};

export type CadPrimitiveFrame = {
  kind: "box";
  width: number;
  depth: number;
  height: number;
  frame: CadBrepFrame;
};

export type CadConstructionEdge = {
  id: string;
  topologyId?: number;
  partition?: boolean;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  startVertexId?: string;
  endVertexId?: string;
};

export type CadConstructionVertex = {
  id: string;
  topologyId: number;
  position: { x: number; y: number; z: number };
};

export type WorkplaneShape = {
  id: string;
  name: string;
  kind: ShapeKind;
  color: string;
  hole?: boolean;
  x: number;
  z: number;
  elevation?: number;
  size: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  rotationX?: number;
  rotationZ?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  mirrorZ?: boolean;
  radius?: number;
  steps?: number;
  sides?: number;
  bevel?: number;
  segments?: number;
  topRadius?: number;
  baseRadius?: number;
  teeth?: number;
  toothSize?: number;
  toothWidth?: number;
  centerHoleSize?: number;
  gearType?: GearType;
  helixAngle?: number;
  helixQuality?: number;
  text?: string;
  font?: string;
  importedMesh?: {
    positions: number[];
    normals?: number[];
    baseWidth: number;
    baseDepth: number;
    baseHeight: number;
    triangleCount: number;
    sourceFormat: "stl" | "obj" | "svg" | "json" | "step";
    offsetX?: number;
    offsetY?: number;
    offsetZ?: number;
    // IndexedDB persistence uses this only in compact stored shape records.
    // Runtime editor shapes are hydrated with the full immutable mesh resource.
    storageResourceId?: string;
    // Stable reference to the original imported file in the project's shared
    // asset table. Copies and grouped operands reuse this reference.
    assetId?: string;
    // Exact OpenCascade B-Rep of the body (single-shape STEP text) in the same
    // local frame as `positions`. Set only for STEP imports; lets the exporter
    // re-emit the original analytic geometry instead of the tessellation.
    brepStep?: string;
  };
  imagePlate?: {
    dataUrl: string;
    mimeType: string;
    pixelWidth: number;
    pixelHeight: number;
  };
  sketchProfile?: SketchProfile;
  sketchOperation?: SketchOperation;
  sketchRevolve?: SketchRevolveSettings;
  sketchSweep?: SketchSweepSettings;
  edgeTreatments?: EdgeTreatmentFeature[];
  edgeTreatmentHistory?: EdgeTreatmentHistoryEntry[];
  cadDisplayEdges?: CadDisplayEdge[];
  cadDisplayEdgesVersion?: 2;
  edgeResizeMode?: "scale" | "preserve";
  cadBrep?: string;
  cadBrepFrame?: CadBrepFrame;
  cadPrimitiveFrame?: CadPrimitiveFrame;
  cadPartitioned?: boolean;
  // Editable geometry stored in the shape's local coordinate frame. Guide
  // entries remain auxiliary; `partition` entries regenerate real B-Rep edges.
  constructionEdges?: CadConstructionEdge[];
  constructionVertices?: CadConstructionVertex[];
  groupedShapes?: WorkplaneShape[];
  groupedBaseWidth?: number;
  groupedBaseDepth?: number;
  groupedBaseHeight?: number;
  groupOperation?: "group" | "intersection";
  locked?: boolean;
  hidden?: boolean;
  // Id of the CAP section that generated this piece (CAP "piece-generate").
  capSectionId?: string;
};
