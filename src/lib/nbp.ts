/**
 * Server-side helpers for the NBP (Narodowy Bank Polski) exchange-rate API.
 * Only used by the /api/nbp/* route handlers — the UI never calls NBP directly.
 *
 * Docs: https://api.nbp.pl/
 */

import type { NbpCurrenciesResponse, NbpCurrency, NbpRateResponse } from "./nbp-types";

export const NBP_API_BASE = "https://api.nbp.pl/api/exchangerates";

/** First day NBP publishes table A in the current API. */
export const NBP_MIN_DATE = "2002-01-02";

/** How many days to look back for the last business day on or before a date. */
export const LOOKBACK_DAYS = 10;

export const FETCH_TIMEOUT_MS = 8000;

/** Cache lifetimes (seconds) for Next.js fetch cache. */
export const REVALIDATE_LATEST = 60 * 60; // 1 h — a new table is published once per business day
export const REVALIDATE_HISTORICAL = 60 * 60 * 24 * 7; // 7 days — past tables do not change

export const PRIORITY_CODES = ["EUR", "USD", "GBP", "CHF"] as const;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type NbpErrorKind =
  | "invalid-code"
  | "invalid-date"
  | "future-date"
  | "date-too-early"
  | "no-data"
  | "upstream";

export const ERROR_MESSAGES: Record<NbpErrorKind, string> = {
  "invalid-code": "Nieprawidłowy kod waluty",
  "invalid-date": "Nieprawidłowa data (oczekiwany format RRRR-MM-DD)",
  "future-date": "Data nie może być z przyszłości",
  "date-too-early": "Kursy NBP są dostępne od 2 stycznia 2002 r.",
  "no-data": "Brak kursu NBP dla wybranej daty",
  upstream: "Nie udało się połączyć z NBP. Spróbuj ponownie.",
};

export const ERROR_STATUS: Record<NbpErrorKind, number> = {
  "invalid-code": 400,
  "invalid-date": 400,
  "future-date": 400,
  "date-too-early": 400,
  "no-data": 404,
  upstream: 502,
};

export class NbpApiError extends Error {
  readonly kind: NbpErrorKind;
  readonly status: number;

  constructor(kind: NbpErrorKind, message: string = ERROR_MESSAGES[kind], options?: { cause?: unknown }) {
    super(message, options);
    this.name = "NbpApiError";
    this.kind = kind;
    this.status = ERROR_STATUS[kind];
  }
}

/** Maps any thrown value to an HTTP status + Polish, user-facing message. */
export function toErrorResponse(err: unknown): { status: number; body: { error: string } } {
  if (err instanceof NbpApiError) {
    return { status: err.status, body: { error: err.message } };
  }
  return { status: ERROR_STATUS.upstream, body: { error: ERROR_MESSAGES.upstream } };
}

// ---------------------------------------------------------------------------
// Validation / date helpers (pure)
// ---------------------------------------------------------------------------

const CODE_RE = /^[A-Z]{3}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Returns the uppercased ISO 4217 code, or null when invalid. */
export function normalizeCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/** True for a well-formed, real calendar date "YYYY-MM-DD". */
export function isValidIsoDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Today's date in Poland (NBP's timezone) as "YYYY-MM-DD". */
export function todayInWarsaw(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Adds (or subtracts) whole days to a "YYYY-MM-DD" date. */
export function shiftIsoDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Validates the optional `date` query param.
 * Returns null when no date was given (= latest rate), the date otherwise.
 * Throws NbpApiError for invalid / future / too-early dates.
 */
export function validateRateDate(raw: string | null | undefined, now: Date = new Date()): string | null {
  if (raw === null || raw === undefined) return null;
  const date = raw.trim();
  if (date === "") return null;
  if (!isValidIsoDate(date)) throw new NbpApiError("invalid-date");
  // ISO dates compare correctly as strings
  if (date > todayInWarsaw(now)) throw new NbpApiError("future-date");
  if (date < NBP_MIN_DATE) throw new NbpApiError("date-too-early");
  return date;
}

/** Validates the `code` query param, throwing NbpApiError("invalid-code") when bad. */
export function validateCode(raw: string | null | undefined): string {
  const code = normalizeCode(raw);
  if (!code) throw new NbpApiError("invalid-code");
  return code;
}

// ---------------------------------------------------------------------------
// URL builders (pure)
// ---------------------------------------------------------------------------

export function buildTableUrl(): string {
  return `${NBP_API_BASE}/tables/a/?format=json`;
}

export function buildLatestRateUrl(code: string): string {
  return `${NBP_API_BASE}/rates/a/${code.toLowerCase()}/?format=json`;
}

export function buildRangeRateUrl(code: string, startDate: string, endDate: string): string {
  return `${NBP_API_BASE}/rates/a/${code.toLowerCase()}/${startDate}/${endDate}/?format=json`;
}

/** The [start, end] window used to find the last business day on or before `date`. */
export function lookbackRange(date: string): { start: string; end: string } {
  const start = shiftIsoDate(date, -LOOKBACK_DAYS);
  return { start: start < NBP_MIN_DATE ? NBP_MIN_DATE : start, end: date };
}

// ---------------------------------------------------------------------------
// NBP payload types + transforms (pure)
// ---------------------------------------------------------------------------

export type NbpTableRaw = {
  table: string;
  no: string;
  effectiveDate: string;
  rates: { currency: string; code: string; mid: number }[];
};

export type NbpRatesRaw = {
  table: string;
  /** Missing for some historical (≈2002) responses, which use `country` instead. */
  currency?: string;
  code: string;
  rates: { no: string; effectiveDate: string; mid: number }[];
};

/** EUR, USD, GBP, CHF first (in that order), then alphabetically by code. */
export function sortCurrencies<T extends { code: string }>(currencies: readonly T[]): T[] {
  const rank = (code: string) => {
    const i = (PRIORITY_CODES as readonly string[]).indexOf(code);
    return i === -1 ? PRIORITY_CODES.length : i;
  };
  return [...currencies].sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code));
}

