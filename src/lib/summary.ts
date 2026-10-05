import { DAY_FORMS, formatDate, formatMoney, HOUR_FORMS, MINUTE_FORMS, plural } from "./format";
import type { NbpRateResponse } from "./nbp-types";
import type { CalculationResult, TimeRange } from "./time";
import { formatDurationShort, formatWallClock, plainNumber } from "./display";

export type SummaryInput = {
  ranges: TimeRange[];
  result: CalculationResult;
  currency: string;
  rate: number | null;
  /** NBP source of `rate`, or null when entered manually / PLN */
  rateSource: NbpRateResponse | null;
  multiplier: number | null;
  value: number | null;
  amount: number | null;
};

/** Plain-text, multi-line Polish summary for the clipboard. */
export function buildSummary(input: SummaryInput): string {
  const { ranges, result, currency, rate, rateSource, multiplier, value, amount } = input;
  const lines: string[] = ["Odliczanie godzin — podsumowanie", ""];

  const counted = ranges
    .map((r, i) => ({ r, i, res: result.perRange[r.id] }))
    .filter((x) => x.res?.status === "ok");

  if (counted.length === 0) {
    lines.push("Brak uzupełnionych przedziałów.");
  } else {
    lines.push("Przedziały:");
    for (const { r, i, res } of counted) {
      lines.push(
        `${i + 1}. ${formatWallClock(r.start)} – ${formatWallClock(r.end)}  (${formatDurationShort(res.minutes)})`,
      );
    }
  }

  lines.push("");
  lines.push(
    `Razem: ${result.days} ${plural(result.days, DAY_FORMS)}, ${result.hours} ${plural(result.hours, HOUR_FORMS)}, ${result.minutes} ${plural(result.minutes, MINUTE_FORMS)}`,
  );
  lines.push(`Łącznie w dniach: ${plainNumber(result.decimalDays, 5, 5)}`);
  lines.push(`Łącznie w godzinach: ${plainNumber(result.decimalHours, 5)}`);
  lines.push("");

  if (currency === "PLN") {
    lines.push(`Waluta: PLN (kurs ${rate === null ? "—" : plainNumber(rate, 6)})`);
  } else if (rate === null) {
    lines.push(`Kurs ${currency}/PLN: brak`);
  } else if (rateSource) {
    lines.push(
      `Kurs ${currency}/PLN: ${plainNumber(rate, 6)} (NBP, tabela ${rateSource.table} z dnia ${formatDate(rateSource.effectiveDate)})`,
    );
  } else {
    lines.push(`Kurs ${currency}/PLN: ${plainNumber(rate, 6)} (wprowadzony ręcznie)`);
  }
  lines.push(`Mnożnik: ${multiplier === null ? "—" : plainNumber(multiplier, 6)}`);
  lines.push(`Wartość: ${value === null ? "—" : plainNumber(value, 6)}`);
  lines.push("");
  lines.push(
    amount === null
      ? "Kwota: —"
      : `Kwota: ${formatMoney(amount).replace(/\s/g, " ")} (dokładnie ${plainNumber(amount, 5, 5)} zł)`,
  );

  return lines.join("\n");
}
