import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { sql } from "drizzle-orm";

// This script adds the 'approved' column to the user table
async function runMigration() {
  try {
    console.log("Adding 'approved' column to user table...");

    // Add the approved column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false NOT NULL;
    `);

    console.log("✅ Migration completed successfully!");
    console.log("The 'approved' column has been added to the user table.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigration };
