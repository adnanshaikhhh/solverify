import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { VouchCreate } from "@/lib/validators";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { calculateTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

async function getTokenId(address: string): Promise<string | null> {
  const db = getSupabaseService();
  const { data } = await db.from("tokens").select("id").eq("contract_address", address).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");
    const tokenId = await getTokenId(params.address);
    if (!tokenId) return jsonError("Token not found", 404, "NOT_FOUND");

    const body = await req.json().catch(() => ({}));
    const parsed = VouchCreate.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());

    const db = getSupabaseService();
    const { error } = await db.from("community_vouches").insert({
      token_id: tokenId,
      voucher_wallet: auth.wallet,
      vouch_message: parsed.data.message || null,
    });
    if (error) {
      if (error.code === "23505") {
        return jsonError("Already vouched", 409, "ALREADY_VOUCHED");
      }
      return jsonError("Insert failed", 500, "DB_ERROR");
    }

    // Recount and recalc
    const { count } = await db
      .from("community_vouches")
      .select("id", { count: "exact", head: true })
      .eq("token_id", tokenId);
    await db.from("tokens").update({ community_vouches: count ?? 0 }).eq("id", tokenId);

    const { data: full } = await db.from("tokens").select("*").eq("id", tokenId).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", tokenId);
    }

    return Response.json({ ok: true, count: count ?? 0 });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");
    const tokenId = await getTokenId(params.address);
    if (!tokenId) return jsonError("Not found", 404, "NOT_FOUND");

    const db = getSupabaseService();
    await db
      .from("community_vouches")
      .delete()
      .eq("token_id", tokenId)
      .eq("voucher_wallet", auth.wallet);

    const { count } = await db
      .from("community_vouches")
      .select("id", { count: "exact", head: true })
      .eq("token_id", tokenId);
    await db.from("tokens").update({ community_vouches: count ?? 0 }).eq("id", tokenId);

    const { data: full } = await db.from("tokens").select("*").eq("id", tokenId).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", tokenId);
    }
    return Response.json({ ok: true, count: count ?? 0 });
  } catch (e) {
    return handleError(e);
  }
}
