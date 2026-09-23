import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const sessionData = await getSessionFromRequest(request);

    if (!sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentUser] = await db
      .select({ approved: user.approved, role: user.role })
      .from(user)
      .where(eq(user.id, sessionData.user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      approved: currentUser.approved,
      role: currentUser.role,
    });
  } catch (error) {
    console.error("Error fetching user approval status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
