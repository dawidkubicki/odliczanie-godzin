import { RANGE_COUNT, type TimeRange } from "./time";
import type { NbpRateResponse } from "./nbp-types";

export const STORAGE_KEY = "odliczanie-godzin:v1";

export type RateMode = "latest" | "date";

export type AppState = {
  ranges: TimeRange[];
  /** ISO code, "PLN" means no conversion (rate = 1) */
  currency: string;
  rateMode: RateMode;
  /** YYYY-MM-DD, used when rateMode === "date" */
  rateDate: string;
  /** Raw text of the editable fields (Polish comma allowed) */
  rateInput: string;
  multiplierInput: string;
  valueInput: string;
  /** Last successful NBP response for the selected currency */
  rateInfo: NbpRateResponse | null;
};

export function emptyRanges(): TimeRange[] {
  return Array.from({ length: RANGE_COUNT }, (_, i) => ({
    id: `r${i + 1}`,
    start: "",
    end: "",
    active: true,
  }));
}

export const INITIAL_STATE: AppState = {
  ranges: emptyRanges(),
  currency: "EUR",
  rateMode: "latest",
  rateDate: "",
  rateInput: "",
  multiplierInput: "1",
  valueInput: "1",
  rateInfo: null,
};

const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

function sanitizeRanges(raw: unknown): TimeRange[] {
  const base = emptyRanges();
  if (!Array.isArray(raw)) return base;
  return base.map((def, i) => {
    const r = raw[i] as Partial<TimeRange> | undefined;
    if (!r || typeof r !== "object") return def;
    return {
      id: def.id,
      start: typeof r.start === "string" && DT_RE.test(r.start) ? r.start : "",
      end: typeof r.end === "string" && DT_RE.test(r.end) ? r.end : "",
      active: typeof r.active === "boolean" ? r.active : true,
    };
  });
}

function sanitizeRateInfo(raw: unknown): NbpRateResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.code !== "string" ||
    typeof r.mid !== "number" ||
    !Number.isFinite(r.mid) ||
    typeof r.effectiveDate !== "string" ||
    typeof r.table !== "string"
  ) {
    return null;
  }
  return {
    code: r.code,
    currency: str(r.currency, ""),
    mid: r.mid,
    effectiveDate: r.effectiveDate,
    table: r.table,
    fetchedAt: str(r.fetchedAt, ""),
  };
}

/** Validates whatever was found in localStorage. */
export function sanitizeState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const currency =
    typeof s.currency === "string" && /^[A-Z]{3}$/.test(s.currency) ? s.currency : "EUR";
  return {
    ranges: sanitizeRanges(s.ranges),
    currency,
    rateMode: s.rateMode === "date" ? "date" : "latest",
    rateDate: typeof s.rateDate === "string" && DATE_RE.test(s.rateDate) ? s.rateDate : "",
    rateInput: str(s.rateInput, ""),
    multiplierInput: str(s.multiplierInput, "1"),
    valueInput: str(s.valueInput, "1"),
    rateInfo: sanitizeRateInfo(s.rateInfo),
  };
}

/** NBP mid as an editable Polish string, e.g. 4.3745 -> "4,3745" */
export function rateToInput(mid: number): string {
  return String(mid).replace(".", ",");
}
