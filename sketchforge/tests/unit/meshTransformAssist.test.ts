import { describe, expect, it } from "vitest";
import { uniformScaleFactor } from "@/lib/meshTransformAssist";

describe("mesh transform assist", () => {
  it("derives the uniform factor from a single-axis handle scale", () => {
    expect(uniformScaleFactor({ x: 1.5, y: 1, z: 1 })).toBe(1.5);
    expect(uniformScaleFactor({ x: 1, y: 0.75, z: 1 })).toBe(0.75);
    expect(uniformScaleFactor({ x: 1, y: 1, z: 2 })).toBe(2);
  });

  it("keeps the largest change for plane handles and stays neutral without scaling", () => {
    expect(uniformScaleFactor({ x: 1.2, y: 0.8, z: 1 })).toBe(1.2);
    expect(uniformScaleFactor({ x: 1, y: 1, z: 1 })).toBe(1);
    expect(uniformScaleFactor({ x: 1.4, y: 1.4, z: 1.4 })).toBe(1.4);
  });
});
