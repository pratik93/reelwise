import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { log, tmdb } from "./lib/tmdb";

/**
 * Step 2: fetch full details for each id (credits, keywords, videos,
 * watch providers, release dates) in ONE request via append_to_response.
 * Each response is cached as cache/movies/<id>.json, so reruns skip
 * anything already fetched (resumable). Set REFRESH=1 to refetch.
 */
const DIR = join(process.cwd(), "ingestion", "cache", "movies");
mkdirSync(DIR, { recursive: true });
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const REFRESH = process.env.REFRESH === "1";

async function main() {
  const ids: number[] = JSON.parse(readFileSync(join(process.cwd(), "ingestion", "cache", "ids.json"), "utf8"));
  const todo = ids.filter((id) => REFRESH || !existsSync(join(DIR, `${id}.json`)));
  log(`details: ${todo.length} to fetch, ${ids.length - todo.length} cached`);
  let done = 0, failed = 0, i = 0;

  async function worker() {
    while (i < todo.length) {
      const id = todo[i++];
      try {
        const d = await tmdb(`/movie/${id}`, {
          append_to_response: "credits,keywords,videos,watch/providers,release_dates",
        });
        // Write a tombstone for 404s so we don't retry them forever.
        writeFileSync(join(DIR, `${id}.json`), JSON.stringify(d ?? { id, missing: true }));
      } catch {
        failed++;
        log(`failed id=${id}`, "errors.log");
      }
      if (++done % 100 === 0) log(`details: ${done}/${todo.length} (${failed} failed)`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  log(`details complete: ${done - failed} ok, ${failed} failed (rerun to retry failures)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
