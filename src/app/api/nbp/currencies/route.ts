import { getCurrencies, toErrorResponse } from "@/lib/nbp";
import type { NbpCurrenciesResponse, NbpError } from "@/lib/nbp-types";

/** GET /api/nbp/currencies -> 200 NbpCurrenciesResponse | 502 NbpError */
export async function GET(): Promise<Response> {
  try {
    const body: NbpCurrenciesResponse = await getCurrencies();
    return Response.json(body);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return Response.json(body satisfies NbpError, { status });
  }
}
