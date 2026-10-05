import "dotenv/config";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://api.themoviedb.org/3";
const LOG_DIR = join(process.cwd(), "ingestion", "logs");
mkdirSync(LOG_DIR, { recursive: true });

export function log(msg: string, file = "ingestion.log") {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  appendFileSync(join(LOG_DIR, file), line + "\n");
}

const key = process.env.TMDB_API_KEY;
/** Accepts either a v3 API key (query param) or a v4 read token (Bearer). */
function auth(url: URL): RequestInit {
  if (!key) throw new Error("TMDB_API_KEY is not set. Copy .env.example to .env and add your key.");
  if (key.length > 60) return { headers: { Authorization: `Bearer ${key}`, accept: "application/json" } };
  url.searchParams.set("api_key", key);
  return { headers: { accept: "application/json" } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simple global throttle: at most ~MAX_RPS requests per second.
const MAX_RPS = Number(process.env.TMDB_MAX_RPS ?? 25);
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + 1000 / MAX_RPS;
  if (slot > now) await sleep(slot - now);
}

/** GET with throttling, 429 Retry-After handling and exponential backoff. */
export async function tmdb<T>(path: string, params: Record<string, string | number> = {}, attempts = 6): Promise<T | null> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const init = auth(url);
  for (let i = 0; i < attempts; i++) {
    await throttle();
    try {
      const res = await fetch(url, init);
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error("TMDB rejected the API key (401). Check TMDB_API_KEY.");
      if (res.status === 429) {
        const wait = (Number(res.headers.get("retry-after")) || 2 ** i) * 1000;
        log(`429 rate limited on ${path}, waiting ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (String(e).includes("401")) throw e;
      const wait = Math.min(30000, 1000 * 2 ** i) + Math.random() * 500;
      log(`retry ${i + 1}/${attempts} ${path}: ${e}`, "errors.log");
      await sleep(wait);
    }
  }
  log(`FAILED ${path}`, "errors.log");
  throw new Error(`Failed after ${attempts} attempts: ${path}`);
}
