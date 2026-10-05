"use client";

import { useEffect, useState } from "react";
import type { NbpCurrency, NbpCurrenciesResponse } from "@/lib/nbp-types";

/** Used until /api/nbp/currencies answers, and if it fails. */
export const FALLBACK_CURRENCIES: NbpCurrency[] = [
  { code: "EUR", name: "euro" },
  { code: "USD", name: "dolar amerykański" },
  { code: "GBP", name: "funt szterling" },
  { code: "CHF", name: "frank szwajcarski" },
];

export const PLN_CURRENCY: NbpCurrency = { code: "PLN", name: "złoty polski" };

let cache: NbpCurrency[] | null = null;

export function useNbpCurrencies() {
  const [currencies, setCurrencies] = useState<NbpCurrency[]>(cache ?? FALLBACK_CURRENCIES);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    cache ? "ready" : "loading",
  );

  useEffect(() => {
    if (cache) return;
    const ac = new AbortController();
    fetch("/api/nbp/currencies", { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Partial<NbpCurrenciesResponse>;
        const list = Array.isArray(data.currencies)
          ? data.currencies.filter(
              (c): c is NbpCurrency =>
                !!c && typeof c.code === "string" && typeof c.name === "string",
            )
          : [];
        if (list.length === 0) throw new Error("empty");
        cache = list;
        setCurrencies(list);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setStatus("fallback");
      });
    return () => ac.abort();
  }, []);

  return { currencies, status };
}
