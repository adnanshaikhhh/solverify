import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { CRON_SECRET } from "@/lib/constants";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (isVercelCron) return true;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  try {
    const db = getSupabaseService();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stale } = await db
      .from("ownership_claims")
      .select("id, token_id")
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .limit(200);
    let count = 0;
    for (const c of stale ?? []) {
      await db.from("ownership_claims").update({ status: "rejected", rejection_reason: "Expired after 7 days" }).eq("id", c.id);
      // Reset token to unclaimed if it was pending only
      await db.from("tokens").update({ claim_status: "unclaimed" }).eq("id", c.token_id).eq("claim_status", "pending");
      count += 1;
    }
    return Response.json({ success: true, processed: (stale ?? []).length, expired: count });
  } catch (e) {
    return handleError(e);
  }
}
