import { describe, expect, it } from "vitest";
import {
  breakdown,
  calculate,
  computeAmount,
  parseLocalDateTime,
  RANGE_COUNT,
  rangeMinutes,
  type TimeRange,
} from "./time";

let seq = 0;
function range(start: string, end: string, active = true): TimeRange {
  return { id: `r${++seq}`, start, end, active };
}

describe("parseLocalDateTime", () => {
  it("parses datetime-local strings as wall-clock minutes", () => {
    expect(parseLocalDateTime("1970-01-01T00:00")).toBe(0);
    expect(parseLocalDateTime("1970-01-02T01:01")).toBe(1440 + 61);
  });

  it("returns null for empty or malformed input", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("2026-09-01")).toBeNull();
    expect(parseLocalDateTime("01.09.2026 21:11")).toBeNull();
  });
});

describe("calculate — reference case from the desktop tool", () => {
  const ranges = [
    range("2026-09-01T21:11", "2026-09-06T22:00"),
    range("2026-09-08T08:40", "2026-09-13T07:50"),
    range("2026-09-14T12:30", "2026-09-19T23:50"),
  ];
  const result = calculate(ranges);

  it("sums to 15 days, 11 hours, 19 minutes", () => {
    expect(result.days).toBe(15);
    expect(result.hours).toBe(11);
    expect(result.minutes).toBe(19);
    expect(result.totalMinutes).toBe(15 * 1440 + 11 * 60 + 19);
    expect(result.countedRanges).toBe(3);
  });

  it("gives decimalDays ≈ 15.47153", () => {
    expect(result.decimalDays).toBeCloseTo(15.47153, 5);
    expect(result.decimalHours).toBeCloseTo(371.31667, 5);
  });

  it("computeAmount(decimalDays, 1, 1, 1) ≈ 15.47153", () => {
    expect(computeAmount(result.decimalDays, 1, 1, 1)).toBeCloseTo(15.47153, 5);
  });

  it("reports per-range minutes", () => {
    expect(result.perRange[ranges[0].id]).toEqual({ minutes: 5 * 1440 + 49, status: "ok" });
    expect(result.perRange[ranges[1].id]).toEqual({ minutes: 4 * 1440 + 23 * 60 + 10, status: "ok" });
    expect(result.perRange[ranges[2].id]).toEqual({ minutes: 5 * 1440 + 11 * 60 + 20, status: "ok" });
  });
});

describe("rangeMinutes statuses", () => {
  it("inactive ranges are ignored even when filled in", () => {
    expect(rangeMinutes(range("2026-09-01T00:00", "2026-09-02T00:00", false))).toEqual({
      minutes: 0,
      status: "inactive",
    });
  });

  it("empty when both ends are blank", () => {
    expect(rangeMinutes(range("", ""))).toEqual({ minutes: 0, status: "empty" });
  });

  it("incomplete when one end is missing or malformed", () => {
    expect(rangeMinutes(range("2026-09-01T00:00", "")).status).toBe("incomplete");
    expect(rangeMinutes(range("", "2026-09-01T00:00")).status).toBe("incomplete");
    expect(rangeMinutes(range("2026-09-01T00:00", "garbage")).status).toBe("incomplete");
  });

  it("reversed when end is before start", () => {
    expect(rangeMinutes(range("2026-09-02T00:00", "2026-09-01T23:59"))).toEqual({
      minutes: 0,
      status: "reversed",
    });
  });

  it("zero-length range is ok with 0 minutes", () => {
    expect(rangeMinutes(range("2026-09-01T10:00", "2026-09-01T10:00"))).toEqual({
      minutes: 0,
      status: "ok",
    });
  });

  it("DST change weekend counts wall-clock time (exactly 48h)", () => {
    // Poland leaves summer time on 2026-10-25 (03:00 -> 02:00)
    expect(rangeMinutes(range("2026-10-24T12:00", "2026-10-26T12:00")).minutes).toBe(48 * 60);
    // and enters it on 2026-03-29 (02:00 -> 03:00)
    expect(rangeMinutes(range("2026-03-28T12:00", "2026-03-30T12:00")).minutes).toBe(48 * 60);
  });
});

describe("calculate — mixed ranges", () => {
  it("only counts ok ranges", () => {
    const ranges = [
      range("2026-09-01T00:00", "2026-09-02T00:00"), // 1 day
      range("2026-09-01T00:00", "2026-09-05T00:00", false), // inactive
      range("", ""), // empty
      range("2026-09-01T00:00", ""), // incomplete
      range("2026-09-03T00:00", "2026-09-02T00:00"), // reversed
      range("2026-09-10T08:00", "2026-09-10T08:00"), // zero-length
    ];
    const result = calculate(ranges);
    expect(result.totalMinutes).toBe(1440);
    expect(result.days).toBe(1);
    expect(result.countedRanges).toBe(2);
    expect(Object.values(result.perRange).map((r) => r.status)).toEqual([
      "ok",
      "inactive",
      "empty",
      "incomplete",
      "reversed",
      "ok",
    ]);
  });

  it(`sums all ${RANGE_COUNT} ranges`, () => {
    expect(RANGE_COUNT).toBe(6);
    // each range: 1 day 2 hours 3 minutes
    const ranges = Array.from({ length: RANGE_COUNT }, (_, i) => {
      const day = String(i * 3 + 1).padStart(2, "0");
      const next = String(i * 3 + 2).padStart(2, "0");
      return range(`2026-01-${day}T10:00`, `2026-01-${next}T12:03`);
    });
    const result = calculate(ranges);
    const perRange = 1440 + 2 * 60 + 3;
    expect(result.countedRanges).toBe(6);
    expect(result.totalMinutes).toBe(6 * perRange);
    expect(result.days).toBe(6);
    expect(result.hours).toBe(12);
    expect(result.minutes).toBe(18);
  });

  it("returns zeros for no ranges", () => {
    const result = calculate([]);
    expect(result).toMatchObject({ totalMinutes: 0, days: 0, hours: 0, minutes: 0, decimalDays: 0, countedRanges: 0 });
  });
});

describe("breakdown / computeAmount", () => {
  it("splits minutes into days/hours/minutes", () => {
    expect(breakdown(1440 * 2 + 61)).toMatchObject({ days: 2, hours: 1, minutes: 1, decimalHours: 49 + 1 / 60 });
  });

  it("multiplies decimal days × rate × multiplier × value", () => {
    expect(computeAmount(2.5, 4.3745, 2, 10)).toBeCloseTo(218.725, 10);
    expect(computeAmount(0, 4.3745, 2, 10)).toBe(0);
  });
});
