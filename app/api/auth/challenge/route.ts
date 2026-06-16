import { NextRequest } from "next/server";
import { ChallengeRequest } from "@/lib/validators";
import { createChallenge } from "@/lib/auth";
import { jsonError, handleError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = ChallengeRequest.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());
    }
    const ch = createChallenge(parsed.data.wallet);
    return Response.json(ch);
  } catch (e) {
    return handleError(e);
  }
}
