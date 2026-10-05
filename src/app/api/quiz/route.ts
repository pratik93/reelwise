import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, limited, sameOrigin } from "@/lib/api";
import { runQuiz } from "@/lib/queries";

const body = z.object({
  mood: z.enum(["happy", "thrilled", "thoughtful", "scared", "romantic", "adventurous"]),
  time: z.enum(["short", "normal", "long"]),
  appetite: z.enum(["familiar", "any", "surprise"]),
  era: z.enum(["new", "any", "classic"]),
  exclude: z.array(z.number().int().positive()).max(100).optional(),
});

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return bad("Bad origin", 403);
  const rl = limited(req, "quiz", 30);
  if (rl) return rl;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Invalid answers");
  const { exclude, ...answers } = parsed.data;
  return NextResponse.json({ items: await runQuiz(answers, exclude) });
}
