import { Pool } from "pg";
import env from "../env.ts";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function markMigrationsApplied() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // Check if migrations are already marked
    const existing = await pool.query(
      'SELECT hash FROM "__drizzle_migrations" ORDER BY created_at'
    );

    // Calculate actual hashes from migration files
    const migration1Content = readFileSync(
      "./migrations/0000_petite_scarecrow.sql",
      "utf-8"
    );
    const migration2Content = readFileSync(
      "./migrations/0001_happy_secret_warriors.sql",
      "utf-8"
    );

    const migrations = [
      {
        hash: createHash("sha256").update(migration1Content).digest("hex"),
        created_at: 1765104154066,
        tag: "0000_petite_scarecrow",
      },
      {
        hash: createHash("sha256").update(migration2Content).digest("hex"),
        created_at: 1765701355928,
        tag: "0001_happy_secret_warriors",
      },
    ];

    // Delete incorrect entries
    await pool.query(
      'DELETE FROM "__drizzle_migrations" WHERE hash IN ($1, $2)',
      ["0000_petite_scarecrow", "0001_happy_secret_warriors"]
    );

    for (const migration of migrations) {
      const exists = existing.rows.some((row) => row.hash === migration.hash);
      if (!exists) {
        await pool.query(
          'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
          [migration.hash, migration.created_at]
        );
        console.log(`✓ Marked migration ${migration.tag} as applied`);
      } else {
        console.log(`- Migration ${migration.tag} already marked`);
      }
    }

    console.log("\n✅ All migrations have been marked as applied!");
  } catch (error) {
    console.error("Error marking migrations:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

markMigrationsApplied();
