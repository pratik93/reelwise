import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MovieGrid } from "@/components/MovieGrid";
import { TmdbImage } from "@/components/TmdbImage";
import { getPerson } from "@/lib/queries";

export const revalidate = 86400;
type Props = { params: Promise<{ id: string }> };
const parseId = (s: string) => (/^\d{1,9}$/.test(s) ? Number(s) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const p = id ? await getPerson(id) : null;
  return p ? { title: p.name, description: `Films featuring ${p.name}: ${p.filmography.slice(0, 5).map((f) => f.title).join(", ")}.` } : { title: "Person not found" };
}

export default async function PersonPage({ params }: Props) {
  const id = parseId((await params).id);
  const person = id ? await getPerson(id) : null;
  if (!person) notFound();
  const directed = person.filmography.filter((f) => f.role === "director");
  const acted = person.filmography.filter((f) => f.role === "cast");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <div className="w-40 shrink-0"><TmdbImage path={person.profilePath} kind="profile" alt={person.name} sizes="160px" priority className="rounded-2xl ring-1 ring-line" /></div>
        <div>
          <h1 className="text-center font-display text-5xl sm:text-left sm:text-6xl">{person.name}</h1>
          <p className="mt-2 text-center text-muted sm:text-left">{[directed.length && `${directed.length} as director`, acted.length && `${acted.length} as cast`].filter(Boolean).join(" · ")} in our catalogue</p>
        </div>
      </div>
      {directed.length > 0 && <section aria-labelledby="directed" className="mt-12"><h2 id="directed" className="mb-5 font-display text-3xl">Directed</h2><MovieGrid movies={directed} /></section>}
      {acted.length > 0 && <section aria-labelledby="acted" className="mt-12"><h2 id="acted" className="mb-5 font-display text-3xl">Acting</h2><MovieGrid movies={acted} /></section>}
    </div>
  );
}
