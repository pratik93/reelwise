export interface MovieCard {
  id: number;
  title: string;
  year: number | null;
  posterPath: string;
  voteAverage: number;
  voteCount: number;
  runtime: number | null;
  genres: string[];
  /** Plain-language "why this" line, set on recommendation lists */
  reason?: string;
}

export interface Person { id: number; name: string; profilePath: string | null }
export interface CastMember extends Person { character: string | null }
export interface ProviderInfo { id: number; name: string; logoPath: string | null; type: "flatrate" | "rent" | "buy" }

export interface MovieDetail extends MovieCard {
  originalTitle: string | null;
  releaseDate: string | null;
  overview: string;
  tagline: string | null;
  backdropPath: string | null;
  popularity: number;
  originalLanguage: string | null;
  spokenLanguages: { iso: string; name: string }[];
  productionCountries: { iso: string; name: string }[];
  imdbId: string | null;
  trailerKey: string | null;
  imdbRating: number | null;
  rottenTomatoes: number | null;
  metascore: number | null;
  certification: string | null;
  keywords: string[];
  cast: CastMember[];
  directors: Person[];
  providers: ProviderInfo[];
}
