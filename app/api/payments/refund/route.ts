// app/api/payments/refund/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { serverError } from "@/lib/api-response";
import {
  refundPayment,
  PaymentValidationError,
} from "@/lib/services/payment";
import { z } from "zod";

const refundSchema = z.object({
  saleId: z.number().int().positive(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ورودی نامعتبر", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await refundPayment({
      saleId: parsed.data.saleId,
      amount: parsed.data.amount,
      note: parsed.data.note,
      createdBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof PaymentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error in refund API:", err);
    return serverError(err);
  }
}
