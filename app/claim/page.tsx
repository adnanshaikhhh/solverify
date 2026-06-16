"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ClaimWizard } from "@/components/verification/ClaimWizard";

function ClaimPageInner() {
  const sp = useSearchParams();
  const address = sp.get("address") || "";
  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Claim your Solana token</h1>
        <p className="mt-2 text-text-secondary">
          Verify ownership with your wallet signature. Free Bronze tier, or upgrade to Silver / Gold.
        </p>
      </div>
      <ClaimWizard initialAddress={address} />
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading...</div>}>
      <ClaimPageInner />
    </Suspense>
  );
}
