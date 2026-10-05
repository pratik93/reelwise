import "dotenv/config";
import { createClient, type InStatement } from "@libsql/client";
import { buildIndex, explainSimilarity, topSimilar, type SimilarityInput } from "../src/lib/reco/similarity";
import { log } from "./lib/tmdb";

/** Step 4: precompute top-20 similar movies for every movie into similar_movies. */
async function main() {
  const db = createClient({ url: process.env.DATABASE_URL ?? "file:./data/movies.db", authToken: process.env.DATABASE_AUTH_TOKEN });
  const [movies, genres, kws, credits] = await Promise.all([
    db.execute("SELECT id,title,overview FROM movies ORDER BY id"),
    db.execute("SELECT mg.movie_id m, g.name n FROM movie_genres mg JOIN genres g ON g.id=mg.genre_id"),
    db.execute("SELECT mk.movie_id m, k.name n FROM movie_keywords mk JOIN keywords k ON k.id=mk.keyword_id"),
    db.execute("SELECT c.movie_id m, c.role r, p.id pid, p.name n FROM credits c JOIN people p ON p.id=c.person_id ORDER BY c.position"),
  ]);
  const inputs = new Map<number, SimilarityInput>();
  for (const r of movies.rows)
    inputs.set(Number(r.id), { id: Number(r.id), title: String(r.title), overview: String(r.overview), genres: [], keywords: [], directors: [], cast: [] });
  for (const r of genres.rows) inputs.get(Number(r.m))?.genres.push(String(r.n));
  for (const r of kws.rows) inputs.get(Number(r.m))?.keywords.push(String(r.n));
  for (const r of credits.rows) {
    const p = { id: Number(r.pid), name: String(r.n) };
    inputs.get(Number(r.m))?.[r.r === "director" ? "directors" : "cast"].push(p);
  }
  const list = [...inputs.values()];
  log(`similarity: indexing ${list.length} movies`);
  const index = buildIndex(list);

  await db.execute("DELETE FROM similar_movies");
  let stmts: InStatement[] = [];
  for (let i = 0; i < list.length; i++) {
    for (const { index: j, score } of topSimilar(index, i, 20)) {
      // Reason is written from the *recommended* movie's perspective: why j resembles i.
      stmts.push({
        sql: "INSERT INTO similar_movies(movie_id,similar_id,score,reason) VALUES(?,?,?,?)",
        args: [list[i].id, list[j].id, score, explainSimilarity(list[i], list[j])],
      });
    }
    if (stmts.length >= 2000 || i === list.length - 1) {
      await db.batch(stmts, "write");
      stmts = [];
      if (i % 1000 < 100) log(`similarity: ${i + 1}/${list.length}`);
    }
  }
  log("similarity complete");
}
main().catch((e) => { console.error(e); process.exit(1); });
