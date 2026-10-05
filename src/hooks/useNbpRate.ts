"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NbpError, NbpRateResponse } from "@/lib/nbp-types";

const NETWORK_ERROR = "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.";
const GENERIC_ERROR = "Nie udało się pobrać kursu z NBP. Spróbuj ponownie za chwilę.";

function isRateResponse(v: unknown): v is NbpRateResponse {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.code === "string" &&
    typeof r.mid === "number" &&
    Number.isFinite(r.mid) &&
    typeof r.effectiveDate === "string" &&
    typeof r.table === "string"
  );
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Partial<NbpError>;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    // not JSON
  }
  return GENERIC_ERROR;
}

/**
 * Fetches a mid rate from /api/nbp/rate. Only the latest request wins —
 * earlier in-flight requests are aborted.
 */
export function useNbpRate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const fetchRate = useCallback(
    async (code: string, date?: string): Promise<NbpRateResponse | null> => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ code });
      if (date) params.set("date", date);

      try {
        const res = await fetch(`/api/nbp/rate?${params.toString()}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const message = await readError(res);
          if (!ac.signal.aborted) setError(message);
          return null;
        }
        const data: unknown = await res.json();
        if (!isRateResponse(data)) {
          if (!ac.signal.aborted) setError(GENERIC_ERROR);
          return null;
        }
        if (ac.signal.aborted) return null;
        return {
          ...data,
          fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : new Date().toISOString(),
        };
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return null;
        if (!ac.signal.aborted) setError(NETWORK_ERROR);
        return null;
      } finally {
        if (controller.current === ac) {
          setLoading(false);
          controller.current = null;
        }
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setLoading(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { fetchRate, loading, error, setError, clearError, cancel };
}
