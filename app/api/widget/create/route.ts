import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { WidgetCreate } from "@/lib/validators";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");
    const body = await req.json().catch(() => null);
    const parsed = WidgetCreate.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());

    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("id, owner_wallet, verification_tier")
      .eq("id", parsed.data.token_id)
      .maybeSingle();
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");
    if (token.owner_wallet !== auth.wallet) return jsonError("Not the owner", 403, "FORBIDDEN");
    if (token.verification_tier !== "gold") {
      return jsonError("Gold tier required for embed widgets", 403, "TIER_REQUIRED");
    }
    const { data, error } = await db
      .from("embed_widgets")
      .insert({ token_id: parsed.data.token_id, style: parsed.data.style })
      .select("id, widget_key, style")
      .single();
    if (error || !data) return jsonError("Insert failed", 500, "DB_ERROR");
    return Response.json({ ok: true, widget: data });
  } catch (e) {
    return handleError(e);
  }
}
