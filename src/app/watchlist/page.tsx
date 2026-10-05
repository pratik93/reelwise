import type { Metadata } from "next";
import { SavedList } from "@/components/SavedList";
import { getWatchlistMovies } from "@/lib/queries";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Your watchlist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const sid = await readSession();
  const movies = sid ? await getWatchlistMovies(sid) : [];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-5xl">Watchlist</h1>
      <p className="mb-8 mt-1 text-muted">Saved in this browser. No account needed.</p>
      <SavedList movies={movies} mode="watchlist" />
    </div>
  );
}
