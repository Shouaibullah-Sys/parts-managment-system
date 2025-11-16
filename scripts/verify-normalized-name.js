// scripts/verify-normalized-name.js
const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

async function verifyColumn() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("🔍 Verifying normalized_name column...");

  try {
    // Check if the column exists
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name = 'normalized_name'
    `;

    if (result.length > 0) {
      console.log("✅ Column exists!");
      console.log("Column details:", result[0]);

      // Check sample data
      const customers =
        await sql`SELECT id, name, normalized_name FROM customers LIMIT 5`;
      console.log("\n📊 Sample customer data:");
      customers.forEach((c) => {
        console.log(
          `  ID: ${c.id}, Name: "${c.name}", Normalized: "${c.normalized_name}"`
        );
      });
    } else {
      console.log("❌ Column does not exist!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

verifyColumn();
