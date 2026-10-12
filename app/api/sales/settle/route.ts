// app/api/sales/settle/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { serverError } from "@/lib/api-response";
import { settleSale, PaymentValidationError } from "@/lib/services/payment";
import { settleSaleSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = settleSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await settleSale({
      ...parsed.data,
      receivedBy: session.user.id,
      createdBy: session.user.id,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof PaymentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error in settle API:", err);
    return serverError(err);
  }
}
