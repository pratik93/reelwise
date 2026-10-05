import type { MetadataRoute } from "next";
import { getAllMovieIds } from "@/lib/queries";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const movies = await getAllMovieIds(45000); // sitemap limit is 50k URLs
  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/quiz`, priority: 0.6 },
    { url: `${SITE}/about`, priority: 0.3 },
    ...movies.map((m) => ({ url: `${SITE}/movie/${m.id}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
