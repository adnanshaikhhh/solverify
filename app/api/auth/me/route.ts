import { NextRequest } from "next/server";
import { readAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await readAuthFromRequest(req);
  if (!auth) {
    return Response.json({ wallet: null, isAdmin: false });
  }
  return Response.json({ wallet: auth.wallet, isAdmin: !!auth.isAdmin });
}
