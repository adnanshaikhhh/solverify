// =============================================================================
// SolVerify — store/uiStore.ts
// Global UI state (modals, toasts, etc.)
// =============================================================================

"use client";

import { create } from "zustand";

export type ToastKind = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs?: number;
}

export interface UiState {
  // Toasts
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  // Generic modals
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2, 10);
    set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
    const duration = t.durationMs ?? 4000;
    if (typeof window !== "undefined") {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
