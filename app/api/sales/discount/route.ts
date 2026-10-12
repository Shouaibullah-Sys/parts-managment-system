// app/api/sales/discount/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { serverError } from "@/lib/api-response";
import {
  applySaleDiscount,
  PaymentValidationError,
} from "@/lib/services/payment";
import { addDiscountSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await applySaleDiscount({
      ...parsed.data,
      createdBy: session.user.id,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof PaymentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error in discount API:", err);
    return serverError(err);
  }
}
