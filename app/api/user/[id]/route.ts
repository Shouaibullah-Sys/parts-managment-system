import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessionData = await getSessionFromRequest(request);

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [currentUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, sessionData.user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (currentUser.role !== "admin" && sessionData.user.id !== id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const [requestedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!requestedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { password: _, ...userData } = requestedUser;

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
