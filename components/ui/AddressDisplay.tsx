"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn, truncateAddress, solscanUrl } from "@/lib/utils";

interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
  link?: string;
}

export function AddressDisplay({
  address,
  truncate = true,
  showCopy = true,
  showExplorer = true,
  className,
  link,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  const display = truncate ? truncateAddress(address) : address;
  const href = link ?? solscanUrl("address", address);

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm", className)}>
      <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-text-secondary">
        {display}
      </span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Copy address"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-safu" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      {showExplorer && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="View on Solscan"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
