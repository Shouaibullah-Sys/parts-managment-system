import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "./auth";

export async function getSession(request: NextRequest) {
  return getSessionFromRequest(request);
}

export async function requireAuth(request: NextRequest) {
  const session = await getSession(request);
  return session;
}
