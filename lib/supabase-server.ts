// =============================================================================
// SolVerify — lib/supabase-server.ts
// Server-only Supabase clients (RLS-aware anon + service_role bypass)
// =============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _service: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

export function getSupabaseService(): SupabaseClient {
  if (_service) return _service;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Supabase service client not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  _service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}

export function getSupabaseAnon(): SupabaseClient {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Supabase anon client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  _anon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anon;
}
