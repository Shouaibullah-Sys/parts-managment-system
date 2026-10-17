// app/api/parts/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory, partners } from "@/db/schema";
import { eq, sql, and, or, like } from "drizzle-orm";
import { getPartnersMap } from "@/lib/parts-queries";
import { partPartnerIdSchema } from "@/lib/validations/part";
import { isDuplicateKeyError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const active = searchParams.get("active");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          sql`LOWER(${parts.partNumber}) LIKE LOWER(${`%${search}%`})`,
          sql`LOWER(${parts.name}) LIKE LOWER(${`%${search}%`})`
        )
      );
    }
    if (active !== null && active !== undefined) {
      whereConditions.push(eq(parts.active, active === "true"));
    }

    // Build SQL WHERE clause — no status filter means all parts
    let whereClause = "WHERE 1=1";
    if (search) {
      whereClause += ` AND (LOWER(p.part_number) LIKE LOWER('%${search}%') OR LOWER(p.name) LIKE LOWER('%${search}%'))`;
    }
    if (active !== null && active !== undefined) {
      whereClause += ` AND p.active = ${active === "true"}`;
    }

    // Parts query using currentStock column directly
    const partsData = await db.execute(sql`
      SELECT
        p.id,
        p.part_number AS "partNumber",
        p.name,
        p.shelf,
        p.min_stock AS "minStock",
        p.cost_price AS "costPrice",
        p.sale_price AS "salePrice",
        p.active,
        p.created_at AS "createdAt",
        p.current_stock AS "currentStock",
        p.partner_id AS "partnerId"
      FROM parts p
      ${sql`${sql.raw(whereClause)}`}
      ORDER BY p.part_number
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(parts)
      .where(and(...whereConditions));

    const total = Number(countResult[0]?.count || 0);

    // Aggregate inventory value over the same filtered set (all pages, not just current page)
    const summaryResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(p.cost_price * p.current_stock), 0) AS "totalCostValue",
        COALESCE(SUM(p.sale_price * p.current_stock), 0) AS "totalSaleValue"
      FROM parts p
      ${sql`${sql.raw(whereClause)}`}
    `);
    const summaryRow = (
      (summaryResult.rows || summaryResult) as Array<{
        totalCostValue?: string | number | null;
        totalSaleValue?: string | number | null;
      }>
    )[0];
    const summary = {
      totalCostValue: Number(summaryRow?.totalCostValue || 0),
      totalSaleValue: Number(summaryRow?.totalSaleValue || 0),
    };

    const rows = (partsData.rows || partsData) as Array<{
      id: number;
      partnerId?: number | null;
      [key: string]: unknown;
    }>;

    const partnersMap = await getPartnersMap(
      rows.map((row) => (row.partnerId != null ? Number(row.partnerId) : null))
    );

    return Response.json({
      success: true,
      data: rows.map((row) => {
        const partnerId = row.partnerId != null ? Number(row.partnerId) : null;
        return {
          ...row,
          partner: partnerId ? partnersMap.get(partnerId) ?? null : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("Error in parts API:", error);
    return Response.json(
      { success: false, error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      partNumber,
      name,
      shelf,
      minStock,
      currentStock,
      costPrice,
      salePrice,
      partnerId: partnerPayload,
    } = body;

    if (!partNumber || !name) {
      return Response.json(
        { success: false, error: "Part number and name are required" },
        { status: 400 }
      );
    }

    // Validate the selected partnership (شریک) before creating anything
    let partnerId: number | null = null;
    if (partnerPayload !== undefined) {
      const parsed = partPartnerIdSchema.safeParse(partnerPayload);
      if (!parsed.success) {
        return Response.json(
          { success: false, error: "شراکت انتخاب‌شده نامعتبر است" },
          { status: 400 }
        );
      }

      partnerId = parsed.data ?? null;
      if (partnerId != null) {
        const [partner] = await db
          .select({ id: partners.id, active: partners.active })
          .from(partners)
          .where(eq(partners.id, partnerId))
          .limit(1);

        if (!partner) {
          return Response.json(
            { success: false, error: "شریک انتخاب‌شده وجود ندارد" },
            { status: 400 }
          );
        }
        if (!partner.active) {
          return Response.json(
            { success: false, error: "شریک انتخاب‌شده غیرفعال است" },
            { status: 400 }
          );
        }
      }
    }

    // بررسی تکراری نبودن شماره قطعه قبل از درج (پیام روشن برای کاربر)
    const [duplicatePart] = await db
      .select({ id: parts.id, name: parts.name })
      .from(parts)
      .where(eq(parts.partNumber, String(partNumber)))
      .limit(1);

    if (duplicatePart) {
      return Response.json(
        {
          success: false,
          error: `شماره قطعه «${partNumber}» قبلاً ثبت شده است («${duplicatePart.name}»). لطفاً شماره دیگری وارد کنید یا همان قطعه را از لیست پیدا کرده و ویرایش کنید.`,
        },
        { status: 409 }
      );
    }

    // Insert the new part
    let newPart;
    try {
      newPart = await db
        .insert(parts)
        .values({
          partNumber,
          name,
          shelf: shelf || null,
          minStock: minStock || 0,
          currentStock: currentStock || 0,
          costPrice: costPrice || null,
          salePrice: salePrice || null,
          partnerId,
          active: true,
        })
        .returning();
    } catch (insertError) {
      // مسابقه همزمان (دو تب/دو سرور) — به جای خطای ۵۰۰، پیام روشن بده
      if (isDuplicateKeyError(insertError)) {
        return Response.json(
          {
            success: false,
            error: `شماره قطعه «${partNumber}» قبلاً ثبت شده است. لطفاً شماره دیگری وارد کنید یا همان قطعه را ویرایش کنید.`,
          },
          { status: 409 }
        );
      }
      throw insertError;
    }

    const partnersMap = await getPartnersMap([partnerId]);

    return Response.json({
      success: true,
      data: {
        ...newPart[0],
        partner: partnerId ? partnersMap.get(partnerId) ?? null : null,
      },
      message: "Part created successfully",
    });
  } catch (error) {
    console.error("Error creating part:", error);

    // Check for duplicate part number (Drizzle آن را در error.cause میگذارد)
    if (isDuplicateKeyError(error)) {
      return Response.json(
        {
          success: false,
          error: "شماره قطعه تکراری است و قبلاً در سیستم ثبت شده است. لطفاً شماره دیگری وارد کنید.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, error: "خطا در ایجاد قطعه. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
