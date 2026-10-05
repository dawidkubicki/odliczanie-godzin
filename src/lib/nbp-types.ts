/**
 * Shared contract between the NBP route handler (/api/nbp) and the UI.
 * The UI never calls api.nbp.pl directly — it goes through the route handler.
 */

export type NbpCurrency = {
  code: string; // "EUR"
  name: string; // "euro" (Polish name as returned by NBP)
};

/**
 * GET /api/nbp/currencies
 * -> 200 NbpCurrenciesResponse | 502 NbpError
 */
export type NbpCurrenciesResponse = {
  currencies: NbpCurrency[]; // sorted: EUR, USD, GBP, CHF first, then alphabetically by code
  table: string; // e.g. "192/A/NBP/2026"
  effectiveDate: string; // "YYYY-MM-DD"
};

/**
 * GET /api/nbp/rate?code=EUR            -> latest published mid rate (table A)
 * GET /api/nbp/rate?code=EUR&date=YYYY-MM-DD
 *      -> rate for the last NBP business day *on or before* `date`
 *         (NBP does not publish on weekends/holidays, so walk back up to 10 days)
 * -> 200 NbpRateResponse | 400 NbpError (bad params) | 404 NbpError (no data) | 502 NbpError
 */
export type NbpRateResponse = {
  code: string; // "EUR"
  currency: string; // "euro"
  mid: number; // 4.3745
  effectiveDate: string; // "YYYY-MM-DD" — the date of the table actually used
  table: string; // "192/A/NBP/2026"
  fetchedAt: string; // ISO timestamp of when the server fetched it
};

export type NbpError = { error: string }; // Polish, user-facing message
