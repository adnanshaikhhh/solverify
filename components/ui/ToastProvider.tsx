"use client";

import { useUiStore } from "@/store/uiStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const KIND_COLOR = {
  info: "text-trusted border-trusted/40",
  success: "text-safu border-safu/40",
  warning: "text-caution border-caution/40",
  error: "text-danger border-danger/40",
};

export function ToastProvider() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = KIND_ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={cn(
                "pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border bg-bg-card/95 p-4 shadow-2xl backdrop-blur-xl",
                KIND_COLOR[t.kind]
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="flex-1 text-sm text-text-primary">{t.message}</div>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-text-muted hover:text-text-primary"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
