/**
 * Personalised picks: every movie the user rated highly (or saved to their
 * watchlist) "votes" for its precomputed similar movies. Disliked movies vote
 * against theirs. Falls back to the caller's popularity list with no history.
 */

export interface TasteSignal {
  movieId: number;
  title: string;
  /** 1-10 rating, or null for a watchlist-only signal */
  rating: number | null;
}

export interface SimilarRow {
  movieId: number; // the movie the user interacted with
  similarId: number;
  score: number;
}

export interface Pick {
  movieId: number;
  score: number;
  /** the user's movie that contributed most */
  becauseOf: TasteSignal;
}

/** Map a rating to a signed weight: 10 -> +1, 6 -> 0, 1 -> about -1. Watchlist = mild positive. */
export function signalWeight(s: TasteSignal): number {
  if (s.rating === null) return 0.4;
  return s.rating >= 6 ? (s.rating - 6) / 4 : (s.rating - 6) / 5;
}

export function personalise(signals: TasteSignal[], similar: SimilarRow[], limit = 20): Pick[] {
  const seen = new Set(signals.map((s) => s.movieId)) // never recommend what they already rated/saved;
  const bySignal = new Map(signals.map((s) => [s.movieId, s]));
  const totals = new Map<number, { score: number; best: number; because: TasteSignal }>();

  for (const row of similar) {
    const s = bySignal.get(row.movieId);
    if (!s || seen.has(row.similarId)) continue;
    const w = signalWeight(s);
    const contribution = w * row.score;
    const cur = totals.get(row.similarId);
    if (!cur) totals.set(row.similarId, { score: contribution, best: contribution, because: s });
    else {
      cur.score += contribution;
      if (contribution > cur.best) { cur.best = contribution; cur.because = s; }
    }
  }
  return [...totals]
    .filter(([, t]) => t.score > 0)
    .map(([movieId, t]) => ({ movieId, score: t.score, becauseOf: t.because }))
    .sort((a, b) => b.score - a.score || a.movieId - b.movieId)
    .slice(0, limit);
}

export function pickReason(p: Pick): string {
  const r = p.becauseOf.rating;
  return r === null
    ? `Because "${p.becauseOf.title}" is on your watchlist`
    : `Because you rated "${p.becauseOf.title}" ${r}/10`;
}
