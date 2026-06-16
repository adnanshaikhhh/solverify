// =============================================================================
// SolVerify — lib/auth.ts
// Wallet signature auth: challenge, verify, JWT issuance
// =============================================================================

import { SignJWT, jwtVerify } from "jose";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { JWT_SECRET } from "./constants";
import { cookies } from "next/headers";
import { jsonError } from "./utils";

const ALG = "HS256";
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 min

function secretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface Challenge {
  nonce: string;
  message: string;
  expiresAt: number;
}

// In-memory nonce store (works on Vercel Edge, single-region)
const nonces = new Map<string, { nonce: string; message: string; expiresAt: number; createdAt: number }>();

// Periodic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of nonces) {
      if (v.expiresAt < now) nonces.delete(k);
    }
  }, 60_000).unref?.();
}

function makeId(): string {
  // RFC4122 v4 using crypto
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createChallenge(wallet: string): Challenge {
  const nonce = makeId();
  const ts = Math.floor(Date.now() / 1000);
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const message =
    `Welcome to SolVerify!\n\n` +
    `Sign this message to authenticate your wallet.\n` +
    `This is a free off-chain signature — no SOL will be spent.\n\n` +
    `Wallet: ${wallet}\n` +
    `Nonce: ${nonce}\n` +
    `Timestamp: ${ts}\n` +
    `Expires: ${new Date(expiresAt).toISOString()}`;

  nonces.set(nonce, { nonce, message, expiresAt, createdAt: Date.now() });
  return { nonce, message, expiresAt };
}

export function consumeNonce(nonce: string): { message: string; wallet: string } | null {
  const entry = nonces.get(nonce);
  if (!entry) return null;
  nonces.delete(nonce);
  if (entry.expiresAt < Date.now()) return null;
  return { message: entry.message, wallet: extractWalletFromMessage(entry.message) };
}

function extractWalletFromMessage(message: string): string {
  const m = message.match(/Wallet:\s*([1-9A-HJ-NP-Za-km-z]+)/);
  return m ? m[1] : "";
}

// =============================================================================
// Verify a wallet signature against a stored nonce/message
// =============================================================================
export function verifyWalletSignature(
  wallet: string,
  signature: string,
  nonce: string
): { ok: true } | { ok: false; reason: string } {
  const stored = consumeNonce(nonce);
  if (!stored) return { ok: false, reason: "Nonce expired or unknown" };
  if (stored.wallet !== wallet) return { ok: false, reason: "Wallet mismatch" };

  try {
    const messageBytes = new TextEncoder().encode(stored.message);
    const sigBytes = bs58.decode(signature);
    const pubkeyBytes = bs58.decode(wallet);

    if (sigBytes.length !== 64) return { ok: false, reason: "Invalid signature length" };
    if (pubkeyBytes.length !== 32) return { ok: false, reason: "Invalid wallet public key length" };

    const ok = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
    return ok ? { ok: true } : { ok: false, reason: "Signature verification failed" };
  } catch (e) {
    console.error("[verifyWalletSignature] error", e);
    return { ok: false, reason: "Signature verification error" };
  }
}

// =============================================================================
// JWT issuance + verification
// =============================================================================
export interface AuthPayload {
  wallet: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export async function issueJwt(wallet: string, isAdmin = false): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ wallet, isAdmin })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime("24h")
    .setSubject(wallet)
    .sign(secretKey());
}

export async function verifyJwt(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "solverify_session";

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=${token}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax; Secure`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

// Server-side helpers
export async function readAuthFromRequest(req: Request): Promise<AuthPayload | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  if (!m) return null;
  return verifyJwt(m[1]);
}

export async function requireAuth(req: Request) {
  const auth = await readAuthFromRequest(req);
  if (!auth) {
    return { auth: null, error: jsonError("Authentication required", 401, "UNAUTHENTICATED") };
  }
  return { auth, error: null };
}

export async function requireAdmin(req: Request) {
  const { auth, error } = await requireAuth(req);
  if (error) return { auth: null, error };
  if (!auth?.isAdmin) {
    return { auth: null, error: jsonError("Admin only", 403, "FORBIDDEN") };
  }
  return { auth, error: null };
}

// Server Component helper
export async function getServerAuth(): Promise<AuthPayload | null> {
  const c = cookies();
  const token = c.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyJwt(token);
}
