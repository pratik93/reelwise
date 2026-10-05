# Reelwise: a movie recommendation site

Browse, search and filter thousands of films, open a movie page with cast, trailer, streaming availability and "More like this", keep a watchlist, rate movies and get personalised picks, or take the 4-question "What should I watch tonight?" quiz. No sign-up: watchlist and ratings are tied to an anonymous cookie.

Built with **Next.js (App Router) + React + TypeScript + Tailwind**, **SQLite/libSQL** (Turso in production), data from **TMDB** (+ optional **OMDb**).

## Folder structure

```
src/app/            pages + API routes (home, browse, movie/[id], person/[id], watchlist, ratings, quiz, about, 404)
src/components/     reusable UI: MovieCard, MovieRow (carousel), FilterBar, RatingStars, Skeletons, States ...
src/lib/            queries (all SQL, parameterised), filters (zod validation), session, rate limiter
src/lib/reco/       recommendation logic: similarity (TF-IDF), personalise, quiz, scoring (pure, unit tested)
db/migrations/      numbered SQL migrations (schema + FTS5 search index)
ingestion/          command-line data pipeline (discover, fetch-details, import, omdb, similarity, report, refresh)
tests/unit/         Vitest tests (cleaning + recommendation logic)
tests/e2e/          Playwright tests (search, movie page, watchlist, quiz, 404, theme)
.github/workflows/  CI + weekly data refresh
```

## Quick start (one command + one key)

```bash
npm run setup          # installs deps, creates .env from .env.example, creates the local database
# put your TMDB key in .env  (see "API keys")
npm run ingest         # collects ~5,000+ movies, cleans, imports, builds recommendations, prints a data report
npm run dev            # http://localhost:3000
```

Requirements: Node 20.19+ / 22. No Docker or Postgres install needed.

## API keys

| Key | Required | Where |
|---|---|---|
| `TMDB_API_KEY` | yes | Free account at themoviedb.org → Settings → API. Either the v3 *API Key* or the v4 *Read Access Token* works. |
| `OMDB_API_KEY` | optional | https://www.omdbapi.com/apikey.aspx (free: 1,000 requests/day). Adds IMDb / Rotten Tomatoes / Metascore. |

Keys live in `.env` (git-ignored). `.env.example` lists every variable.

## Data pipeline

`npm run ingest` runs these steps in order; each can also be run on its own:

| Script | What it does |
|---|---|
| `npm run db:migrate` | Applies `db/migrations/*.sql` |
| `npm run ingest:discover` | Finds candidate movie ids via TMDB `/discover`, sliced by release year (well-voted, rating ≥ 5.5), plus trending/now playing/upcoming |
| `npm run ingest:fetch` | Fetches full details (credits, keywords, videos, watch providers, certification) in **one request per movie**; cached as JSON in `ingestion/cache/` |
| `npm run ingest:import` | Cleans (drops no-poster / no-overview / adult / unreleased, dedupes, normalises dates, languages, runtimes) and upserts into the database |
| `npm run ingest:omdb` | Optional OMDb enrichment, most-voted first, resumable across days |
| `npm run ingest:similar` | Precomputes the top-20 similar movies for every title, with a plain-language reason |
| `npm run ingest:report` | Prints and writes `data/REPORT.md` (counts, poster coverage, genre distribution, gaps) |

Collector behaviour: **resumable** (finished years and already-fetched movies are skipped, so Ctrl-C and rerun is safe), **rate-limit aware** (global throttle, honours `429 Retry-After`), **retries with exponential backoff + jitter**, and logs to `ingestion/logs/ingestion.log` and `errors.log`. Tunables: `TARGET_MOVIES`, `MIN_VOTE_COUNT`, `MIN_VOTE_AVERAGE`, `CONCURRENCY`, `TMDB_MAX_RPS`, `WATCH_REGIONS`.

Only official APIs are used (TMDB, OMDb). Nothing is scraped, and IMDb is never scraped. Missing fields stay empty and the UI hides them.

## How recommendations work

