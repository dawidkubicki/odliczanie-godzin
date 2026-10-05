import type { NextRequest } from "next/server";
import { getRate, toErrorResponse } from "@/lib/nbp";
import type { NbpError, NbpRateResponse } from "@/lib/nbp-types";

/**
 * GET /api/nbp/rate?code=EUR[&date=YYYY-MM-DD]
 * -> 200 NbpRateResponse | 400 NbpError | 404 NbpError | 502 NbpError
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  try {
    const body: NbpRateResponse = await getRate(params.get("code"), params.get("date"));
    return Response.json(body);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return Response.json(body satisfies NbpError, { status });
  }
}
