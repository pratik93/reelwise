import "dotenv/config";
import { createClient } from "@libsql/client";
import { writeFileSync } from "node:fs";

/** Prints and saves a short data-quality report to data/REPORT.md. */
async function main() {
  const db = createClient({ url: process.env.DATABASE_URL ?? "file:./data/movies.db", authToken: process.env.DATABASE_AUTH_TOKEN });
  const one = async (sql: string) => Number((await db.execute(sql)).rows[0][0]);
  const total = await one("SELECT COUNT(*) FROM movies");
  const pct = (n: number) => (total ? `${n} (${((n / total) * 100).toFixed(1)}%)` : "0");
  const lines: string[] = [`# Data report`, ``, `Generated ${new Date().toISOString()}`, ``, `- Movies: **${total}**`];
  lines.push(`- With poster: ${pct(await one("SELECT COUNT(*) FROM movies WHERE poster_path IS NOT NULL"))}`);
  lines.push(`- With backdrop: ${pct(await one("SELECT COUNT(*) FROM movies WHERE backdrop_path IS NOT NULL"))}`);
  lines.push(`- With runtime: ${pct(await one("SELECT COUNT(*) FROM movies WHERE runtime IS NOT NULL"))}`);
  lines.push(`- With tagline: ${pct(await one("SELECT COUNT(*) FROM movies WHERE tagline IS NOT NULL"))}`);
  lines.push(`- With trailer: ${pct(await one("SELECT COUNT(*) FROM movies WHERE trailer_key IS NOT NULL"))}`);
  lines.push(`- With keywords: ${pct(await one("SELECT COUNT(DISTINCT movie_id) FROM movie_keywords"))}`);
  lines.push(`- With a director: ${pct(await one("SELECT COUNT(DISTINCT movie_id) FROM credits WHERE role='director'"))}`);
  lines.push(`- With streaming info: ${pct(await one("SELECT COUNT(DISTINCT movie_id) FROM movie_providers"))}`);
  lines.push(`- With OMDb ratings: ${pct(await one("SELECT COUNT(*) FROM movies WHERE imdb_rating IS NOT NULL"))}`);
  lines.push(`- With similar-movie rows: ${pct(await one("SELECT COUNT(DISTINCT movie_id) FROM similar_movies"))}`);
  lines.push(`- People: ${await one("SELECT COUNT(*) FROM people")}, keywords: ${await one("SELECT COUNT(*) FROM keywords")}, providers: ${await one("SELECT COUNT(*) FROM providers")}`);
  const range = (await db.execute("SELECT MIN(year) a, MAX(year) b FROM movies")).rows[0];
  lines.push(`- Release years: ${range.a} to ${range.b}`, ``, `## Genre distribution`, ``);
  for (const r of (await db.execute("SELECT g.name n, COUNT(*) c FROM movie_genres mg JOIN genres g ON g.id=mg.genre_id GROUP BY g.id ORDER BY c DESC")).rows)
    lines.push(`- ${r.n}: ${r.c}`);
  lines.push(``, `## Known gaps`, ``, `- Streaming availability only covers the regions in WATCH_REGIONS and changes often; refresh weekly.`,
    `- Fields TMDB doesn't have are left empty (never invented) and the UI hides them.`,
    `- OMDb ratings are filled gradually (free tier is 1,000 requests/day).`);
  const out = lines.join("\n");
  writeFileSync("data/REPORT.md", out + "\n");
  console.log(out);
}
main().catch((e) => { console.error(e); process.exit(1); });
