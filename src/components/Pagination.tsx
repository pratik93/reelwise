import Link from "next/link";
import { filtersToQuery, type Filters } from "@/lib/filters";

export function Pagination({ page, totalPages, filters }: { page: number; totalPages: number; filters: Filters }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => `/browse?${filtersToQuery({ ...filters, page: p })}`;
  const nums = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...nums].sort((a, b) => a - b);
  const cls = "grid h-10 min-w-10 place-items-center rounded-full border border-line px-3 text-sm hover:bg-surface-2";
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link href={href(page - 1)} rel="prev" className={cls}>‹ Prev</Link>}
      {sorted.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - sorted[i - 1] > 1 && <span aria-hidden="true" className="text-muted">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`} className={`${cls} ${n === page ? "!border-accent bg-accent !text-accent-fg" : ""}`}>{n}</Link>
        </span>
      ))}
      {page < totalPages && <Link href={href(page + 1)} rel="next" className={cls}>Next ›</Link>}
    </nav>
  );
}
