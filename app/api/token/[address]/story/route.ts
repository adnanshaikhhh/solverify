// =============================================================================
// app/api/token/[address]/story/route.ts
// Aggregates SolVerify DB events into a token story timeline
// =============================================================================

import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StoryEvent {
  id: string;
  type: string;
  label: string;
  actor: string | null;
  at: string;
  detail: string;
}

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("id, name, created_at, claim_status, verification_tier, owner_wallet, updated_at")
      .eq("contract_address", params.address)
      .maybeSingle();
    if (!token) return Response.json({ events: [] });

    const [updates, claims, vouches, scans, payments] = await Promise.all([
      db.from("metadata_updates").select("id, field_name, updated_by, created_at, previous_value, new_value").eq("token_id", token.id).order("created_at", { ascending: false }).limit(50),
      db.from("ownership_claims").select("id, claimer_wallet, claim_method, status, created_at, verified_at").eq("token_id", token.id).order("created_at", { ascending: false }).limit(10),
      db.from("community_vouches").select("id, voucher_wallet, created_at").eq("token_id", token.id).order("created_at", { ascending: false }).limit(5),
      db.from("link_safety_scans").select("id, url, scan_result, scanned_at").eq("token_id", token.id).order("scanned_at", { ascending: false }).limit(5),
      db.from("payments").select("id, payer_wallet, tier_requested, status, created_at, confirmed_at").eq("token_id", token.id).order("created_at", { ascending: false }).limit(5),
    ]);

    const events: StoryEvent[] = [];

    // First appearance
    events.push({
      id: `first-${token.id}`,
      type: "first_seen",
      label: `${token.name || "Token"} indexed by SolVerify`,
      actor: null,
      at: token.created_at,
      detail: `First indexed on SolVerify. Initial status: ${token.claim_status || "unclaimed"}.`,
    });

    // Claim events
    for (const c of (claims.data as any[]) || []) {
      events.push({
        id: c.id,
        type: "claim",
        label: c.status === "approved" ? `Ownership claim approved` : c.status === "rejected" ? `Ownership claim rejected` : `Ownership claim submitted`,
        actor: c.claimer_wallet,
        at: c.verified_at || c.created_at,
        detail: `Method: ${c.claim_method || "n/a"}`,
      });
    }

    // Payment events
    for (const p of (payments.data as any[]) || []) {
      if (p.status === "confirmed") {
        events.push({
          id: p.id,
          type: "tier_upgrade",
          label: `Upgraded to ${p.tier_requested} tier`,
          actor: p.payer_wallet,
          at: p.confirmed_at || p.created_at,
          detail: `Tier upgrade payment confirmed`,
        });
      }
    }

    // Vouch events (only first 5)
    for (const v of (vouches.data as any[]) || []) {
      events.push({
        id: v.id,
        type: "vouch",
        label: `Community vouch`,
        actor: v.voucher_wallet,
        at: v.created_at,
        detail: `Added to community trust signals`,
      });
    }

    // Link safety scans
    for (const s of (scans.data as any[]) || []) {
      events.push({
        id: s.id,
        type: "link_scan",
        label: `Link scanned: ${s.scan_result}`,
        actor: "SolVerify",
        at: s.scanned_at,
        detail: `${s.url.slice(0, 60)}…`,
      });
    }

    // Metadata updates
    for (const u of (updates.data as any[]) || []) {
      events.push({
        id: u.id,
        type: "metadata_update",
        label: `Metadata updated: ${u.field_name}`,
        actor: u.updated_by,
        at: u.created_at,
        detail: u.previous_value && u.new_value ? `"${u.previous_value.slice(0, 30)}" → "${u.new_value.slice(0, 30)}"` : `Field changed`,
      });
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    events.splice(50); // limit

    return Response.json({ events });
  } catch (e) {
    return handleError(e);
  }
}
