import { db } from "../../src/db/connection.ts";
import {
  spots,
  walks,
  tags,
  walkReviews,
  walkComments,
  walkSubscriptions,
  userWalkProgress,
  walkTags,
  users,
} from "../../src/db/schema.ts";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";
import { env } from "../../env.ts";

export default async function setup() {
  console.log("💽 Setting up the test db....");

  try {
    console.log("🧹 Cleaning up the test db....");
    await db.execute(sql`DROP TABLE IF EXISTS ${users} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${walks} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${spots} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${tags} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${walkReviews} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${walkComments} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${walkSubscriptions} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${userWalkProgress} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${walkTags} CASCADE`);

    console.log("🚀 Pushing schema using drizzle-kit...");
    execSync(
      `npx drizzle-kit push --url="${process.env.DATABASE_URL}" --schema="./src/db/schema.ts" --dialect="postgresql"`,
      {
        stdio: "inherit",
        cwd: process.cwd(),
      }
    );
    console.log("✅ Test db setup complete!");
  } catch (error) {
    console.error("❌ Test db setup failed:", error);
    throw error;
  }

  return async () => {
    try {
      console.log("🧹 Cleaning up the test db....");
      await db.execute(sql`DROP TABLE IF EXISTS ${users} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${walks} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${spots} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${tags} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${walkReviews} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${walkComments} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${walkSubscriptions} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${userWalkProgress} CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS ${walkTags} CASCADE`);
      process.exit(0);
    } catch (error) {
      console.error("❌ Test db cleanup failed:", error);
      throw error;
    }
  };
}
