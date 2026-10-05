import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildLatestRateUrl,
  buildRangeRateUrl,
  buildTableUrl,
  ERROR_MESSAGES,
  fetchNbpJson,
  getCurrencies,
  getRate,
  isValidIsoDate,
  lookbackRange,
  NbpApiError,
  normalizeCode,
  pickLastRate,
  REVALIDATE_HISTORICAL,
  REVALIDATE_LATEST,
  shiftIsoDate,
  sortCurrencies,
  toCurrenciesResponse,
  toErrorResponse,
  todayInWarsaw,
  toRateResponse,
  validateCode,
  validateRateDate,
} from "./nbp";

// 2026-10-05 10:00 in Warsaw (UTC+2)
const NOW = new Date("2026-10-05T08:00:00Z");

function expectNbpError(fn: () => unknown, kind: NbpApiError["kind"]) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(NbpApiError);
    expect((err as NbpApiError).kind).toBe(kind);
    return;
  }
  throw new Error(`expected NbpApiError(${kind})`);
}

describe("normalizeCode / validateCode", () => {
  it("uppercases valid 3-letter codes", () => {
    expect(normalizeCode("eur")).toBe("EUR");
    expect(normalizeCode(" Usd ")).toBe("USD");
    expect(validateCode("chf")).toBe("CHF");
  });

  it.each([null, undefined, "", "EU", "EURO", "E1R", "€UR", "../"])("rejects %j", (raw) => {
    expect(normalizeCode(raw)).toBeNull();
    expectNbpError(() => validateCode(raw), "invalid-code");
  });
});

