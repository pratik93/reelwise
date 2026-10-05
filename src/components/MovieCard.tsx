import Link from "next/link";
import type { MovieCard as Movie } from "@/lib/types";
import { TmdbImage } from "./TmdbImage";
import { WatchlistButton } from "./WatchlistButton";

export const CARD_SIZES = "(min-width:1280px) 180px, (min-width:768px) 20vw, 40vw";

export function MovieCard({ movie, showReason = true, myRating, priority }: { movie: Movie; showReason?: boolean; myRating?: number; priority?: boolean }) {
  return (
    <article className="group relative w-full">
      <Link href={`/movie/${movie.id}`} className="block rounded-xl focus-visible:outline-offset-4">
        <div className="relative overflow-hidden rounded-xl ring-1 ring-line transition duration-300 group-hover:-translate-y-1 group-hover:ring-accent">
          <TmdbImage path={movie.posterPath} kind="poster" alt={`Poster for ${movie.title}`} sizes={CARD_SIZES} priority={priority} />
          {movie.voteAverage > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">
              <span className="text-accent" aria-hidden="true">★</span> {movie.voteAverage.toFixed(1)}
              <span className="sr-only"> out of 10</span>
            </span>
          )}
          {myRating ? <span className="absolute bottom-2 left-2 rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-fg">You: {myRating}/10</span> : null}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{movie.title}</h3>
        <p className="text-xs text-muted">{[movie.year, movie.genres[0]].filter(Boolean).join(" · ")}</p>
        {showReason && movie.reason && <p className="mt-1 line-clamp-3 text-xs italic text-muted">{movie.reason}</p>}
      </Link>
      <div className="absolute right-2 top-2 opacity-100 transition md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <WatchlistButton movieId={movie.id} title={movie.title} variant="icon" />
      </div>
    </article>
  );
}

export function MovieCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[2/3] rounded-xl" />
      <div className="skeleton mt-2 h-4 w-3/4 rounded" />
      <div className="skeleton mt-1 h-3 w-1/2 rounded" />
    </div>
  );
}
