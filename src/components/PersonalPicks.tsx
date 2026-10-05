"use client";
import { useEffect, useState } from "react";
import type { MovieCard } from "@/lib/types";
import { useUser } from "./UserProvider";
import { MovieRow, MovieRowSkeleton } from "./MovieRow";
import { ErrorState } from "./States";

/** "Picked for you": personalised after the first rating/watchlist add; popular+well-rated before that. */
export function PersonalPicks({ id = "picks" }: { id?: string }) {
  const { ready, watchlist, ratings } = useUser();
  const [data, setData] = useState<{ picks: MovieCard[]; personalised: boolean } | null>(null);
  const [error, setError] = useState(false);
  const signature = `${watchlist.size}:${Object.keys(ratings).length}`;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    fetch("/api/recommendations")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setData(d); setError(false); } })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [ready, signature]);

  if (error) return <div className="px-4 pt-10"><ErrorState title="Couldn't load your picks" body="Refresh the page to try again." /></div>;
  if (!data) return <MovieRowSkeleton title="your picks" />;
  return (
    <MovieRow
      id={id}
      title={data.personalised ? "Picked for you" : "Start here"}
      subtitle={data.personalised ? "Based on your ratings and watchlist" : "Rate a few movies and these picks will adapt to your taste"}
      movies={data.picks}
    />
  );
}
