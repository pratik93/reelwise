import { z } from "zod";

export const SORTS = ["relevance", "popularity", "rating", "newest", "oldest", "title", "runtime"] as const;
export type Sort = (typeof SORTS)[number];
export const PAGE_SIZE = 24;

const num = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());

/** Single validated shape for browse/search, used by both the page and the API. */
export const filtersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  genres: z.preprocess(
    (v) => (typeof v === "string" && v ? v.split(",").map(Number) : v),
    z.array(z.number().int().positive()).max(5).optional(),
  ),
  yearMin: num(1870, 2100),
  yearMax: num(1870, 2100),
  ratingMin: num(0, 10),
  runtimeMin: num(0, 1000),
  runtimeMax: num(0, 1000),
  lang: z.string().regex(/^[a-z]{2,3}$/).optional(),
  provider: num(1, 100000),
  sort: z.enum(SORTS).default("relevance"),
  page: z.preprocess((v) => (v === "" || v == null ? 1 : Number(v)), z.number().int().min(1).max(500)).default(1),
});
export type Filters = z.infer<typeof filtersSchema>;

/** Parse untrusted query params; invalid fields are dropped rather than throwing. */
export function parseFilters(input: Record<string, string | string[] | undefined> | URLSearchParams): Filters {
  const obj: Record<string, unknown> = {};
  const entries: [string, string | undefined][] =
    input instanceof URLSearchParams ? [...input.entries()] : Object.entries(input).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]);
  for (const [k, v] of entries) if (v !== undefined && v !== "") obj[k] = v;
  const r = filtersSchema.safeParse(obj);
  if (r.success) return r.data;
  // Retry field by field so one bad param doesn't wipe the others.
  const ok: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (filtersSchema.safeParse({ [k]: v }).success) ok[k] = v;
  return filtersSchema.parse(ok);
}

export function filtersToQuery(f: Partial<Filters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.genres?.length) p.set("genres", f.genres.join(","));
  for (const k of ["yearMin", "yearMax", "ratingMin", "runtimeMin", "runtimeMax", "provider"] as const) if (f[k] != null) p.set(k, String(f[k]));
  if (f.lang) p.set("lang", f.lang);
  if (f.sort && f.sort !== "relevance") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p.toString();
}
