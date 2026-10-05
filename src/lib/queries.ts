import type { InValue } from "@libsql/client";
import { db } from "@/db/client";
import { PAGE_SIZE, type Filters } from "./filters";
import type { MovieCard, MovieDetail, Person } from "./types";
import { quizFilters, quizReason, type QuizAnswers } from "./reco/quiz";
import { personalise, pickReason, type SimilarRow, type TasteSignal } from "./reco/personalise";

export const REGION = process.env.WATCH_REGION ?? "US";

/** Bayesian-weighted rating expression (see reco/scoring.ts) so tiny vote counts can't top charts. */
const WEIGHTED = "((m.vote_count * m.vote_average + 500 * 6.5) / (m.vote_count + 500.0))";

const CARD_COLS = `m.id, m.title, m.year, m.poster_path, m.vote_average, m.vote_count, m.runtime,
  (SELECT group_concat(g.name, '|') FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id WHERE mg.movie_id = m.id) AS genres`;

type Row = Record<string, unknown>;
const toCard = (r: Row): MovieCard => ({
  id: Number(r.id),
  title: String(r.title),
  year: r.year == null ? null : Number(r.year),
  posterPath: String(r.poster_path),
  voteAverage: Number(r.vote_average),
  voteCount: Number(r.vote_count),
  runtime: r.runtime == null ? null : Number(r.runtime),
  genres: r.genres ? String(r.genres).split("|") : [],
});

async function cards(sql: string, args: InValue[] = []): Promise<MovieCard[]> {
  return (await db.execute({ sql, args })).rows.map((r) => toCard(r as unknown as Row));
}

/** Turn free text into a safe FTS5 query: quoted tokens, prefix match on the last one. */
export function ftsQuery(q: string): string | null {
  const tokens = q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
  if (!tokens.length) return null;
  return tokens.map((t, i) => `"${t}"${i === tokens.length - 1 ? "*" : ""}`).join(" ");
}

