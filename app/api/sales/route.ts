// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { createSale } from "@/lib/services/sale";
import { createSaleSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );

    const sale = await createSale(parsed.data);
    return NextResponse.json(sale);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
