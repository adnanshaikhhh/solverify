// =============================================================================
// SolVerify — hooks/usePayment.ts
// Tier upgrade payment flow
// =============================================================================

"use client";

import { useCallback, useState } from "react";
import { useUiStore } from "@/store/uiStore";

export function usePayment() {
  const { pushToast } = useUiStore();
  const [pending, setPending] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [solAmount, setSolAmount] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "confirmed" | "failed">("idle");

  const fetchSolPrice = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/sol-price");
      if (res.ok) {
        const data = (await res.json()) as { sol_usd: number };
        setSolPrice(data.sol_usd);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const initiate = useCallback(async (tokenId: string, tier: "silver" | "gold") => {
    setPending(true);
    setStatus("waiting");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_id: tokenId, tier }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Could not start payment");
      }
      const data = (await res.json()) as {
        payment_id: string;
        sol_amount: number;
        expires_at: string;
      };
      setPaymentId(data.payment_id);
      setSolAmount(data.sol_amount);
      setExpiresAt(data.expires_at);
      return data;
    } catch (e) {
      setStatus("failed");
      pushToast({
        kind: "error",
        message: e instanceof Error ? e.message : "Payment init failed",
      });
      return null;
    } finally {
      setPending(false);
    }
  }, [pushToast]);

  const poll = useCallback(async () => {
    if (!paymentId) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`);
      if (res.ok) {
        const data = (await res.json()) as { status: "pending" | "confirmed" | "failed" };
        if (data.status === "confirmed") {
          setStatus("confirmed");
          pushToast({ kind: "success", message: "Payment confirmed — tier upgraded!" });
        } else if (data.status === "failed") {
          setStatus("failed");
          pushToast({ kind: "error", message: "Payment failed" });
        }
        return data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [paymentId, pushToast]);

  return {
    pending,
    paymentId,
    solAmount,
    solPrice,
    expiresAt,
    status,
    fetchSolPrice,
    initiate,
    poll,
  };
}
