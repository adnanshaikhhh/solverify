// =============================================================================
// SolVerify — hooks/useAdmin.ts
// Admin-only data fetches
// =============================================================================

"use client";

import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

export function useAdminClaims(status: "pending" | "all" = "pending") {
  const url = status === "all" ? "/api/admin/claims" : "/api/admin/claims?status=pending";
  return useSWR<{ claims: any[] }>(url, fetcher);
}

export function useAdminReports(status: "pending" | "all" = "pending") {
  const url = status === "all" ? "/api/admin/reports" : "/api/admin/reports?status=pending";
  return useSWR<{ reports: any[] }>(url, fetcher);
}

export function useAdminStats() {
  return useSWR<{ stats: Record<string, number | string> }>("/api/admin/stats", fetcher);
}
