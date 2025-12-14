import { Pool } from "pg";
import env from "../env.ts";
import { execSync } from "child_process";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function resetDatabase() {
  try {
    console.log("🗑️  Dropping all tables...");

    // Get all table names
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != '__drizzle_migrations'
    `);

    const tables = tablesResult.rows.map((row) => row.tablename);

    if (tables.length > 0) {
      // Drop all tables with CASCADE to handle foreign keys
      const dropQuery = `DROP TABLE IF EXISTS ${tables
        .map((t) => `"${t}"`)
        .join(", ")} CASCADE;`;
      await pool.query(dropQuery);
      console.log(`✓ Dropped ${tables.length} tables`);
    } else {
      console.log("✓ No tables to drop");
    }

    // Clear migrations table (create if doesn't exist)
    console.log("🗑️  Clearing migrations table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);
    await pool.query('TRUNCATE TABLE "__drizzle_migrations"');
    console.log("✓ Cleared migrations table");

    console.log("\n🔄 Running migrations...");
    execSync("npm run db:migrate", { stdio: "inherit" });

    console.log("\n✅ Database reset and migrations applied successfully!");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
