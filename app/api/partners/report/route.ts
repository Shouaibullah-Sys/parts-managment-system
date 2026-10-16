// app/api/partners/report/route.ts
// گزارش فروش و سود شرکا — فقط ادمین
// سهم شریک = سود ناخالص × درصد شریک؛ باقی‌مانده سهم مغازه
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { buildPartnerReport } from "@/lib/partner-report";

async function getCurrentUser(request: NextRequest) {
  const sessionData = await getSessionFromRequest(request);
  if (!sessionData?.user) return null;

  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionData.user.id))
    .limit(1);

  return currentUser ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "فقط ادمین به گزارش سود دسترسی دارد" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const data = await buildPartnerReport({
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      partnerId: searchParams.get("partnerId") || "",
      includeReturned: searchParams.get("includeReturned") === "true",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error building partner report:", err);
    return NextResponse.json(
      { success: false, error: "خطا در محاسبهٔ گزارش شرکا" },
      { status: 500 },
    );
  }
}
