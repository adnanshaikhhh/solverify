import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { MetadataUpdate } from "@/lib/validators";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { calculateTrustScore } from "@/lib/trust-score";
import { scanUrls } from "@/lib/link-scanner";
import { isValidSolanaAddress } from "@/lib/solana";
import { ADMIN_WALLETS } from "@/lib/constants";

export const runtime = "nodejs";

function categoryFor(field: string): "branding" | "social" | "description" | "links" | "other" {
  if (field === "name" || field === "symbol" || field === "logo_url" || field === "banner_url") return "branding";
  if (field === "description") return "description";
  if (["website_url", "twitter_url", "telegram_url", "discord_url", "github_url", "whitepaper_url"].includes(field)) return "social";
  return "other";
}

export async function PUT(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");

    const body = await req.json().catch(() => null);
    const parsed = MetadataUpdate.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());
    }

    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("*")
      .eq("contract_address", params.address)
      .maybeSingle();
    if (!token) return jsonError("Token not found", 404, "NOT_FOUND");

    const isAdmin = ADMIN_WALLETS.includes(auth.wallet);
    if (!isAdmin && token.owner_wallet !== auth.wallet) {
      return jsonError("Not authorized to edit", 403, "FORBIDDEN");
    }

    if (token.claim_status === "suspended") {
      return jsonError("Token suspended", 403, "SUSPENDED");
    }

    const updates: Record<string, unknown> = {};
    const diffs: Array<{ field: string; previous: string | null; next: string | null; category: string }> = [];

    for (const [field, value] of Object.entries(parsed.data)) {
      const prev = (token as any)[field] ?? null;
      const next = (value as string | null | undefined) ?? null;
      if (prev !== next) {
        updates[field] = next;
        diffs.push({ field, previous: prev, next, category: categoryFor(field) });
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: true, message: "no changes" });
    }

    // If any URL field changed, scan them
    const urlFields = ["website_url", "twitter_url", "telegram_url", "discord_url", "github_url", "whitepaper_url"];
    const changedUrls: string[] = [];
    for (const f of urlFields) {
      if (f in updates) changedUrls.push(updates[f] as string);
    }
    const urlScans = changedUrls.length ? await scanUrls(changedUrls) : [];
    const blocked = urlScans.filter((s) => s.verdict === "phishing" || s.verdict === "malware" || s.verdict === "blocked");
    if (blocked.length > 0) {
      // Auto-remove blocked URLs
      for (const b of blocked) {
        for (const f of urlFields) {
          if (updates[f] === b.url) updates[f] = null;
        }
      }
    }

    updates.updated_at = new Date().toISOString();
    const { error: updateErr } = await db
      .from("tokens")
      .update(updates)
      .eq("id", token.id);
    if (updateErr) return jsonError("Update failed", 500, "DB_ERROR");

    // Log diffs
    if (diffs.length > 0) {
      await db.from("metadata_updates").insert(
        diffs.map((d) => ({
          token_id: token.id,
          updated_by: auth.wallet,
          field_name: d.field,
          previous_value: d.previous,
          new_value: d.next,
          update_category: d.category,
        }))
      );
    }

    // Log link scans
    if (urlScans.length > 0) {
      await db.from("link_safety_scans").insert(
        urlScans.map((s) => ({
          token_id: token.id,
          url: s.url,
          scan_result: s.verdict,
          scan_details: s.providers,
        }))
      );
    }

    // Recalculate trust score
    const { data: updated } = await db
      .from("tokens")
      .select("*")
      .eq("id", token.id)
      .single();
    if (updated) {
      const result = calculateTrustScore(updated);
      await db
        .from("tokens")
        .update({ trust_score: result.score, trust_score_breakdown: result.breakdown })
        .eq("id", token.id);
    }

    return Response.json({ ok: true, diffs, blocked: blocked.map((b) => b.url) });
  } catch (e) {
    return handleError(e);
  }
}
