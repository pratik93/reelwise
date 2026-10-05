"use client";
import Link from "next/link";
import { useRef } from "react";
import type { MovieCard as Movie } from "@/lib/types";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";

interface Props { title: string; subtitle?: string; movies: Movie[]; href?: string; id: string }

/** Horizontally scrolling carousel with snap points, keyboard-focusable cards and arrow buttons. */
export function MovieRow({ title, subtitle, movies, href, id }: Props) {
  const scroller = useRef<HTMLUListElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });
  if (movies.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="font-display text-3xl leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {href && <Link href={href} className="text-sm text-accent hover:underline">See all</Link>}
          <button type="button" onClick={() => scrollBy(-1)} aria-label={`Scroll ${title} left`} className="hidden h-9 w-9 place-items-center rounded-full border border-line hover:bg-surface-2 md:grid">‹</button>
          <button type="button" onClick={() => scrollBy(1)} aria-label={`Scroll ${title} right`} className="hidden h-9 w-9 place-items-center rounded-full border border-line hover:bg-surface-2 md:grid">›</button>
        </div>
      </div>
      <ul ref={scroller} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {movies.map((m) => (
          <li key={m.id} className="w-36 shrink-0 snap-start sm:w-40 lg:w-44">
            <MovieCard movie={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MovieRowSkeleton({ title }: { title?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6" role="status" aria-label={`Loading ${title ?? "movies"}`}>
      <div className="skeleton mb-4 h-8 w-56 rounded" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="w-36 shrink-0 sm:w-40 lg:w-44"><MovieCardSkeleton /></div>)}
      </div>
    </section>
  );
}
