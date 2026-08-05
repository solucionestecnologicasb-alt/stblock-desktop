import { describe, expect, it } from "vitest";
import {
  appendCapTimelineEntry,
  capSectionHasUsableProfile,
  capSectionToolHeight,
  capSectionToolPlane,
  createCapSection,
  emptyCapDocument,
  normalizeCapDocument,
  planeElevation,
  reconcileCapDocument,
} from "@/lib/capDocument";
import { tessellateSketchEntity } from "@/lib/capGeometry";
import type { CapDocument, CapSection, SketchEntity } from "@/types/sketchforge";

const circle: SketchEntity = { id: "e1", kind: "circle", cx: 0, cz: 0, radius: 10 };

function sectionWithProfile(overrides: Partial<CapSection> = {}): CapSection {
  return {
    id: "sec-1",
    name: "Sección 1",
    plane: { kind: "base" },
    sketchProfile: { points: [], segments: [], images: [] },
    operation: "extrude",
    extrusionDepth: 10,
    createdAt: 1234,
    ...overrides,
  };
}

describe("capDocument basics", () => {
  it("creates empty documents", () => {
    expect(emptyCapDocument()).toEqual({ sections: [], timeline: [], activeSectionId: undefined });
  });

  it("normalizes undefined/corrupt input to an empty document", () => {
    expect(normalizeCapDocument(undefined)).toEqual(emptyCapDocument());
    expect(normalizeCapDocument(null)).toEqual(emptyCapDocument());
    expect(normalizeCapDocument({})).toEqual(emptyCapDocument());
    expect(normalizeCapDocument({ sections: "nope" })).toEqual(emptyCapDocument());
    expect(normalizeCapDocument(42)).toEqual(emptyCapDocument());
  });

  it("normalizes a valid document and drops malformed entries", () => {
    const raw = {
      sections: [
        { id: "a", name: "A", plane: { kind: "base" }, sketchProfile: { points: [], segments: [] }, operation: "extrude", extrusionDepth: 5 },
        { id: "bad", plane: "nope" },
        { id: "b", name: "B", plane: { kind: "offset", elevation: 60 }, sketchProfile: { points: [], segments: [] }, operation: "revolve", extrusionDepth: 0 },
      ],
      timeline: [
        { id: "t1", kind: "section-create", sectionId: "a", label: "Sección A", timestamp: 1 },
        { id: "t2", kind: "nope", label: "x", timestamp: 2 },
      ],
      activeSectionId: "a",
    };
    const normalized = normalizeCapDocument(raw);
    expect(normalized.sections.map((section) => section.id)).toEqual(["a", "b"]);
    expect(normalized.sections[1].plane).toEqual({ kind: "offset", elevation: 60 });
    expect(normalized.timeline.length).toBe(1);
    expect(normalized.timeline[0].kind).toBe("section-create");
    expect(normalized.activeSectionId).toBe("a");
  });

  it("normalizes entities inside a sketch profile", () => {
    const raw = {
      sections: [
        {
          id: "a",
          name: "A",
          plane: { kind: "base" },
          sketchProfile: {
            points: [{ id: "p", x: 1, z: 2 }],
            segments: [{ id: "s", startId: "p", endId: "missing" }],
            entities: [circle],
          },
          operation: "extrude",
          extrusionDepth: 5,
        },
      ],
      timeline: [],
    };
    const normalized = normalizeCapDocument(raw);
    expect(normalized.sections[0].sketchProfile.entities).toEqual([circle]);
    // dangling segment dropped
    expect(normalized.sections[0].sketchProfile.segments).toEqual([]);
  });
});

