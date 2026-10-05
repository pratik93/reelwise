import "dotenv/config";
import { createClient, type InStatement } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanMovie, dedupeMovies, type CleanMovie, type DropReason } from "./lib/clean";
import { log } from "./lib/tmdb";

/**
 * Step 3: read cached raw JSON, clean it, dedupe, and (re)load the database.
 * Idempotent: movies are upserted; link tables are rewritten per movie.
 */
const DIR = join(process.cwd(), "ingestion", "cache", "movies");
const regions = (process.env.WATCH_REGIONS ?? process.env.WATCH_REGION ?? "US").split(",").map((s) => s.trim());

async function main() {
  const db = createClient({ url: process.env.DATABASE_URL ?? "file:./data/movies.db", authToken: process.env.DATABASE_AUTH_TOKEN });
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  const dropped: Record<DropReason, number> = { missing: 0, adult: 0, no_poster: 0, no_overview: 0, no_title: 0, unreleased: 0 };
  const cleaned: CleanMovie[] = [];
  for (const f of files) {
    const r = cleanMovie(JSON.parse(readFileSync(join(DIR, f), "utf8")), regions);
    if ("drop" in r) dropped[r.drop]++;
    else cleaned.push(r.movie);
  }
  const { kept, removed } = dedupeMovies(cleaned);
  log(`import: ${files.length} raw, ${kept.length} kept, ${removed} duplicates, dropped ${JSON.stringify(dropped)}`);

  // Remove movies no longer kept (e.g. dropped by cleaning rules); cascades to links.
  const keepIds = new Set(kept.map((m) => m.id));
  const existing = (await db.execute("SELECT id FROM movies")).rows.map((r) => Number(r.id));
  const stale = existing.filter((id) => !keepIds.has(id));
  for (let i = 0; i < stale.length; i += 500) {
    const chunk = stale.slice(i, i + 500);
    await db.execute({ sql: `DELETE FROM movies WHERE id IN (${chunk.map(() => "?").join(",")})`, args: chunk });
  }

  const BATCH = 50;
  for (let i = 0; i < kept.length; i += BATCH) {
    const stmts: InStatement[] = [];
    for (const m of kept.slice(i, i + BATCH)) {
      // Preserve OMDb enrichment columns across re-imports by not touching them here.
      stmts.push({
        sql: `INSERT INTO movies (id,title,original_title,release_date,year,runtime,overview,tagline,poster_path,backdrop_path,
                vote_average,vote_count,popularity,original_language,spoken_languages,production_countries,imdb_id,trailer_key,certification)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET title=excluded.title, original_title=excluded.original_title, release_date=excluded.release_date,
                year=excluded.year, runtime=excluded.runtime, overview=excluded.overview, tagline=excluded.tagline,
                poster_path=excluded.poster_path, backdrop_path=excluded.backdrop_path, vote_average=excluded.vote_average,
                vote_count=excluded.vote_count, popularity=excluded.popularity, original_language=excluded.original_language,
                spoken_languages=excluded.spoken_languages, production_countries=excluded.production_countries,
                imdb_id=excluded.imdb_id, trailer_key=excluded.trailer_key, certification=excluded.certification`,
        args: [m.id, m.title, m.originalTitle, m.releaseDate, m.year, m.runtime, m.overview, m.tagline, m.posterPath, m.backdropPath,
          m.voteAverage, m.voteCount, m.popularity, m.originalLanguage, JSON.stringify(m.spokenLanguages),
          JSON.stringify(m.productionCountries), m.imdbId, m.trailerKey, m.certification],
      });
      for (const t of ["movie_genres", "movie_keywords", "credits", "movie_providers"])
        stmts.push({ sql: `DELETE FROM ${t} WHERE movie_id=?`, args: [m.id] });
      for (const g of m.genres) {
        stmts.push({ sql: "INSERT INTO genres(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name", args: [g.id, g.name] });
        stmts.push({ sql: "INSERT INTO movie_genres(movie_id,genre_id) VALUES(?,?)", args: [m.id, g.id] });
      }
      for (const k of m.keywords) {
        stmts.push({ sql: "INSERT INTO keywords(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name", args: [k.id, k.name] });
        stmts.push({ sql: "INSERT INTO movie_keywords(movie_id,keyword_id) VALUES(?,?)", args: [m.id, k.id] });
      }
      for (const c of m.cast) {
        stmts.push({ sql: "INSERT INTO people(id,name,profile_path) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, profile_path=COALESCE(excluded.profile_path,people.profile_path)", args: [c.id, c.name, c.profilePath] });
        stmts.push({ sql: "INSERT OR REPLACE INTO credits(movie_id,person_id,role,character,position) VALUES(?,?,'cast',?,?)", args: [m.id, c.id, c.character, c.position] });
      }
      m.directors.forEach((d, pos) => {
        stmts.push({ sql: "INSERT INTO people(id,name,profile_path) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, profile_path=COALESCE(excluded.profile_path,people.profile_path)", args: [d.id, d.name, d.profilePath] });
        stmts.push({ sql: "INSERT OR REPLACE INTO credits(movie_id,person_id,role,character,position) VALUES(?,?,'director',NULL,?)", args: [m.id, d.id, pos] });
      });
      for (const p of m.providers) {
        stmts.push({ sql: "INSERT INTO providers(id,name,logo_path) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, logo_path=excluded.logo_path", args: [p.id, p.name, p.logoPath] });
        stmts.push({ sql: "INSERT OR IGNORE INTO movie_providers(movie_id,provider_id,region,type) VALUES(?,?,?,?)", args: [m.id, p.id, p.region, p.type] });
      }
    }
    await db.batch(stmts, "write");
    if ((i / BATCH) % 10 === 0) log(`import: ${Math.min(i + BATCH, kept.length)}/${kept.length}`);
  }
  await db.execute("DELETE FROM people WHERE id NOT IN (SELECT person_id FROM credits)");
  log(`import complete: ${kept.length} movies`);
}
main().catch((e) => { console.error(e); process.exit(1); });
