"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { filtersToQuery, SORTS, type Filters } from "@/lib/filters";

interface Facets {
  genres: { id: number; name: string }[];
  languages: { code: string; name: string }[];
  providers: { id: number; name: string }[];
  yearRange: { min: number; max: number };
}

const SORT_LABEL: Record<(typeof SORTS)[number], string> = {
  relevance: "Best match", popularity: "Most popular", rating: "Highest rated", newest: "Newest first", oldest: "Oldest first", title: "Title A–Z", runtime: "Shortest first",
};
const field = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg";

/** URL-driven filters: every change updates the query string, and the server re-renders the results. */
export function FilterBar({ filters, facets }: { filters: Filters; facets: Facets }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  const first = useRef(true);

  const apply = (patch: Partial<Filters>) =>
    start(() => router.push(`/browse?${filtersToQuery({ ...filters, ...patch, page: 1 })}`, { scroll: false }));

  // Debounced instant search inside the browse page.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => { if ((filters.q ?? "") !== q.trim()) apply({ q: q.trim() || undefined }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const num = (v: string) => (v === "" ? undefined : Number(v));
  const selected = new Set(filters.genres ?? []);
  const activeCount = [filters.genres?.length, filters.yearMin, filters.yearMax, filters.ratingMin, filters.runtimeMax, filters.lang, filters.provider].filter(Boolean).length;

  return (
    <form role="search" aria-label="Filter movies" onSubmit={(e) => e.preventDefault()} className="space-y-4" aria-busy={pending}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="f-q" className="sr-only">Search titles and plots</label>
          <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, plots, taglines…" className={`${field} h-11`} />
        </div>
        <div className="sm:w-48">
          <label htmlFor="f-sort" className="sr-only">Sort by</label>
          <select id="f-sort" value={filters.sort} onChange={(e) => apply({ sort: e.target.value as Filters["sort"] })} className={`${field} h-11`}>
            {SORTS.filter((s) => s !== "relevance" || filters.q).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      <details className="group rounded-xl border border-line bg-surface" open={activeCount > 0 ? true : undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
          <span>Filters{activeCount ? ` (${activeCount} active)` : ""}</span>
          <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="space-y-5 border-t border-line p-4">
          <fieldset>
            <legend className="mb-2 text-sm text-muted">Genres (movies must match all selected)</legend>
            <div className="flex flex-wrap gap-2">
              {facets.genres.map((g) => {
                const on = selected.has(g.id);
                return (
                  <button key={g.id} type="button" aria-pressed={on}
                    onClick={() => { const n = new Set(selected); if (on) n.delete(g.id); else if (n.size < 5) n.add(g.id); apply({ genres: [...n] }); }}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent bg-accent text-accent-fg" : "border-line hover:bg-surface-2"}`}>
                    {g.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <label className="text-sm">From year<input type="number" inputMode="numeric" min={facets.yearRange.min} max={facets.yearRange.max} defaultValue={filters.yearMin ?? ""} key={`a${filters.yearMin}`} onBlur={(e) => apply({ yearMin: num(e.target.value) })} placeholder={String(facets.yearRange.min)} className={`${field} mt-1`} /></label>
            <label className="text-sm">To year<input type="number" inputMode="numeric" min={facets.yearRange.min} max={facets.yearRange.max} defaultValue={filters.yearMax ?? ""} key={`b${filters.yearMax}`} onBlur={(e) => apply({ yearMax: num(e.target.value) })} placeholder={String(facets.yearRange.max)} className={`${field} mt-1`} /></label>
            <label className="text-sm">Min rating
              <select value={filters.ratingMin ?? ""} onChange={(e) => apply({ ratingMin: num(e.target.value) })} className={`${field} mt-1`}>
                <option value="">Any</option>{[5, 6, 7, 8, 9].map((r) => <option key={r} value={r}>{r}+ ★</option>)}
              </select></label>
            <label className="text-sm">Max runtime
              <select value={filters.runtimeMax ?? ""} onChange={(e) => apply({ runtimeMax: num(e.target.value) })} className={`${field} mt-1`}>
                <option value="">Any</option>{[90, 105, 120, 150, 180].map((r) => <option key={r} value={r}>{r} min</option>)}
              </select></label>
            <label className="text-sm">Language
              <select value={filters.lang ?? ""} onChange={(e) => apply({ lang: e.target.value || undefined })} className={`${field} mt-1`}>
                <option value="">Any</option>{facets.languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select></label>
            <label className="text-sm">Streaming on
              <select value={filters.provider ?? ""} onChange={(e) => apply({ provider: num(e.target.value) })} className={`${field} mt-1`} disabled={facets.providers.length === 0}>
                <option value="">{facets.providers.length ? "Any service" : "No data"}</option>{facets.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
          </div>
          {activeCount > 0 && (
            <button type="button" onClick={() => start(() => router.push(`/browse?${filtersToQuery({ q: filters.q, sort: filters.sort })}`))} className="text-sm text-accent hover:underline">Clear all filters</button>
          )}
        </div>
      </details>
    </form>
  );
}
