import type { SketchProfile, SketchSegment, SketchPoint } from "@/types/sketchforge";
import { createLocalId } from "./localIds";

function distance(p1: { x: number; z: number }, p2: { x: number; z: number }) {
  return Math.hypot(p2.x - p1.x, p2.z - p1.z);
}

function findLineIntersection(
  A: { x: number; z: number },
  B: { x: number; z: number },
  C: { x: number; z: number },
  D: { x: number; z: number }
): { t: number; u: number } | null {
  const dx1 = B.x - A.x;
  const dz1 = B.z - A.z;
  const dx2 = D.x - C.x;
  const dz2 = D.z - C.z;

  const det = dx2 * dz1 - dx1 * dz2;
  if (Math.abs(det) < 1e-10) {
    return null;
  }

  const t = (dx2 * (A.z - C.z) - dz2 * (A.x - C.x)) / det;
  const u = (dx1 * (A.z - C.z) - dz1 * (A.x - C.x)) / det;

  if (t >= -1e-4 && t <= 1 + 1e-4 && u >= -1e-4 && u <= 1 + 1e-4) {
    return { t: Math.max(0, Math.min(1, t)), u: Math.max(0, Math.min(1, u)) };
  }
  return null;
}

function evaluateBezier(
  start: { x: number; z: number },
  handleOut: { x: number; z: number },
  handleIn: { x: number; z: number },
  end: { x: number; z: number },
  t: number
) {
  const inv = 1 - t;
  return {
    x: inv ** 3 * start.x + 3 * inv ** 2 * t * handleOut.x + 3 * inv * t ** 2 * handleIn.x + t ** 3 * end.x,
    z: inv ** 3 * start.z + 3 * inv ** 2 * t * handleOut.z + 3 * inv * t ** 2 * handleIn.z + t ** 3 * end.z,
  };
}

function sampleSegment(
  segment: SketchSegment,
  pointById: Map<string, SketchPoint>,
  samplesCount = 32
): { points: { x: number; z: number }[]; tValues: number[] } {
  const start = pointById.get(segment.startId);
  const end = pointById.get(segment.endId);
  if (!start || !end) return { points: [], tValues: [] };

  if (segment.kind === "line" || !start.handleOut || !end.handleIn) {
    return {
      points: [
        { x: start.x, z: start.z },
        { x: end.x, z: end.z },
      ],
      tValues: [0, 1],
    };
  }

  const points: { x: number; z: number }[] = [];
  const tValues: number[] = [];
  for (let i = 0; i <= samplesCount; i++) {
    const t = i / samplesCount;
    points.push(evaluateBezier(start, start.handleOut, end.handleIn, end, t));
    tValues.push(t);
  }
  return { points, tValues };
}