* **More like this**: each movie becomes five TF-IDF vectors (genres, keywords, director, cast, overview text). Similarity is a weighted sum of cosine similarities (keywords .30, overview .25, genres .20, director .15, cast .10), found efficiently with an inverted index. Top 20 per movie are stored in `similar_movies`. The reason text (e.g. *"Shares the director Christopher Nolan and themes like dream, heist with Inception"*) is built only from real overlaps.
* **Picked for you**: ratings and watchlist entries vote for their precomputed neighbours (10/10 = +1, 6 = 0, 1 ≈ −1, watchlist = +0.4). With no history it falls back to Bayesian-weighted top-rated films.
* **Discovery rows**: Trending (popularity), Top Rated (weighted rating, ≥1000 votes), Hidden Gems (rating ≥ 7.3, ≥ 300 votes, below median popularity), New Releases (last 12 months), by genre.
* **Quiz**: mood → genre set, time → runtime bounds, adventurousness → vote thresholds/hidden gems, era → year bounds; samples 10 from the best matches.

## Database

Local default is a file: `DATABASE_URL=file:./data/movies.db` (created by `npm run db:migrate`).

**Why libSQL/SQLite rather than Postgres:** the brief allowed SQLite locally, but a plain SQLite file cannot be written on Vercel (needed for watchlist/ratings). libSQL runs as a local file in development and as hosted **Turso** in production with the same code, and ships FTS5 full-text search with BM25 ranking. All queries are parameterised SQL (no ORM). To use Postgres instead, port `src/lib/queries.ts` (swap FTS5 `MATCH`/`bm25` for `tsvector`/`ts_rank`) and the SQL in `db/migrations`.

Search upgrade path: for typo tolerance and facets at larger scale, index the `movies` table into Meilisearch and replace `searchMovies()`/`suggest()`.

## Tests

```bash
npm test               # unit tests: data cleaning + recommendation logic
npm run typecheck && npm run lint
npx playwright install chromium
npm run test:e2e       # builds, starts the site on :3100 and runs browser tests (needs an ingested database)
```

## Deploying (Vercel + Turso)

1. `brew install tursodatabase/tap/turso` (or see turso.tech), then `turso db create reelwise` and `turso db tokens create reelwise`.
2. Load data into it from your machine: set `DATABASE_URL=libsql://…` and `DATABASE_AUTH_TOKEN=…` in `.env`, then `npm run db:migrate && npm run ingest` (or copy an existing local DB with `turso db shell reelwise < dump.sql`).
3. Push the repo to GitHub and import it in Vercel. Set env vars: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `NEXT_PUBLIC_SITE_URL` (your https URL), `WATCH_REGION`.
4. Deploy. Home and movie pages use ISR (hourly / daily), so most traffic is served from cache.

## Weekly refresh

`.github/workflows/refresh-data.yml` runs every Monday: `npm run refresh` re-fetches trending, now-playing, upcoming, popular and top-rated movies (plus any new ids), re-imports, recomputes similarity and updates streaming availability. Add repository secrets `TMDB_API_KEY`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (and optionally `OMDB_API_KEY`), and optionally a `DEPLOY_HOOK_URL` variable (Vercel deploy hook) to rebuild pages immediately. Equivalent cron: `0 5 * * 1 cd /path/to/app && npm run refresh`.

## Security notes

* Every query parameter, JSON body and path param is validated (zod / strict regexes); all SQL is parameterised; `ORDER BY` uses a fixed whitelist; the FTS query is tokenised and quoted.
* React escapes output; the one `dangerouslySetInnerHTML` (JSON-LD) escapes `<`.
* API routes are rate limited (in-memory per instance; use Upstash/Vercel KV for strict global limits), mutating routes check same-origin, and the session cookie is `HttpOnly; SameSite=Lax; Secure` in production.

## Limitations

* Streaming availability covers the regions in `WATCH_REGIONS` (default US) and goes stale between refreshes.
* Watchlist/ratings are per browser (anonymous cookie), with no cross-device sync until accounts exist.
* Rate limiting is per server instance.
* Similarity is content-based; there is no collaborative filtering (needs many users).

## Future work

User accounts and sync, reviews, social features (follow friends, shared lists), collaborative filtering, Meilisearch, multi-region provider switch.

Movie data and images: [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
