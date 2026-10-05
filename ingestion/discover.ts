import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log, tmdb } from "./lib/tmdb";

/**
 * Step 1: build a list of candidate movie ids using /discover/movie.
 * TMDB caps each query at 500 pages (10,000 results), so we slice by release
 * year to reach broad coverage, keeping only well-voted movies.
 * Resumable: finished year-slices are recorded in cache/discover-state.json.
 */
const CACHE = join(process.cwd(), "ingestion", "cache");
mkdirSync(CACHE, { recursive: true });
const STATE = join(CACHE, "discover-state.json");
const IDS = join(CACHE, "ids.json");

const TARGET = Number(process.env.TARGET_MOVIES ?? 7000); // over-fetch; cleaning drops some
const MIN_VOTES = Number(process.env.MIN_VOTE_COUNT ?? 300);
const MIN_RATING = Number(process.env.MIN_VOTE_AVERAGE ?? 5.5);

type Page = { results: { id: number }[]; total_pages: number };

async function main() {
  const state: { doneYears: number[]; ids: number[] } = existsSync(STATE)
    ? JSON.parse(readFileSync(STATE, "utf8"))
    : { doneYears: [], ids: [] };
  const ids = new Set(state.ids);
  const thisYear = new Date().getFullYear();

  for (let year = thisYear; year >= 1950 && ids.size < TARGET; year--) {
    if (state.doneYears.includes(year)) continue;
    for (let page = 1; page <= 25; page++) {
      const data = await tmdb<Page>("/discover/movie", {
        sort_by: "vote_count.desc",
        "vote_count.gte": MIN_VOTES,
        "vote_average.gte": MIN_RATING,
        primary_release_year: year,
        include_adult: "false",
        page,
      });
      if (!data || data.results.length === 0) break;
      data.results.forEach((m) => ids.add(m.id));
      if (page >= data.total_pages) break;
    }
    state.doneYears.push(year);
    state.ids = [...ids];
    writeFileSync(STATE, JSON.stringify(state));
    log(`discover: year ${year} done, ${ids.size} candidate ids`);
  }

  // Trending + now playing keep fresh releases in play for weekly refreshes.
  for (const path of ["/trending/movie/week", "/movie/now_playing", "/movie/upcoming"]) {
    for (let page = 1; page <= 5; page++) {
      const d = await tmdb<Page>(path, { page });
      d?.results.forEach((m) => ids.add(m.id));
    }
  }
  writeFileSync(IDS, JSON.stringify([...ids]));
  log(`discover complete: ${ids.size} ids`);
}
main().catch((e) => { console.error(e); process.exit(1); });
