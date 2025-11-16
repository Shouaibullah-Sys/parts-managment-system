// scripts/apply-section-enum-to-varchar-migration.js
// This script converts the section enum column to varchar to allow flexible text values

const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

async function applyMigration() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("🚀 Starting section enum to varchar migration...");

  try {
    // Step 1: Check current table structure
    console.log("🔍 Checking current table structure...");

    const partsColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'parts'
      ORDER BY ordinal_position
    `;

    console.log("📋 Current parts table columns:", partsColumns);

    const searchIndexColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'search_index'
      ORDER BY ordinal_position
    `;

    console.log("📋 Current search_index table columns:", searchIndexColumns);

    // Step 2: Check if section column exists in parts table
    const sectionColumn = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'parts' AND column_name = 'section'
    `;

    if (!sectionColumn || sectionColumn.length === 0) {
      console.log("🔄 Adding missing section column to parts table...");
      await sql`ALTER TABLE parts ADD COLUMN section varchar(50) DEFAULT 'E'`;
      console.log("✅ Section column added to parts table");
    } else {
      console.log("📋 Section column exists in parts table");
    }

    // Step 3: Check if section column exists in search_index table
    const searchIndexSectionColumn = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'search_index' AND column_name = 'section'
    `;

    if (!searchIndexSectionColumn || searchIndexSectionColumn.length === 0) {
      console.log("🔄 Adding missing section column to search_index table...");
      await sql`ALTER TABLE search_index ADD COLUMN section varchar(50) DEFAULT 'E'`;
      console.log("✅ Section column added to search_index table");
    } else {
      console.log("📋 Section column exists in search_index table");
    }

    // Step 4: Verify the final structure
    console.log("🔍 Verifying final migration results...");

    const finalPartsResult = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'parts' AND column_name = 'section'
    `;

    const finalSearchIndexResult = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'search_index' AND column_name = 'section'
    `;

    console.log("✅ Migration completed successfully!");
    console.log("📋 Parts table section column:", finalPartsResult[0]);
    console.log(
      "📋 Search index table section column:",
      finalSearchIndexResult[0]
    );

    console.log(
      "🎉 Section field is now flexible varchar - users can enter any text value!"
    );
    console.log(
      "\n✨ Users can now enter custom section values like 'Engine', 'Transmission', 'Electronics', etc."
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