export function trimSketchProfileSegment(
  profile: SketchProfile,
  targetSegmentId: string,
  clickPoint: { x: number; z: number }
): SketchProfile | null {
  const targetSegment = profile.segments.find((seg) => seg.id === targetSegmentId);
  if (!targetSegment) return null;

  const pointById = new Map(profile.points.map((p) => [p.id, p]));
  const otherSegments = profile.segments.filter((seg) => seg.id !== targetSegmentId && !seg.construction);

  // 1. Sample the target segment
  const targetSamples = sampleSegment(targetSegment, pointById);
  if (targetSamples.points.length < 2) return null;

  // Compute cumulative lengths along target segment to convert sample index to t parameter
  const targetLengths: number[] = [0];
  for (let i = 1; i < targetSamples.points.length; i++) {
    targetLengths.push(targetLengths[i - 1] + distance(targetSamples.points[i - 1], targetSamples.points[i]));
  }
  const totalTargetLength = targetLengths[targetLengths.length - 1];
  const tValues = targetSamples.tValues.map((t, idx) => (totalTargetLength > 0 ? targetLengths[idx] / totalTargetLength : t));

  // 2. Find closest point on target segment to clickPoint
  let minClickDist = Number.POSITIVE_INFINITY;
  let tClick = 0.5;

  for (let i = 0; i < targetSamples.points.length - 1; i++) {
    const pA = targetSamples.points[i];
    const pB = targetSamples.points[i + 1];
    const tA = tValues[i];
    const tB = tValues[i + 1];

    const dx = pB.x - pA.x;
    const dz = pB.z - pA.z;
    const lenSq = dx * dx + dz * dz;

    let h = 0;
    if (lenSq > 1e-8) {
      h = ((clickPoint.x - pA.x) * dx + (clickPoint.z - pA.z) * dz) / lenSq;
      h = Math.max(0, Math.min(1, h));
    }

    const q = { x: pA.x + h * dx, z: pA.z + h * dz };
    const dist = distance(clickPoint, q);
    if (dist < minClickDist) {
      minClickDist = dist;
      tClick = tA + h * (tB - tA);
    }
  }

  // 3. Find intersections with all other segments
  const intersections: { t: number; point: { x: number; z: number } }[] = [];

  otherSegments.forEach((other) => {
    const otherSamples = sampleSegment(other, pointById);
    if (otherSamples.points.length < 2) return;

    // Intersection check between target sub-segments and other sub-segments
    for (let i = 0; i < targetSamples.points.length - 1; i++) {
      const pA = targetSamples.points[i];
      const pB = targetSamples.points[i + 1];
      const tA = tValues[i];
      const tB = tValues[i + 1];

      for (let j = 0; j < otherSamples.points.length - 1; j++) {
        const qC = otherSamples.points[j];
        const qD = otherSamples.points[j + 1];

        const intersect = findLineIntersection(pA, pB, qC, qD);
        if (intersect) {
          const tIntersect = tA + intersect.t * (tB - tA);
          const pIntersect = {
            x: pA.x + intersect.t * (pB.x - pA.x),
            z: pA.z + intersect.t * (pB.z - pA.z),
          };
          // Avoid duplicate or extremely close intersection parameters
          if (
            tIntersect > 0.005 &&
            tIntersect < 0.995 &&
            !intersections.some((it) => Math.abs(it.t - tIntersect) < 0.005)
          ) {
            intersections.push({ t: tIntersect, point: pIntersect });
          }
        }
      }
    }
  });

  // Sort intersections by t parameter
  intersections.sort((a, b) => a.t - b.t);

  // If no intersections, delete the segment entirely
  if (intersections.length === 0) {
    return {
      ...profile,
      segments: profile.segments.filter((seg) => seg.id !== targetSegmentId),
    };
  }

  // 4. Determine which interval [t_start, t_end] contains tClick
  const boundaries = [
    { t: 0, point: pointById.get(targetSegment.startId)! },
    ...intersections,
    { t: 1, point: pointById.get(targetSegment.endId)! },
  ];

  let clickIntervalIdx = -1;
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (tClick >= boundaries[i].t && tClick <= boundaries[i + 1].t) {
      clickIntervalIdx = i;
      break;
    }
  }

  if (clickIntervalIdx === -1) {
    return {
      ...profile,
      segments: profile.segments.filter((seg) => seg.id !== targetSegmentId),
    };
  }

  // 5. Build new segments and points for the non-clicked intervals
  const newPoints: SketchPoint[] = [...profile.points];
  const newSegments: SketchSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    if (i === clickIntervalIdx) continue; // Skip/delete clicked interval

    const startBoundary = boundaries[i];
    const endBoundary = boundaries[i + 1];

    // Get or create start point for the new sub-segment
    let startPointId = "";
    if (startBoundary.t === 0) {
      startPointId = targetSegment.startId;
    } else {
      // Find existing point near the intersection coordinate, or create new one
      const existing = newPoints.find(
        (p) => Math.hypot(p.x - startBoundary.point.x, p.z - startBoundary.point.z) < 1e-4
      );
      if (existing) {
        startPointId = existing.id;
      } else {
        const id = createLocalId("sketch-point");
        newPoints.push({
          id,
          x: startBoundary.point.x,
          z: startBoundary.point.z,
          mode: "corner",
        });
        startPointId = id;
      }
    }

    // Get or create end point for the new sub-segment
    let endPointId = "";
    if (endBoundary.t === 1) {
      endPointId = targetSegment.endId;
    } else {
      const existing = newPoints.find(
        (p) => Math.hypot(p.x - endBoundary.point.x, p.z - endBoundary.point.z) < 1e-4
      );
      if (existing) {
        endPointId = existing.id;
      } else {
        const id = createLocalId("sketch-point");
        newPoints.push({
          id,
          x: endBoundary.point.x,
          z: endBoundary.point.z,
          mode: "corner",
        });
        endPointId = id;
      }
    }

    // Add the split segment
    newSegments.push({
      id: createLocalId("sketch-segment"),
      startId: startPointId,
      endId: endPointId,
      kind: targetSegment.kind,
      construction: targetSegment.construction,
    });
  }

  return {
    ...profile,
    points: newPoints,
    segments: [
      ...profile.segments.filter((seg) => seg.id !== targetSegmentId),
      ...newSegments,
    ],
  };
}
