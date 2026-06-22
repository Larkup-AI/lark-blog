import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  const db = drizzle(client);

  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    console.log("Migrations complete");
  } catch (error) {
    console.error("Migration failed:");
    console.error(error);
  } finally {
    await client.end();
  }
}
main();
