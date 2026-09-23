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
    console.error("Session error:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
