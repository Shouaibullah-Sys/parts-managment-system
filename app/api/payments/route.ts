// app/api/payments/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, serverError } from "@/lib/api-response";
import {
  addPayment,
  PaymentValidationError,
} from "@/lib/services/payment";
import { addPaymentSchema } from "@/lib/validation/schemas";
import { db } from "@/db/drizzle";
import { payments, sales, saleDiscounts, user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
    if (err instanceof PaymentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error in payments API:", err);
    return serverError(err);
  }
}

// Payment history for one sale (used by the payment dialog)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saleId = parseInt(
      new URL(request.url).searchParams.get("saleId") || "",
      10
    );
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return NextResponse.json(
        { error: "saleId نامعتبر است" },
        { status: 400 }
      );
    }

    const saleRows = await db
      .select({ paidAmount: sales.paidAmount })
      .from(sales)
      .where(eq(sales.id, saleId));
    if (!saleRows[0]) {
      return NextResponse.json({ error: "فروش یافت نشد" }, { status: 404 });
    }

    const history = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        note: payments.note,
        receivedBy: user.name,
      })
      .from(payments)
      .leftJoin(user, eq(payments.receivedBy, user.id))
      .where(eq(payments.saleId, saleId))
      .orderBy(desc(payments.paymentDate), desc(payments.id));

    // تخفیف‌های اعمال‌شده روی همین فروش (جزو درآمد نیست)
    const discounts = await db
      .select({
        id: saleDiscounts.id,
        amount: saleDiscounts.amount,
        createdAt: saleDiscounts.createdAt,
        note: saleDiscounts.note,
        createdBy: user.name,
      })
      .from(saleDiscounts)
      .leftJoin(user, eq(saleDiscounts.createdBy, user.id))
      .where(eq(saleDiscounts.saleId, saleId))
      .orderBy(desc(saleDiscounts.createdAt), desc(saleDiscounts.id));

    // Sale may have been created with an initial paid amount recorded only
    // on sales.paid_amount (no payments row) — surface it as a synthetic entry
    const paymentsSum = history.reduce(
      (sum, row) => sum + Number(row.amount),
      0
    );
    const initialPaid = Math.max(
      0,
      Number(saleRows[0].paidAmount) - paymentsSum
    );

    return NextResponse.json({
      success: true,
      data: history,
      discounts,
      initialPaid,
    });
  } catch (err: any) {
    console.error("Error in payments GET API:", err);
    return serverError(err);
  }
}
