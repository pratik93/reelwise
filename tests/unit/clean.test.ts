import { describe, expect, it } from "vitest";
import { cleanMovie, dedupeMovies, normaliseDate, normaliseLanguage, normaliseRuntime, pickTrailer } from "../../ingestion/lib/clean";

const base = { id: 1, title: " Inception ", poster_path: "/p.jpg", overview: "A thief enters dreams.", status: "Released", release_date: "2010-07-15", runtime: 148, original_language: "EN" };

describe("cleanMovie", () => {
  it("drops movies without a poster or overview", () => {
    expect(cleanMovie({ ...base, poster_path: null })).toEqual({ drop: "no_poster" });
    expect(cleanMovie({ ...base, overview: "   " })).toEqual({ drop: "no_overview" });
  });
  it("drops adult, unreleased and missing records", () => {
    expect(cleanMovie({ ...base, adult: true })).toEqual({ drop: "adult" });
    expect(cleanMovie({ ...base, status: "In Production" })).toEqual({ drop: "unreleased" });
    expect(cleanMovie({ id: 5, missing: true })).toEqual({ drop: "missing" });
  });
  it("normalises fields and handles missing values", () => {
    const r = cleanMovie({ ...base, runtime: 0, tagline: "", release_date: "" });
    if (!("movie" in r)) throw new Error("expected movie");
    expect(r.movie.title).toBe("Inception");
    expect(r.movie.originalLanguage).toBe("en");
    expect(r.movie.runtime).toBeNull();
    expect(r.movie.tagline).toBeNull();
    expect(r.movie.releaseDate).toBeNull();
    expect(r.movie.year).toBeNull();
  });
  it("keeps top 10 cast and only directors from crew", () => {
    const cast = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `A${i}`, character: "x" }));
    const crew = [{ id: 100, name: "Nolan", job: "Director" }, { id: 101, name: "Zimmer", job: "Composer" }];
    const r = cleanMovie({ ...base, credits: { cast, crew } });
    if (!("movie" in r)) throw new Error();
    expect(r.movie.cast).toHaveLength(10);
    expect(r.movie.directors.map((d) => d.name)).toEqual(["Nolan"]);
  });
  it("collects watch providers per region", () => {
    const r = cleanMovie({ ...base, "watch/providers": { results: { US: { flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/n.png" }] }, GB: { rent: [{ provider_id: 2, provider_name: "Apple TV" }] } } } }, ["US"]);
    if (!("movie" in r)) throw new Error();
    expect(r.movie.providers).toEqual([{ id: 8, name: "Netflix", logoPath: "/n.png", region: "US", type: "flatrate" }]);
  });
});

describe("normalisers", () => {
  it("validates dates", () => {
    expect(normaliseDate("2010-07-15")).toBe("2010-07-15");
    expect(normaliseDate("2010")).toBe("2010-01-01");
    expect(normaliseDate("2010-02-31")).toBeNull();
    expect(normaliseDate("garbage")).toBeNull();
  });
  it("validates languages and runtimes", () => {
    expect(normaliseLanguage("FR")).toBe("fr");
    expect(normaliseLanguage("xx-yy")).toBeNull();
    expect(normaliseRuntime(5)).toBeNull();
    expect(normaliseRuntime(120)).toBe(120);
  });
  it("prefers official trailers on YouTube", () => {
    const v = { results: [{ site: "YouTube", key: "teaser", type: "Teaser", official: true }, { site: "Vimeo", key: "v", type: "Trailer" }, { site: "YouTube", key: "trail", type: "Trailer", official: true }] };
    expect(pickTrailer(v)).toBe("trail");
    expect(pickTrailer({ results: [] })).toBeNull();
  });
});

describe("dedupeMovies", () => {
  it("keeps the most-voted duplicate of the same title and year", () => {
    const mk = (id: number, votes: number, title = "Heat") => ({ id, title, year: 1995, voteCount: votes }) as unknown as Parameters<typeof dedupeMovies>[0][number];
    const { kept, removed } = dedupeMovies([mk(1, 10), mk(2, 500), mk(3, 5, "Other")]);
    expect(removed).toBe(1);
    expect(kept.map((m) => m.id).sort()).toEqual([2, 3]);
  });
});
