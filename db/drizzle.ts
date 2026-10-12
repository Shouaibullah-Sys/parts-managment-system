//db/drizzle.ts
import { config } from "dotenv";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import net from "node:net";
import dns from "node:dns";
import { schema } from "./schema";

// Safely configure dotenv only in Node.js environment
if (typeof window === "undefined") {
  config({ path: ".env" }); // or .env.local
}

/**
 * Driver selection:
 * - Vercel/serverless -> neon-http over HTTPS: proven in production
 * - Local / office    -> TCP (port 5432): stable where the HTTPS route to
 *                        the Neon data endpoint flaps intermittently
 * Override anytime with DB_DRIVER=http or DB_DRIVER=tcp.
 */
const driver: "http" | "tcp" =
  process.env.DB_DRIVER === "http" || process.env.DB_DRIVER === "tcp"
    ? process.env.DB_DRIVER
    : process.env.VERCEL
      ? "http"
      : "tcp";

// Both adapters expose the same query API used across the app:
// select/insert/update/delete, db.execute() -> { rows }, db.query, transactions.
type AppDatabase = NodePgDatabase<typeof schema>;

let db: AppDatabase;

if (driver === "tcp") {
  // Happy-eyeballs (autoSelectFamily) cancels each connect attempt after
  // 250ms; the office link to Neon needs ~400ms+, so every attempt looked
  // like an instant ETIMEDOUT. Let the OS run the connect instead, and skip
  // the dead IPv6 route (no IPv6 on this network).
  dns.setDefaultResultOrder("ipv4first");
  net.setDefaultAutoSelectFamily(false);

  // Keep a single pool across dev-server HMR reloads
  const g = globalThis as typeof globalThis & { __pgPool?: Pool };
  const url = process.env.DATABASE_URL ?? "";
  // TLS only when the URL asks for it (Neon); plain local Postgres has none
  const useSsl = /[?&]sslmode=(require|verify-full|allow|prefer)(&|$)/.test(url);
  const pool =
    g.__pgPool ??
    new Pool({
      connectionString: url,
      max: 5,
      // Fail fast when the network drops instead of hanging requests
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30_000,
      ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
    });
  g.__pgPool = pool;
  db = drizzleNodePg(pool, { schema });
} else {
  const sql = neon(process.env.DATABASE_URL!, {
    fetchOptions: {
      retries: 5,
      retryDelay: 1000,
    },
  });
  db = drizzleNeonHttp(sql, { schema }) as unknown as AppDatabase;
}

// Only log in non-browser environments to avoid stdout errors
if (typeof window === "undefined") {
  console.log(
    `Database connection initialized successfully (driver: ${driver})`
  );
}

export { db };
export default db;
