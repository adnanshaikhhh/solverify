"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface TrustGradeHistoryProps {
  address: string;
}

interface HistoryPoint {
  score: number;
  at: string;
  reason: string;
}

export function TrustGradeHistory({ address }: TrustGradeHistoryProps) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/trust/${address}/history`);
        if (res.ok) {
          const j = (await res.json()) as { history: HistoryPoint[] };
          if (!cancelled) setData(j.history);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  return (
    <GlassCard>
      <h3 className="mb-4 text-lg font-semibold">Score History</h3>
      {loading ? (
        <div className="flex h-64 items-center justify-center text-text-muted">Loading...</div>
      ) : data.length < 2 ? (
        <div className="flex h-64 items-center justify-center text-text-muted">
          Not enough history yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
            <XAxis
              dataKey="at"
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              tickFormatter={(v) => new Date(v).toLocaleDateString()}
            />
            <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#0D0D14",
                border: "1px solid #1E1E2E",
                borderRadius: 8,
                color: "#F1F5F9",
              }}
              labelFormatter={(v) => new Date(v as string).toLocaleString()}
            />
            <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}
