import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { db, pool } = await import("../lib/db/index");
  
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Error running migrations:", err);
  }
  pool.end();
}

main();
