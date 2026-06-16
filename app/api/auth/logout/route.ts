import { AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
  );
  return res;
}
