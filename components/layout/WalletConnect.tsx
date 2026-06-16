"use client";

import { useWallet } from "@/hooks/useWallet";
import { cn, truncateAddress } from "@/lib/utils";
import { Wallet, LogOut } from "lucide-react";

export function WalletConnect() {
  const { wallet, isConnected, connecting, signingIn, signIn, disconnect } = useWallet();

  if (isConnected && wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded-xl border border-border-active bg-bg-elevated px-3 py-1.5 text-sm font-mono text-text-primary">
          {truncateAddress(wallet, 4, 4)}
        </div>
        <button
          onClick={() => disconnect()}
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-danger"
          aria-label="Disconnect"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      disabled={connecting || signingIn}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
        "bg-brand text-white hover:bg-brand-hover active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <Wallet className="h-4 w-4" />
      {connecting ? "Connecting..." : signingIn ? "Signing..." : "Connect Wallet"}
    </button>
  );
}
