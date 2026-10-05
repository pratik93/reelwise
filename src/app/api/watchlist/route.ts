import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, limited, sameOrigin } from "@/lib/api";
import { setWatchlist } from "@/lib/queries";
import { ensureSession } from "@/lib/session";

const body = z.object({ movieId: z.number().int().positive(), add: z.boolean() });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return bad("Bad origin", 403);
  const rl = limited(req, "watchlist", 60);
  if (rl) return rl;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Invalid request");
  await setWatchlist(await ensureSession(), parsed.data.movieId, parsed.data.add);
  return NextResponse.json({ ok: true });
}
