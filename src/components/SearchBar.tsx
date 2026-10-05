"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { MovieCard } from "@/lib/types";
import { imgUrl } from "@/lib/images";

/** Instant search: debounced suggestions in an ARIA combobox; Enter goes to the full results page. */
export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MovieCard[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (q.trim().length < 2) return; // too short: the list is hidden and results are ignored
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { items: MovieCard[] }) => { setItems(d.items ?? []); setActive(-1); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (path: string) => { setOpen(false); router.push(path); };
  const showList = open && q.trim().length >= 2;
  const list = showList ? items : [];

  return (
    <div ref={box} className="relative w-full max-w-xs md:w-72">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && list[active]) go(`/movie/${list[active].id}`);
          else if (q.trim()) go(`/browse?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <label htmlFor="site-search" className="sr-only">Search movies</label>
        <input
          id="site-search"
          type="search"
          value={q}
          autoComplete="off"
          placeholder="Search movies…"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm text-fg placeholder:text-muted"
        />
      </form>
      {showList && (
        <ul id={listId} role="listbox" aria-label="Search suggestions" className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-2xl md:w-96 md:left-auto">
          {loading && list.length === 0 && <li className="px-3 py-3 text-sm text-muted">Searching…</li>}
          {!loading && list.length === 0 && <li className="px-3 py-3 text-sm text-muted">No movies found for “{q}”.</li>}
          {list.map((m, i) => (
            <li key={m.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={`/movie/${m.id}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg p-2 ${i === active ? "bg-surface-2" : "hover:bg-surface-2"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(m.posterPath, 92)} alt="" width={36} height={54} loading="lazy" className="h-[54px] w-9 rounded bg-surface-2 object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{m.title}</span>
                  <span className="block text-xs text-muted">{m.year ?? "Year unknown"}{m.voteAverage ? ` · ★ ${m.voteAverage.toFixed(1)}` : ""}</span>
                </span>
              </Link>
            </li>
          ))}
          {list.length > 0 && (
            <li role="presentation">
              <Link href={`/browse?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-accent hover:bg-surface-2">
                See all results →
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
