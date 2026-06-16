import type { Metadata } from "next";

export const metadata: Metadata = { title: "Claim Token" };

import { ClaimWizard } from "@/components/verification/ClaimWizard";

export default function ClaimPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Claim your Solana token</h1>
        <p className="mt-2 text-text-secondary">
          Verify ownership with your wallet signature. Free Bronze tier, or upgrade to Silver / Gold.
        </p>
      </div>
      <ClaimWizard />
    </div>
  );
}
