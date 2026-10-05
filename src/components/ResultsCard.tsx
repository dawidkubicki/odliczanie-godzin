"use client";

import type { CalculationResult } from "@/lib/time";
import {
  DAY_FORMS,
  formatMoney,
  formatNumber,
  HOUR_FORMS,
  MINUTE_FORMS,
  plural,
} from "@/lib/format";
import { plainNumber } from "@/lib/display";
import { CopyButton } from "./CopyButton";
import { Section, Separator } from "./Section";
import { CopyIcon } from "./icons";

type ResultsCardProps = {
  result: CalculationResult;
  currency: string;
  rate: number | null;
  multiplier: number | null;
  value: number | null;
  amount: number | null;
  onCopySummary: () => void;
};

function BigNumber({ value, forms }: { value: number; forms: [string, string, string] }) {
  return (
    <div className="min-w-0">
      <div className="overflow-hidden text-[clamp(44px,13vw,64px)] font-semibold leading-none tracking-[-0.04em] tabular-nums lg:text-[60px]">
        <span key={value} className="inline-block animate-num-in">
          {value}
        </span>
      </div>
      <div className="mt-2 text-[13px] text-secondary">{plural(value, forms)}</div>
    </div>
  );
}

function ValueRow({
  label,
  display,
  copyValue,
  copyLabel,
  disabled,
}: {
  label: string;
  display: string;
  copyValue: string;
  copyLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 py-1.5 pl-5 pr-3 sm:pl-6">
      <span className="text-[15px] text-label">{label}</span>
      <span className="flex items-center gap-1">
        <span className="text-[17px] font-medium tabular-nums tracking-[-0.01em]">{display}</span>
        <CopyButton value={copyValue} label={copyLabel} disabled={disabled} />
      </span>
    </div>
  );
}

export function ResultsCard({
  result,
  currency,
  rate,
  multiplier,
  value,
  amount,
  onCopySummary,
}: ResultsCardProps) {
  const empty = result.countedRanges === 0;
  const decimalDays = formatNumber(result.decimalDays, 5, 5);
  const decimalHours = formatNumber(result.decimalHours, 5);

  const rateText = rate === null ? "—" : formatNumber(rate, 6);
  const formula = `${decimalDays} dni × ${rateText}${currency === "PLN" ? "" : ` ${currency}/PLN`} × ${
    multiplier === null ? "—" : formatNumber(multiplier, 6)
  } × ${value === null ? "—" : formatNumber(value, 6)}`;

  const announce = `Wynik: ${result.days} ${plural(result.days, DAY_FORMS)}, ${result.hours} ${plural(
    result.hours,
    HOUR_FORMS,
  )}, ${result.minutes} ${plural(result.minutes, MINUTE_FORMS)}. Łącznie ${decimalDays} dni.${
    amount === null ? "" : ` Kwota ${formatMoney(amount)}.`
  }`;

  return (
    <Section id="results-title" title="Wynik">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      <div className={`px-5 pb-5 pt-6 transition-opacity sm:px-6 ${empty ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-3 gap-3">
          <BigNumber value={result.days} forms={DAY_FORMS} />
          <BigNumber value={result.hours} forms={HOUR_FORMS} />
          <BigNumber value={result.minutes} forms={MINUTE_FORMS} />
        </div>
        {empty && (
          <p className="mt-4 text-[13px] text-secondary">
            Uzupełnij co najmniej jeden przedział, aby zobaczyć wynik.
          </p>
        )}
      </div>

      <Separator className="ml-5 sm:ml-6" />
      <ValueRow
        label="Łącznie w dniach"
        display={decimalDays}
        copyValue={plainNumber(result.decimalDays, 5, 5)}
        copyLabel="Kopiuj łączną liczbę dni"
      />
      <Separator className="ml-5 sm:ml-6" />
      <ValueRow
        label="Łącznie w godzinach"
        display={decimalHours}
        copyValue={plainNumber(result.decimalHours, 5)}
        copyLabel="Kopiuj łączną liczbę godzin"
      />
      <Separator className="ml-5 sm:ml-6" />

      <div className="px-5 pb-6 pt-5 sm:px-6">
        <div className="text-[13px] text-secondary">Kwota</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[clamp(34px,10vw,44px)] font-semibold leading-tight tracking-[-0.03em] tabular-nums">
            {amount === null ? (
              <span className="text-tertiary">—</span>
            ) : (
              <span key={amount} className="inline-block animate-num-in">
                {formatMoney(amount)}
              </span>
            )}
          </div>
          <CopyButton
            value={amount === null ? "" : plainNumber(amount, 2, 2)}
            label="Kopiuj kwotę"
            disabled={amount === null}
            className="-mr-2"
          />
        </div>
        {amount === null ? (
          <p className="mt-1 text-[13px] text-secondary">
            Uzupełnij kurs, mnożnik i wartość, aby obliczyć kwotę.
          </p>
        ) : (
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="text-[13px] tabular-nums text-secondary">
              Dokładnie {formatNumber(amount, 5, 5)} zł
            </p>
            <CopyButton
              value={plainNumber(amount, 5, 5)}
              label="Kopiuj dokładną kwotę"
              className="-mr-2"
            />
          </div>
        )}
        <p className="mt-3 break-words text-[12px] tabular-nums text-tertiary">{formula}</p>

        <button
          type="button"
          onClick={onCopySummary}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-medium text-white transition-[background-color,transform] duration-150 hover:bg-accent-hover active:scale-[0.98]"
        >
          <CopyIcon size={16} />
          Kopiuj podsumowanie
        </button>
      </div>
    </Section>
  );
}
