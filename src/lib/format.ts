/** Polish number / date formatting helpers. */

export function formatNumber(value: number, maxDigits = 5, minDigits = 0): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
    useGrouping: true,
  }).format(value);
}

export function formatMoney(value: number, currency = "PLN"): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Parses user input like "4,3745" or "4.3745" or "1 234,5". Returns null if invalid. */
export function parseDecimal(input: string): number | null {
  const normalized = input.replace(/[\s ]/g, "").replace(",", ".");
  if (normalized === "" || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Polish plural: plural(5, ["dzień", "dni", "dni"]) */
export function plural(n: number, forms: [one: string, few: string, many: string]): string {
  if (n === 1) return forms[0];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export const DAY_FORMS: [string, string, string] = ["dzień", "dni", "dni"];
export const HOUR_FORMS: [string, string, string] = ["godzina", "godziny", "godzin"];
export const MINUTE_FORMS: [string, string, string] = ["minuta", "minuty", "minut"];

export function formatDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}
