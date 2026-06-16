// =============================================================================
// SolVerify — hooks/useWallet.ts
// Wallet adapter glue + auth challenge/verify
// =============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toBase58: () => string };
      signMessage: (msg: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      disconnect: () => Promise<void>;
    };
    backpack?: {
      isBackpack?: boolean;
      publicKey?: { toBase58: () => string };
      signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      disconnect: () => Promise<void>;
    };
    solflare?: {
      isSolflare?: boolean;
      publicKey?: { toBase58: () => string };
      signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      disconnect: () => Promise<void>;
    };
  }
}

export type WalletKind = "phantom" | "backpack" | "solflare" | null;

export interface ConnectedWallet {
  kind: WalletKind;
  publicKey: string;
}

function getProvider(kind: WalletKind): any {
  if (typeof window === "undefined") return null;
  if (kind === "phantom") return window.solana?.isPhantom ? window.solana : null;
  if (kind === "backpack") return window.backpack?.isBackpack ? window.backpack : null;
  if (kind === "solflare") return window.solflare?.isSolflare ? window.solflare : null;
  return null;
}

function detectWallet(): WalletKind {
  if (typeof window === "undefined") return null;
  if (window.solana?.isPhantom) return "phantom";
  if (window.backpack?.isBackpack) return "backpack";
  if (window.solflare?.isSolflare) return "solflare";
  return null;
}

export function useWallet() {
  const { wallet, isAdmin, ready, setAuth, clearAuth } = useAuthStore();
  const { pushToast } = useUiStore();
  const [detected, setDetected] = useState<WalletKind>(null);
  const [connecting, setConnecting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    setDetected(detectWallet());
  }, []);

  const isConnected = Boolean(wallet);

  const connect = useCallback(async (kind?: WalletKind): Promise<ConnectedWallet | null> => {
    const k = kind ?? detected ?? detectWallet();
    if (!k) {
      pushToast({ kind: "warning", message: "No Solana wallet detected. Install Phantom, Backpack, or Solflare." });
      return null;
    }
    const provider = getProvider(k);
    if (!provider) {
      pushToast({ kind: "warning", message: `${k} wallet not available` });
      return null;
    }
    setConnecting(true);
    try {
      const res = await provider.connect();
      const publicKey = res.publicKey.toBase58();
      return { kind: k, publicKey };
    } catch (e) {
      console.error("connect failed", e);
      pushToast({ kind: "error", message: "Wallet connection failed" });
      return null;
    } finally {
      setConnecting(false);
    }
  }, [detected, pushToast]);

  const signIn = useCallback(async (connected?: ConnectedWallet): Promise<boolean> => {
    const c = connected ?? (wallet ? { kind: detected, publicKey: wallet } : null);
    if (!c) {
      pushToast({ kind: "warning", message: "Connect your wallet first" });
      return false;
    }
    const provider = getProvider(c.kind);
    if (!provider) {
      pushToast({ kind: "error", message: "Wallet provider missing" });
      return false;
    }
    setSigningIn(true);
    try {
      // 1) Request challenge
      const chRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: c.publicKey }),
      });
      if (!chRes.ok) {
        const j = (await chRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Challenge failed");
      }
      const { message, nonce } = (await chRes.json()) as { message: string; nonce: string };

      // 2) Sign
      const encoded = new TextEncoder().encode(message);
      const sig = await provider.signMessage(encoded, "utf8");
      const bs58 = (await import("bs58")).default;
      const signature = bs58.encode(sig.signature);

      // 3) Verify
      const vRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: c.publicKey, signature, nonce }),
      });
      if (!vRes.ok) {
        const j = (await vRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Verification failed");
      }
      const { isAdmin: a } = (await vRes.json()) as { isAdmin: boolean };
      setAuth(c.publicKey, a);
      pushToast({ kind: "success", message: "Signed in" });
      return true;
    } catch (e) {
      console.error("signIn error", e);
      pushToast({
        kind: "error",
        message: e instanceof Error ? e.message : "Sign-in failed",
      });
      return false;
    } finally {
      setSigningIn(false);
    }
  }, [wallet, detected, pushToast, setAuth]);

  const disconnect = useCallback(async () => {
    try {
      const provider = getProvider(detected);
      if (provider?.disconnect) await provider.disconnect();
    } catch (e) {
      console.error("disconnect error", e);
    }
    // Call server to clear cookie
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    clearAuth();
    pushToast({ kind: "info", message: "Disconnected" });
  }, [detected, pushToast, clearAuth]);

  // On mount, check existing session via /api/auth/me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (!cancelled) setAuth("", false);
          return;
        }
        const data = (await res.json()) as { wallet: string | null; isAdmin: boolean };
        if (cancelled) return;
        if (data.wallet) setAuth(data.wallet, data.isAdmin);
        else setAuth("", false);
      } catch {
        if (!cancelled) setAuth("", false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      wallet,
      isAdmin,
      ready,
      isConnected,
      detected,
      connecting,
      signingIn,
      connect,
      signIn,
      disconnect,
    }),
    [wallet, isAdmin, ready, isConnected, detected, connecting, signingIn, connect, signIn, disconnect]
  );
}
