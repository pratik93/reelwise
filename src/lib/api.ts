import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "./rate-limit";

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

/** Returns a 429 response if the caller exceeded `limit` requests/minute on this route, else null. */
export function limited(req: NextRequest, route: string, limit: number): NextResponse | null {
  const r = rateLimit(`${route}:${clientIp(req)}`, limit);
  return r.ok ? null : NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
}

/** Same-origin check for state-changing requests (CSRF defence in depth on top of SameSite=Lax). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === req.nextUrl.origin;
}

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