/** Picks the entry with the latest effectiveDate (NBP returns them ascending). */
export function pickLastRate<T extends { effectiveDate: string }>(rates: readonly T[]): T | null {
  let last: T | null = null;
  for (const r of rates) {
    if (!last || r.effectiveDate >= last.effectiveDate) last = r;
  }
  return last;
}

function isTableRaw(value: unknown): value is NbpTableRaw {
  const v = value as NbpTableRaw;
  return (
    !!v &&
    typeof v.no === "string" &&
    typeof v.effectiveDate === "string" &&
    Array.isArray(v.rates)
  );
}

function isRatesRaw(value: unknown): value is NbpRatesRaw {
  const v = value as NbpRatesRaw;
  return !!v && typeof v.code === "string" && Array.isArray(v.rates);
}

export function toCurrenciesResponse(payload: unknown): NbpCurrenciesResponse {
  const table = Array.isArray(payload) ? payload[0] : undefined;
  if (!isTableRaw(table)) throw new NbpApiError("upstream");
  const currencies: NbpCurrency[] = table.rates
    .filter((r) => r && typeof r.code === "string")
    .map((r) => ({ code: r.code.toUpperCase(), name: r.currency ?? r.code }));
  return {
    currencies: sortCurrencies(currencies),
    table: table.no,
    effectiveDate: table.effectiveDate,
  };
}

export function toRateResponse(payload: unknown, fetchedAt: Date = new Date()): NbpRateResponse {
  if (!isRatesRaw(payload)) throw new NbpApiError("upstream");
  const last = pickLastRate(payload.rates);
  if (!last) throw new NbpApiError("no-data");
  if (typeof last.mid !== "number" || !Number.isFinite(last.mid)) throw new NbpApiError("upstream");
  return {
    code: payload.code.toUpperCase(),
    currency: payload.currency ?? payload.code.toUpperCase(),
    mid: last.mid,
    effectiveDate: last.effectiveDate,
    table: last.no,
    fetchedAt: fetchedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

/**
 * GETs an NBP endpoint as JSON. 404 ("Brak danych") -> NbpApiError("no-data");
 * timeouts, network failures, other non-2xx and malformed JSON -> NbpApiError("upstream").
 */
export async function fetchNbpJson(url: string, revalidate: number): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate },
    });
  } catch (cause) {
    throw new NbpApiError("upstream", undefined, { cause });
  }
  if (res.status === 404) throw new NbpApiError("no-data");
  if (!res.ok) throw new NbpApiError("upstream", undefined, { cause: `NBP HTTP ${res.status}` });
  try {
    return await res.json();
  } catch (cause) {
    throw new NbpApiError("upstream", undefined, { cause });
  }
}

/** Latest table A as a sorted currency list. */
export async function getCurrencies(): Promise<NbpCurrenciesResponse> {
  return toCurrenciesResponse(await fetchNbpJson(buildTableUrl(), REVALIDATE_LATEST));
}

/**
 * Mid rate for `code`. Without `date` — the latest published rate.
 * With `date` — the rate of the last NBP business day on or before `date`.
 * Inputs are validated here, so raw query params can be passed straight in.
 */
export async function getRate(
  rawCode: string | null | undefined,
  rawDate?: string | null,
  now: Date = new Date(),
): Promise<NbpRateResponse> {
  const code = validateCode(rawCode);
  const date = validateRateDate(rawDate, now);

  if (date === null) {
    try {
      return toRateResponse(await fetchNbpJson(buildLatestRateUrl(code), REVALIDATE_LATEST), now);
    } catch (err) {
      // Valid-looking code that NBP table A does not know (e.g. "XXX")
      if (err instanceof NbpApiError && err.kind === "no-data") {
        throw new NbpApiError("no-data", `Brak kursu NBP dla waluty ${code}`);
      }
      throw err;
    }
  }

  const { start, end } = lookbackRange(date);
  // Today's table may still be published later today, so cache it briefly.
  const revalidate = date >= todayInWarsaw(now) ? REVALIDATE_LATEST : REVALIDATE_HISTORICAL;
  return toRateResponse(await fetchNbpJson(buildRangeRateUrl(code, start, end), revalidate), now);
}
