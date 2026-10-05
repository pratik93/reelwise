import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { MovieGrid, MovieGridSkeleton } from "@/components/MovieGrid";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/States";
import { PAGE_SIZE, parseFilters, filtersToQuery } from "@/lib/filters";
import { getFacets, searchMovies } from "@/lib/queries";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  return {
    title: f.q ? `Search: ${f.q}` : "Browse movies",
    description: "Search and filter movies by genre, year, rating, runtime, language and streaming service.",
    robots: f.q || f.page > 1 ? { index: false, follow: true } : undefined,
  };
}

async function Results({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters(await searchParams);
  const { items, total } = await searchMovies(filters);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (items.length === 0)
    return <EmptyState title="No movies match" body="Try removing a filter or searching for something else." action={{ href: "/browse", label: "Reset filters" }} />;
  return (
    <>
      <p className="mb-4 text-sm text-muted" aria-live="polite">{total.toLocaleString()} {total === 1 ? "movie" : "movies"} · page {filters.page} of {totalPages}</p>
      <MovieGrid movies={items} />
      <Pagination page={filters.page} totalPages={totalPages} filters={filters} />
    </>
  );
}

export default async function BrowsePage({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters(await searchParams);
  const facets = await getFacets();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-5xl">{filters.q ? <>Results for “{filters.q}”</> : "Browse"}</h1>
      <FilterBar filters={filters} facets={facets} />
      <div className="mt-8">
        {/* key forces the skeleton to show again whenever filters change */}
        <Suspense key={filtersToQuery(filters)} fallback={<MovieGridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
