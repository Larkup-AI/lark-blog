import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  try {
    await db.execute(sql`ALTER TABLE "user" RENAME COLUMN "vercelAiGatewayUrl" TO "vercelAiGatewayKey";`);
    console.log("Renamed column successfully.");
  } catch (err: any) {
    if (err.message.includes("does not exist") || err.message.includes("already exists")) {
       console.log("Column might already be renamed or doesn't exist, ignoring:", err.message);
    } else {
       console.error("Error:", err);
    }
  }
  process.exit(0);
}
main();
