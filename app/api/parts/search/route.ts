// app/api/parts/search/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { ok, bad, unauthorized, serverError } from "@/lib/api-response";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";
import { sql, eq, or, like } from "drizzle-orm";

// Simple in-memory cache (consider Redis for production)
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) return unauthorized();

    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const useCache = url.searchParams.get("cache") !== "false";

    if (!query || query.length < 2) {
      return bad("Query must be at least 2 characters long");
    }

    // Check cache first
    const cacheKey = `${query}:${limit}`;
    if (useCache) {
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return ok(cached.data);
      }
    }

    const startTime = Date.now();

    // Build optimized search query
    const searchQuery = db
      .select({
        id: parts.id,
        partNumber: parts.partNumber,
        name: parts.name,
        section: parts.section,
        currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
        salePrice: parts.salePrice,
        minStock: parts.minStock,
      })
      .from(parts)
      .leftJoin(inventory, eq(parts.id, inventory.partId))
      .where(
        or(
          like(sql`LOWER(${parts.partNumber})`, `%${query.toLowerCase()}%`),
          like(sql`LOWER(${parts.name})`, `%${query.toLowerCase()}%`),
          like(
            sql`REPLACE(LOWER(${parts.partNumber}), ' ', '')`,
            `%${query.toLowerCase().replace(/\s/g, "")}%`
          )
        )
      )
      .groupBy(parts.id)
      .orderBy(
        sql`
          CASE 
            WHEN LOWER(${parts.partNumber}) = LOWER(${query}) THEN 1
            WHEN LOWER(${parts.name}) = LOWER(${query}) THEN 2
            WHEN LOWER(${parts.partNumber}) LIKE LOWER(${`${query}%`}) THEN 3
            WHEN LOWER(${parts.name}) LIKE LOWER(${`${query}%`}) THEN 4
            ELSE 5
          END
        `
      )
      .limit(limit);

    const results = await searchQuery;
    const searchTime = Date.now() - startTime;

    // Cache the results
    if (useCache && results.length > 0) {
      searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });
    }

    // Clean old cache entries
    cleanupCache();

    return ok({
      results,
      metadata: {
        query,
        count: results.length,
        searchTime,
        cached: false,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}
