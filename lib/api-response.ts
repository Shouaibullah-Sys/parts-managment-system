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

// تشخیص خطای یکتایی پستگرس (unique violation) مثل تکراری بودن part_number.
// دقت: Drizzle خطای واقعی را در error.cause میگذارد و error.message فقط
// «Failed query: ...» است؛ پس باید زنجیره cause را هم بررسی کنیم.
export function isDuplicateKeyError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === "string") {
      if (current.includes("duplicate key value")) return true;
      return false;
    }
    if (typeof current !== "object") return false;

    const e = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (e.code === "23505") return true;
    if (typeof e.message === "string" && e.message.includes("duplicate key value")) {
      return true;
    }
    current = e.cause;
  }
  return false;
}
