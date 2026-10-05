import { NextResponse, type NextRequest } from "next/server";
import { limited } from "@/lib/api";
import { suggest } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const rl = limited(req, "suggest", 180);
  if (rl) return rl;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ items: [] });
  try {
    return NextResponse.json({ items: await suggest(q) }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
