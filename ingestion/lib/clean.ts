/** Pure data-cleaning helpers for raw TMDB movie payloads (unit tested). */

export interface CleanMovie {
  id: number;
  title: string;
  originalTitle: string | null;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  overview: string;
  tagline: string | null;
  posterPath: string;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  originalLanguage: string | null;
  spokenLanguages: { iso: string; name: string }[];
  productionCountries: { iso: string; name: string }[];
  imdbId: string | null;
  trailerKey: string | null;
  certification: string | null;
  genres: { id: number; name: string }[];
  keywords: { id: number; name: string }[];
  cast: { id: number; name: string; profilePath: string | null; character: string | null; position: number }[];
  directors: { id: number; name: string; profilePath: string | null }[];
  providers: { id: number; name: string; logoPath: string | null; region: string; type: "flatrate" | "rent" | "buy" }[];
}

export type DropReason = "missing" | "adult" | "no_poster" | "no_overview" | "no_title" | "unreleased";

/** Trim; collapse empty/whitespace-only strings to null. */
export function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length ? t : null;
}

/** Accepts yyyy-mm-dd (or yyyy-mm / yyyy) and returns a valid ISO date or null. */
export function normaliseDate(v: unknown): string | null {
  const t = text(v);
  if (!t) return null;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(t);
  if (!m) return null;
  const [y, mo = "01", d = "01"] = [m[1], m[2], m[3]];
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${y}-${mo}-${d}`) return null;
  return `${y}-${mo}-${d}`;
}

export function normaliseLanguage(v: unknown): string | null {
  const t = text(v);
  return t && /^[a-zA-Z]{2,3}$/.test(t) ? t.toLowerCase() : null;
}

/** Runtime of 0 or absurd values means "unknown", not "zero minutes". */
export function normaliseRuntime(v: unknown): number | null {
  return typeof v === "number" && v >= 20 && v <= 600 ? Math.round(v) : null;
}

/** Prefer an official YouTube trailer, then any trailer, then a teaser. */
export function pickTrailer(videos: unknown): string | null {
  const list = ((videos as { results?: any[] } | undefined)?.results ?? []).filter((v) => v?.site === "YouTube" && v?.key);
  const rank = (v: any) => (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 2 : 9) + (v.official ? 0 : 1);
  const best = [...list].sort((a, b) => rank(a) - rank(b))[0];
  return best && rank(best) < 9 ? String(best.key) : null;
}

export function pickCertification(releaseDates: unknown, country = "US"): string | null {
  const entry = ((releaseDates as { results?: any[] } | undefined)?.results ?? []).find((r) => r.iso_3166_1 === country);
  const cert = (entry?.release_dates ?? []).map((d: any) => text(d.certification)).find(Boolean);
  return cert ?? null;
}

export function cleanMovie(raw: any, regions: string[] = ["US"]): { movie: CleanMovie } | { drop: DropReason } {
  if (!raw || raw.missing || !raw.id) return { drop: "missing" };
  if (raw.adult) return { drop: "adult" };
  const title = text(raw.title);
  if (!title) return { drop: "no_title" };
  const posterPath = text(raw.poster_path);
  if (!posterPath) return { drop: "no_poster" };
  const overview = text(raw.overview);
  if (!overview) return { drop: "no_overview" };
  if (raw.status && raw.status !== "Released") return { drop: "unreleased" };

  const releaseDate = normaliseDate(raw.release_date);
  const dedupe = <T extends { id: number }>(xs: T[]): T[] => [...new Map(xs.map((x) => [x.id, x] as const)).values()];

  const cast = dedupe<CleanMovie["cast"][number]>(
    (raw.credits?.cast ?? [])
      .filter((c: any) => c?.id && text(c.name))
      .slice(0, 10)
      .map((c: any, i: number) => ({
        id: c.id, name: text(c.name)!, profilePath: text(c.profile_path), character: text(c.character), position: i,
      })),
  );
  const directors = dedupe<CleanMovie["directors"][number]>(
    (raw.credits?.crew ?? [])
      .filter((c: any) => c?.job === "Director" && c?.id && text(c.name))
      .map((c: any) => ({ id: c.id, name: text(c.name)!, profilePath: text(c.profile_path) })),
  );

  const providers: CleanMovie["providers"] = [];
  const wp = raw["watch/providers"]?.results ?? {};
  for (const region of regions) {
    for (const type of ["flatrate", "rent", "buy"] as const) {
      for (const p of wp[region]?.[type] ?? []) {
        if (p?.provider_id && text(p.provider_name))
          providers.push({ id: p.provider_id, name: text(p.provider_name)!, logoPath: text(p.logo_path), region, type });
      }
    }
  }

  return {
    movie: {
      id: raw.id,
      title,
      originalTitle: text(raw.original_title) && text(raw.original_title) !== title ? text(raw.original_title) : null,
      releaseDate,
      year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
      runtime: normaliseRuntime(raw.runtime),
      overview,
      tagline: text(raw.tagline),
      posterPath,
      backdropPath: text(raw.backdrop_path),
      voteAverage: Number(raw.vote_average) || 0,
      voteCount: Number(raw.vote_count) || 0,
      popularity: Number(raw.popularity) || 0,
      originalLanguage: normaliseLanguage(raw.original_language),
      spokenLanguages: (raw.spoken_languages ?? [])
        .filter((l: any) => normaliseLanguage(l?.iso_639_1))
        .map((l: any) => ({ iso: normaliseLanguage(l.iso_639_1)!, name: text(l.english_name) ?? text(l.name) ?? l.iso_639_1 })),
      productionCountries: (raw.production_countries ?? [])
        .filter((c: any) => text(c?.iso_3166_1))
        .map((c: any) => ({ iso: c.iso_3166_1, name: text(c.name) ?? c.iso_3166_1 })),
      imdbId: text(raw.imdb_id),
      trailerKey: pickTrailer(raw.videos),
      certification: pickCertification(raw.release_dates),
      genres: dedupe<CleanMovie["genres"][number]>((raw.genres ?? []).filter((g: any) => g?.id && text(g.name)).map((g: any) => ({ id: g.id, name: g.name }))),
      keywords: dedupe<CleanMovie["keywords"][number]>((raw.keywords?.keywords ?? []).filter((k: any) => k?.id && text(k.name)).map((k: any) => ({ id: k.id, name: k.name }))),
      cast,
      directors,
      providers,
    },
  };
}

const normTitle = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Remove duplicate releases of the same film (same title + year): keep the most-voted one. */
export function dedupeMovies(movies: CleanMovie[]): { kept: CleanMovie[]; removed: number } {
  const best = new Map<string, CleanMovie>();
  for (const m of movies) {
    const k = `${normTitle(m.title)}|${m.year ?? ""}`;
    const cur = best.get(k);
    if (!cur || m.voteCount > cur.voteCount) best.set(k, m);
  }
  const kept = [...best.values()];
  return { kept, removed: movies.length - kept.length };
}
