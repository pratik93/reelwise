import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE = "sid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Read the anonymous session id (never creates one). Returns null if absent/invalid. */
export async function readSession(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  return v && UUID.test(v) ? v : null;
}

/** Read the session id or create it. Only call from route handlers / server actions. */
export async function ensureSession(): Promise<string> {
  const existing = await readSession();
  if (existing) return existing;
  const sid = randomUUID();
  (await cookies()).set(COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return sid;
}
