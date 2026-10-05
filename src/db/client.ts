import { createClient, type Client } from "@libsql/client";

// One client per process. Locally this is a file DB; in production set
// DATABASE_URL to a Turso (libSQL) URL plus DATABASE_AUTH_TOKEN.
const globalForDb = globalThis as unknown as { __libsql?: Client };

export const db: Client =
  globalForDb.__libsql ??
  createClient({
    url: process.env.DATABASE_URL ?? "file:./data/movies.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__libsql = db;
