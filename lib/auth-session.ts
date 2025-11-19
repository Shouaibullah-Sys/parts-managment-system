// lib/auth-session.ts
import type { NextRequest } from "next/server";
import { auth } from "./auth";

/**
 * Use request.headers (the Request instance) rather than next/headers() which
 * forces a streaming boundary and can slow things down.
 */
export async function getSession(request: NextRequest) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function requireAuth(request: NextRequest) {
  const session = await getSession(request);
  return session;
}
