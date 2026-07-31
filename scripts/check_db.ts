import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'user';
  `);
  console.log(result);
  process.exit(0);
}
main();
