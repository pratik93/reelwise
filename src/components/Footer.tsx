import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-3 text-sm text-muted">
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" aria-label="The Movie Database (TMDB)">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tmdb-logo.svg" alt="TMDB logo" width={137} height={18} className="h-4 w-auto" loading="lazy" />
          </a>
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data and images are provided by TMDB. Extra ratings from OMDb.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/browse" className="text-muted hover:text-fg">Browse</Link>
          <Link href="/quiz" className="text-muted hover:text-fg">Pick for me</Link>
          <Link href="/watchlist" className="text-muted hover:text-fg">Watchlist</Link>
          <Link href="/about" className="text-muted hover:text-fg">About</Link>
        </nav>
      </div>
    </footer>
  );
}
