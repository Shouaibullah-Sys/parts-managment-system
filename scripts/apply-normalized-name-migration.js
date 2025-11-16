// scripts/apply-normalized-name-migration.js
const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function applyMigration() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("🔄 Applying normalized_name migration...");

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "../migrations/0005_add_normalized_name.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql(statement);
    }

    console.log("✅ Migration applied successfully!");
    console.log("\n📝 Next steps:");
    console.log(
      "1. Existing customer names have been normalized using basic lowercase"
    );
    console.log(
      "2. New customers will use the advanced normalization function"
    );
    console.log(
      "3. You may want to run a script to properly normalize existing customer data"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
