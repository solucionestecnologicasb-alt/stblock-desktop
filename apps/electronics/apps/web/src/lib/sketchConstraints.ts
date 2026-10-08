// 2D sketch constraint solver (FreeCAD Sketcher-lite).
//
// Constraints operate on sketch points (x/z) and segments (pairs of point ids).
// The solver runs Gauss-Seidel-style iterative relaxation: each constraint is
// evaluated in turn and its residual is projected onto the affected points.
// Repeated passes converge toward a configuration satisfying (within tolerance)
// the constraints that are geometrically compatible.
//
// Pure and dependency-free so it is unit-testable.

export type SketchConstraint =
  | { id: string; kind: "coincident"; pointA: string; pointB: string }
  | { id: string; kind: "horizontal"; segmentId: string }
  | { id: string; kind: "vertical"; segmentId: string }
  | { id: string; kind: "parallel"; segmentA: string; segmentB: string }
  | { id: string; kind: "perpendicular"; segmentA: string; segmentB: string }
  | { id: string; kind: "tangent"; segmentA: string; segmentB: string }
  | { id: string; kind: "symmetry"; pointA: string; pointB: string; axisSegmentId?: string; centerPointId?: string }
  | { id: string; kind: "fixed"; pointId: string }
  | { id: string; kind: "distance"; pointA: string; pointB: string; value: number }
  | { id: string; kind: "angle"; segmentA: string; segmentB: string; value: number };

export type SolverPoint = {
  id: string;
  x: number;
  z: number;
  // Points produced by parametric entities should not be moved directly.
  generated?: boolean;
};

export type SolverSegment = {
  id: string;
  startId: string;
  endId: string;
  generated?: boolean;
};

export type SketchSolverState = {
  points: SolverPoint[];
  segments: SolverSegment[];
  constraints: SketchConstraint[];
};

export type SolveResult = {
  points: SolverPoint[];
  converged: boolean;
  iterations: number;
  maxResidual: number;
};

export const SKETCH_SOLVER_DEFAULTS = {
  maxIterations: 200,
  tolerance: 1e-4,
};

function pointPosition(points: Map<string, SolverPoint>, id: string): { x: number; z: number } | null {
  const point = points.get(id);
  return point ? { x: point.x, z: point.z } : null;
}

function segmentEndpoints(segments: Map<string, SolverSegment>, id: string) {
  const segment = segments.get(id);
  if (!segment) return null;
  return { startId: segment.startId, endId: segment.endId };
}

function deltaMagnitude(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(bx - ax, bz - az);
}

function canMove(points: Map<string, SolverPoint>, fixedIds: Set<string>, id: string) {
  return !fixedIds.has(id) && !points.get(id)?.generated;
}

/**
 * Apply a single relaxation pass over all constraints. Returns the maximum
 * residual (in model units) produced by the pass.
 */
