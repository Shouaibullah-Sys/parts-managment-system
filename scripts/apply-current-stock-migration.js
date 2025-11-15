// scripts/apply-current-stock-migration.js
// This script applies the current_stock column migration using the app's database connection

import { db } from "../db/drizzle.js";
import { parts } from "../db/schema.js";

async function applyMigration() {
  try {
    console.log("🚀 Starting current_stock column migration...");

    // First, let's check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parts' AND column_name = 'current_stock'
    `;

    const existingColumns = await db.execute(checkColumnQuery);

    if (existingColumns.rows && existingColumns.rows.length > 0) {
      console.log("✅ current_stock column already exists!");
      return;
    }

    // Add the column
    console.log("📦 Adding current_stock column to parts table...");

    const addColumnQuery = `
      ALTER TABLE parts ADD COLUMN current_stock INTEGER DEFAULT 0
    `;

    await db.execute(addColumnQuery);

    // Initialize current_stock to 0 for all existing parts
    console.log("🔄 Initializing current_stock values to 0...");

    const initializeQuery = `
      UPDATE parts SET current_stock = 0 WHERE current_stock IS NULL
    `;

    await db.execute(initializeQuery);

    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'parts' AND column_name = 'current_stock'
    `;

    const verifyResult = await db.execute(verifyQuery);

    console.log("✅ Migration completed successfully!");
    console.log("Column details:", verifyResult.rows[0]);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
applyMigration();
