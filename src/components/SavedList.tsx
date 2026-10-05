"use client";
import type { MovieCard as Movie } from "@/lib/types";
import { useUser } from "./UserProvider";
import { MovieGrid } from "./MovieGrid";
import { EmptyState } from "./States";

/** Renders server-fetched saved/rated movies but reacts instantly when the user removes one. */
export function SavedList({ movies, mode }: { movies: Movie[]; mode: "watchlist" | "ratings" }) {
  const { ready, watchlist, ratings } = useUser();
  const visible = !ready ? movies : movies.filter((m) => (mode === "watchlist" ? watchlist.has(m.id) : ratings[m.id] != null));
  if (visible.length === 0)
    return mode === "watchlist"
      ? <EmptyState title="Your watchlist is empty" body="Tap the bookmark on any movie to save it for later." action={{ href: "/browse", label: "Find something to watch" }} />
      : <EmptyState title="You haven't rated anything yet" body="Rate movies you've seen and your recommendations will get sharper." action={{ href: "/browse?sort=popularity", label: "Rate some movies" }} />;
  return <MovieGrid movies={visible} ratings={mode === "ratings" ? ratings : undefined} />;
}
