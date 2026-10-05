"use client";

import { useCallback, useEffect, useMemo } from "react";
import { calculate, computeAmount, type TimeRange } from "@/lib/time";
import { parseDecimal } from "@/lib/format";
import {
  emptyRanges,
  INITIAL_STATE,
  rateToInput,
  sanitizeState,
  STORAGE_KEY,
  type AppState,
  type RateMode,
} from "@/lib/app-state";
import { todayIso } from "@/lib/display";
import { buildSummary } from "@/lib/summary";
import { readPersistentState, usePersistentState } from "@/hooks/usePersistentState";
import { useNbpRate } from "@/hooks/useNbpRate";
import { useNbpCurrencies } from "@/hooks/useNbpCurrencies";
import { copyText } from "@/hooks/useClipboard";
import { RangesCard } from "./RangesCard";
import { CurrencyCard } from "./CurrencyCard";
import { ResultsCard } from "./ResultsCard";
import { Toast, useToast } from "./Toast";

function isPristine(s: AppState): boolean {
  return (
    s.ranges.every((r) => !r.start && !r.end && r.active) &&
    s.currency === INITIAL_STATE.currency &&
    s.rateMode === INITIAL_STATE.rateMode &&
    s.multiplierInput === INITIAL_STATE.multiplierInput &&
    s.valueInput === INITIAL_STATE.valueInput
  );
}

