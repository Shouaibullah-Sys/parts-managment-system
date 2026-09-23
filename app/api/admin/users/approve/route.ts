import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getSessionFromRequest(request);

    if (!sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, sessionData.user.id))
      .limit(1);

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const updatedUser = await db
      .update(schema.user)
      .set({
        approved: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId))
      .returning({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        approved: schema.user.approved,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
      });

    if (!updatedUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User approved successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
