"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface UserCtx {
  ready: boolean;
  watchlist: Set<number>;
  ratings: Record<number, number>;
  toggleWatchlist: (id: number) => Promise<void>;
  rate: (id: number, rating: number | null) => Promise<void>;
}
const Ctx = createContext<UserCtx | null>(null);

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
}

/** Loads the anonymous session's watchlist/ratings once and applies changes optimistically. */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());
  const [ratings, setRatings] = useState<Record<number, number>>({});

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { watchlist: number[]; ratings: Record<number, number> }) => {
        if (!alive) return;
        setWatchlist(new Set(d.watchlist));
        setRatings(d.ratings);
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  const toggleWatchlist = useCallback(async (id: number) => {
    const add = !watchlist.has(id);
    const apply = (on: boolean) => setWatchlist((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
    apply(add);
    try { await post("/api/watchlist", { movieId: id, add }); } catch { apply(!add); }
  }, [watchlist]);

  const rate = useCallback(async (id: number, rating: number | null) => {
    const prev = ratings[id] ?? null;
    const apply = (v: number | null) => setRatings((r) => { const n = { ...r }; if (v == null) delete n[id]; else n[id] = v; return n; });
    apply(rating);
    try { await post("/api/ratings", { movieId: id, rating }); } catch { apply(prev); }
  }, [ratings]);

  const value = useMemo(() => ({ ready, watchlist, ratings, toggleWatchlist, rate }), [ready, watchlist, ratings, toggleWatchlist, rate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): UserCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUser must be used inside UserProvider");
  return c;
}
