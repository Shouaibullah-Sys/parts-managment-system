// app/api/parts/search/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts } from "@/db/schema";
import { or, like, sql, eq } from "drizzle-orm";

// Simple search cache
const searchCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    if (!query || query.length < 2) {
      return ok([]);
    }

    // Check cache
    const cacheKey = `${query.toLowerCase()}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return ok(cached.data);
    }

    const startTime = Date.now();

    // Fast case-insensitive search
    const searchResults = await db
      .select()
      .from(parts)
      .where(
        or(
          like(sql`LOWER(${parts.partNumber})`, `%${query.toLowerCase()}%`),
          like(sql`LOWER(${parts.name})`, `%${query.toLowerCase()}%`),
          like(
            sql`LOWER(${parts.partNumber})`,
            `%${query.replace(/\s/g, "").toLowerCase()}%`
          )
        )
      )
      .limit(limit)
      .execute();

    // Add default stock for now
    const resultsWithStock = searchResults.map((part) => ({
      ...part,
      currentStock: 100, // Default for testing
      isLowStock: false,
    }));

    const searchTime = Date.now() - startTime;

    // Cache the results
    searchCache.set(cacheKey, {
      data: resultsWithStock,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    cleanupCache();

    return ok({
      results: resultsWithStock,
      metadata: {
        query,
        count: resultsWithStock.length,
        searchTime,
        cached: false,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    // Fallback to empty results
    return ok([]);
  }
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
}
