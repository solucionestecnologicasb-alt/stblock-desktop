export type CadModifierKind = "chamfer" | "fillet";

export type CadModifierEdge = {
  id: number;
  owner?: number;
  points: number[];
  display: boolean;
  selectable: boolean;
  angle: number;
  boundary: boolean;
  manifold: boolean;
};

export type CadModifierQuality = "draft" | "standard" | "fine";

export type CadModifierDisplayEdge = {
  points: number[];
};

export type CadModifierPrimitivePart = {
  kind: "box";
  width: number;
  depth: number;
  height: number;
  transform?: number[];
};

export type CadModifierMeshPart = {
  positions?: Float32Array;
  indices?: Uint32Array;
  brep?: string;
  brepTransform?: number[];
  primitive?: CadModifierPrimitivePart;
  hole: boolean;
};

export type CadModifierComponentMesh = {
  owner: number;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  brep: string;
  displayEdges: CadModifierDisplayEdge[];
};

/**
 * A face of a solid reconstructed from a shape mesh. Coordinates are in the
 * solid's local frame (the same frame the shape mesh uses: centered in X/Z,
 * extrusion along +Y). `points` is a flat [x, y, z, ...] boundary polyline
 * sampled from the face's edges, used for hover highlighting.
 */
export type CadTopologyFace = {
  id: number;
  center: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  area: number;
  points: number[];
};

export type CadTopologyVertex = {
  id: number;
  x: number;
  y: number;
  z: number;
};

/**
 * An edge (line) of a solid reconstructed from a shape mesh. Coordinates are
 * in the same local/world frame as the shape mesh. `points` is a flat
 * [x, y, z, ...] polyline sampled along the curve, used for hover picking and
 * overlay rendering. `endpoints` are the two boundary vertex positions, used
 * for dragging the edge (moving both endpoints stretches the adjacent faces).
 */
export type CadTopologyEdge = {
  id: number;
  center: { x: number; y: number; z: number };
  points: number[];
  endpoints: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }];
};

/**
 * A pick (selection) of a topology entity. OCCT hash ids are unstable across
 * separate reconstructions, so multi-selection stores the pick id only for
 * display; position-based anchors drive the actual edits.
 */
export type CadTopologyPickKind = "face" | "vertex" | "edge";

export type CadTopologyPick = {
  kind: CadTopologyPickKind;
  id: number;
};

export type CadModifierWorkerRequest =
  | { type: "prepare"; requestId: number; parts: CadModifierMeshPart[]; sharpAngle: number; suppressTreatmentDetailEdges?: boolean }
  | {
      type: "preview";
      requestId: number;
      kind: CadModifierKind;
      edgeIds: number[];
      amount: number;
      quality: CadModifierQuality;
      chamferAngle: number;
    }
  | { type: "collectTopology"; requestId: number; parts: CadModifierMeshPart[] }
  | {
      type: "boolean";
      requestId: number;
      base: CadModifierMeshPart[];
      tool: CadModifierMeshPart[];
      operation: "fuse" | "cut";
    }
  | {
      type: "extrudeFace";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Center of the face being pushed/pulled. OCCT face hashes are unstable
      // across separate reconstructions, so the worker locates the face by
      // matching this center position instead of a hash id.
      faceCenter: { x: number; y: number; z: number };
      // Signed distance along the face normal: positive pulls outward (fuse),
      // negative pushes inward (cut = pocket / through hole).
      distance: number;
    }
  | {
      type: "moveTopologyVertex";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Original (pivot) position of the dragged vertex. OCCT vertex hashes are
      // unstable across separate reconstructions, so the worker locates the
      // vertex by matching this position instead of a hash id.
      from: { x: number; y: number; z: number };
      // Target position in the same (world) frame as the mesh parts.
      position: { x: number; y: number; z: number };
    }
  | {
      type: "moveTopologyFace";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Center of the face being slid laterally. OCCT face hashes are unstable
      // across separate reconstructions, so the worker locates the face by
      // matching this center position instead of a hash id.
      faceCenter: { x: number; y: number; z: number };
      // Lateral slide offset applied to every vertex of the face.
      offset: { x: number; y: number; z: number };
    }
  | {
      type: "addVertexOnEdge";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Click point in the same (world) frame as the mesh parts; the worker
      // snaps it onto the nearest edge before splitting the tessellation.
      position: { x: number; y: number; z: number };
    }
  | {
      type: "moveTopologyEdge";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Displacements for the two boundary vertices of the edge being dragged.
      // `from` is the original world-space vertex position; the worker moves
      // every mesh vertex near `from` to `to`, stretching the adjacent faces.
      endpoints: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }>;
    }
  | {
      type: "moveTopologyVertices";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Displacements for several topology vertices at once (multi-selection
      // drag / nudge / align / snap). The worker moves every mesh vertex near
      // each `from` to the matching `to` in a single deform pass.
      updates: Array<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } }>;
    }
  | {
      type: "moveTopologyFaces";
      requestId: number;
      parts: CadModifierMeshPart[];
      // Lateral slide specs for several faces at once (multi-selection face
      // slide / align / snap). Each face is located by its center position,
      // then every vertex of the face is displaced by `offset`.
      faces: Array<{ center: { x: number; y: number; z: number }; offset: { x: number; y: number; z: number } }>;
    }
  | { type: "dispose"; requestId: number };

export type CadModifierWorkerResponse =
  | { type: "ready"; requestId: number; edges: CadModifierEdge[]; selectableEdgeIds: number[]; sourceType: string }
  | {
      type: "preview";
      requestId: number;
      positions: Float32Array;
      normals: Float32Array;
      indices: Uint32Array;
      triangleCount: number;
      brep: string;
      displayEdges: CadModifierDisplayEdge[];
      components?: CadModifierComponentMesh[];
    }
  | {
      type: "topology";
      requestId: number;
      // "occt" topology comes from the B-Rep solid reconstruction; "mesh"
      // topology is the approximate fallback derived from the triangle mesh
      // when the imported mesh cannot be healed into a closed CAD solid.
      mode: "occt" | "mesh";
      faces: CadTopologyFace[];
      vertices: CadTopologyVertex[];
      edges: CadTopologyEdge[];
    }
  | { type: "disposed"; requestId: number }
  | { type: "error"; requestId: number; message: string; resetSession?: boolean };
