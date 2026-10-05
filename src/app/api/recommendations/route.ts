import { NextResponse, type NextRequest } from "next/server";
import { limited } from "@/lib/api";
import { getPersonalised } from "@/lib/queries";
import { readSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const rl = limited(req, "reco", 60);
  if (rl) return rl;
  const sid = await readSession();
  const result = await getPersonalised(sid ?? "", 20); // empty sid -> no history -> cold-start fallback
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
