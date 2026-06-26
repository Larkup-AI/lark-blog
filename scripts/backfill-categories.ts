/**
 * Backfill script: sets category = 'Engineering' for all published posts
 * that currently have no category (NULL or empty string).
 *
 * Run with: npx tsx scripts/backfill-categories.ts
 */
import { db } from "../lib/db";
import { posts } from "../lib/db/schema";
import { isNull, or, eq } from "drizzle-orm";

async function main() {
  console.log("🔍 Fetching posts without a category...");

  const result = await db
    .update(posts)
    .set({ category: "Engineering" })
    .where(or(isNull(posts.category), eq(posts.category, "")))
    .returning({ id: posts.id, title: posts.title });

  console.log(`✅ Updated ${result.length} post(s) to category = "Engineering":`);
  for (const p of result) {
    console.log(`  - [${p.id}] ${p.title}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
