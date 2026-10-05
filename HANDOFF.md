# Reelwise handoff

**Repo:** https://github.com/pratik93/reelwise (branch `main`). The README covers setup, the data pipeline, deployment and security notes.

## What it is
A movie recommendation site. Visitors can browse, search and filter movies, open movie pages with cast, trailer and streaming info, and see "More like this". They can keep a watchlist, rate movies and get personalised picks, or take a 4-question "What should I watch tonight?" quiz. There are no accounts. The watchlist and ratings are tied to an anonymous cookie.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, libSQL/SQLite with plain parameterised SQL, zod validation, Vitest and Playwright. Movie data comes from the TMDB API, with optional OMDb ratings.

## Run it locally
```bash
npm run setup      # install, create .env, create the local DB
# put TMDB_API_KEY in .env (free key at themoviedb.org)
npm run ingest     # ~20 min: discover, fetch, clean, import, similarity, report
npm run dev        # http://localhost:3000
```
Node 20.19+ or 22 is required. Next 16 has breaking changes, so read `AGENTS.md` and `node_modules/next/dist/docs/` before changing framework-level code.

## Layout
| Path | Contents |
|---|---|
| `src/app/` | pages and API routes: `/`, `/browse`, `/movie/[id]`, `/person/[id]`, `/watchlist`, `/ratings`, `/quiz`, `/about`, and `api/*` |
| `src/lib/queries.ts` | all SQL (search, discovery rows, detail, user data, quiz) |
| `src/lib/reco/` | pure recommendation logic: `similarity` (TF-IDF), `personalise`, `quiz`, `scoring` |
| `src/lib/filters.ts` | zod schema shared by the browse page and the search API |
| `src/components/` | the reusable UI kit |
| `ingestion/` | CLI pipeline: `discover`, `fetch-details`, `import`, `omdb`, `similarity`, `refresh`, `report`, with cleaning in `lib/clean.ts` |
| `db/migrations/` | numbered SQL migrations, including the FTS5 search index |
| `tests/unit`, `tests/e2e` | 21 unit tests, 14 browser tests (desktop and mobile) |
| `.github/workflows/` | `ci.yml` (typecheck, lint, test, build) and `refresh-data.yml` (weekly) |

## State at handoff
- **Data:** 7,254 clean movies, all with posters, 100% with similar-movie rows, 96% with keywords, 95% with trailers and 93% with streaming info (US region). See `data/REPORT.md` after ingesting.
- **Checks:** typecheck, lint, unit tests, production build and all browser tests pass.
- **Lighthouse (mobile):** performance 87-96, accessibility 96-100, SEO and best-practices 100, no layout shift.

## How the recommendations work
- **More like this:** TF-IDF similarity over keywords, overview text, genres, director and cast (weights in `src/lib/reco/similarity.ts`). The top 20 per movie are precomputed into `similar_movies`, each with a plain-language reason.
- **Picked for you:** ratings and watchlist entries vote for their precomputed neighbours. A 10/10 counts +1, a 6 counts 0, and low ratings vote against. With no history it falls back to Bayesian-weighted top-rated films.
- **Quiz:** mood becomes a genre set, time becomes runtime bounds, adventurousness becomes vote thresholds, and era becomes year bounds. It samples 10 from the best matches.

## Decisions to know about
- **Database:** libSQL (local file, Turso in production) instead of Postgres. The build machine had no Postgres or Docker, and Vercel can't write to SQLite files, which the watchlist and ratings need. It also gives FTS5 full-text search. The README covers porting to Postgres.
- **Images:** plain `<img>` with TMDB's own sized `srcset`, not `next/image`, to avoid the optimizer quota.
- **Root `loading.tsx`:** deliberately absent. With it, unknown movie pages returned HTTP 200 instead of 404.
- **Setup:** there is no Docker Compose. `npm run setup` plus `npm run ingest` is the one-command path.

## Not done yet (suggested next steps)
1. **Deploy.** Create a Turso DB, run `npm run db:migrate && npm run ingest` against it, then import the repo into Vercel and set the env vars (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `WATCH_REGION`).
2. **Weekly refresh.** Add repo secrets `TMDB_API_KEY`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (optionally `OMDB_API_KEY`) so `refresh-data.yml` works. It can't update a local SQLite file, so it needs the hosted DB.
3. **OMDb ratings.** Add a free `OMDB_API_KEY`. IMDb, Rotten Tomatoes and Metascore are empty until then, and the UI hides missing fields.
4. **Rate limiting** is in-memory per server instance. Swap in Upstash or Vercel KV for strict global limits.
5. **Future features:** accounts and cross-device sync, reviews and social features, collaborative filtering once there's real usage, Meilisearch for typo tolerance, and a streaming-region switcher.

## Gotchas
- **Secrets:** `.env` is git-ignored. Never commit it. The TMDB key used during development was shared in a chat, so regenerate it.
- **Watch region:** streaming data covers only `WATCH_REGIONS` (default US) and goes stale between refreshes.
- **New migrations:** add a new numbered file in `db/migrations/` and run `npm run db:migrate`. Don't edit `0001_init.sql`.
- **E2E tests:** they need an ingested database.
