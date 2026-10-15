//db/drizzle.ts
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import net from "node:net";
import dns from "node:dns";
import { schema } from "./schema";

// Safely configure dotenv only in Node.js environment
if (typeof window === "undefined") {
  config({ path: ".env" }); // or .env.local
}

/**
 * Local-first: the app talks to a PostgreSQL server over TCP on the same
 * machine (or the LAN). No serverless/HTTPS driver — Postgres runs locally
 * and the public site reaches it through the same process.
 */
type AppDatabase = NodePgDatabase<typeof schema>;

// Happy-eyeballs (autoSelectFamily) cancels each connect attempt after 250ms;
// a dropped/slow link then looks like an instant ETIMEDOUT. Let the OS run the
// connect instead, and prefer IPv4 (no IPv6 on the shop network).
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

// Keep a single pool across dev-server HMR reloads
const g = globalThis as typeof globalThis & { __pgPool?: Pool };
const url = process.env.DATABASE_URL ?? "";
// TLS only when the URL asks for it; plain local Postgres has none
const useSsl = /[?&]sslmode=(require|verify-full|allow|prefer)(&|$)/.test(url);
const pool =
  g.__pgPool ??
  new Pool({
    connectionString: url,
    max: 5,
    // Fail fast when the database is unreachable instead of hanging requests
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  });
g.__pgPool = pool;

const db: AppDatabase = drizzle(pool, { schema });

// Only log in non-browser environments to avoid stdout errors
if (typeof window === "undefined") {
  console.log("Database connection initialized successfully (driver: tcp)");
}

export { db };
export default db;
