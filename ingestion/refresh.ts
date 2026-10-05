import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log, tmdb } from "./lib/tmdb";

/**
 * Weekly refresh: add newly trending / now-playing / upcoming movies to the id list and
 * invalidate their cached details so vote counts, popularity and streaming data are re-fetched.
 * The normal fetch -> import -> similarity steps then pick up only what changed.
 */
const CACHE = join(process.cwd(), "ingestion", "cache");
type Page = { results: { id: number }[] };

async function main() {
  const idsFile = join(CACHE, "ids.json");
  const ids = new Set<number>(existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, "utf8")) : []);
  let invalidated = 0, added = 0;
  for (const path of ["/trending/movie/week", "/movie/now_playing", "/movie/upcoming", "/movie/top_rated", "/movie/popular"]) {
    for (let page = 1; page <= 5; page++) {
      const d = await tmdb<Page>(path, { page });
      for (const m of d?.results ?? []) {
        if (!ids.has(m.id)) { ids.add(m.id); added++; }
        const f = join(CACHE, "movies", `${m.id}.json`);
        if (existsSync(f)) { rmSync(f); invalidated++; }
      }
    }
  }
  writeFileSync(idsFile, JSON.stringify([...ids]));
  log(`refresh: ${added} new ids, ${invalidated} cached entries invalidated`);
}
main().catch((e) => { console.error(e); process.exit(1); });
