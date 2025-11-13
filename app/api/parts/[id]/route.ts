// app/api/parts/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { parts, inventory, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partId = parseInt(params.id);

    if (isNaN(partId)) {
      return NextResponse.json(
        { success: false, error: "Invalid part ID" },
        { status: 400 }
      );
    }

    const [part] = await db.select().from(parts).where(eq(parts.id, partId));

    if (!part) {
      return NextResponse.json(
        { success: false, error: "Part not found" },
        { status: 404 }
      );
    }

    // Get current stock level
    const stockResult = await db
      .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
      .from(inventory)
      .where(eq(inventory.partId, partId));

    const currentStock = stockResult[0]?.stock || 0;

    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(inventory)
      .where(eq(inventory.partId, partId))
      .orderBy(inventory.createdAt)
      .limit(10);

    const partWithDetails = {
      ...part,
      currentStock,
      recentTransactions,
      isLowStock: currentStock < part.minStock,
    };

    return NextResponse.json({
      success: true,
      data: partWithDetails,
    });
  } catch (error) {
    console.error("Error fetching part:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user role from database
    const [userWithRole] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userWithRole || userWithRole.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partId = parseInt(params.id);

    if (isNaN(partId)) {
      return NextResponse.json(
        { success: false, error: "Invalid part ID" },
        { status: 400 }
      );
    }

    const updateData = await request.json();

    // Check if part exists
    const [existingPart] = await db
      .select()
      .from(parts)
      .where(eq(parts.id, partId));

    if (!existingPart) {
      return NextResponse.json(
        { success: false, error: "Part not found" },
        { status: 404 }
      );
    }

    // Check if part number is being changed and if it already exists
    if (
      updateData.partNumber &&
      updateData.partNumber !== existingPart.partNumber
    ) {
      const [partWithSameNumber] = await db
        .select()
        .from(parts)
        .where(eq(parts.partNumber, updateData.partNumber))
        .limit(1);

      if (partWithSameNumber) {
        return NextResponse.json(
          { success: false, error: "Part number already exists" },
          { status: 400 }
        );
      }
    }

    const [updatedPart] = await db
      .update(parts)
      .set(updateData)
      .where(eq(parts.id, partId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedPart,
    });
  } catch (error: any) {
    console.error("Error updating part:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user role from database
    const [userWithRole] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userWithRole || userWithRole.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partId = parseInt(params.id);

    if (isNaN(partId)) {
      return NextResponse.json(
        { success: false, error: "Invalid part ID" },
        { status: 400 }
      );
    }

    const [deletedPart] = await db
      .update(parts)
      .set({ active: false })
      .where(eq(parts.id, partId))
      .returning();

    if (!deletedPart) {
      return NextResponse.json(
        { success: false, error: "Part not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Part deleted successfully",
      data: deletedPart,
    });
  } catch (error) {
    console.error("Error deleting part:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
