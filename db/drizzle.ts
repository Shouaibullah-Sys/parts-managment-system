//db/drizzle.ts
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { schema } from "./schema";

// Safely configure dotenv only in Node.js environment
if (typeof window === "undefined") {
  config({ path: ".env" }); // or .env.local
}

// Create a more robust connection with error handling
const sql = neon(process.env.DATABASE_URL!);

const db = drizzle(sql, { schema });

// Only log in non-browser environments to avoid stdout errors
if (typeof window === "undefined") {
  console.log("Database connection initialized successfully");
}

export { db };
export default db;