describe("date helpers", () => {
  it("isValidIsoDate checks format and real calendar dates", () => {
    expect(isValidIsoDate("2026-09-06")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-9-6")).toBe(false);
    expect(isValidIsoDate("06.09.2026")).toBe(false);
    expect(isValidIsoDate("2026-09-06T00:00")).toBe(false);
  });

  it("todayInWarsaw uses the Polish calendar day", () => {
    expect(todayInWarsaw(NOW)).toBe("2026-10-05");
    // 23:30 UTC on 4 Oct is already 5 Oct in Warsaw
    expect(todayInWarsaw(new Date("2026-10-04T23:30:00Z"))).toBe("2026-10-05");
  });

  it("shiftIsoDate crosses month/year boundaries", () => {
    expect(shiftIsoDate("2026-09-06", -10)).toBe("2026-08-27");
    expect(shiftIsoDate("2026-01-03", -10)).toBe("2025-12-24");
    expect(shiftIsoDate("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("lookbackRange spans 10 days and is clamped to 2002-01-02", () => {
    expect(lookbackRange("2026-09-06")).toEqual({ start: "2026-08-27", end: "2026-09-06" });
    expect(lookbackRange("2002-01-05")).toEqual({ start: "2002-01-02", end: "2002-01-05" });
  });

  it("validateRateDate accepts absent / empty / valid dates", () => {
    expect(validateRateDate(null, NOW)).toBeNull();
    expect(validateRateDate(undefined, NOW)).toBeNull();
    expect(validateRateDate("", NOW)).toBeNull();
    expect(validateRateDate("2026-09-06", NOW)).toBe("2026-09-06");
    expect(validateRateDate("2026-10-05", NOW)).toBe("2026-10-05"); // today
    expect(validateRateDate("2002-01-02", NOW)).toBe("2002-01-02");
  });

  it("validateRateDate rejects bad, future and too-early dates", () => {
    expectNbpError(() => validateRateDate("2026-02-30", NOW), "invalid-date");
    expectNbpError(() => validateRateDate("yesterday", NOW), "invalid-date");
    expectNbpError(() => validateRateDate("2026-10-06", NOW), "future-date");
    expectNbpError(() => validateRateDate("2030-01-01", NOW), "future-date");
    expectNbpError(() => validateRateDate("2002-01-01", NOW), "date-too-early");
  });
});

describe("URL builders", () => {
  it("builds table A URLs with format=json and lowercase codes", () => {
    expect(buildTableUrl()).toBe("https://api.nbp.pl/api/exchangerates/tables/a/?format=json");
    expect(buildLatestRateUrl("EUR")).toBe("https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json");
    expect(buildRangeRateUrl("USD", "2026-08-27", "2026-09-06")).toBe(
      "https://api.nbp.pl/api/exchangerates/rates/a/usd/2026-08-27/2026-09-06/?format=json",
    );
  });
});

describe("sortCurrencies / pickLastRate", () => {
  it("puts EUR, USD, GBP, CHF first, then the rest by code", () => {
    const input = ["THB", "USD", "AUD", "CHF", "EUR", "XDR", "GBP", "CAD"].map((code) => ({ code }));
    expect(sortCurrencies(input).map((c) => c.code)).toEqual([
      "EUR",
      "USD",
      "GBP",
      "CHF",
      "AUD",
      "CAD",
      "THB",
      "XDR",
    ]);
    // does not mutate the input
    expect(input[0].code).toBe("THB");
  });

  it("picks the rate with the latest effectiveDate", () => {
    const rates = [
      { effectiveDate: "2026-09-02", mid: 1 },
      { effectiveDate: "2026-09-04", mid: 3 },
      { effectiveDate: "2026-09-03", mid: 2 },
    ];
    expect(pickLastRate(rates)?.mid).toBe(3);
    expect(pickLastRate([])).toBeNull();
  });
});

const TABLE_PAYLOAD = [
  {
    table: "A",
    no: "192/A/NBP/2026",
    effectiveDate: "2026-10-02",
    rates: [
      { currency: "bat (Tajlandia)", code: "THB", mid: 0.1159 },
      { currency: "dolar amerykański", code: "USD", mid: 3.8881 },
      { currency: "euro", code: "EUR", mid: 4.3745 },
      { currency: "frank szwajcarski", code: "CHF", mid: 4.6 },
      { currency: "funt szterling", code: "GBP", mid: 5.1 },
      { currency: "dolar australijski", code: "AUD", mid: 2.699 },
    ],
  },
];

const RANGE_PAYLOAD = {
  table: "A",
  currency: "dolar amerykański",
  code: "USD",
  rates: [
    { no: "170/A/NBP/2026", effectiveDate: "2026-09-02", mid: 3.7423 },
    { no: "171/A/NBP/2026", effectiveDate: "2026-09-03", mid: 3.7224 },
    { no: "172/A/NBP/2026", effectiveDate: "2026-09-04", mid: 3.7145 },
  ],
};

describe("payload transforms", () => {
  it("toCurrenciesResponse maps and sorts table A", () => {
    expect(toCurrenciesResponse(TABLE_PAYLOAD)).toEqual({
      table: "192/A/NBP/2026",
      effectiveDate: "2026-10-02",
      currencies: [
        { code: "EUR", name: "euro" },
        { code: "USD", name: "dolar amerykański" },
        { code: "GBP", name: "funt szterling" },
        { code: "CHF", name: "frank szwajcarski" },
        { code: "AUD", name: "dolar australijski" },
        { code: "THB", name: "bat (Tajlandia)" },
      ],
    });
  });

  it("toCurrenciesResponse rejects malformed payloads as upstream errors", () => {
    expectNbpError(() => toCurrenciesResponse([]), "upstream");
    expectNbpError(() => toCurrenciesResponse({ foo: 1 }), "upstream");
  });

  it("toRateResponse uses the last entry", () => {
    expect(toRateResponse(RANGE_PAYLOAD, NOW)).toEqual({
      code: "USD",
      currency: "dolar amerykański",
      mid: 3.7145,
      effectiveDate: "2026-09-04",
      table: "172/A/NBP/2026",
      fetchedAt: NOW.toISOString(),
    });
  });

  it("toRateResponse falls back to the code when NBP omits the currency name (2002 data)", () => {
    const old = {
      table: "A",
      country: "USA",
      symbol: "787",
      code: "USD",
      rates: [{ no: "1/A/NBP/2002", effectiveDate: "2002-01-02", mid: 3.948 }],
    };
    expect(toRateResponse(old, NOW).currency).toBe("USD");
  });

  it("toRateResponse: empty rates -> no-data, garbage -> upstream", () => {
    expectNbpError(() => toRateResponse({ ...RANGE_PAYLOAD, rates: [] }, NOW), "no-data");
    expectNbpError(() => toRateResponse("404 NotFound", NOW), "upstream");
  });
});

describe("toErrorResponse", () => {
  it("maps NbpApiError kinds to statuses and Polish messages", () => {
    expect(toErrorResponse(new NbpApiError("invalid-code"))).toEqual({
      status: 400,
      body: { error: "Nieprawidłowy kod waluty" },
    });
    expect(toErrorResponse(new NbpApiError("no-data"))).toEqual({
      status: 404,
      body: { error: "Brak kursu NBP dla wybranej daty" },
    });
    expect(toErrorResponse(new NbpApiError("upstream")).status).toBe(502);
  });

  it("maps unknown errors to a 502 connection error", () => {
    expect(toErrorResponse(new Error("boom"))).toEqual({
      status: 502,
      body: { error: "Nie udało się połączyć z NBP. Spróbuj ponownie." },
    });
  });
});

// ---------------------------------------------------------------------------
// fetch-wrapping functions
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function notFound(): Response {
  return new Response("404 NotFound - Not Found - Brak danych", { status: 404 });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expectRejectKind(promise: Promise<unknown>, kind: NbpApiError["kind"]) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(NbpApiError);
  expect((err as NbpApiError).kind).toBe(kind);
  return err as NbpApiError;
}

describe("fetchNbpJson", () => {
  it("sends Accept: application/json, a timeout signal and revalidate", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await expect(fetchNbpJson("https://example.test/x", 123)).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.test/x");
    expect(init?.headers).toEqual({ Accept: "application/json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect((init as RequestInit & { next?: { revalidate?: number } }).next).toEqual({ revalidate: 123 });
  });

  it("404 -> no-data", async () => {
    fetchMock.mockResolvedValue(notFound());
    await expectRejectKind(fetchNbpJson("https://example.test/x", 1), "no-data");
  });

  it("other HTTP errors -> upstream", async () => {
    fetchMock.mockResolvedValue(new Response("Bad Request", { status: 400 }));
    await expectRejectKind(fetchNbpJson("https://example.test/x", 1), "upstream");
    fetchMock.mockResolvedValue(new Response("oops", { status: 503 }));
    await expectRejectKind(fetchNbpJson("https://example.test/x", 1), "upstream");
  });

  it("network error -> upstream", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const err = await expectRejectKind(fetchNbpJson("https://example.test/x", 1), "upstream");
    expect(err.message).toBe(ERROR_MESSAGES.upstream);
  });

  it("timeout -> upstream", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expectRejectKind(fetchNbpJson("https://example.test/x", 1), "upstream");
  });

  it("invalid JSON -> upstream", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    await expectRejectKind(fetchNbpJson("https://example.test/x", 1), "upstream");
  });
});

describe("getCurrencies", () => {
  it("returns the sorted currency list", async () => {
    fetchMock.mockResolvedValue(jsonResponse(TABLE_PAYLOAD));
    const res = await getCurrencies();
    expect(res.table).toBe("192/A/NBP/2026");
    expect(res.currencies.slice(0, 4).map((c) => c.code)).toEqual(["EUR", "USD", "GBP", "CHF"]);
    expect(fetchMock.mock.calls[0][0]).toBe(buildTableUrl());
  });

  it("network failure -> upstream (502)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const err = await expectRejectKind(getCurrencies(), "upstream");
    expect(err.status).toBe(502);
  });
});

