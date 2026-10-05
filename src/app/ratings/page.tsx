import type { Metadata } from "next";
import { SavedList } from "@/components/SavedList";
import { getRatedMovies } from "@/lib/queries";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "My ratings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RatingsPage() {
  const sid = await readSession();
  const movies = sid ? await getRatedMovies(sid) : [];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-5xl">My ratings</h1>
      <p className="mb-8 mt-1 text-muted">The more you rate, the better your picks get.</p>
      <SavedList movies={movies} mode="ratings" />
    </div>
  );
}
