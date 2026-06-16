"use client";

import { formatDistanceToNow } from "date-fns";
import { GlassCard } from "@/components/ui/GlassCard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { Edit2, GitBranch, Plus, Trash2, AlertCircle } from "lucide-react";

interface Update {
  id: string;
  updated_by: string;
  field_name: string;
  previous_value: string | null;
  new_value: string | null;
  update_category: string;
  created_at: string;
}

interface UpdateTimelineProps {
  updates: Update[];
}

const ICON_BY_CAT = {
  branding: Edit2,
  social: GitBranch,
  description: Edit2,
  links: GitBranch,
  other: Plus,
};

export function UpdateTimeline({ updates }: UpdateTimelineProps) {
  if (updates.length === 0) {
    return (
      <GlassCard>
        <p className="text-text-secondary">No updates yet.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="!p-0">
      <ol className="relative space-y-4 p-5">
        {updates.map((u, i) => {
          const Icon = ICON_BY_CAT[u.update_category as keyof typeof ICON_BY_CAT] || Edit2;
          return (
            <li key={u.id} className="relative flex gap-3 pl-1">
              {/* vertical line */}
              {i !== updates.length - 1 && (
                <span className="absolute left-4 top-8 h-[calc(100%+1rem)] w-px bg-border-subtle" />
              )}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated">
                <Icon className="h-3.5 w-3.5 text-text-secondary" />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium text-text-primary">{u.field_name}</span>
                    <span className="ml-2 text-xs uppercase tracking-wide text-text-muted">{u.update_category}</span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="mt-1 text-sm">
                  {u.previous_value && (
                    <span className="text-danger/80 line-through">{truncate(u.previous_value)}</span>
                  )}
                  {u.previous_value && u.new_value && <span className="mx-2 text-text-muted">→</span>}
                  {u.new_value ? (
                    <span className="text-safu">{truncate(u.new_value)}</span>
                  ) : (
                    <span className="text-caution italic">cleared</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  by <AddressDisplay address={u.updated_by} truncate showCopy={false} showExplorer={false} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </GlassCard>
  );
}

function truncate(s: string, n = 80) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
