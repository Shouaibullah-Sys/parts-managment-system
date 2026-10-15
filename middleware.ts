import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReadOnly } from "@/lib/remote-mode";

// Read-only guard for the public hostname (diplmasiltd.net via the tunnel).
//
// The shop terminal is reached over the LAN (IP/local hostname) and is NOT
// treated as remote, so it keeps full read/write. Remote requests may only use
// safe methods (GET/HEAD/OPTIONS); every mutating request is rejected before it
// reaches a route handler. The only exceptions are the auth routes needed to
// sign in and out.
const OPEN_MUTATIONS = ["/api/auth/login", "/api/auth/logout"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const READ_ONLY_MESSAGE =
  "این نسخه فقط برای مشاهده است. برای ثبت یا تغییر اطلاعات از ترمینال فروشگاه استفاده کنید.";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? req.headers.get("x-forwarded-host");

  if (!isReadOnly(host)) return NextResponse.next();
  if (!MUTATING_METHODS.has(req.method)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (OPEN_MUTATIONS.some((p) => pathname.startsWith(p)))
    return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: READ_ONLY_MESSAGE }, { status: 403 });
  }
  return new NextResponse(READ_ONLY_MESSAGE, { status: 403 });
}

export const config = {
  // Run on app routes only — skip Next internals and any static asset (paths
  // containing a file extension).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
