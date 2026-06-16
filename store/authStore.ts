// =============================================================================
// SolVerify — store/authStore.ts
// Wallet auth state (client-side)
// =============================================================================

"use client";

import { create } from "zustand";

export interface AuthState {
  wallet: string | null;
  isAdmin: boolean;
  ready: boolean;
  setAuth: (wallet: string, isAdmin: boolean) => void;
  clearAuth: () => void;
  setReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  wallet: null,
  isAdmin: false,
  ready: false,
  setAuth: (wallet, isAdmin) => set({ wallet, isAdmin, ready: true }),
  clearAuth: () => set({ wallet: null, isAdmin: false, ready: true }),
  setReady: (ready) => set({ ready }),
}));