describe("capDocument section helpers", () => {
  it("creates a named section with an empty profile", () => {
    const section = createCapSection({ kind: "base" }, 2);
    expect(section.name).toBe("Sección 3");
    expect(section.plane).toEqual({ kind: "base" });
    expect(section.sketchProfile.points).toEqual([]);
    expect(section.operation).toBe("extrude");
  });

  it("appends timeline entries", () => {
    const cap = emptyCapDocument();
    const withEntry = appendCapTimelineEntry(cap, { id: "t", kind: "piece-generate", sectionId: "a", shapeId: "s", label: "Generar pieza", timestamp: 1 });
    expect(withEntry.timeline.length).toBe(1);
    expect(cap.timeline.length).toBe(0);
  });

  it("computes plane elevation", () => {
    expect(planeElevation({ kind: "base" })).toBe(0);
    expect(planeElevation({ kind: "offset", elevation: 60 })).toBe(60);
    expect(planeElevation({ kind: "face", shapeId: "s", center: [0, 12, 0], normal: [0, 1, 0], up: [0, 0, 1] })).toBe(12);
  });

  it("reconciles orphan resultShapeId", () => {
    const cap: CapDocument = {
      sections: [
        sectionWithProfile({ id: "sec-1", resultShapeId: "shape-1" }),
        sectionWithProfile({ id: "sec-2", resultShapeId: "shape-2" }),
      ],
      timeline: [],
    };
    const shapes = [{ id: "shape-1" } as never];
    const reconciled = reconcileCapDocument(cap, shapes);
    expect(reconciled).not.toBe(cap);
    expect(reconciled.sections[0].resultShapeId).toBe("shape-1");
    expect(reconciled.sections[1].resultShapeId).toBeUndefined();
  });

  it("returns the same reference when nothing changed", () => {
    const cap: CapDocument = { sections: [sectionWithProfile({ id: "sec-1" })], timeline: [] };
    expect(reconcileCapDocument(cap, [])).toBe(cap);
  });

  it("detects usable profiles via closed paths", () => {
    const openProfile = { points: [{ id: "p0", x: 0, z: 0 }, { id: "p1", x: 10, z: 0 }], segments: [{ id: "s0", startId: "p0", endId: "p1", kind: "line" }] };
    expect(capSectionHasUsableProfile(sectionWithProfile({ sketchProfile: openProfile }))).toBe(false);

    const closedProfile = {
      points: [{ id: "p0", x: 0, z: 0 }, { id: "p1", x: 10, z: 0 }, { id: "p2", x: 10, z: 10 }],
      segments: [
        { id: "s0", startId: "p0", endId: "p1", kind: "line" },
        { id: "s1", startId: "p1", endId: "p2", kind: "line" },
        { id: "s2", startId: "p2", endId: "p0", kind: "line" },
      ],
    };
    expect(capSectionHasUsableProfile(sectionWithProfile({ sketchProfile: closedProfile }))).toBe(true);

    // a circle entity alone (tessellated) is usable
    const tessellated = tessellateSketchEntity(circle);
    const entityProfile = {
      points: [...tessellated.points],
      segments: [...tessellated.segments],
      entities: [circle],
    };
    expect(capSectionHasUsableProfile(sectionWithProfile({ sketchProfile: entityProfile }))).toBe(true);
  });
});

describe("cap section tool plane and height (Añadir/Cortar)", () => {
  it("shifts the tool plane inward along the face normal in Cortar mode", () => {
    const section: CapSection = sectionWithProfile({
      plane: {
        kind: "face",
        shapeId: "host-1",
        center: [10, 20, 0],
        normal: [1, 0, 0],
        up: [0, 0, 1],
      },
      operation: "extrude",
      extrusionDepth: 8,
      unionMode: "cut",
    });
    expect(capSectionToolPlane(section, section.extrusionDepth)).toEqual({
      kind: "face",
      shapeId: "host-1",
      center: [2, 20, 0],
      normal: [1, 0, 0],
      up: [0, 0, 1],
    });
    expect(capSectionToolHeight(section)).toBe(8.25);
  });

  it("keeps the plane unchanged for add, floating, revolve and non-face planes", () => {
    const facePlane = {
      kind: "face" as const,
      shapeId: "host-1",
      center: [0, 0, 0],
      normal: [0, 1, 0],
      up: [0, 0, 1],
    };
    const add = sectionWithProfile({ plane: facePlane, operation: "extrude", extrusionDepth: 5, unionMode: "add" });
    expect(capSectionToolPlane(add, 5)).toEqual(facePlane);
    expect(capSectionToolHeight(add)).toBe(5);

    const floating = sectionWithProfile({ plane: facePlane, operation: "extrude", extrusionDepth: 5 });
    expect(capSectionToolPlane(floating, 5)).toEqual(facePlane);
    expect(capSectionToolHeight(floating)).toBe(5);

    const revolveCut = sectionWithProfile({ plane: facePlane, operation: "revolve", extrusionDepth: 5, unionMode: "cut" });
    expect(capSectionToolPlane(revolveCut, 5)).toEqual(facePlane);
    expect(capSectionToolHeight(revolveCut)).toBe(5);

    const baseCut = sectionWithProfile({ operation: "extrude", extrusionDepth: 5, unionMode: "cut" });
    expect(capSectionToolPlane(baseCut, 5)).toEqual({ kind: "base" });
    expect(capSectionToolHeight(baseCut)).toBe(5);
  });
});
