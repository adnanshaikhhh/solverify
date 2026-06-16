import { notFound } from "next/navigation";
import { isValidSolanaAddress } from "@/lib/solana";
import { TokenTabs } from "@/components/token/TokenTabs";

async function fetchToken(address: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/tokens/${address}`,
    { cache: "no-store" }
  ).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json())?.token ?? null;
}

export default async function TokenPage({ params }: { params: { address: string } }) {
  if (!isValidSolanaAddress(params.address)) notFound();
  const token = await fetchToken(params.address);
  if (!token) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Token not found</h1>
        <p className="mt-2 text-text-secondary">No token with address {params.address} is indexed yet.</p>
      </div>
    );
  }
  return <TokenTabs address={params.address} initialToken={token} />;
}
