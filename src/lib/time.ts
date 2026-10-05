/**
 * Time range arithmetic.
 *
 * Datetimes are "wall-clock" strings as produced by <input type="datetime-local">
 * (YYYY-MM-DDTHH:mm). They are parsed as UTC so DST transitions do not add or
 * remove an hour — the same behaviour as the original desktop tool.
 */

export const RANGE_COUNT = 6;

export type TimeRange = {
  id: string;
  /** "YYYY-MM-DDTHH:mm" or "" when not filled in */
  start: string;
  /** "YYYY-MM-DDTHH:mm" or "" when not filled in */
  end: string;
  active: boolean;
};

export type RangeStatus = "ok" | "empty" | "incomplete" | "reversed" | "inactive";

export type DurationBreakdown = {
  totalMinutes: number;
  days: number;
  hours: number;
  minutes: number;
  /** Total expressed in days, e.g. 15d 11h 19m -> 15.471527… */
  decimalDays: number;
  /** Total expressed in hours, e.g. 15d 11h 19m -> 371.3166… */
  decimalHours: number;
};

export type CalculationResult = DurationBreakdown & {
  /** Per-range minutes (0 for ranges that do not count) */
  perRange: Record<string, { minutes: number; status: RangeStatus }>;
  /** Number of ranges that contributed to the total */
  countedRanges: number;
};

const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** Parses a datetime-local string to epoch minutes (wall-clock, UTC). */
export function parseLocalDateTime(value: string): number | null {
  const m = DATETIME_RE.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi);
  return Number.isNaN(ms) ? null : Math.round(ms / 60000);
}

export function rangeMinutes(range: TimeRange): { minutes: number; status: RangeStatus } {
  if (!range.active) return { minutes: 0, status: "inactive" };
  if (!range.start && !range.end) return { minutes: 0, status: "empty" };
  const start = parseLocalDateTime(range.start);
  const end = parseLocalDateTime(range.end);
  if (start === null || end === null) return { minutes: 0, status: "incomplete" };
  if (end < start) return { minutes: 0, status: "reversed" };
  return { minutes: end - start, status: "ok" };
}

export function breakdown(totalMinutes: number): DurationBreakdown {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return {
    totalMinutes,
    days,
    hours,
    minutes,
    decimalDays: totalMinutes / 1440,
    decimalHours: totalMinutes / 60,
  };
}

export function calculate(ranges: TimeRange[]): CalculationResult {
  const perRange: CalculationResult["perRange"] = {};
  let total = 0;
  let counted = 0;
  for (const r of ranges) {
    const res = rangeMinutes(r);
    perRange[r.id] = res;
    if (res.status === "ok") {
      total += res.minutes;
      counted++;
    }
  }
  return { ...breakdown(total), perRange, countedRanges: counted };
}

/** Amount = decimal days × exchange rate × multiplier × value */
export function computeAmount(
  decimalDays: number,
  rate: number,
  multiplier: number,
  value: number,
): number {
  return decimalDays * rate * multiplier * value;
}
