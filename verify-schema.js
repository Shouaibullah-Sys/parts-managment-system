// Verification script for database schema changes
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not found in environment variables");
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

async function verifySchema() {
  try {
    console.log("🔍 Verifying database schema...");

    // Check if new columns exist in user table
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name IN ('phone', 'sms_notifications', 'push_notifications')
      ORDER BY column_name;
    `;

    console.log("📋 User table new columns:");
    if (userColumns.length === 0) {
      console.log(
        "❌ No new columns found. Migration may not have been applied."
      );
    } else {
      userColumns.forEach((col) => {
        console.log(
          `   ✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
        );
      });
    }

    // Check if push_subscriptions table exists
    const pushTable = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'push_subscriptions' 
      AND table_schema = 'public';
    `;

    if (pushTable.length === 0) {
      console.log(
        "❌ push_subscriptions table not found. Migration may not have been applied."
      );
    } else {
      console.log("✅ push_subscriptions table exists");

      // Check push_subscriptions table structure
      const pushColumns = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions'
        ORDER BY column_name;
      `;

      console.log("📋 push_subscriptions table structure:");
      pushColumns.forEach((col) => {
        console.log(
          `   ✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
        );
      });
    }

    console.log("\n🎉 Schema verification completed!");
  } catch (error) {
    console.error("❌ Error verifying schema:", error.message);
  }
}

// Function to apply migration manually if needed
async function applyMigration() {
  try {
    console.log("🔄 Applying migration manually...");

    const migrationSQL = readFileSync(
      join(__dirname, "migrations/0006_add_phone_and_notification_fields.sql"),
      "utf8"
    );

    // Split SQL statements and execute them one by one
    const statements = migrationSQL.split(";").filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim()}`);

        // Use the neon sql function directly
        const result = await sql.raw(statement.trim());
        console.log(`✅ Executed successfully: ${JSON.stringify(result)}`);
      }
    }

    console.log("✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Error applying migration:", error.message);

    // Try alternative approach with manual SQL execution
    console.log("🔄 Trying alternative migration approach...");
    try {
      const migrationSQL = readFileSync(
        join(
          __dirname,
          "migrations/0006_add_phone_and_notification_fields.sql"
        ),
        "utf8"
      );

      // Execute each statement separately
      const statements = migrationSQL.split(";").filter((stmt) => stmt.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.trim()}`);

          // Try using sql tagged template
          try {
            await sql`${statement.trim()}`;
            console.log(`✅ Executed successfully`);
          } catch (tagError) {
            console.error(`❌ Tagged template failed:`, tagError.message);
          }
        }
      }
    } catch (altError) {
      console.error("❌ Alternative approach also failed:", altError.message);
    }
  }
}

// Main execution
const command = process.argv[2] || "verify";

if (command === "apply") {
  applyMigration().then(() => {
    return verifySchema();
  });
} else {
  verifySchema();
}
