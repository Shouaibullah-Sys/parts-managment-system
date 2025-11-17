// app/api/payments/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, serverError } from "@/lib/api-response";
import { addPayment } from "@/lib/services/payment";
import { addPaymentSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Add the current user as the one receiving the payment
    const paymentData = {
      ...parsed.data,
      receivedBy: session.user.id,
    };

    const result = await addPayment(paymentData);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in payments API:", err);
    return serverError(err);
  }
}
