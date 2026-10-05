import type { Metadata } from "next";
import Link from "next/link";
import { getMovieCount } from "@/lib/queries";

export const metadata: Metadata = { title: "About", description: "How Reelwise finds movies you'll like, where the data comes from, and what we do with your watchlist." };
export const revalidate = 3600;

export default async function About() {
  const count = await getMovieCount();
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <h1 className="font-display text-5xl">About Reelwise</h1>
      <p className="text-lg text-muted">Reelwise helps you decide what to watch. {count > 0 && <>Right now it knows about <strong className="text-fg">{count.toLocaleString()}</strong> well-loved films. </>}Browse, filter, build a watchlist and rate what you&apos;ve seen. Recommendations get better as you go.</p>
      <section className="space-y-2"><h2 className="font-display text-3xl">How recommendations work</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li><strong className="text-fg">More like this:</strong> each film is compared with every other using its genres, themes (keywords), director, cast and plot text. The 20 closest matches are precomputed, and each one explains why.</li>
          <li><strong className="text-fg">Picked for you:</strong> films you rate highly (or save) vote for their closest matches; films you rate low vote against theirs. With no history we show popular, well-rated films.</li>
          <li><strong className="text-fg">Pick for me:</strong> a four-question quiz maps mood, time, adventurousness and era to filters.</li>
        </ul></section>
      <section className="space-y-2"><h2 className="font-display text-3xl">Your data</h2>
        <p className="text-muted">No sign-up. Your watchlist and ratings are tied to an anonymous cookie in this browser. Clear cookies and they&apos;re gone. We don&apos;t collect personal information.</p></section>
      <section className="space-y-2"><h2 className="font-display text-3xl">Data sources</h2>
        <p className="text-muted">Movie data and images come from <a className="text-accent underline" href="https://www.themoviedb.org/" rel="noopener noreferrer" target="_blank">TMDB</a>; streaming availability is provided by JustWatch via TMDB; additional ratings come from OMDb when available. This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>
      <Link href="/quiz" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-medium text-accent-fg">Try the “Pick for me” quiz</Link>
    </div>
  );
}