export function Calculator() {
  const [state, setState] = usePersistentState<AppState>(STORAGE_KEY, INITIAL_STATE, sanitizeState);
  const { currencies, status: currenciesStatus } = useNbpCurrencies();
  const nbp = useNbpRate();
  const { fetchRate, setError: setRateError, clearError, cancel } = nbp;
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  // ---- derived values -------------------------------------------------------
  const result = useMemo(() => calculate(state.ranges), [state.ranges]);
  const rate = parseDecimal(state.rateInput);
  const multiplier = parseDecimal(state.multiplierInput);
  const value = parseDecimal(state.valueInput);
  const amount =
    rate !== null && multiplier !== null && value !== null
      ? computeAmount(result.decimalDays, rate, multiplier, value)
      : null;

  const rateInfo =
    state.currency !== "PLN" && state.rateInfo?.code === state.currency ? state.rateInfo : null;
  const rateMatchesNbp = rateInfo !== null && rate !== null && Math.abs(rate - rateInfo.mid) < 1e-9;
  const isManual = rateInfo !== null && !rateMatchesNbp;

  // ---- NBP ------------------------------------------------------------------
  const loadRate = useCallback(
    async (code: string, mode: RateMode, date: string) => {
      if (code === "PLN") return;
      if (mode === "date" && !date) {
        setRateError("Wybierz datę, z której ma pochodzić kurs.");
        return;
      }
      const data = await fetchRate(code, mode === "date" ? date : undefined);
      if (!data) return;
      setState((prev) =>
        prev.currency !== code
          ? prev
          : { ...prev, rateInfo: data, rateInput: rateToInput(data.mid) },
      );
    },
    [fetchRate, setRateError, setState],
  );

  // First visit: fetch the latest rate. Returning visits: refresh it, unless the
  // user picked a historical date or typed the rate by hand.
  useEffect(() => {
    const s = readPersistentState<AppState>(STORAGE_KEY) ?? INITIAL_STATE;
    if (s.currency === "PLN" || s.rateMode !== "latest") return;
    const manual =
      s.rateInput.trim() !== "" &&
      (!s.rateInfo ||
        s.rateInfo.code !== s.currency ||
        parseDecimal(s.rateInput) !== s.rateInfo.mid);
    if (manual) return;
    void loadRate(s.currency, "latest", "");
  }, [loadRate]);

  // ---- handlers -------------------------------------------------------------
  const updateRange = useCallback(
    (id: string, patch: Partial<TimeRange>) =>
      setState((prev) => ({
        ...prev,
        ranges: prev.ranges.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    [setState],
  );

  const clearRange = useCallback(
    (id: string) => updateRange(id, { start: "", end: "" }),
    [updateRange],
  );

  const onCurrencyChange = (code: string) => {
    if (code === "PLN") {
      cancel();
      clearError();
      setState((prev) => ({ ...prev, currency: "PLN", rateInput: "1", rateInfo: null }));
      return;
    }
    setState((prev) => ({ ...prev, currency: code, rateInput: "", rateInfo: null }));
    void loadRate(code, state.rateMode, state.rateDate);
  };

  const onRateModeChange = (mode: RateMode) => {
    clearError();
    setState((prev) => ({
      ...prev,
      rateMode: mode,
      rateDate: mode === "date" && !prev.rateDate ? todayIso() : prev.rateDate,
    }));
  };

  const onFetch = () => void loadRate(state.currency, state.rateMode, state.rateDate);

  const onRestoreNbp = () => {
    if (!rateInfo) return;
    setState((prev) => ({ ...prev, rateInput: rateToInput(rateInfo.mid) }));
  };

  const onClearAll = () => {
    const previous = state;
    cancel();
    clearError();
    setState({ ...INITIAL_STATE, ranges: emptyRanges() });
    showToast({
      message: "Wyczyszczono wszystkie dane",
      action: {
        label: "Cofnij",
        onAction: () => {
          cancel();
          setState(previous);
        },
      },
      duration: 6000,
    });
    void loadRate(INITIAL_STATE.currency, "latest", "");
  };

  const onCopySummary = async () => {
    const text = buildSummary({
      ranges: state.ranges,
      result,
      currency: state.currency,
      rate,
      rateSource: rateMatchesNbp ? rateInfo : null,
      multiplier,
      value,
      amount,
    });
    const ok = await copyText(text);
    showToast(
      ok
        ? { message: "Skopiowano podsumowanie" }
        : { message: "Nie udało się skopiować — spróbuj ponownie" },
    );
  };

  const pristine = isPristine(state);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-8 pt-10 sm:pb-10 sm:pt-16">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
            Odliczanie godzin
          </h1>
          <p className="mt-2 max-w-[560px] text-[17px] leading-snug text-secondary">
            Zsumuj czas z kilku przedziałów i przelicz go na złotówki po kursie NBP.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          disabled={pristine}
          className="rounded-full px-3 py-1.5 text-[15px] text-accent transition-[background-color,opacity,transform] duration-150 hover:bg-accent-soft active:scale-[0.98] -ml-3 disabled:pointer-events-none disabled:opacity-40 sm:ml-0 sm:-mr-3"
        >
          Wyczyść wszystko
        </button>
      </header>

      <main className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        <RangesCard
          ranges={state.ranges}
          result={result}
          onChange={updateRange}
          onClear={clearRange}
        />

        <div className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-6 lg:self-start">
          <ResultsCard
            result={result}
            currency={state.currency}
            rate={rate}
            multiplier={multiplier}
            value={value}
            amount={amount}
            onCopySummary={() => void onCopySummary()}
          />
          <CurrencyCard
            currencies={currencies}
            currenciesStatus={currenciesStatus}
            currency={state.currency}
            onCurrencyChange={onCurrencyChange}
            rateMode={state.rateMode}
            onRateModeChange={onRateModeChange}
            rateDate={state.rateDate}
            onRateDateChange={(rateDate) => setState((prev) => ({ ...prev, rateDate }))}
            onFetch={onFetch}
            loading={nbp.loading}
            error={nbp.error}
            rateInput={state.rateInput}
            onRateInputChange={(rateInput) => setState((prev) => ({ ...prev, rateInput }))}
            rateInvalid={state.rateInput.trim() !== "" && rate === null}
            multiplierInput={state.multiplierInput}
            onMultiplierInputChange={(multiplierInput) =>
              setState((prev) => ({ ...prev, multiplierInput }))
            }
            multiplierInvalid={state.multiplierInput.trim() !== "" && multiplier === null}
            valueInput={state.valueInput}
            onValueInputChange={(valueInput) => setState((prev) => ({ ...prev, valueInput }))}
            valueInvalid={state.valueInput.trim() !== "" && value === null}
            rateInfo={rateInfo}
            isManual={isManual}
            onRestoreNbp={onRestoreNbp}
          />
        </div>
      </main>

      <footer className="mt-16 text-center text-[12px] text-tertiary">
        Kursy średnie walut obcych według tabeli A Narodowego Banku Polskiego.
      </footer>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
