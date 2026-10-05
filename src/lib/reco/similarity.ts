/**
 * Content-based similarity. Each movie is turned into five sparse TF-IDF
 * vectors (genres, keywords, director, cast, overview text). The similarity of
 * two movies is the weighted sum of the cosine similarity in each group, so
 * "shares a director" and "same themes" both contribute in a controlled way.
 * Pure functions only; ingestion/similarity.ts does the DB I/O.
 */

export interface SimilarityInput {
  id: number;
  title: string;
  genres: string[];
  keywords: string[];
  directors: { id: number; name: string }[];
  cast: { id: number; name: string }[];
  overview: string;
}

export type Group = "genres" | "keywords" | "directors" | "cast" | "overview";
export const WEIGHTS: Record<Group, number> = { genres: 0.2, keywords: 0.3, directors: 0.15, cast: 0.1, overview: 0.25 };

type Vec = Map<string, number>;

const STOP = new Set(
  "a an and are as at be but by for from has have he her his i in into is it its of on or she that the their them they this to was were which who will with after about when while over out up one two new find must back only other than then there these those what where how not no can all more most also been being had do does did just so such own same too very s t into during before between through against above below under again further once here both each few any some".split(" "),
);

/** Lowercase, strip punctuation, drop stop-words and very short tokens, light suffix stemming. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, (m) => (w.length - m.length >= 4 ? "" : m)));
}

function groupTokens(m: SimilarityInput): Record<Group, string[]> {
  return {
    genres: m.genres,
    keywords: m.keywords,
    directors: m.directors.map((d) => String(d.id)),
    cast: m.cast.map((c) => String(c.id)),
    overview: tokenize(m.overview),
  };
}

export interface SimilarityIndex {
  ids: number[];
  /** per group: for each movie, a normalised sparse vector */
  vectors: Record<Group, Vec[]>;
  /** per group: token -> postings [movieIndex, weight] */
  postings: Record<Group, Map<string, [number, number][]>>;
}

export function buildIndex(movies: SimilarityInput[]): SimilarityIndex {
  const n = movies.length;
  const groups = Object.keys(WEIGHTS) as Group[];
  const toks = movies.map(groupTokens);
  const vectors = {} as SimilarityIndex["vectors"];
  const postings = {} as SimilarityIndex["postings"];

  for (const g of groups) {
    const df = new Map<string, number>();
    for (const t of toks) for (const w of new Set(t[g])) df.set(w, (df.get(w) ?? 0) + 1);
    const vecs: Vec[] = [];
    const post = new Map<string, [number, number][]>();
    toks.forEach((t, i) => {
      const tf = new Map<string, number>();
      for (const w of t[g]) tf.set(w, (tf.get(w) ?? 0) + 1);
      const v: Vec = new Map();
      let norm = 0;
      for (const [w, c] of tf) {
        const weight = (1 + Math.log(c)) * Math.log(1 + n / (df.get(w) ?? 1)); // smoothed TF-IDF
        v.set(w, weight);
        norm += weight * weight;
      }
      norm = Math.sqrt(norm) || 1;
      for (const [w, x] of v) {
        v.set(w, x / norm);
        if (!post.has(w)) post.set(w, []);
        post.get(w)!.push([i, x / norm]);
      }
      vecs.push(v);
    });
    vectors[g] = vecs;
    postings[g] = post;
  }
  return { ids: movies.map((m) => m.id), vectors, postings };
}

/** Top-k most similar movies to movie at index `i` using the inverted index. */
export function topSimilar(index: SimilarityIndex, i: number, k = 20): { index: number; score: number }[] {
  const scores = new Map<number, number>();
  for (const g of Object.keys(WEIGHTS) as Group[]) {
    for (const [w, x] of index.vectors[g][i]) {
      for (const [j, y] of index.postings[g].get(w) ?? []) {
        if (j === i) continue;
        scores.set(j, (scores.get(j) ?? 0) + WEIGHTS[g] * x * y);
      }
    }
  }
  return [...scores]
    .map(([index, score]) => ({ index, score }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, k);
}

const list = (xs: string[]) => (xs.length <= 1 ? xs[0] : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * Plain-language reason for why `b` is recommended given `a`,
 * built only from facts that really overlap.
 */
export function explainSimilarity(a: SimilarityInput, b: SimilarityInput): string {
  const sharedDirectors = a.directors.filter((d) => b.directors.some((x) => x.id === d.id)).map((d) => d.name);
  const sharedCast = a.cast.filter((c) => b.cast.some((x) => x.id === c.id)).map((c) => c.name);
  const sharedGenres = a.genres.filter((g) => b.genres.includes(g));
  const sharedKeywords = a.keywords.filter((k) => b.keywords.includes(k));
  const parts: string[] = [];
  if (sharedDirectors.length) parts.push(`the director ${list(sharedDirectors.slice(0, 2))}`);
  if (sharedKeywords.length >= 2) parts.push(`themes like ${list(sharedKeywords.slice(0, 3))}`);
  if (sharedCast.length) parts.push(`${list(sharedCast.slice(0, 2))} in the cast`);
  if (sharedGenres.length && parts.length < 2) parts.push(`${list(sharedGenres.slice(0, 2)).toLowerCase()} storytelling`);
  if (!parts.length) return `Its story has a similar feel to ${a.title}`;
  return `Shares ${list(parts.slice(0, 3))} with ${a.title}`;
}
