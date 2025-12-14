import { Pool } from "pg";
import env from "../env.ts";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function checkMigrations() {
  try {
    // Check what's in the migrations table
    const result = await pool.query(
      'SELECT * FROM "__drizzle_migrations" ORDER BY created_at'
    );
    console.log("Current migrations in database:");
    console.log(JSON.stringify(result.rows, null, 2));

    // Calculate the actual hash that drizzle uses
    const migration1 = readFileSync(
      "./migrations/0000_petite_scarecrow.sql",
      "utf-8"
    );
    const migration2 = readFileSync(
      "./migrations/0001_happy_secret_warriors.sql",
      "utf-8"
    );

    const hash1 = createHash("sha256").update(migration1).digest("hex");
    const hash2 = createHash("sha256").update(migration2).digest("hex");

    console.log("\nCalculated hashes:");
    console.log("0000_petite_scarecrow:", hash1);
    console.log("0001_happy_secret_warriors:", hash2);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkMigrations();