// ---------------------------------------------------------------- search & browse
export async function searchMovies(f: Filters): Promise<{ items: MovieCard[]; total: number }> {
  const where: string[] = [];
  const args: InValue[] = [];
  let from = "movies m";
  const fts = f.q ? ftsQuery(f.q) : null;
  if (f.q && !fts) return { items: [], total: 0 };
  if (fts) {
    from = "movies_fts JOIN movies m ON m.id = movies_fts.rowid";
    where.push("movies_fts MATCH ?");
    args.push(fts);
  }
  if (f.genres?.length) {
    where.push(`m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id IN (${f.genres.map(() => "?").join(",")}) GROUP BY movie_id HAVING COUNT(*) = ?)`);
    args.push(...f.genres, f.genres.length);
  }
  if (f.yearMin != null) { where.push("m.year >= ?"); args.push(f.yearMin); }
  if (f.yearMax != null) { where.push("m.year <= ?"); args.push(f.yearMax); }
  if (f.ratingMin != null) { where.push("m.vote_average >= ?"); args.push(f.ratingMin); }
  if (f.runtimeMin != null) { where.push("m.runtime >= ?"); args.push(f.runtimeMin); }
  if (f.runtimeMax != null) { where.push("m.runtime <= ?"); args.push(f.runtimeMax); }
  if (f.lang) { where.push("m.original_language = ?"); args.push(f.lang); }
  if (f.provider != null) {
    where.push("m.id IN (SELECT movie_id FROM movie_providers WHERE provider_id = ? AND region = ? AND type = 'flatrate')");
    args.push(f.provider, REGION);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Whitelisted ORDER BY fragments only; never interpolate user input.
  const order: Record<string, string> = {
    // bm25 weights: title matters most, overview least. Lower is better.
    relevance: fts ? "bm25(movies_fts, 10, 6, 3, 1), m.popularity DESC" : "m.popularity DESC",
    popularity: "m.popularity DESC",
    rating: `${WEIGHTED} DESC`,
    newest: "m.release_date DESC",
    oldest: "m.release_date ASC",
    title: "m.title COLLATE NOCASE ASC",
    runtime: "m.runtime ASC",
  };
  const total = Number((await db.execute({ sql: `SELECT COUNT(*) c FROM ${from} ${w}`, args })).rows[0].c);
  const items = await cards(
    `SELECT ${CARD_COLS} FROM ${from} ${w} ORDER BY ${order[f.sort]} LIMIT ? OFFSET ?`,
    [...args, PAGE_SIZE, (f.page - 1) * PAGE_SIZE],
  );
  return { items, total };
}

/** Lightweight results for the instant-search dropdown. */
export async function suggest(q: string, limit = 6): Promise<MovieCard[]> {
  const fts = ftsQuery(q);
  if (!fts) return [];
  return cards(
    `SELECT ${CARD_COLS} FROM movies_fts JOIN movies m ON m.id = movies_fts.rowid
     WHERE movies_fts MATCH ? ORDER BY bm25(movies_fts, 10, 6, 3, 1) - (m.popularity / 200.0) LIMIT ?`,
    [fts, limit],
  );
}

// ---------------------------------------------------------------- facets
export async function getFacets() {
  const [genres, langs, providers, years] = await Promise.all([
    db.execute("SELECT g.id, g.name FROM genres g WHERE EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.genre_id = g.id) ORDER BY g.name"),
    db.execute("SELECT original_language l, COUNT(*) c FROM movies WHERE original_language IS NOT NULL GROUP BY l ORDER BY c DESC LIMIT 25"),
    db.execute({
      sql: `SELECT p.id, p.name, COUNT(*) c FROM movie_providers mp JOIN providers p ON p.id = mp.provider_id
            WHERE mp.region = ? AND mp.type = 'flatrate' GROUP BY p.id ORDER BY c DESC LIMIT 20`,
      args: [REGION],
    }),
    db.execute("SELECT MIN(year) a, MAX(year) b FROM movies"),
  ]);
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  return {
    genres: genres.rows.map((r) => ({ id: Number(r.id), name: String(r.name) })),
    languages: langs.rows.map((r) => {
      const code = String(r.l);
      let name = code;
      try { name = names.of(code) ?? code; } catch { /* keep code */ }
      return { code, name };
    }),
    providers: providers.rows.map((r) => ({ id: Number(r.id), name: String(r.name) })),
    yearRange: { min: Number(years.rows[0].a ?? 1900), max: Number(years.rows[0].b ?? new Date().getFullYear()) },
  };
}

// ---------------------------------------------------------------- discovery rows
export const getTrending = (n = 20) => cards(`SELECT ${CARD_COLS} FROM movies m ORDER BY m.popularity DESC LIMIT ?`, [n]);
export const getTopRated = (n = 20) => cards(`SELECT ${CARD_COLS} FROM movies m WHERE m.vote_count >= 1000 ORDER BY ${WEIGHTED} DESC LIMIT ?`, [n]);
export const getNewReleases = (n = 20) =>
  cards(
    `SELECT ${CARD_COLS} FROM movies m WHERE m.release_date <= date('now') AND m.release_date >= date('now','-12 months')
     ORDER BY m.release_date DESC LIMIT ?`,
    [n],
  );
/** High rating + enough votes, but below the catalogue's median popularity. */
export const getHiddenGems = (n = 20) =>
  cards(
    `SELECT ${CARD_COLS} FROM movies m
     WHERE m.vote_average >= 7.3 AND m.vote_count >= 300
       AND m.popularity <= (SELECT popularity FROM movies ORDER BY popularity LIMIT 1 OFFSET (SELECT COUNT(*) / 2 FROM movies))
     ORDER BY ${WEIGHTED} DESC LIMIT ?`,
    [n],
  );
export const getByGenre = (genreId: number, n = 20) =>
  cards(
    `SELECT ${CARD_COLS} FROM movies m WHERE m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id = ?)
     AND m.vote_count >= 500 ORDER BY ${WEIGHTED} DESC LIMIT ?`,
    [genreId, n],
  );

export async function getHero(): Promise<(MovieCard & { backdropPath: string; overview: string }) | null> {
  const r = (await db.execute(
    `SELECT ${CARD_COLS}, m.backdrop_path, m.overview FROM movies m
     WHERE m.backdrop_path IS NOT NULL AND m.release_date <= date('now') AND m.vote_average >= 6.8
     ORDER BY m.popularity DESC LIMIT 1`,
  )).rows[0] as unknown as Row | undefined;
  return r ? { ...toCard(r), backdropPath: String(r.backdrop_path), overview: String(r.overview) } : null;
}

// ---------------------------------------------------------------- detail pages
export async function getMovie(id: number): Promise<MovieDetail | null> {
  const r = (await db.execute({ sql: `SELECT ${CARD_COLS}, m.* FROM movies m WHERE m.id = ?`, args: [id] })).rows[0] as unknown as Row | undefined;
  if (!r) return null;
  const [kw, credits, prov] = await Promise.all([
    db.execute({ sql: "SELECT k.name FROM movie_keywords mk JOIN keywords k ON k.id = mk.keyword_id WHERE mk.movie_id = ? LIMIT 12", args: [id] }),
    db.execute({
      sql: `SELECT p.id, p.name, p.profile_path, c.role, c.character FROM credits c JOIN people p ON p.id = c.person_id
            WHERE c.movie_id = ? ORDER BY c.role, c.position`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT p.id, p.name, p.logo_path, mp.type FROM movie_providers mp JOIN providers p ON p.id = mp.provider_id
            WHERE mp.movie_id = ? AND mp.region = ? ORDER BY mp.type, p.name`,
      args: [id, REGION],
    }),
  ]);
  const person = (x: Row): Person => ({ id: Number(x.id), name: String(x.name), profilePath: x.profile_path ? String(x.profile_path) : null });
  const json = (v: unknown) => { try { return v ? JSON.parse(String(v)) : []; } catch { return []; } };
  return {
    ...toCard(r),
    originalTitle: r.original_title ? String(r.original_title) : null,
    releaseDate: r.release_date ? String(r.release_date) : null,
    overview: String(r.overview),
    tagline: r.tagline ? String(r.tagline) : null,
    backdropPath: r.backdrop_path ? String(r.backdrop_path) : null,
    popularity: Number(r.popularity),
    originalLanguage: r.original_language ? String(r.original_language) : null,
    spokenLanguages: json(r.spoken_languages),
    productionCountries: json(r.production_countries),
    imdbId: r.imdb_id ? String(r.imdb_id) : null,
    trailerKey: r.trailer_key ? String(r.trailer_key) : null,
    imdbRating: r.imdb_rating == null ? null : Number(r.imdb_rating),
    rottenTomatoes: r.rotten_tomatoes == null ? null : Number(r.rotten_tomatoes),
    metascore: r.metascore == null ? null : Number(r.metascore),
    certification: r.certification ? String(r.certification) : null,
    keywords: kw.rows.map((k) => String(k.name)),
    cast: credits.rows.filter((c) => c.role === "cast").map((c) => ({ ...person(c as unknown as Row), character: c.character ? String(c.character) : null })),
    directors: credits.rows.filter((c) => c.role === "director").map((c) => person(c as unknown as Row)),
    providers: prov.rows.map((p) => ({ id: Number(p.id), name: String(p.name), logoPath: p.logo_path ? String(p.logo_path) : null, type: p.type as "flatrate" | "rent" | "buy" })),
  };
}

export async function getSimilar(id: number, n = 20): Promise<MovieCard[]> {
  const rows = (await db.execute({
    sql: `SELECT ${CARD_COLS}, s.reason FROM similar_movies s JOIN movies m ON m.id = s.similar_id
          WHERE s.movie_id = ? ORDER BY s.score DESC LIMIT ?`,
    args: [id, n],
  })).rows as unknown as Row[];
  return rows.map((r) => ({ ...toCard(r), reason: r.reason ? String(r.reason) : undefined }));
}

export async function getPerson(id: number) {
  const p = (await db.execute({ sql: "SELECT id, name, profile_path FROM people WHERE id = ?", args: [id] })).rows[0];
  if (!p) return null;
  const films = (await db.execute({
    sql: `SELECT ${CARD_COLS}, c.role, c.character FROM credits c JOIN movies m ON m.id = c.movie_id
          WHERE c.person_id = ? ORDER BY m.release_date DESC`,
    args: [id],
  })).rows as unknown as Row[];
  return {
    id: Number(p.id), name: String(p.name), profilePath: p.profile_path ? String(p.profile_path) : null,
    filmography: films.map((f) => ({ ...toCard(f), role: String(f.role) as "cast" | "director", character: f.character ? String(f.character) : null })),
  };
}

export async function getAllMovieIds(limit = 50000): Promise<{ id: number; title: string }[]> {
  return (await db.execute({ sql: "SELECT id, title FROM movies ORDER BY popularity DESC LIMIT ?", args: [limit] })).rows.map((r) => ({ id: Number(r.id), title: String(r.title) }));
}
export async function getMovieCount(): Promise<number> {
  return Number((await db.execute("SELECT COUNT(*) c FROM movies")).rows[0].c);
}

// ---------------------------------------------------------------- user data
export async function getUserState(sid: string) {
  const [w, r] = await Promise.all([
    db.execute({ sql: "SELECT movie_id FROM watchlist WHERE session_id = ? ORDER BY added_at DESC", args: [sid] }),
    db.execute({ sql: "SELECT movie_id, rating FROM ratings WHERE session_id = ?", args: [sid] }),
  ]);
  return {
    watchlist: w.rows.map((x) => Number(x.movie_id)),
    ratings: Object.fromEntries(r.rows.map((x) => [Number(x.movie_id), Number(x.rating)])) as Record<number, number>,
  };
}

export async function getWatchlistMovies(sid: string): Promise<MovieCard[]> {
  return cards(
    `SELECT ${CARD_COLS} FROM watchlist w JOIN movies m ON m.id = w.movie_id WHERE w.session_id = ? ORDER BY w.added_at DESC`,
    [sid],
  );
}

export async function getRatedMovies(sid: string): Promise<(MovieCard & { myRating: number })[]> {
  const rows = (await db.execute({
    sql: `SELECT ${CARD_COLS}, r.rating FROM ratings r JOIN movies m ON m.id = r.movie_id WHERE r.session_id = ? ORDER BY r.rated_at DESC`,
    args: [sid],
  })).rows as unknown as Row[];
  return rows.map((r) => ({ ...toCard(r), myRating: Number(r.rating) }));
}

export async function setWatchlist(sid: string, movieId: number, add: boolean) {
  if (add) await db.execute({ sql: "INSERT OR IGNORE INTO watchlist(session_id,movie_id,added_at) SELECT ?, id, ? FROM movies WHERE id = ?", args: [sid, Date.now(), movieId] });
  else await db.execute({ sql: "DELETE FROM watchlist WHERE session_id = ? AND movie_id = ?", args: [sid, movieId] });
}

export async function setRating(sid: string, movieId: number, rating: number | null) {
  if (rating == null) await db.execute({ sql: "DELETE FROM ratings WHERE session_id = ? AND movie_id = ?", args: [sid, movieId] });
  else
    await db.execute({
      sql: `INSERT INTO ratings(session_id,movie_id,rating,rated_at) SELECT ?, id, ?, ? FROM movies WHERE id = ?
            ON CONFLICT(session_id,movie_id) DO UPDATE SET rating = excluded.rating, rated_at = excluded.rated_at`,
      args: [sid, rating, Date.now(), movieId],
    });
}

/**
 * "Because you liked...": rank candidates using the user's ratings and watchlist.
 * With no history we fall back to well-rated popular films (cold start).
 */
export async function getPersonalised(sid: string, n = 20): Promise<{ picks: MovieCard[]; personalised: boolean }> {
  const sig = (await db.execute({
    sql: `SELECT m.id, m.title, r.rating FROM ratings r JOIN movies m ON m.id = r.movie_id WHERE r.session_id = ?
          UNION ALL
          SELECT m.id, m.title, NULL FROM watchlist w JOIN movies m ON m.id = w.movie_id
          WHERE w.session_id = ? AND w.movie_id NOT IN (SELECT movie_id FROM ratings WHERE session_id = ?)`,
    args: [sid, sid, sid],
  })).rows;
  const signals: TasteSignal[] = sig.map((r) => ({ movieId: Number(r.id), title: String(r.title), rating: r.rating == null ? null : Number(r.rating) }));
  if (signals.length) {
    const ids = signals.map((s) => s.movieId);
    const sim = (await db.execute({
      sql: `SELECT movie_id, similar_id, score FROM similar_movies WHERE movie_id IN (${ids.map(() => "?").join(",")})`,
      args: ids,
    })).rows.map((r): SimilarRow => ({ movieId: Number(r.movie_id), similarId: Number(r.similar_id), score: Number(r.score) }));
    const picks = personalise(signals, sim, n);
    if (picks.length) {
      const movies = await cards(`SELECT ${CARD_COLS} FROM movies m WHERE m.id IN (${picks.map(() => "?").join(",")})`, picks.map((p) => p.movieId));
      const byId = new Map(movies.map((m) => [m.id, m]));
      const out = picks.flatMap((p) => { const m = byId.get(p.movieId); return m ? [{ ...m, reason: pickReason(p) }] : []; });
      return { picks: out, personalised: true };
    }
  }
  const fallback = await getTopRated(n);
  return { picks: fallback.map((m) => ({ ...m, reason: "Highly rated and loved by lots of viewers" })), personalised: false };
}

// ---------------------------------------------------------------- quiz
export async function runQuiz(a: QuizAnswers, excludeIds: number[] = []): Promise<MovieCard[]> {
  const f = quizFilters(a);
  const where = [`m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id IN (${f.genreIds.map(() => "?").join(",")}))`, "m.vote_count >= ?", "m.vote_average >= ?"];
  const args: InValue[] = [...f.genreIds, f.minVotes, f.minRating];
  if (f.maxRuntime) { where.push("m.runtime <= ?"); args.push(f.maxRuntime); }
  if (f.minRuntime) { where.push("m.runtime >= ?"); args.push(f.minRuntime); }
  if (f.minYear) { where.push("m.year >= ?"); args.push(f.minYear); }
  if (f.maxYear) { where.push("m.year <= ?"); args.push(f.maxYear); }
  if (excludeIds.length) { where.push(`m.id NOT IN (${excludeIds.map(() => "?").join(",")})`); args.push(...excludeIds); }
  const order = f.sort === "gems" ? `${WEIGHTED} DESC, m.popularity ASC` : `${WEIGHTED} DESC, m.popularity DESC`;
  // Take a wider pool then sample so repeated quizzes feel fresh.
  const pool = await cards(`SELECT ${CARD_COLS} FROM movies m WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 40`, args);
  const sampled = pool.slice(0, 20).sort(() => Math.random() - 0.5).slice(0, 10);
  return sampled.map((m) => ({ ...m, reason: quizReason(a, m) }));
}

/** Genres with the most films, for the home page's by-genre rows. */
export async function getTopGenres(n = 6): Promise<{ id: number; name: string }[]> {
  const rows = (await db.execute({
    sql: `SELECT g.id, g.name FROM genres g JOIN movie_genres mg ON mg.genre_id = g.id GROUP BY g.id ORDER BY COUNT(*) DESC LIMIT ?`,
    args: [n],
  })).rows;
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
}
