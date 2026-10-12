import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Read-only mirror guard (READ_ONLY=true on the online/Vercel copy).
// Blocks all mutating API methods except the auth routes needed to log in.
// The shop terminal (MacBook) does not set READ_ONLY, so it is unaffected.
const OPEN_MUTATIONS = ["/api/auth/login", "/api/auth/logout"];

export function middleware(req: NextRequest) {
  if (process.env.READ_ONLY !== "true") return NextResponse.next();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method))
    return NextResponse.next();
  if (OPEN_MUTATIONS.some((p) => req.nextUrl.pathname.startsWith(p)))
    return NextResponse.next();
  return NextResponse.json(
    {
      error:
        "The online copy is read-only. Please make changes from the shop terminal.",
    },
    { status: 403 }
  );
}

export const config = {
  matcher: "/api/:path*",
};
