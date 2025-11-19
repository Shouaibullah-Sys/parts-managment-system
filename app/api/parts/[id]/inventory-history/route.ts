// app/api/parts/[id]/inventory-history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { getPartInventoryHistory } from "@/lib/parts-queries";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId) return bad("Invalid ID");

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const result = await getPartInventoryHistory(numericId, page, limit);

    return ok(result.history, { pagination: result.pagination });
  } catch (err) {
    return serverError(err);
  }
}
