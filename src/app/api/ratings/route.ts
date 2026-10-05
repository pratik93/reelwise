import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, limited, sameOrigin } from "@/lib/api";
import { setRating } from "@/lib/queries";
import { ensureSession } from "@/lib/session";

// rating: 1-10, or null to clear it
const body = z.object({ movieId: z.number().int().positive(), rating: z.number().int().min(1).max(10).nullable() });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return bad("Bad origin", 403);
  const rl = limited(req, "ratings", 60);
  if (rl) return rl;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Invalid request");
  await setRating(await ensureSession(), parsed.data.movieId, parsed.data.rating);
  return NextResponse.json({ ok: true });
}
