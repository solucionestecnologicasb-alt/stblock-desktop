import { describe, expect, it } from "vitest";
import { computeWindowRange } from "@/lib/windowedListMath";

describe("computeWindowRange", () => {
  it("renders from the top with overscan", () => {
    expect(computeWindowRange(100, 0, 500, 50, 3)).toEqual({ start: 0, end: 13 });
  });

  it("clamps the end to the total item count", () => {
    expect(computeWindowRange(10, 0, 500, 50, 3)).toEqual({ start: 0, end: 10 });
  });

  it("skips items above the scroll offset", () => {
    expect(computeWindowRange(100, 250, 200, 50, 2)).toEqual({ start: 3, end: 11 });
  });

  it("handles an empty list", () => {
    expect(computeWindowRange(0, 0, 500, 50, 3)).toEqual({ start: 0, end: 0 });
  });

  it("handles a zero viewport height", () => {
    expect(computeWindowRange(100, 0, 0, 50, 3)).toEqual({ start: 0, end: 3 });
  });

  it("guards against invalid item heights", () => {
    expect(computeWindowRange(100, 0, 500, 0, 3)).toEqual({ start: 0, end: 100 });
  });

  it("never exceeds the total for a valid scroll position", () => {
    const range = computeWindowRange(3, 100, 300, 50, 6);
    expect(range.start).toBeGreaterThanOrEqual(0);
    expect(range.end).toBeLessThanOrEqual(3);
  });

  it("stays within bounds even for extreme scroll offsets", () => {
    const range = computeWindowRange(3, 10_000, 500, 50, 6);
    expect(range.start).toBeGreaterThanOrEqual(0);
    expect(range.end).toBeLessThanOrEqual(3);
  });
});
