/**
 * Small fixed-window, in-memory rate limiter. Good enough for a single server and as a
 * best-effort guard on serverless (each instance keeps its own counters). For strict
 * limits across instances, swap the Map for Upstash Redis / Vercel KV.
 */
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  cur.count++;
  return { ok: cur.count <= limit, retryAfter: Math.ceil((cur.reset - now) / 1000) };
}
