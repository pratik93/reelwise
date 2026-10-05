import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MovieActions } from "@/components/MovieActions";
import { MovieRow } from "@/components/MovieRow";
import { TmdbImage } from "@/components/TmdbImage";
import { Trailer } from "@/components/Trailer";
import { imgUrl } from "@/lib/images";
import { getAllMovieIds, getMovie, getSimilar } from "@/lib/queries";

export const revalidate = 86400; // ISR: movie pages regenerate daily
export async function generateStaticParams() {
  // Pre-render the most popular pages at build; everything else renders on first request and is cached.
  return (await getAllMovieIds(200)).map((m) => ({ id: String(m.id) }));
}

type Props = { params: Promise<{ id: string }> };
const parseId = (s: string) => (/^\d{1,9}$/.test(s) ? Number(s) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const m = id ? await getMovie(id) : null;
  if (!m) return { title: "Movie not found" };
  const title = `${m.title}${m.year ? ` (${m.year})` : ""}`;
  const description = m.overview.length > 155 ? m.overview.slice(0, 152) + "…" : m.overview;
  const image = m.backdropPath ? imgUrl(m.backdropPath, 780) : imgUrl(m.posterPath, 500);
  return {
    title, description,
    alternates: { canonical: `/movie/${m.id}` },
    openGraph: { type: "video.movie", title, description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

const fmtRuntime = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default async function MoviePage({ params }: Props) {
  const id = parseId((await params).id);
  const movie = id ? await getMovie(id) : null;
  if (!movie) notFound();
  const similar = await getSimilar(movie.id);

  // schema.org structured data. "<" is escaped so the JSON can never close the script tag (XSS).
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    image: imgUrl(movie.posterPath, 500),
    datePublished: movie.releaseDate ?? undefined,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    genre: movie.genres,
    director: movie.directors.map((d) => ({ "@type": "Person", name: d.name })),
    actor: movie.cast.slice(0, 5).map((c) => ({ "@type": "Person", name: c.name })),
    aggregateRating: movie.voteCount > 0 ? { "@type": "AggregateRating", ratingValue: movie.voteAverage.toFixed(1), ratingCount: movie.voteCount, bestRating: 10, worstRating: 0 } : undefined,
  }).replace(/</g, "\\u003c");

  const byType = (t: string) => movie.providers.filter((p) => p.type === t);
  const watchGroups = [
    { label: "Stream", items: byType("flatrate") },
    { label: "Rent", items: byType("rent") },
    { label: "Buy", items: byType("buy") },
  ].filter((g) => g.items.length);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="relative isolate overflow-hidden">
        {movie.backdropPath && <TmdbImage path={movie.backdropPath} kind="backdrop" alt="" sizes="100vw" priority className="absolute inset-0 -z-10 !aspect-auto h-full w-full opacity-40" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/80 to-bg/30" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 md:grid-cols-[17rem_1fr] md:pt-16">
          <div className="mx-auto w-48 md:w-full">
            <TmdbImage path={movie.posterPath} kind="poster" alt={`Poster for ${movie.title}`} sizes="(min-width:768px) 272px, 192px" priority className="rounded-2xl shadow-2xl ring-1 ring-line" />
          </div>
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-4xl leading-tight sm:text-6xl">{movie.title} {movie.year && <span className="text-muted">({movie.year})</span>}</h1>
              {movie.originalTitle && <p className="text-muted">Original title: {movie.originalTitle}</p>}
              {movie.tagline && <p className="mt-2 text-lg italic text-muted">“{movie.tagline}”</p>}
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {movie.certification && <li className="rounded border border-line px-1.5 py-0.5 text-fg">{movie.certification}</li>}
              {movie.releaseDate && <li><time dateTime={movie.releaseDate}>{new Date(movie.releaseDate + "T00:00:00Z").toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</time></li>}
              {movie.runtime && <li>{fmtRuntime(movie.runtime)}</li>}
              {movie.originalLanguage && <li className="uppercase">{movie.originalLanguage}</li>}
            </ul>
            {movie.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Genres">
                {movie.genres.map((g) => <li key={g} className="rounded-full border border-line px-3 py-1 text-sm">{g}</li>)}
              </ul>
            )}
            <dl className="flex flex-wrap gap-6">
              {movie.voteCount > 0 && <div><dt className="text-xs uppercase tracking-wide text-muted">TMDB</dt><dd className="text-2xl font-semibold"><span className="text-accent" aria-hidden="true">★</span> {movie.voteAverage.toFixed(1)}<span className="text-sm font-normal text-muted"> / 10 · {movie.voteCount.toLocaleString()} votes</span></dd></div>}
              {movie.imdbRating != null && <div><dt className="text-xs uppercase tracking-wide text-muted">IMDb</dt><dd className="text-2xl font-semibold">{movie.imdbRating.toFixed(1)}</dd></div>}
              {movie.rottenTomatoes != null && <div><dt className="text-xs uppercase tracking-wide text-muted">Rotten Tomatoes</dt><dd className="text-2xl font-semibold">{movie.rottenTomatoes}%</dd></div>}
              {movie.metascore != null && <div><dt className="text-xs uppercase tracking-wide text-muted">Metascore</dt><dd className="text-2xl font-semibold">{movie.metascore}</dd></div>}
            </dl>
            <MovieActions movieId={movie.id} title={movie.title} />
            <div>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Overview</h2>
              <p className="max-w-3xl text-pretty leading-relaxed">{movie.overview}</p>
            </div>
            {movie.directors.length > 0 && (
              <p className="text-sm"><span className="text-muted">{movie.directors.length > 1 ? "Directors" : "Director"}: </span>
                {movie.directors.map((d, i) => <span key={d.id}>{i > 0 && ", "}<Link href={`/person/${d.id}`} className="text-accent hover:underline">{d.name}</Link></span>)}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6">
        {movie.trailerKey && (
          <section aria-labelledby="trailer"><h2 id="trailer" className="mb-4 font-display text-3xl">Trailer</h2><div className="max-w-4xl"><Trailer videoKey={movie.trailerKey} title={movie.title} /></div></section>
        )}

        <section aria-labelledby="watch">
          <h2 id="watch" className="mb-4 font-display text-3xl">Where to watch</h2>
          {watchGroups.length === 0 ? (
            <p className="text-muted">No streaming information available for your region right now.</p>
          ) : (
            <div className="space-y-4">
              {watchGroups.map((g) => (
                <div key={g.label}>
                  <h3 className="mb-2 text-sm text-muted">{g.label}</h3>
                  <ul className="flex flex-wrap gap-3">
                    {g.items.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3 text-sm">
                        {p.logoPath && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl(p.logoPath, 92)} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-lg" />
                        )}
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-muted">Availability data provided by JustWatch via TMDB.</p>
            </div>
          )}
        </section>

        {movie.cast.length > 0 && (
          <section aria-labelledby="cast">
            <h2 id="cast" className="mb-4 font-display text-3xl">Top cast</h2>
            <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
              {movie.cast.map((c) => (
                <li key={c.id}>
                  <Link href={`/person/${c.id}`} className="group block">
                    <TmdbImage path={c.profilePath} kind="profile" alt={c.name} sizes="120px" className="rounded-xl ring-1 ring-line transition group-hover:ring-accent" />
                    <p className="mt-2 text-sm font-medium leading-tight">{c.name}</p>
                    {c.character && <p className="text-xs text-muted">{c.character}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {movie.keywords.length > 0 && (
          <section aria-labelledby="themes">
            <h2 id="themes" className="mb-3 font-display text-3xl">Themes</h2>
            <ul className="flex flex-wrap gap-2">{movie.keywords.map((k) => <li key={k} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">{k}</li>)}</ul>
          </section>
        )}
      </div>

      <MovieRow id="similar" title="More like this" subtitle={`Based on shared themes, cast, crew and story with ${movie.title}`} movies={similar} />
    </article>
  );
}