function applyPass(state: SketchSolverState, points: Map<string, SolverPoint>, segments: Map<string, SolverSegment>, fixedIds: Set<string>) {
  let maxResidual = 0;
  const recordResidual = (residual: number) => {
    if (Number.isFinite(residual)) maxResidual = Math.max(maxResidual, Math.abs(residual));
  };

  for (const constraint of state.constraints) {
    switch (constraint.kind) {
      case "fixed": {
        // Fixed points are never moved.
        break;
      }
      case "coincident": {
        const a = pointPosition(points, constraint.pointA);
        const b = pointPosition(points, constraint.pointB);
        if (!a || !b) break;
        const mx = (a.x + b.x) / 2;
        const mz = (a.z + b.z) / 2;
        recordResidual(Math.hypot(a.x - b.x, a.z - b.z));
        const moveA = canMove(points, fixedIds, constraint.pointA);
        const moveB = canMove(points, fixedIds, constraint.pointB);
        if (moveA) {
          points.get(constraint.pointA)!.x = mx;
          points.get(constraint.pointA)!.z = mz;
        }
        if (moveB) {
          points.get(constraint.pointB)!.x = mx;
          points.get(constraint.pointB)!.z = mz;
        }
        break;
      }
      case "horizontal": {
        const endpoints = segmentEndpoints(segments, constraint.segmentId);
        if (!endpoints) break;
        const a = pointPosition(points, endpoints.startId);
        const b = pointPosition(points, endpoints.endId);
        if (!a || !b) break;
        const mid = (a.z + b.z) / 2;
        recordResidual(b.z - a.z);
        if (canMove(points, fixedIds, endpoints.startId)) points.get(endpoints.startId)!.z = mid;
        if (canMove(points, fixedIds, endpoints.endId)) points.get(endpoints.endId)!.z = mid;
        break;
      }
      case "vertical": {
        const endpoints = segmentEndpoints(segments, constraint.segmentId);
        if (!endpoints) break;
        const a = pointPosition(points, endpoints.startId);
        const b = pointPosition(points, endpoints.endId);
        if (!a || !b) break;
        const mid = (a.x + b.x) / 2;
        recordResidual(b.x - a.x);
        if (canMove(points, fixedIds, endpoints.startId)) points.get(endpoints.startId)!.x = mid;
        if (canMove(points, fixedIds, endpoints.endId)) points.get(endpoints.endId)!.x = mid;
        break;
      }
      case "distance": {
        const a = pointPosition(points, constraint.pointA);
        const b = pointPosition(points, constraint.pointB);
        if (!a || !b) break;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        const target = Math.max(1e-9, Math.abs(constraint.value));
        recordResidual(length - target);
        if (length < 1e-9) break;
        const scale = (target - length) / 2;
        const nx = (dx / length) * scale;
        const nz = (dz / length) * scale;
        const move = (id: string, sign: number) => {
          if (!canMove(points, fixedIds, id)) return;
          points.get(id)!.x += nx * sign;
          points.get(id)!.z += nz * sign;
        };
        move(constraint.pointA, -1);
        move(constraint.pointB, 1);
        break;
      }
      case "parallel": {
        const endpointsA = segmentEndpoints(segments, constraint.segmentA);
        const endpointsB = segmentEndpoints(segments, constraint.segmentB);
        if (!endpointsA || !endpointsB) break;
        const a1 = pointPosition(points, endpointsA.startId);
        const a2 = pointPosition(points, endpointsA.endId);
        const b1 = pointPosition(points, endpointsB.startId);
        const b2 = pointPosition(points, endpointsB.endId);
        if (!a1 || !a2 || !b1 || !b2) break;
        const dax = a2.x - a1.x;
        const daz = a2.z - a1.z;
        const dbx = b2.x - b1.x;
        const dbz = b2.z - b1.z;
        const daLength = Math.hypot(dax, daz);
        const dbLength = Math.hypot(dbx, dbz);
        if (daLength < 1e-9 || dbLength < 1e-9) break;
        // Rotate segment B to be parallel to A (keep its midpoint fixed).
        const midX = (b1.x + b2.x) / 2;
        const midZ = (b1.z + b2.z) / 2;
        const half = dbLength / 2;
        const ux = dax / daLength;
        const uz = daz / daLength;
        const signed = (dbx * ux + dbz * uz) >= 0 ? 1 : -1;
        const new1 = { x: midX - ux * half * signed, z: midZ - uz * half * signed };
        const new2 = { x: midX + ux * half * signed, z: midZ + uz * half * signed };
        recordResidual(Math.abs(dax / daLength - dbx / dbLength) + Math.abs(daz / daLength - dbz / dbLength));
        if (canMove(points, fixedIds, endpointsB.startId)) {
          points.get(endpointsB.startId)!.x = new1.x;
          points.get(endpointsB.startId)!.z = new1.z;
        }
        if (canMove(points, fixedIds, endpointsB.endId)) {
          points.get(endpointsB.endId)!.x = new2.x;
          points.get(endpointsB.endId)!.z = new2.z;
        }
        break;
      }
      case "perpendicular": {
        const endpointsA = segmentEndpoints(segments, constraint.segmentA);
        const endpointsB = segmentEndpoints(segments, constraint.segmentB);
        if (!endpointsA || !endpointsB) break;
        const a1 = pointPosition(points, endpointsA.startId);
        const a2 = pointPosition(points, endpointsA.endId);
        const b1 = pointPosition(points, endpointsB.startId);
        const b2 = pointPosition(points, endpointsB.endId);
        if (!a1 || !a2 || !b1 || !b2) break;
        const dax = a2.x - a1.x;
        const daz = a2.z - a1.z;
        const dbx = b2.x - b1.x;
        const dbz = b2.z - b1.z;
        const dbLength = Math.hypot(dbx, dbz);
        if (Math.hypot(dax, daz) < 1e-9 || dbLength < 1e-9) break;
        const midX = (b1.x + b2.x) / 2;
        const midZ = (b1.z + b2.z) / 2;
        const ux = -daz / Math.hypot(dax, daz);
        const uz = dax / Math.hypot(dax, daz);
        const half = dbLength / 2;
        const new1 = { x: midX - ux * half, z: midZ - uz * half };
        const new2 = { x: midX + ux * half, z: midZ + uz * half };
        const dot = dax * dbx + daz * dbz;
        recordResidual(Math.abs(dot) / (Math.hypot(dax, daz) * dbLength));
        if (canMove(points, fixedIds, endpointsB.startId)) {
          points.get(endpointsB.startId)!.x = new1.x;
          points.get(endpointsB.startId)!.z = new1.z;
        }
        if (canMove(points, fixedIds, endpointsB.endId)) {
          points.get(endpointsB.endId)!.x = new2.x;
          points.get(endpointsB.endId)!.z = new2.z;
        }
        break;
      }
      case "angle": {
        const endpointsA = segmentEndpoints(segments, constraint.segmentA);
        const endpointsB = segmentEndpoints(segments, constraint.segmentB);
        if (!endpointsA || !endpointsB) break;
        const a1 = pointPosition(points, endpointsA.startId);
        const a2 = pointPosition(points, endpointsA.endId);
        const b1 = pointPosition(points, endpointsB.startId);
        const b2 = pointPosition(points, endpointsB.endId);
        if (!a1 || !a2 || !b1 || !b2) break;
        const dax = a2.x - a1.x;
        const daz = a2.z - a1.z;
        const dbx = b2.x - b1.x;
        const dbz = b2.z - b1.z;
        const dbLength = Math.hypot(dbx, dbz);
        const daLength = Math.hypot(dax, daz);
        if (daLength < 1e-9 || dbLength < 1e-9) break;
        const targetRad = (constraint.value * Math.PI) / 180;
        const currentAngle = Math.atan2(daz, dax);
        const targetAngle = currentAngle + targetRad;
        const ux = Math.cos(targetAngle);
        const uz = Math.sin(targetAngle);
        const midX = (b1.x + b2.x) / 2;
        const midZ = (b1.z + b2.z) / 2;
        const half = dbLength / 2;
        const new1 = { x: midX - ux * half, z: midZ - uz * half };
        const new2 = { x: midX + ux * half, z: midZ + uz * half };
        const residual = currentAngle - (Math.atan2(dbz, dbx) - targetRad);
        recordResidual(residual);
        if (canMove(points, fixedIds, endpointsB.startId)) {
          points.get(endpointsB.startId)!.x = new1.x;
          points.get(endpointsB.startId)!.z = new1.z;
        }
        if (canMove(points, fixedIds, endpointsB.endId)) {
          points.get(endpointsB.endId)!.x = new2.x;
          points.get(endpointsB.endId)!.z = new2.z;
        }
        break;
      }
      case "tangent": {
        // Approximate tangency between two line segments sharing an endpoint:
        // force their directions to be collinear.
        const endpointsA = segmentEndpoints(segments, constraint.segmentA);
        const endpointsB = segmentEndpoints(segments, constraint.segmentB);
        if (!endpointsA || !endpointsB) break;
        const a1 = pointPosition(points, endpointsA.startId);
        const a2 = pointPosition(points, endpointsA.endId);
        const b1 = pointPosition(points, endpointsB.startId);
        const b2 = pointPosition(points, endpointsB.endId);
        if (!a1 || !a2 || !b1 || !b2) break;
        const dax = a2.x - a1.x;
        const daz = a2.z - a1.z;
        const dbx = b2.x - b1.x;
        const dbz = b2.z - b1.z;
        const daLength = Math.hypot(dax, daz);
        const dbLength = Math.hypot(dbx, dbz);
        if (daLength < 1e-9 || dbLength < 1e-9) break;
        const uax = dax / daLength;
        const uaz = daz / daLength;
        const ubx = dbx / dbLength;
        const ubz = dbz / dbLength;
        const cross = uax * ubz - uaz * ubx;
        recordResidual(cross);
        // Rotate B to align with A (or anti-align) while keeping its midpoint.
        const midX = (b1.x + b2.x) / 2;
        const midZ = (b1.z + b2.z) / 2;
        const signed = (ubx * uax + ubz * uaz) >= 0 ? 1 : -1;
        const half = dbLength / 2;
        const new1 = { x: midX - uax * half * signed, z: midZ - uaz * half * signed };
        const new2 = { x: midX + uax * half * signed, z: midZ + uaz * half * signed };
        if (canMove(points, fixedIds, endpointsB.startId)) {
          points.get(endpointsB.startId)!.x = new1.x;
          points.get(endpointsB.startId)!.z = new1.z;
        }
        if (canMove(points, fixedIds, endpointsB.endId)) {
          points.get(endpointsB.endId)!.x = new2.x;
          points.get(endpointsB.endId)!.z = new2.z;
        }
        break;
      }
      case "symmetry": {
        const a = pointPosition(points, constraint.pointA);
        const b = pointPosition(points, constraint.pointB);
        if (!a || !b) break;
        if (constraint.centerPointId) {
          const center = pointPosition(points, constraint.centerPointId);
          if (center) {
            recordResidual(Math.hypot(a.x + b.x - 2 * center.x, a.z + b.z - 2 * center.z));
            const newA = { x: 2 * center.x - b.x, z: 2 * center.z - b.z };
            const newB = { x: 2 * center.x - a.x, z: 2 * center.z - a.z };
            if (canMove(points, fixedIds, constraint.pointA)) {
              points.get(constraint.pointA)!.x = newA.x;
              points.get(constraint.pointA)!.z = newA.z;
            }
            if (canMove(points, fixedIds, constraint.pointB)) {
              points.get(constraint.pointB)!.x = newB.x;
              points.get(constraint.pointB)!.z = newB.z;
            }
          }
        } else if (constraint.axisSegmentId) {
          const axis = segmentEndpoints(segments, constraint.axisSegmentId);
          if (axis) {
            const p1 = pointPosition(points, axis.startId);
            const p2 = pointPosition(points, axis.endId);
            if (p1 && p2) {
              const dx = p2.x - p1.x;
              const dz = p2.z - p1.z;
              const lengthSq = dx * dx + dz * dz;
              if (lengthSq > 1e-12) {
                const reflect = (p: { x: number; z: number }) => {
                  const t = ((p.x - p1.x) * dx + (p.z - p1.z) * dz) / lengthSq;
                  return {
                    x: 2 * (p1.x + dx * t) - p.x,
                    z: 2 * (p1.z + dz * t) - p.z,
                  };
                };
                const reflectedA = reflect(a);
                const reflectedB = reflect(b);
                recordResidual(Math.hypot(a.x - reflectedB.x, a.z - reflectedB.z));
                if (canMove(points, fixedIds, constraint.pointA)) {
                  points.get(constraint.pointA)!.x = reflectedB.x;
                  points.get(constraint.pointA)!.z = reflectedB.z;
                }
                if (canMove(points, fixedIds, constraint.pointB)) {
                  points.get(constraint.pointB)!.x = reflectedA.x;
                  points.get(constraint.pointB)!.z = reflectedA.z;
                }
              }
            }
          }
        }
        break;
      }
    }
  }
  return maxResidual;
}

