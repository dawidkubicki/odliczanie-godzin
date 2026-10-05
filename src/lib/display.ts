import { formatDateTime, formatNumber } from "./format";

/** "2026-09-01T21:11" -> "01.09.2026 21:11" (wall clock, no timezone shift) */
export function formatWallClock(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return value;
  const [, y, mo, d, h, mi] = m;
  return `${d}.${mo}.${y} ${h}:${mi}`;
}

/** 7249 -> "5 d 0 godz. 49 min" */
export function formatDurationShort(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days} d ${hours} godz. ${minutes} min`;
}

/** Number for copying: Polish comma, no thousands separators. */
export function plainNumber(value: number, maxDigits = 5, minDigits = 0): string {
  return formatNumber(value, maxDigits, minDigits).replace(/\s/g, "");
}

/** "05.10.2026 09:12:27" (Intl puts a comma between date and time in pl-PL; drop it). */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDateTime(d).replace(",", "");
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