describe("getRate", () => {
  it("latest rate: calls /rates/a/{code}/ with a 1h cache", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        table: "A",
        currency: "euro",
        code: "EUR",
        rates: [{ no: "192/A/NBP/2026", effectiveDate: "2026-10-02", mid: 4.3745 }],
      }),
    );
    const res = await getRate("eur", null, NOW);
    expect(res).toEqual({
      code: "EUR",
      currency: "euro",
      mid: 4.3745,
      effectiveDate: "2026-10-02",
      table: "192/A/NBP/2026",
      fetchedAt: NOW.toISOString(),
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(buildLatestRateUrl("EUR"));
    expect((init as { next?: { revalidate?: number } }).next?.revalidate).toBe(REVALIDATE_LATEST);
  });

  it("date on a Sunday: fetches [date-10, date] and returns Friday's rate", async () => {
    fetchMock.mockResolvedValue(jsonResponse(RANGE_PAYLOAD));
    const res = await getRate("usd", "2026-09-06", NOW);
    expect(res.effectiveDate).toBe("2026-09-04");
    expect(res.mid).toBe(3.7145);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(buildRangeRateUrl("USD", "2026-08-27", "2026-09-06"));
    expect((init as { next?: { revalidate?: number } }).next?.revalidate).toBe(REVALIDATE_HISTORICAL);
  });

  it("date = today uses the short cache", async () => {
    fetchMock.mockResolvedValue(jsonResponse(RANGE_PAYLOAD));
    await getRate("USD", "2026-10-05", NOW);
    const init = fetchMock.mock.calls[0][1] as { next?: { revalidate?: number } };
    expect(init.next?.revalidate).toBe(REVALIDATE_LATEST);
  });

  it("404 for a date -> no-data with the date message", async () => {
    fetchMock.mockResolvedValue(notFound());
    const err = await expectRejectKind(getRate("USD", "2026-09-06", NOW), "no-data");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Brak kursu NBP dla wybranej daty");
  });

  it("404 for latest (unknown code) -> no-data naming the currency", async () => {
    fetchMock.mockResolvedValue(notFound());
    const err = await expectRejectKind(getRate("xxx", undefined, NOW), "no-data");
    expect(err.message).toBe("Brak kursu NBP dla waluty XXX");
  });

  it("timeout -> upstream", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    await expectRejectKind(getRate("EUR", null, NOW), "upstream");
  });

  it("validates params before calling NBP", async () => {
    await expectRejectKind(getRate("EURO", null, NOW), "invalid-code");
    await expectRejectKind(getRate(null, null, NOW), "invalid-code");
    await expectRejectKind(getRate("EUR", "2030-01-01", NOW), "future-date");
    await expectRejectKind(getRate("EUR", "2026-02-30", NOW), "invalid-date");
    await expectRejectKind(getRate("EUR", "1999-01-01", NOW), "date-too-early");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
