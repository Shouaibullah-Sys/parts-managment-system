// app/api/parts/low-stock/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { lowStockParts } from "@/lib/parts-queries";
import { requireAuth } from "@/lib/auth-session";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const items = await lowStockParts();
    return ok(items);
  } catch (err) {
    return serverError(err);
  }
}
