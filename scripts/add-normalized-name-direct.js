// scripts/add-normalized-name-direct.js
const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

async function addColumn() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("🔄 Adding normalized_name column to customers table...");

  try {
    // Step 1: Add the column
    console.log("Step 1: Adding column...");
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(255)`;
    console.log("✅ Column added");

    // Step 2: Populate existing data
    console.log("Step 2: Populating existing data...");
    await sql`UPDATE customers SET normalized_name = LOWER(TRIM(name)) WHERE normalized_name IS NULL`;
    console.log("✅ Data populated");

    // Step 3: Make it NOT NULL
    console.log("Step 3: Setting NOT NULL constraint...");
    await sql`ALTER TABLE customers ALTER COLUMN normalized_name SET NOT NULL`;
    console.log("✅ Constraint added");

    // Step 4: Add index
    console.log("Step 4: Adding index...");
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_normalized_name ON customers(normalized_name)`;
    console.log("✅ Index created");

    // Verify
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name = 'normalized_name'
    `;

    if (result.length > 0) {
      console.log("\n✅ SUCCESS! Column verified:");
      console.log(result[0]);

      // Show sample data
      const customers =
        await sql`SELECT id, name, normalized_name FROM customers LIMIT 3`;
      console.log("\n📊 Sample data:");
      customers.forEach((c) => {
        console.log(`  "${c.name}" → "${c.normalized_name}"`);
      });
    } else {
      console.log("\n❌ Column still not found!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  }
}

addColumn();
