// app/api/customers/find-or-create/route.ts
import { NextResponse } from "next/server";
import { findOrCreateCustomer } from "@/lib/services/customer";
import { findOrCreateCustomerSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = findOrCreateCustomerSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );

    const { name, phone, address } = parsed.data;
    const customer = await findOrCreateCustomer(name, phone, address);
    return NextResponse.json(customer);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
