"use client";

import { TokenCard, type TokenCardData } from "./TokenCard";
import { TokenCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { motion } from "framer-motion";

interface TokenGridProps {
  tokens: TokenCardData[];
  loading?: boolean;
  emptyMessage?: string;
}

export function TokenGrid({ tokens, loading, emptyMessage = "No tokens found." }: TokenGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TokenCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle bg-bg-card/40 p-12 text-center">
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tokens.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3, ease: "easeOut" }}
        >
          <TokenCard token={t} />
        </motion.div>
      ))}
    </div>
  );
}
