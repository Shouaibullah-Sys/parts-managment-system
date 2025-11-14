// lib/api-response.ts
import { NextResponse } from "next/server";

export function ok(data: any, extra: Record<string, any> = {}) {
  // Keep the same shape your UI expects: { success, data, pagination? }
  return NextResponse.json({ success: true, data, ...extra });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function unauthorized() {
  return bad("Unauthorized", 401);
}

export function notFound(message = "Not found") {
  return bad(message, 404);
}

export function serverError(err: unknown) {
  console.error("API Server Error:", err);
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}
