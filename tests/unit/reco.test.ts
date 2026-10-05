import { describe, expect, it } from "vitest";
import { buildIndex, explainSimilarity, tokenize, topSimilar, type SimilarityInput } from "../../src/lib/reco/similarity";
import { personalise, pickReason, signalWeight } from "../../src/lib/reco/personalise";
import { weightedRating, isHiddenGem } from "../../src/lib/reco/scoring";
import { quizFilters, quizReason } from "../../src/lib/reco/quiz";

const m = (id: number, title: string, o: Partial<SimilarityInput>): SimilarityInput => ({
  id, title, genres: [], keywords: [], directors: [], cast: [], overview: "", ...o,
});
const nolan = { id: 1, name: "Christopher Nolan" };
const movies = [
  m(1, "Inception", { genres: ["Sci-Fi", "Action"], keywords: ["dream", "heist", "subconscious"], directors: [nolan], overview: "A thief steals secrets through dream sharing technology." }),
  m(2, "Interstellar", { genres: ["Sci-Fi", "Drama"], keywords: ["space", "time", "dream"], directors: [nolan], overview: "Explorers travel through a wormhole in space." }),
  m(3, "Notting Hill", { genres: ["Romance", "Comedy"], keywords: ["bookshop", "actress"], overview: "A bookseller falls for a famous actress." }),
  m(4, "Paprika", { genres: ["Sci-Fi", "Animation"], keywords: ["dream", "subconscious", "heist"], overview: "A device lets therapists enter dreams of patients." }),
];

describe("similarity", () => {
  const index = buildIndex(movies);
  it("ranks content-related movies above unrelated ones", () => {
    const top = topSimilar(index, 0, 3).map((r) => movies[r.index].title);
    expect(top[0]).toBe("Paprika"); // same keywords + genre + dream overview
    expect(top).toContain("Interstellar");
    expect(top).not.toContain("Notting Hill"); // no overlap -> no filler results
  });
  it("never returns the movie itself and respects k", () => {
    const res = topSimilar(index, 0, 2);
    expect(res).toHaveLength(2);
    expect(res.every((r) => r.index !== 0)).toBe(true);
  });
  it("explains using only real overlaps", () => {
    const why = explainSimilarity(movies[0], movies[1]);
    expect(why).toContain("Christopher Nolan");
    expect(explainSimilarity(movies[2], movies[0])).not.toContain("Nolan");
  });
  it("tokenizes without stopwords", () => {
    expect(tokenize("The thieves are stealing secrets")).not.toContain("the");
  });
});

describe("personalise", () => {
  const similar = [
    { movieId: 1, similarId: 10, score: 0.9 },
    { movieId: 1, similarId: 11, score: 0.5 },
    { movieId: 2, similarId: 11, score: 0.8 },
    { movieId: 2, similarId: 12, score: 0.9 },
    { movieId: 1, similarId: 2, score: 0.7 }, // already rated -> excluded
  ];
  it("boosts movies similar to highly rated ones and penalises those similar to disliked ones", () => {
    const picks = personalise([{ movieId: 1, title: "A", rating: 10 }, { movieId: 2, title: "B", rating: 2 }], similar);
    expect(picks.map((p) => p.movieId)).toEqual([10]); // 11 and 12 are net-negative or zero
    expect(pickReason(picks[0])).toBe('Because you rated "A" 10/10');
  });
  it("treats watchlist entries as mild positives and excludes saved titles", () => {
    const picks = personalise([{ movieId: 1, title: "A", rating: null }, { movieId: 2, title: "B", rating: null }], similar);
    expect(picks.some((p) => p.movieId === 2)).toBe(false);
    expect(pickReason(picks[0])).toContain("watchlist");
  });
  it("returns nothing with no history so callers can fall back to popularity", () => {
    expect(personalise([], similar)).toEqual([]);
  });
  it("signal weights are signed around 6", () => {
    expect(signalWeight({ movieId: 1, title: "", rating: 10 })).toBe(1);
    expect(signalWeight({ movieId: 1, title: "", rating: 6 })).toBe(0);
    expect(signalWeight({ movieId: 1, title: "", rating: 1 })).toBe(-1);
  });
});

describe("scoring + quiz", () => {
  it("weightedRating shrinks low-vote scores toward the mean", () => {
    expect(weightedRating(9.5, 10)).toBeLessThan(weightedRating(8.4, 20000));
  });
  it("flags hidden gems", () => {
    expect(isHiddenGem({ voteAverage: 7.8, voteCount: 900, popularity: 10 }, 30)).toBe(true);
    expect(isHiddenGem({ voteAverage: 7.8, voteCount: 900, popularity: 90 }, 30)).toBe(false);
  });
  it("maps quiz answers to filters", () => {
    const f = quizFilters({ mood: "scared", time: "short", appetite: "surprise", era: "classic" }, new Date("2026-01-01"));
    expect(f.genreIds).toContain(27);
    expect(f.maxRuntime).toBe(100);
    expect(f.maxYear).toBe(1999);
    expect(f.sort).toBe("gems");
  });
  it("writes a readable quiz reason", () => {
    expect(quizReason({ mood: "happy", time: "short", appetite: "familiar", era: "any" }, { genres: [], runtime: 92, year: 2001 })).toBe("A feel-good pick: only 92 minutes, a crowd favourite");
  });
});
