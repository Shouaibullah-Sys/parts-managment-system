// app/api/customers/[id]/balance/route.ts
import { NextResponse } from "next/server";
import { getCustomerBalance } from "@/lib/services/customer";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await context.params;
    const id = Number(customerId);
    if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

    const balance = await getCustomerBalance(id);
    return NextResponse.json(balance);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
