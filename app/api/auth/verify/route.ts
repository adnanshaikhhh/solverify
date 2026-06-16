import { NextRequest } from "next/server";
import { VerifyRequest } from "@/lib/validators";
import { verifyWalletSignature, issueJwt, AUTH_COOKIE } from "@/lib/auth";
import { getSupabaseService } from "@/lib/supabase-server";
import { ADMIN_WALLETS } from "@/lib/constants";
import { jsonError, handleError } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = VerifyRequest.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());
    }
    const { wallet, signature, nonce } = parsed.data;
    const result = verifyWalletSignature(wallet, signature, nonce);
    if (!result.ok) {
      return jsonError(result.reason, 401, "SIGNATURE_INVALID");
    }
    const isAdmin = ADMIN_WALLETS.includes(wallet);
    const token = await issueJwt(wallet, isAdmin);

    const res = Response.json({ ok: true, wallet, isAdmin });
    res.headers.append(
      "Set-Cookie",
      `${AUTH_COOKIE}=${token}; Path=/; Max-Age=${60 * 60 * 24}; HttpOnly; SameSite=Lax; Secure`
    );
    return res;
  } catch (e) {
    return handleError(e);
  }
}
