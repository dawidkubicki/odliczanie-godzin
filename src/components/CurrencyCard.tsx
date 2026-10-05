"use client";

import type { NbpCurrency, NbpRateResponse } from "@/lib/nbp-types";
import type { RateMode } from "@/lib/app-state";
import { formatDate } from "@/lib/format";
import { formatTimestamp, plainNumber, todayIso } from "@/lib/display";
import { PLN_CURRENCY } from "@/hooks/useNbpCurrencies";
import { SegmentedControl } from "./SegmentedControl";
import { Row, Section, Separator } from "./Section";
import { AlertIcon, ChevronUpDownIcon, RefreshIcon, Spinner } from "./icons";

type CurrencyCardProps = {
  currencies: NbpCurrency[];
  currenciesStatus: "loading" | "ready" | "fallback";
  currency: string;
  onCurrencyChange: (code: string) => void;
  rateMode: RateMode;
  onRateModeChange: (mode: RateMode) => void;
  rateDate: string;
  onRateDateChange: (date: string) => void;
  onFetch: () => void;
  loading: boolean;
  error: string | null;
  rateInput: string;
  onRateInputChange: (v: string) => void;
  rateInvalid: boolean;
  multiplierInput: string;
  onMultiplierInputChange: (v: string) => void;
  multiplierInvalid: boolean;
  valueInput: string;
  onValueInputChange: (v: string) => void;
  valueInvalid: boolean;
  /** NBP info for the selected currency (null if none / other currency) */
  rateInfo: NbpRateResponse | null;
  /** The rate field differs from the NBP value */
  isManual: boolean;
  onRestoreNbp: () => void;
};

const RATE_MODES: { value: RateMode; label: string }[] = [
  { value: "latest", label: "Najnowszy" },
  { value: "date", label: "Z dnia" },
];

function NumberInput({
  id,
  value,
  onChange,
  invalid,
  suffix,
  placeholder,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  suffix?: string;
  placeholder?: string;
  describedBy?: string;
}) {
  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className="field w-[132px] text-right text-[15px] font-medium sm:w-[148px]"
      />
      {suffix !== undefined && (
        <span className="w-[62px] shrink-0 text-[13px] tabular-nums text-secondary">{suffix}</span>
      )}
    </>
  );
}

function FieldError({ id, show }: { id: string; show: boolean }) {
  if (!show) return null;
  return (
    <p id={id} className="-mt-1 px-4 pb-3 text-right text-[12px] text-danger sm:px-5">
      Wpisz liczbę, np. 4,3745
    </p>
  );
}

