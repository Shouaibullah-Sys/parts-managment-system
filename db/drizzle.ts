//db/drizzle.ts
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { schema } from "./schema";

config({ path: ".env" }); // or .env.local

// Create a more robust connection with error handling
let db: ReturnType<typeof drizzle>;

try {
  const sql = neon(process.env.DATABASE_URL!);

  db = drizzle(sql, { schema });

  console.log("Database connection initialized successfully");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw new Error(
    "Database connection failed. Please check your DATABASE_URL and network connectivity."
  );
}

export { db };
export default db;
