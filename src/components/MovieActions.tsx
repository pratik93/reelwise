"use client";
import { RatingStars } from "./RatingStars";
import { useUser } from "./UserProvider";
import { WatchlistButton } from "./WatchlistButton";

export function MovieActions({ movieId, title }: { movieId: number; title: string }) {
  const { ratings, rate } = useUser();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <WatchlistButton movieId={movieId} title={title} />
      <RatingStars value={ratings[movieId] ?? null} onChange={(v) => rate(movieId, v)} />
    </div>
  );
}
