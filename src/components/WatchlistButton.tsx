"use client";
import { useUser } from "./UserProvider";

export function WatchlistButton({ movieId, title, variant = "full" }: { movieId: number; title: string; variant?: "full" | "icon" }) {
  const { watchlist, toggleWatchlist, ready } = useUser();
  const on = watchlist.has(movieId);
  const label = on ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`;
  const icon = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
  if (variant === "icon")
    return (
      <button type="button" onClick={() => toggleWatchlist(movieId)} aria-pressed={on} aria-label={label} disabled={!ready}
        className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${on ? "bg-accent text-accent-fg" : "bg-black/60 text-white hover:bg-black/80"}`}>
        {icon}
      </button>
    );
  return (
    <button type="button" onClick={() => toggleWatchlist(movieId)} aria-pressed={on} disabled={!ready}
      className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${on ? "bg-accent text-accent-fg" : "border border-line bg-surface hover:bg-surface-2"}`}>
      {icon}{on ? "In your watchlist" : "Add to watchlist"}
    </button>
  );
}
