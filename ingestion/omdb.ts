import "dotenv/config";
import { createClient } from "@libsql/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "./lib/tmdb";

/**
 * Optional step: enrich movies with IMDb rating / Rotten Tomatoes / Metascore from
 * the official OMDb API (free tier: 1,000 requests/day). Most-voted movies first.
 * Responses are cached, so the job is resumable across days. No scraping involved.
 */
const key = process.env.OMDB_API_KEY;
const DIR = join(process.cwd(), "ingestion", "cache", "omdb");
mkdirSync(DIR, { recursive: true });

async function main() {
  if (!key) { log("omdb: OMDB_API_KEY not set, skipping (optional)"); return; }
  const db = createClient({ url: process.env.DATABASE_URL ?? "file:./data/movies.db", authToken: process.env.DATABASE_AUTH_TOKEN });
  const limit = Number(process.env.OMDB_DAILY_LIMIT ?? 950);
  const rows = (await db.execute("SELECT id, imdb_id FROM movies WHERE imdb_id IS NOT NULL AND imdb_rating IS NULL ORDER BY vote_count DESC")).rows;
  let used = 0;
  for (const r of rows) {
    const id = Number(r.id), imdb = String(r.imdb_id);
    const file = join(DIR, `${imdb}.json`);
    let data: any;
    if (existsSync(file)) data = JSON.parse(readFileSync(file, "utf8"));
    else {
      if (used >= limit) { log(`omdb: daily limit reached (${limit}); rerun tomorrow to continue`); break; }
      used++;
      const res = await fetch(`https://www.omdbapi.com/?i=${imdb}&apikey=${key}`);
      if (res.status === 401) { log("omdb: key rejected or daily limit hit"); break; }
      data = await res.json();
      writeFileSync(file, JSON.stringify(data));
      await new Promise((r) => setTimeout(r, 120));
    }
    if (data?.Response !== "True") continue;
    const imdbRating = parseFloat(data.imdbRating);
    const rt = (data.Ratings ?? []).find((x: any) => x.Source === "Rotten Tomatoes")?.Value;
    const meta = parseInt(data.Metascore, 10);
    await db.execute({
      sql: "UPDATE movies SET imdb_rating=?, rotten_tomatoes=?, metascore=? WHERE id=?",
      args: [Number.isFinite(imdbRating) ? imdbRating : null, rt ? parseInt(rt, 10) : null, Number.isFinite(meta) ? meta : null, id],
    });
  }
  log(`omdb: used ${used} requests`);
}
main().catch((e) => { console.error(e); process.exit(1); });
