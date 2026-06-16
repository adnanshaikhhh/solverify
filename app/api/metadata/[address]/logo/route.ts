import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { ADMIN_WALLETS } from "@/lib/constants";

export const runtime = "nodejs";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");

    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens").select("id, owner_wallet").eq("contract_address", params.address).maybeSingle();
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");
    if (!ADMIN_WALLETS.includes(auth.wallet) && token.owner_wallet !== auth.wallet) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("file required", 400, "NO_FILE");
    if (!ALLOWED.has(file.type)) return jsonError("Unsupported type", 400, "BAD_MIME");
    if (file.size > MAX_LOGO_BYTES) return jsonError("File too large (5MB max)", 400, "TOO_LARGE");

    const ext = file.name.split(".").pop() || "png";
    const path = `${token.id}/logo-${Date.now()}.${ext}`;

    const buf = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await db.storage
      .from("token-assets")
      .upload(path, buf, { contentType: file.type, upsert: true });
    if (upErr) {
      console.error("[logo upload]", upErr);
      return jsonError("Upload failed", 500, "STORAGE_ERROR");
    }
    const { data: pub } = db.storage.from("token-assets").getPublicUrl(path);
    await db.from("tokens").update({ logo_url: pub.publicUrl }).eq("id", token.id);
    return Response.json({ ok: true, url: pub.publicUrl });
  } catch (e) {
    return handleError(e);
  }
}
