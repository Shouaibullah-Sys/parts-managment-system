// app/api/partners/report/pdf/route.ts
// خروجی PDF گزارش فروش و سود شرکا — فقط ادمین
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { buildPartnerReport } from "@/lib/partner-report";
import { generatePartnerReportPdf } from "@/lib/partner-pdf";

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
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const partnerId = searchParams.get("partnerId") || "";
    const includeReturned = searchParams.get("includeReturned") === "true";

    const data = await buildPartnerReport({
      from,
      to,
      partnerId,
      includeReturned,
    });

    let partnerName: string | undefined;
    if (partnerId && partnerId !== "all") {
      if (partnerId === "unassigned") {
        partnerName = "بدون شراکت";
      } else {
        const pid = parseInt(partnerId);
        const match = data.summary.find((s) => s.id === pid);
        partnerName = match?.name;
      }
    }

    const pdf = await generatePartnerReportPdf(data, {
      from,
      to,
      partnerName,
      includeReturned,
    });

    const safe = (v: string) => v.replace(/[^\dA-Za-z_-]/g, "") || "all";
    const filename = `partner-report-${safe(from)}_${safe(to)}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generating partner report PDF:", err);
    return NextResponse.json(
      { success: false, error: "خطا در تولید فایل PDF" },
      { status: 500 },
    );
  }
}
