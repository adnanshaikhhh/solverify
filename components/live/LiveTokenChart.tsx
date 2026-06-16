"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

declare global {
  interface Window {
    LightweightCharts?: any;
  }
}

const SCRIPT_SRC = "https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js";

let _loaded = false;
let _loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (_loaded) return Promise.resolve();
  if (_loading) return _loading;
  _loading = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("No document"));
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      _loaded = true;
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => { _loaded = true; resolve(); };
    s.onerror = () => reject(new Error("Failed to load chart library"));
    document.head.appendChild(s);
  });
  return _loading;
}

interface LiveTokenChartProps {
  address: string;
  days?: number;
}

export function LiveTokenChart({ address, days = 7 }: LiveTokenChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadScript();
        if (cancelled) return;
        if (!window.LightweightCharts) throw new Error("Chart library unavailable");
        const res = await fetch(`/api/token/${address}/chart?days=${days}`);
        if (!res.ok) throw new Error(`Chart fetch failed: ${res.status}`);
        const data = (await res.json()) as { candles: Candle[]; pair: any };
        if (cancelled) return;
        setPair(data.pair);

        if (!containerRef.current || data.candles.length === 0) {
          setError(data.candles.length === 0 ? "No price history available" : null);
          return;
        }

        // Build chart
        const chart = window.LightweightCharts.createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { color: "transparent" },
            textColor: "#94A3B8",
            fontSize: 12,
          },
          grid: {
            vertLines: { color: "rgba(30,30,46,0.5)" },
            horzLines: { color: "rgba(30,30,46,0.5)" },
          },
          crosshair: { mode: 1 },
          rightPriceScale: { borderColor: "#1E1E2E" },
          timeScale: { borderColor: "#1E1E2E", timeVisible: true, secondsVisible: false },
        });
        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries({
          upColor: "#10B981",
          downColor: "#EF4444",
          borderUpColor: "#10B981",
          borderDownColor: "#EF4444",
          wickUpColor: "#10B981",
          wickDownColor: "#EF4444",
        });
        candleSeries.setData(data.candles.map((c) => ({
          time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
        })));
        candleSeriesRef.current = candleSeries;

        // Volume bars
        const volSeries = chart.addHistogramSeries({
          color: "#7C3AED",
          priceFormat: { type: "volume" },
          priceScaleId: "",
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        volSeries.setData(data.candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
        })));
        volumeSeriesRef.current = volSeries;

        chart.timeScale().fitContent();

        // Resize
        resizeObserver = new ResizeObserver(() => {
          if (chartRef.current && containerRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        resizeObserver.observe(containerRef.current);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chart failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      try { chartRef.current?.remove(); } catch { /* noop */ }
    };
  }, [address, days]);

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Price Chart ({days}d)</h3>
          {pair && (
            <p className="mt-0.5 text-xs text-text-muted">
              {pair.dexId} · {pair.baseToken?.symbol}/{pair.quoteToken?.symbol}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => {
                if (d !== days) {
                  // Trigger re-fetch via key change
                  const evt = new CustomEvent("chart:days", { detail: d });
                  window.dispatchEvent(evt);
                }
              }}
              className={`rounded-md px-2 py-0.5 text-xs ${d === days ? "bg-brand/20 text-brand" : "text-text-muted hover:bg-bg-elevated"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="flex h-96 items-center justify-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {error && !loading && (
        <div className="flex h-96 flex-col items-center justify-center gap-2 text-text-muted">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {!loading && !error && <div ref={containerRef} className="w-full" style={{ height: 400 }} />}
    </div>
  );
}
