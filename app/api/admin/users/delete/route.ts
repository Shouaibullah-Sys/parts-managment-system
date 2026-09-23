import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
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

    if (userId === sessionData.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const deletedUser = await db
      .delete(schema.user)
      .where(eq(schema.user.id, userId))
      .returning({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      });

    if (!deletedUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
