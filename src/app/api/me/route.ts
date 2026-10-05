import { NextResponse } from "next/server";
import { getUserState } from "@/lib/queries";
import { readSession } from "@/lib/session";

export async function GET() {
  const sid = await readSession();
  const state = sid ? await getUserState(sid) : { watchlist: [], ratings: {} };
  return NextResponse.json(state, { headers: { "Cache-Control": "private, no-store" } });
}
