import type { MovieCard as Movie } from "@/lib/types";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function MovieGrid({ movies, ratings }: { movies: Movie[]; ratings?: Record<number, number> }) {
  return (
    <div className={GRID}>
      {movies.map((m, i) => <MovieCard key={m.id} movie={m} priority={i < 4} myRating={ratings?.[m.id]} />)}
    </div>
  );
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return <div className={GRID} role="status" aria-label="Loading movies">{Array.from({ length: count }, (_, i) => <MovieCardSkeleton key={i} />)}</div>;
}
