import { NextResponse, type NextRequest } from "next/server";
import { bad, limited } from "@/lib/api";
import { parseFilters } from "@/lib/filters";
import { searchMovies } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const rl = limited(req, "search", 120);
  if (rl) return rl;
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    return NextResponse.json(await searchMovies(filters));
  } catch {
    return bad("Search failed", 500);
  }
}