/**
 * Solve the constraint system. Points that are not constrained keep moving; the
 * result is the first configuration (within tolerance) reached by relaxation.
 */
export function solveSketchConstraints(state: SketchSolverState, options?: Partial<typeof SKETCH_SOLVER_DEFAULTS>): SolveResult {
  const points = new Map(state.points.map((point) => [point.id, { ...point }]));
  const segments = new Map(state.segments.map((segment) => [segment.id, segment]));
  const fixedIds = new Set(
    state.constraints.filter((constraint) => constraint.kind === "fixed").map((constraint) => (constraint as { pointId: string }).pointId),
  );
  const maxIterations = options?.maxIterations ?? SKETCH_SOLVER_DEFAULTS.maxIterations;
  const tolerance = options?.tolerance ?? SKETCH_SOLVER_DEFAULTS.tolerance;

  let converged = false;
  let iterations = 0;
  let maxResidual = Infinity;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    iterations = iteration + 1;
    maxResidual = applyPass(state, points, segments, fixedIds);
    if (maxResidual <= tolerance) {
      converged = true;
      break;
    }
  }
  return {
    points: state.points.map((point) => {
      const next = points.get(point.id);
      return next ? { ...next } : { ...point };
    }),
    converged,
    iterations,
    maxResidual,
  };
}

/**
 * Create a constraint id (local, no runtime dependency).
 */
export function createConstraintId(prefix = "constraint") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