export function CurrencyCard(props: CurrencyCardProps) {
  const {
    currencies,
    currenciesStatus,
    currency,
    onCurrencyChange,
    rateMode,
    onRateModeChange,
    rateDate,
    onRateDateChange,
    onFetch,
    loading,
    error,
    rateInput,
    onRateInputChange,
    rateInvalid,
    multiplierInput,
    onMultiplierInputChange,
    multiplierInvalid,
    valueInput,
    onValueInputChange,
    valueInvalid,
    rateInfo,
    isManual,
    onRestoreNbp,
  } = props;

  const isPln = currency === "PLN";
  const list = currencies.filter((c) => c.code !== "PLN");
  const options =
    isPln || list.some((c) => c.code === currency) ? list : [...list, { code: currency, name: "" }];

  const footer = (
    <>
      {isPln ? (
        <p>Złoty polski nie wymaga przeliczenia — kurs wynosi 1.</p>
      ) : rateInfo ? (
        <>
          <p className="tabular-nums">
            Kurs NBP z {formatDate(rateInfo.effectiveDate)} · tabela {rateInfo.table}
          </p>
          {rateInfo.fetchedAt && (
            <p className="tabular-nums">Ostatnie pobranie: {formatTimestamp(rateInfo.fetchedAt)}</p>
          )}
          {isManual && (
            <p>
              Kurs zmieniony ręcznie (NBP: {plainNumber(rateInfo.mid, 6)}).{" "}
              <button
                type="button"
                onClick={onRestoreNbp}
                className="rounded font-medium text-accent hover:underline"
              >
                Przywróć kurs NBP
              </button>
            </p>
          )}
        </>
      ) : (
        <p>Kurs nie został jeszcze pobrany — pobierz go z NBP lub wpisz ręcznie.</p>
      )}
      {!isPln && rateMode === "date" && (
        <p>
          Jeśli NBP nie publikował kursu w wybranym dniu, użyty zostanie kurs z ostatniego dnia
          roboczego.
        </p>
      )}
      {currenciesStatus === "fallback" && (
        <p>Nie udało się pobrać pełnej listy walut — dostępne są waluty podstawowe.</p>
      )}
    </>
  );

  return (
    <div className="space-y-8">
      <Section id="currency-title" title="Waluta i kurs" footer={footer}>
        <Row label="Waluta" htmlFor="currency">
          <div className="relative min-w-0">
            <select
              id="currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="field max-w-[220px] cursor-pointer truncate pr-8 text-[15px] font-medium"
            >
              {options.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name ? `${c.code} — ${c.name}` : c.code}
                </option>
              ))}
              <option value={PLN_CURRENCY.code}>
                {PLN_CURRENCY.code} — {PLN_CURRENCY.name}
              </option>
            </select>
            <ChevronUpDownIcon
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary"
            />
          </div>
        </Row>
        <Separator />
        <Row label="Źródło">
          <SegmentedControl
            label="Źródło kursu"
            options={RATE_MODES}
            value={rateMode}
            onChange={onRateModeChange}
            disabled={isPln}
            className="w-[196px]"
          />
        </Row>
        {rateMode === "date" && !isPln && (
          <>
            <Separator />
            <Row label="Data kursu" htmlFor="rate-date" className="animate-fade-in">
              <input
                id="rate-date"
                type="date"
                value={rateDate}
                max={todayIso()}
                min="2002-01-02"
                onChange={(e) => onRateDateChange(e.target.value)}
                className="field w-[180px] text-[15px]"
              />
            </Row>
          </>
        )}
        <Separator />
        <button
          type="button"
          onClick={onFetch}
          disabled={isPln || loading}
          aria-busy={loading || undefined}
          className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left text-[15px] font-medium text-accent transition-[background-color,opacity] duration-150 hover:bg-accent-soft active:bg-accent-soft disabled:cursor-default disabled:hover:bg-transparent sm:px-5 [&:disabled:not([aria-busy])]:opacity-40"
        >
          <span>{loading ? "Pobieranie kursu…" : "Pobierz kurs NBP"}</span>
          {loading ? <Spinner size={16} className="text-secondary" /> : <RefreshIcon size={17} />}
        </button>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border-t border-separator px-4 py-3 text-[13px] text-danger sm:px-5"
          >
            <AlertIcon size={16} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Section>

      <Section
        id="conversion-title"
        title="Przeliczenie"
        footer={<p>Kwota = łączna liczba dni × kurs × mnożnik × wartość.</p>}
      >
        <Row label="Kurs" htmlFor="rate">
          <NumberInput
            id="rate"
            value={rateInput}
            onChange={onRateInputChange}
            invalid={rateInvalid}
            placeholder="0,0000"
            suffix={isPln ? "PLN" : `${currency}/PLN`}
            describedBy={rateInvalid ? "rate-error" : undefined}
          />
        </Row>
        <FieldError id="rate-error" show={rateInvalid} />
        <Separator />
        <Row label="Mnożnik" htmlFor="multiplier">
          <NumberInput
            id="multiplier"
            value={multiplierInput}
            onChange={onMultiplierInputChange}
            invalid={multiplierInvalid}
            placeholder="1"
            suffix=""
            describedBy={multiplierInvalid ? "multiplier-error" : undefined}
          />
        </Row>
        <FieldError id="multiplier-error" show={multiplierInvalid} />
        <Separator />
        <Row label="Wartość" htmlFor="value">
          <NumberInput
            id="value"
            value={valueInput}
            onChange={onValueInputChange}
            invalid={valueInvalid}
            placeholder="1"
            suffix=""
            describedBy={valueInvalid ? "value-error" : undefined}
          />
        </Row>
        <FieldError id="value-error" show={valueInvalid} />
      </Section>
    </div>
  );
}
