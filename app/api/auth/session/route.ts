import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const sessionData = await getSessionFromCookies();

    if (!sessionData) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: sessionData.user });
  } catch (error) {
    // Internal failure (e.g. transient DB error) — this is NOT "logged out".
    // Return 500 so the client marks the check as failed and offers a retry
    // instead of clearing the session and bouncing the user to /login.
    console.error("Session error:", error);
    return NextResponse.json(
      { user: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
