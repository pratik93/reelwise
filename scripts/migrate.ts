import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Applies db/migrations/*.sql in order, tracking what has run.
async function main() {
  const db = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/movies.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  await db.execute("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)");
  const done = new Set((await db.execute("SELECT name FROM _migrations")).rows.map((r) => String(r.name)));
  const dir = join(process.cwd(), "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    await db.executeMultiple(readFileSync(join(dir, file), "utf8"));
    await db.execute({ sql: "INSERT INTO _migrations(name) VALUES (?)", args: [file] });
    console.log("applied", file);
  }
  console.log("database up to date");
}
main().catch((e) => { console.error(e); process.exit(1); });
