import { describe, expect, it } from "vitest";
import { emptyRanges, nextRangeId, sanitizeState } from "./app-state";
import { MAX_RANGES, RANGE_COUNT } from "./time";

const range = (start = "", end = "") => ({ start, end, active: true });

describe("emptyRanges", () => {
  it(`defaults to ${RANGE_COUNT} rows`, () => {
    expect(emptyRanges()).toHaveLength(RANGE_COUNT);
  });

  it("accepts a custom count", () => {
    expect(emptyRanges(2).map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});

describe("nextRangeId", () => {
  it("does not collide after rows were removed", () => {
    const ranges = emptyRanges(4).filter((r) => r.id !== "r2");
    expect(nextRangeId(ranges)).toBe("r5");
  });
});

describe("sanitizeState ranges", () => {
  it("keeps a user-chosen number of rows", () => {
    const s = sanitizeState({ ranges: [range("2026-09-01T10:00", "2026-09-02T10:00"), range()] });
    expect(s?.ranges).toHaveLength(2);
    expect(s?.ranges[0].start).toBe("2026-09-01T10:00");
  });

  it("supports more rows than the default", () => {
    const s = sanitizeState({ ranges: Array.from({ length: 9 }, () => range()) });
    expect(s?.ranges).toHaveLength(9);
  });

  it(`caps at ${MAX_RANGES} rows`, () => {
    const s = sanitizeState({ ranges: Array.from({ length: MAX_RANGES + 5 }, () => range()) });
    expect(s?.ranges).toHaveLength(MAX_RANGES);
  });

  it("falls back to the default for empty or invalid data", () => {
    expect(sanitizeState({ ranges: [] })?.ranges).toHaveLength(RANGE_COUNT);
    expect(sanitizeState({ ranges: "x" })?.ranges).toHaveLength(RANGE_COUNT);
  });

  it("assigns unique ids regardless of stored ids", () => {
    const s = sanitizeState({ ranges: [{ ...range(), id: "r7" }, { ...range(), id: "r7" }] });
    expect(s?.ranges.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
