import Link from "next/link";
import { Suspense } from "react";
import { PersonalPicks } from "@/components/PersonalPicks";
import { MovieRow } from "@/components/MovieRow";
import { TmdbImage } from "@/components/TmdbImage";
import { EmptyState } from "@/components/States";
import { getByGenre, getHero, getHiddenGems, getMovieCount, getNewReleases, getTopGenres, getTopRated, getTrending } from "@/lib/queries";

export const revalidate = 3600; // discovery rows change slowly; regenerate hourly (ISR)

export default async function Home() {
  if ((await getMovieCount()) === 0)
    return (
      <div className="px-4 py-24">
        <EmptyState title="No movies yet" body="The database is empty. Run the ingestion pipeline (npm run ingest) to load movies, then refresh." action={{ href: "/about", label: "How it works" }} />
      </div>
    );
  const [hero, trending, topRated, gems, fresh, genres] = await Promise.all([
    getHero(), getTrending(), getTopRated(), getHiddenGems(), getNewReleases(), getTopGenres(6),
  ]);
  const genreRows = await Promise.all(genres.map(async (g) => ({ ...g, movies: await getByGenre(g.id) })));

  return (
    <>
      {hero && (
        <section aria-label="Featured movie" className="relative isolate overflow-hidden">
          <TmdbImage path={hero.backdropPath} kind="backdrop" alt="" priority sizes="100vw" className="absolute inset-0 -z-10 !aspect-auto h-full w-full opacity-60" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/60 to-bg/10" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
          <div className="rise mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end gap-4 px-4 pb-12 pt-24 sm:min-h-[32rem] sm:px-6">
            <p className="text-sm font-medium uppercase tracking-widest text-accent">Featured tonight</p>
            <h1 className="max-w-3xl font-display text-5xl leading-[1.02] sm:text-7xl">{hero.title}</h1>
            <p className="max-w-xl text-pretty text-base text-fg/90 line-clamp-3 sm:text-lg">{hero.overview}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/movie/${hero.id}`} className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg">View details</Link>
              <Link href="/quiz" className="inline-flex h-11 items-center rounded-full border border-line bg-bg/60 px-6 text-sm font-medium backdrop-blur hover:bg-surface-2">Pick for me</Link>
            </div>
          </div>
        </section>
      )}
      <Suspense><PersonalPicks /></Suspense>
      <MovieRow id="trending" title="Trending now" subtitle="What everyone is watching" movies={trending} href="/browse?sort=popularity" />
      <MovieRow id="top-rated" title="Top rated" subtitle="Critically loved and audience approved" movies={topRated} href="/browse?sort=rating" />
      <MovieRow id="gems" title="Hidden gems" subtitle="Highly rated, but flying under the radar" movies={gems} />
      <MovieRow id="new" title="New releases" subtitle="From the last twelve months" movies={fresh} href="/browse?sort=newest" />
      {genreRows.map((g) => (
        <MovieRow key={g.id} id={`genre-${g.id}`} title={g.name} movies={g.movies} href={`/browse?genres=${g.id}&sort=rating`} />
      ))}
    </>
  );
}
