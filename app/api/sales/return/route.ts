// app/api/sales/return/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { serverError } from "@/lib/api-response";
import { returnSale } from "@/lib/services/sale";
import { PaymentValidationError } from "@/lib/services/payment";
import { z } from "zod";

const returnSchema = z.object({
  saleId: z.number().int().positive(),
  restoreStock: z.boolean().optional().default(true),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = returnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ورودی نامعتبر", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = returnSale({
      saleId: parsed.data.saleId,
      restoreStock: parsed.data.restoreStock,
      note: parsed.data.note,
      createdBy: session.user.id,
    });

    return NextResponse.json(await result);
  } catch (err: any) {
    if (err instanceof PaymentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error in sale return API:", err);
    return serverError(err);
  }
}
